///<reference path="../lib.deno.d.ts" />

import { readFile } from 'fs/promises';

export const readTextFile: typeof Deno.readTextFile = async function readTextFile(
	path
) {
	return readFile(path, 'utf8');
};
