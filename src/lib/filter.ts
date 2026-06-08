export interface MemListOptions {
  // sort orders
  order: "newest" | "oldest";
  // filters
  onlyNew: boolean;
  onlyArchived: boolean;
  matchAllTags: string[];
  matchAnyTags: string[];
}

export const listOptionsByString = (filterString: string | undefined): MemListOptions => {
  const options: MemListOptions = {
    order: "newest",
    onlyNew: false,
    onlyArchived: false,
    matchAllTags: [],
    matchAnyTags: []
  };

  if (!filterString) {
    options.onlyNew = true;
    return options;
  }

  if (filterString == "*") {
    options.onlyArchived = true;
    options.matchAllTags = ["#*"];
    return options;
  }

  const toTag = (tag: string) => `#${tag.trim().toLowerCase()}`;

  // Filter strings can either be
  // - a single tag
  // - tags separated by '+' (match all) or ',' (match any)
  // Check for the separators explicitly: split('+') always returns at least one
  // element, so it cannot be used to detect which separator was used.
  if (filterString.includes("+")) {
    options.matchAllTags = filterString.split("+").map(toTag);
    return options;
  }

  if (filterString.includes(",")) {
    options.matchAnyTags = filterString.split(",").map(toTag);
    return options;
  }

  // A single tag.
  options.matchAllTags = [toTag(filterString)];
  return options;
};

export const stringFromListOptions = (options: MemListOptions): string => {
  if (options.onlyArchived) {
    return "*";
  }
  if (options.matchAllTags.length > 0) {
    const matchAll = options.matchAllTags.map((tag) => tag.replace("#", "")).join("+");
    return matchAll;
  }
  if (options.matchAnyTags.length > 0) {
    const matchAny = options.matchAnyTags.map((tag) => tag.replace("#", "")).join(",");
    return matchAny;
  }
  return "";
};
