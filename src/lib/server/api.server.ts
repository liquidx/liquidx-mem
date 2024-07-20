import { getAuth } from 'firebase-admin/auth';
import { type App } from 'firebase-admin/app';

import { USER_NOT_FOUND } from './firestore-user-secrets';

export const getUserId = async (
	firebaseApp: App,
	request: Request
): Promise<string | undefined> => {
	// Check auth
	const token = request.headers.get('Authorization')?.replace('Bearer ', '');
	if (!token) {
		console.log('Error: No token');
		return;
	}

	let userId = '';
	if (token) {
		const decodedToken = await getAuth(firebaseApp).verifyIdToken(token);
		if (!decodedToken) {
			return;
		}
		userId = decodedToken.uid;
	}

	if (!userId || userId === USER_NOT_FOUND) {
		return;
	}

	return userId;
};
