import { getAuth } from 'firebase-admin/auth';
import { firebaseApp } from './firebase-app.js';
import type { DecodedIdToken } from 'firebase-admin/auth';

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
export const validateFirebaseIdToken = async (
	req: Request
): Promise<DecodedIdToken | undefined> => {
	console.log('Check if request is authorized with Firebase ID token');

	const auth = getAuth(firebaseApp());

	if (
		(!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) &&
		!(req.cookies && req.cookies.__session)
	) {
		console.error(
			'No Firebase ID token was passed as a Bearer token in the Authorization header.',
			'Make sure you authorize your request by providing the following HTTP header:',
			'Authorization: Bearer <Firebase ID Token>',
			'or by passing a "__session" cookie.'
		);
		return;
	}

	let idToken;
	if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
		console.log('Found "Authorization" header');
		// Read the ID Token from the Authorization header.
		idToken = req.headers.authorization.split('Bearer ')[1];
	} else if (req.cookies) {
		console.log('Found "__session" cookie');
		// Read the ID Token from cookie.
		idToken = req.cookies.__session;
	} else {
		return;
	}

	try {
		const decodedIdToken = await auth.verifyIdToken(idToken);
		console.log('ID Token correctly decoded', decodedIdToken);
		return decodedIdToken;
	} catch (error) {
		console.error('Error while verifying Firebase ID token:', error);
		return;
	}
};
