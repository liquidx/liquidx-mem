export interface MemListOptions {
  // sort orders
  order: 'newest' | 'oldest';
  // filters
  onlyNew: boolean;
  onlyArchived: boolean;
  matchAllTags: string[];
  matchAnyTags: string[];
}

export const listOptionsByString = (filterString: string | undefined): MemListOptions => {
  const options: MemListOptions = {
    order: 'newest',
    onlyNew: false,
    onlyArchived: false,
    matchAllTags: [],
    matchAnyTags: []
  };

  if (!filterString) {
    options.onlyNew = true;
    return options;
  }

  if (filterString == '*') {
    options.onlyArchived = true;
  }

  // Filter strings can either be
  // - a single tag
  // - tags separated by '+' (match all) or ',' (match any)
  const matchAll = filterString.split('+');
  if (matchAll.length > 0) {
    options.matchAllTags = matchAll
      .map((tag) => tag.trim())
      .map((tag) => tag.toLowerCase())
      .map((tag) => `#${tag}`);
    return options;
  }

  const matchAny = filterString.split(',');
  if (matchAny.length > 1) {
    options.matchAnyTags = matchAny
      .map((tag) => tag.trim())
      .map((tag) => tag.toLowerCase())
      .map((tag) => `#${tag}`);
    return options;
  }

  return options;
};

export const stringFromListOptions = (options: MemListOptions): string => {
  if (options.onlyArchived) {
    return '*';
  }
  if (options.matchAllTags.length > 0) {
    const matchAll = options.matchAllTags.map((tag) => tag.replace('#', '')).join('+');
    return matchAll;
  }
  if (options.matchAnyTags.length > 0) {
    const matchAny = options.matchAnyTags.map((tag) => tag.replace('#', '')).join(',');
    return matchAny;
  }
  return '';
};
