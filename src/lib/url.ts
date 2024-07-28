export const removeUrlTrackingParams = (url: string): string => {
	// Remove tracking params like utm_source, utm_medium, etc.
	const urlObj = new URL(url);
	urlObj.searchParams.delete('utm_source');
	urlObj.searchParams.delete('utm_medium');
	urlObj.searchParams.delete('utm_campaign');
	urlObj.searchParams.delete('utm_term');
	urlObj.searchParams.delete('utm_content');
	urlObj.searchParams.delete('gad_source');
	urlObj.searchParams.delete('fbclid');
	urlObj.searchParams.delete('gclid');
	urlObj.searchParams.delete('msclkid');
	urlObj.searchParams.delete('mc_cid');
	urlObj.searchParams.delete('mc_eid');
	// threads.net specific
	urlObj.searchParams.delete('xtm');

	return urlObj.toString();
};
