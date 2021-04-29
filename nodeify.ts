import bundle from "./deno.ns/src/deno.ns.b.ts";
import { writeAll } from "https://deno.land/std@0.95.0/io/util.ts";

export const build = async (entrypoint: string, outDir: string) => {
  await Deno.remove(outDir).catch(() => {});
  await Deno.mkdir(outDir, { recursive: true });
  const result = await Deno.emit(entrypoint, {
    compilerOptions: { allowJs: true },
  });

  if (result.diagnostics.length > 0) {
    console.error(result.diagnostics);
    // Deno.exit(1);
  }

  const map: Record<string, string> = {};
  const base = new URL(import.meta.url).pathname
    .split("/")
    .slice(0, -1)
    .join("/");
  for (
    const [name, file] of Object.entries(result.files)
      .filter(([name]) => !name.endsWith(".map"))
  ) {
    const url = new URL(name);
    const mapped = url.protocol === "file:"
      ? `${outDir}/file/${url.pathname.slice(base.length + 1)}`
      : `${outDir}/${url.protocol.slice(0, -1)}/${url.hostname}/${
        url.pathname.slice(1)
      }`;
    map[name] = mapped;
  }
  for (const [name, file] of Object.entries(result.files)) {
    const mapped = map[name];
    if (!mapped) {
      continue;
    }
    await Deno.mkdir(mapped.split("/").slice(0, -1).join("/"), {
      recursive: true,
    });
    let replaced = file;
    for (const [importName, mapped] of Object.entries(map)) {
      replaced = replaced.replaceAll('.ts"', '.ts.js"');
      replaced = replaced.replaceAll(
        '"https://',
        '"' +
          "../".repeat(
            Math.max(
              1,
              name.split("/").length -
                (name.startsWith("https://") ? 0 : base.split("/").length) - 2,
            ),
          ) +
          "https/",
      );
      replaced = replaced.replaceAll(importName, mapped);
    }
    await Deno.writeTextFile(mapped, replaced);
  }
  await write(bundle, `${outDir}/deno.ns`);
  const mappedEntrypoint = `./file/${entrypoint}.js`;
  await Deno.writeTextFile(
    `${outDir}/${mappedEntrypoint}`,
    `import "../deno.ns/global.js";
    import.meta.main = true;
${await Deno.readTextFile(`${outDir}/${mappedEntrypoint}`)}`,
  );
  await Deno.writeTextFile(
    `${outDir}/package.json`,
    JSON.stringify(
      {
        type: "module",
        main: mappedEntrypoint,
        "dependencies": {
          "node-fetch": "^2.6.1",
        },
      },
      null,
      "  ",
    ),
  );
};

export const copy = async (url: string, path: string) => {
  await Deno.mkdir(path.split("/").slice(0, -1).join("/"), { recursive: true });
  await Deno.writeTextFile(
    path,
    (await (await fetch(url)).text())
      .replaceAll('.ts"', '.ts.js"')
      .replaceAll('"https://', '"../../../../https/'),
  );
};

const write = async <T>(bundle: T, path: string) => {
  if (bundle instanceof Uint8Array) {
    const file = await Deno.open(path, {
      write: true,
      create: true,
      truncate: true,
    });
    await writeAll(file, bundle);
    file.close();
  }
  await Deno.mkdir(path, { recursive: true }).catch(() => {});
  for (const [k, data] of Object.entries(bundle)) {
    await write(data, `${path}/${k}`);
  }
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
