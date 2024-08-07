import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

import { parseOpenGraph } from '$lib/opengraph';

describe('parseOpenGraph', () => {
	it('should get opengraph images from x', async () => {
		const content = readFileSync('./test/fixtures/x.html', 'utf-8');

		const result = parseOpenGraph(content);
		expect(result).toHaveProperty('title');
	});

	it('should get opengraph images from youtube', async () => {
		const content = readFileSync('./test/fixtures/youtube_watch.html', 'utf-8');

		const result = parseOpenGraph(content);
		console.log(result);
		expect(result).toHaveProperty('title');
	});

	it('should get opengraph images from mitpress', async () => {
		const content = readFileSync('./test/fixtures/mitpress.html', 'utf-8');

		const result = parseOpenGraph(content);
		console.log(result);
		expect(result).toHaveProperty('title');
	});
});
