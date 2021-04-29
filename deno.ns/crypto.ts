import { randomFillSync } from 'crypto';
export const crypto = {
	getRandomValues(p) {
		randomFillSync(p);
		return p;
	},
	subtle: null
};
