import { getAllMems } from '$lib/server/mem';
import { htmlEscape } from '$lib/html';
import { getFirebaseApp, getFirestoreClient, FIREBASE_PROJECT_ID } from '$lib/firebase.server.js';

export const GET: RequestHandler = async ({ params, request }) => {
	//const firebaseApp = getFirebaseApp();
	const firestore = getFirestoreClient(FIREBASE_PROJECT_ID);

	// TODO: Verify the user ID using a secret code
	const userId = params.feedId;
	const mems = await getAllMems(firestore, userId, { maxResults: 100, lookQueue: true });

	// Output the RSS
	let rss = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
	rss += `<rss version="2.0">\n`;
	rss += `<channel>\n`;
	rss += `<title>${userId}</title>\n`;
	for (const mem of mems) {
		rss += `<item>\n`;
		rss += `<guid isPermaLink="false">${mem.id}</guid>\n`;
		rss += `<title>${htmlEscape(mem.title)}</title>\n`;
		rss += `<link>${htmlEscape(mem.url)}</link>\n`;
		rss += `<description>${htmlEscape(mem.description)}</description>\n`;
		if (mem.addedMs) {
			rss += `<pubDate>${new Date(mem.addedMs).toUTCString()}</pubDate>\n`;
		}
		rss += `</item>\n`;
	}
	rss += `</channel>\n`;
	rss += `</rss>\n`;
	return new Response(rss);
};
