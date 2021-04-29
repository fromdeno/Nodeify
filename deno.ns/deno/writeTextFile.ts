///<reference path="../lib.deno.d.ts" />

import { writeFile } from 'fs/promises';

export const writeTextFile: typeof Deno.writeTextFile = async function writeTextFile(
	path,
	data,
	options
) {
	return writeFile(path, data);
};
