export interface TagFilters {
	onlyNew: boolean;
	onlyArchived: boolean;
	matchAllTags: string[];
	matchAnyTags: string[];
}

export const tagFiltersByString = (filterString: string | undefined): TagFilters => {
	const filters: TagFilters = {
		onlyNew: false,
		onlyArchived: false,
		matchAllTags: [],
		matchAnyTags: []
	};

	if (!filterString) {
		return filters;
	}

	if (filterString == '*') {
		filters.onlyArchived = true;
	}

	// Filter strings can either be
	// - a single tag
	// - tags separated by '+' (match all) or ',' (match any)
	const matchAll = filterString.split('+');
	if (matchAll.length > 0) {
		filters.matchAllTags = matchAll
			.map((tag) => tag.trim())
			.map((tag) => tag.toLowerCase())
			.map((tag) => `#${tag}`);
		return filters;
	}

	const matchAny = filterString.split(',');
	if (matchAny.length > 1) {
		filters.matchAnyTags = matchAny
			.map((tag) => tag.trim())
			.map((tag) => tag.toLowerCase())
			.map((tag) => `#${tag}`);
		return filters;
	}

	return filters;
};

export const stringFromTagFilters = (filters: TagFilters): string => {
	if (filters.onlyArchived) {
		return '*';
	}
	if (filters.matchAllTags.length > 0) {
		const matchAll = filters.matchAllTags.map((tag) => tag.replace('#', '')).join('+');
		return matchAll;
	}
	if (filters.matchAnyTags.length > 0) {
		const matchAny = filters.matchAnyTags.map((tag) => tag.replace('#', '')).join(',');
		return matchAny;
	}
	return '';
};
