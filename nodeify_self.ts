import { build, copy } from "./nodeify.ts";

const outDir = "node_nodeify";
await build("nodeify.ts", outDir);
await copy(
  "https://deno.land/x/brotli@v0.1.4/wasm.js",
  `${outDir}/https/deno.land/x/brotli@v0.1.4/wasm.js`,
);

await copy(
  "https://deno.land/x/lz4@v0.1.2/wasm.js",
  `${outDir}/https/deno.land/x/lz4@v0.1.2/wasm.js`,
);
