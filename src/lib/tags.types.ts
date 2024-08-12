export interface TagCount {
  tag: string;
  icon: string;
  count: number;
}

export interface TagIndex {
  userId: string;
  counts: TagCount[];
}

export type TagListItem = { tag: string; count: number; icon?: string };
