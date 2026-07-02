# Task Backlog

Forward-looking implementation tasks for liquidx-mem, written in the same
"as-planned" spirit as the `docs/spec/` "as-implemented" reference. Each task doc
captures the goal, the decisions already made, a work breakdown, the files it
touches, and how to verify it.

These come from a "next version" roadmap with three phases. Phase 1 has shipped; the
remaining two are documented here.

| Phase | Task                                                                          | Status              |
| ----- | ----------------------------------------------------------------------------- | ------------------- |
| 1     | Reading List view with topic grouping                                         | ✅ Shipped (PR #11) |
| 2     | [Email digests & resurfacing](./phase-2-email-digests.md)                     | 📋 Planned          |
| 3     | [External access: API tokens, CLI & remote MCP](./phase-3-external-access.md) | 📋 Planned          |

## Phase 1 recap (shipped)

A dedicated `/reading` view of mems tagged `#look`/`#next`/`#try` (OR-matched),
grouped by their other "topic" tags, searchable, with a "mark read" action that
strips the reading-list tags so an item drops off the list while staying saved.

Key pieces, for reference when building Phases 2–3:

- `src/lib/common/reading.ts` — `READING_LIST_TAGS = ["#look", "#next", "#try"]`
  (shared by server + client; reused throughout the roadmap).
- `src/lib/filter.ts` — fixed `listOptionsByString` so comma/OR (`matchAnyTags`)
  filtering actually works (it was dead code); `+` still means AND.
- `src/routes/_api/mem/flag/+server.ts` — added a `markRead` branch (strips all
  reading tags) and now refreshes tag counts on `seen`/`markRead`.
- `src/lib/svelte/ReadingListView.svelte`, `src/routes/(web)/reading/+page.svelte`,
  and a nav entry in `src/lib/svelte/MemTagList.svelte`.

The phases below are independent and can be built in any order, though Phase 3's
unified auth is a natural prerequisite for exposing more surface area safely.
