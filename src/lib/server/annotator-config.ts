export interface AnnotatorUrlConfig {
	pattern: RegExp;
	action: 'fetch' | 'opengraph' | 'ignore';
	useOldTitleDescription?: boolean;
}

export const ANNOTATOR_URL_CONFIG: AnnotatorUrlConfig[] = [
	{
		pattern: new RegExp('https://www.instagram.com/accounts/login/'),
		action: 'ignore'
	},
	{
		pattern: new RegExp('https://www.threads.net/.*/post'),
		action: 'opengraph'
	},
	{
		pattern: new RegExp('https://www.reddit.com/r/.*'),
		action: 'opengraph',
		useOldTitleDescription: true
	}
];
