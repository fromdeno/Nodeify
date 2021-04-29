const exec = (cwd: string, cmd: string[]) =>
  Deno.run({
    cwd,
    cmd: [...Deno.build.os === "windows" ? ["cmd", "/c"] : [], ...cmd],
  });

await exec("deno.ns", ["npm", "i"]).status();
await exec("deno.ns", ["npm", "run", "full"]).status();
