import { describe, it, expect } from 'vitest';
import { fetchOpenGraph } from '$lib/opengraph';

describe('parseOpenGraph', () => {
	it('should get opengraph from github', async () => {
		const url = 'https://github.com/glanceapp/glance';
		const result = await fetchOpenGraph(url);
		console.log(result);
		expect(result).toHaveProperty('title');
	});
});
