export interface UserList {
  name: string;
  tags: string[]; // normalized "#tag" values, match-any within a list
  autoArchive?: boolean; // default true when undefined
}

// Seeded default so behavior is preserved when a user configures nothing.
export const DEFAULT_LISTS: UserList[] = [{ name: "reading", tags: ["#look"], autoArchive: true }];

// A user's lists, falling back to the seeded default when none are configured.
export const listsForUser = (lists: UserList[] | undefined | null): UserList[] =>
  lists && lists.length > 0 ? lists : DEFAULT_LISTS;

// Flattened tags of lists that pull an added mem out of the "new" inbox.
export const autoArchiveTags = (lists: UserList[]): string[] =>
  lists.filter((list) => list.autoArchive !== false).flatMap((list) => list.tags);

// Flattened tags across all lists (used for the unseen dot and "seen").
export const allListTags = (lists: UserList[]): string[] => lists.flatMap((list) => list.tags);
