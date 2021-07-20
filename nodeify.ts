import { writeAll } from "https://deno.land/std@0.95.0/io/util.ts";
import { red } from "https://deno.land/std@0.97.0/fmt/colors.ts";
import { toFileUrl } from "https://deno.land/std@0.95.0/path/mod.ts";

const filterDots = (path: string) => {
  const segments = path.split("/");
  const result: string[] = [];
  for (const segment of segments) {
    if (segment === "..") {
      result.pop();
      continue;
    }
    if (segment === ".") {
      continue;
    }
    result.push(segment);
  }
  return result.join("/");
};

export const mapPath = (path: string) => {
  const url = new URL(path, "file://.");
  const proto = url.protocol.slice(0, -1);
  const ext = url.pathname.endsWith(".js")
    ? ""
    : url.pathname.endsWith(".d.ts")
    ? ""
    : ".js";
  return filterDots(`${proto}/${url.hostname}${url.pathname}${ext}`);
};

const replaceImportsInModule = (
  path: string,
  data: string,
  outDir: string,
  map: Record<string, string>,
  fetched: string[],
) => {
  const replaced = data.replace(
    /from\s*["']([^"']+)["']/g,
    (_, x: string) => {
      if (/^https?:/.test(x) && x.endsWith(".js")) {
        fetchJSModule(x, outDir, map, fetched).catch((err) =>
          console.error(err.message)
        );
      }
      return 'from "' +
        (/^https?:/.test(x)
          ? ((y) => y.startsWith(".") ? y : "../" + y)(
            "../".repeat(path.split("/").length - 2) + mapPath(x),
          )
          : ((y) =>
            y.endsWith(".js") ? y : y + (y.endsWith(".d.ts") ? "" : ".js"))(
              x.startsWith(".") ? x : "./" + x,
            )) +
        '"';
    },
  );
  return replaced;
};

export const fetchJSModule = async (
  url: string,
  outDir: string,
  map: Record<string, string>,
  fetched: string[],
) => {
  if (fetched.includes(url)) {
    return;
  }
  fetched.push(url);
  const res = await fetch(url);
  const data = await res.text();
  const path = `${outDir}/${mapPath(url)}`;
  await Deno.mkdir(
    path.split("/").slice(0, -1).join("/"),
    { recursive: true },
  );
  const file = await Deno.open(
    path,
    { create: true, write: true, truncate: true },
  );
  await writeAll(
    file,
    new TextEncoder().encode(
      replaceImportsInModule(path, data, outDir, map, fetched),
    ),
  );
  file.close();
};

const diagnosticMessageHelper = (d: Deno.Diagnostic): string[] => [
  ...d.messageText ? [d.messageText] : [],
  ...d.messageChain ? diagnosticMessageHelper(d.messageChain) : [],
];

const diagnosticMessage = (d: Deno.Diagnostic) =>
  diagnosticMessageHelper(d).join("\n");

export const build = async (entrypoint: string, outDir: string) => {
  await Deno.remove(outDir).catch(() => {});
  await Deno.mkdir(outDir, { recursive: true });
  const map: Record<string, string> = {};
  const fetched: string[] = [];
  const result = await Deno.emit(entrypoint, {
    compilerOptions: {
      allowJs: true,
      checkJs: true,
      declaration: true,
    },
  });
  if (result.diagnostics.length > 0) {
    for (const diag of result.diagnostics) {
      if (diag.fileName?.endsWith(".js") && !diag.fileName.endsWith(".ts.js")) {
        await fetchJSModule(diag.fileName, outDir, map, fetched);
      }
    }
    result.diagnostics.forEach((d) =>
      console.error(
        [
          `${red(diagnosticMessage(d))}`,
          `\tin ${d.fileName}:${d.start?.line}:${d.start?.character}`,
          // `\tat ${d.sourceLine}`,
        ].join("\n"),
      )
    );
    // Deno.exit(1);
  }

  for (
    const [name, file] of Object.entries(result.files)
      .filter(([name]) => !name.endsWith(".map"))
      .map(([name, file]) =>
        name.startsWith("file:")
          ? ["." + name.slice(toFileUrl(Deno.cwd()).href.length), file]
          : [name, file]
      )
  ) {
    const mapped = mapPath(name);
    map[name] = mapped;
  }
  for (
    const [name, file] of Object.entries(result.files).map(([name, file]) =>
      name.startsWith("file:")
        ? ["." + name.slice(toFileUrl(Deno.cwd()).href.length), file]
        : [name, file]
    )
  ) {
    const mapped = map[name];
    if (!mapped) {
      continue;
    }
    await Deno.mkdir(`${outDir}/${mapped}`.split("/").slice(0, -1).join("/"), {
      recursive: true,
    });
    const replaced = replaceImportsInModule(name, file, outDir, map, fetched);
    await Deno.writeTextFile(`${outDir}/${mapped}`, replaced);
  }
  const mappedEntrypoint = mapPath(entrypoint);
  await Deno.writeTextFile(
    `${outDir}/${mappedEntrypoint}`,
    `import.meta.main = true;\n${await Deno.readTextFile(
      `${outDir}/${mappedEntrypoint}`,
    )}`,
  );
  await Deno.writeTextFile(
    `${outDir}/index.js`,
    `import "deno.ns/global";\nexport * from "./${mappedEntrypoint}";\n`,
  );
  const pack = JSON.parse(
    await Deno.readTextFile(`${outDir}/package.json`).catch(() => ("{}")),
  );
  await Deno.writeTextFile(
    `${outDir}/package.json`,
    JSON.stringify(
      {
        ...pack,
        type: "module",
        main: "./index.js",
        "dependencies": {
          "deno.ns": "^0.2.0",
        },
      },
      null,
      "  ",
    ),
  );
};

if (import.meta.main) {
  const [entrypoint, outDir] = Deno.args;

  if (!outDir) {
    console.error("No outDir argument\nUsage: nodeify <entrypoint> <outDir>");
    Deno.exit(1);
  }

  if (!entrypoint) {
    console.error(
      "No entrypoint argument\nUsage: nodeify <entrypoint> <outDir>",
    );
    Deno.exit(1);
  }
  await build(entrypoint, outDir);
}
