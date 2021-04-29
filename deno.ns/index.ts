///<reference path="lib.deno.d.ts" />

import fetch from 'node-fetch';
import { args } from './deno/args.js';
import { build } from './deno/build.js';
import { env } from './deno/env.js';
import { errors } from './deno/errors.js';
import { listen } from './deno/listen.js';
import { mkdir } from './deno/mkdir.js';
import { open } from './deno/open.js';
import { readDir } from './deno/readDir.js';
import { readTextFile } from './deno/readTextFile.js';
import { remove } from './deno/remove.js';
import { rename } from './deno/rename.js';
import { stat } from './deno/stat.js';
import { writeTextFile } from './deno/writeTextFile.js';

export { Headers } from 'node-fetch';
export { crypto } from './crypto.js';
export { fetch };

//@ts-expect-error
export const Deno: typeof globalThis.Deno = {
	args,
	build,
	env,
	errors,
	listen,
	mkdir,
	open,
	readDir,
	readTextFile,
	remove,
	rename,
	stat,
	writeTextFile
};
