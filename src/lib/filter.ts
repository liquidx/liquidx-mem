export type FilterStrategy = 'any' | 'all';
export type FilterTags = string[];
export type FilterCondition = {
	filterTags: FilterTags;
	filterStrategy: FilterStrategy;
	archivedOnly: boolean;
};

export const getFilterCondition = (tags: string): FilterCondition => {
	let filterTags = [] as string[];
	let filterStrategy: FilterStrategy = 'any';
	let archivedOnly = false;

	if (tags === '') {
		return { filterTags, filterStrategy, archivedOnly };
	}

	if (tags == '*') {
		archivedOnly = true;
	} else if (tags.includes('+')) {
		filterStrategy = 'all';
		filterTags = tags.split('+').map((t) => `#${t}`);
	} else {
		filterTags = tags.split('|').map((t) => `#${t}`);
	}
	return { filterTags, filterStrategy, archivedOnly };
};
