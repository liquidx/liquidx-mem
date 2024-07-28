export interface AnnotatorUrlConfig {
	pattern: RegExp;
	action: 'fetch' | 'opengraph' | 'ignore';
}

export const ANNOTATOR_URL_CONFIG: AnnotatorUrlConfig[] = [
	{
		pattern: new RegExp('https://www.instagram.com/accounts/login/'),
		action: 'ignore'
	},
	{
		pattern: new RegExp('^x.com$'),
		action: 'ignore'
	},
	{
		pattern: new RegExp('https://www.threads.net/.*/post'),
		action: 'opengraph'
	}
];
