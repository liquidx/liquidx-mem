// Scheme of what is stored in the database for the User. This gets reflected back
// across the app as the type { User } from 'lucia'.
//
// Referenced in $lib/lucia.server.ts
export interface DatabaseUserAttributes {
	email: string; // required
	name?: string;
	oauthAvatarUrl?: string;

	githubUsername?: string;

	googleUsername?: string;
	googleAccountId?: string;

	appleUsername?: string;
	appleUserId?: string;
}

// Defining this outside of Lucia so that we can use the
// type on the client side.
export interface User extends DatabaseUserAttributes {
	id: string;
}
