export type TagIndex = { [field: string]: number };
export type TagListItem = { tag: string; count: number; icon?: string };
export type IndexTagDocument = { counts: TagListItem[] };
