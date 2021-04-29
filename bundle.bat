@pushd "%~dp0"
@pushd deno.ns
@call npm i
@call npm run full
@popd
@deno run --allow-read=deno.ns/dist --allow-write=deno.ns/deno.ns.b.ts https://raw.githubusercontent.com/trgwii/bundler/master/bundler.ts ts-bundle deno.ns/dist deno.ns/deno.ns.b.ts
@popd
