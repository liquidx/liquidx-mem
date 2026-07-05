# Wanderloop Design System — Guideline (Mem edition)

Mem is one product in the **Wanderloop family**. The family shares one design system — a sharp, minimal **terminal / HUD** aesthetic — and each product retunes exactly one thing: the accent hue. This document is the implementation guideline; `Wanderloop Design System.dc.html` in this bundle is the visual reference for the family system.

## Principles
1. **Sharp** — no rounded corners anywhere. Structure is drawn with 1px hairlines, ticks and boxed cells. Only status dots are circles.
2. **Airy** — lots of black space, few elements per view. Density comes from data, not chrome.
3. **Sparing accent** — the accent marks a handful of things per view: the prompt, the active/live marker, the primary action. If everything is orange, nothing is.
4. **Labels vs values** — UPPERCASE + letter-spacing for labels, titles and states; lowercase for every value, name and control. The mono grid does the rest.

## Color

### Family core (fixed, all products)
| token | value | use |
|---|---|---|
| base | `#08080A` | app background |
| surface | `#0C0C10` | inputs, panels, popovers |
| text/primary | `#E6E6EA` | titles, values |
| text/secondary | `#9A9AA4` | body, notes |
| text/tertiary | `#7A7A84` | secondary meta |
| text/faint | `#54545E` | timestamps, labels, idle icons |
| text/dim | `#45454E` | hints |
| text/ui | `#C9C9D0` | control labels |
| danger | `#D06A6A` | delete / destructive |
| warn | `#D0A24C` | pending / caution |

Hairlines (borders & separators): `rgba(255,255,255,.05)` faint · `.09–.12` default · `.14–.16` strong. Hover fills: `rgba(255,255,255,.02–.04)`.

### Mem accent (the one per-product variable)
- **accent** `#D98E52` = `oklch(0.73 0.13 55)` — Mem's brand orange retuned to the family's fixed lightness/chroma (the flagship Check-In app uses `oklch(.73 .13 293)` purple; every family accent shares L/C and varies hue only).
- **accent-muted** `#A06B42` — urls, inline tag text.
- accent tint fill `rgba(217,142,82,.08–.1)` · accent glow `0 0 8px rgba(217,142,82,.55)`.

Never introduce additional hues. New semantic colors must be derived from the table above.

## Typography
- One family: **Spline Sans Mono** (Google Fonts), fallback `ui-monospace, monospace`. Weights 400 and 600 only.
- Scale: `9px` micro-labels (UPPERCASE, tracking .14–.16em) · `10px` meta, chips, tags · `11px` small body, controls · `12–13px` content · `14px` omni-bar / list titles · `15px+` brand & screen titles (weight 600, tracking .02–.05em).
- Numerals are tabular by default (mono). Line-height 1.4 titles, 1.6 body.
- Casing rule is a hard rule: labels/states UPPERCASE, values lowercase.

## Structure & spacing
- Radius **0** everywhere; no drop shadows except floating layers (`0 16px 48px rgba(0,0,0,.7)`) and accent glows.
- Page padding 24px desktop / 16px mobile; vertical rhythm 12–16px; list-row padding ~13px.
- **Section label** pattern: `LABEL · count ————hairline———— descriptor` (10px, tracking .16em).
- **Tick strip** (9px-tall ruler of 1px ticks every 24px on a hairline): mobile-only header motif; on desktop the column/rail hairlines carry the structure instead.
- **Active-state markers**: a 2px accent bar — bottom edge for horizontal controls (tabs, segmented cells, chips), left edge for vertical lists (nav items, selector cells, editing rows) — optionally with an accent tint fill. Never restyle the text alone.

## Iconography
- Set: **Tabler Icons**, stroke 1.5, `stroke-linecap: square`, `stroke-linejoin: miter`. Sizes 13–18px.
- Icons appear **only** in navigation and inline edit affordances (✎ pencil, ✕ dismiss/delete). Everything else — states, markers, prompts — is drawn with dots, ticks and text (`>`, `▾`, `▪`, `★`).
- Idle icon color `#54545E`; hover/active accent.
- Tag emoji are user data rendered as text, not part of the icon system.

## Components (as used in Mem)
- **Omni-bar / search field**: surface bg, strong hairline border, accent `>` prompt, blinking block caret (accent, `1s steps(1)`), right-aligned `⏎` hint in dim text.
- **Segmented control**: bordered group with 1px internal dividers; active cell = accent bottom bar + optional tint. Used for view tabs (`new / reading / archive` with counts) and density (`full / minimal`).
- **Chips**: 1px hairline border, `4px 9px` padding, 10px text; active = accent underline bar inset from edges.
- **Expandable tag selector**: chips row (top ~8) + `+N tags ▾` accent expander → dense grid (5-col desktop / 2-col mobile, 1px hairline grid lines, max-height + vertical scroll). Cells: `emoji · #name · count`.
- **List row**: date column (faint, `MM-DD`) · unseen dot (accent, glowing) · content. Full density adds url (accent-muted, scheme stripped, ≤48 chars), note, thumbnail (hairline border, no caption), text-only action row. Minimal = one line: title + muted domain + tags, **no separators**.
- **Row-flip editor**: row swaps in place for a form — accent 2px left rule + `rgba(accent,.045)` tint, `EDITING` label, ✕ top-right. No save button: edits apply live, `⏎`/✕ dismiss, `esc` discards. Inputs: base bg, hairline border, accent focus border, mono.
- **Buttons**: primary = accent text on accent tint + accent border; neutral = hairline border; destructive = red text + red hairline. All square, 10–11px lowercase.
- **Toggle**: square 40×20 track, accent border + tint when on, glowing square knob.
- **Status tokens**: `▪ lowercase-state` — accent ok · amber pending · faint off.

## Motion
Sharp and mechanical — a terminal booting, not a consumer app. No bounce, no overshoot.
- `riseIn`: rows/cards fade up 7px, `.5s ease`, staggered +60ms (on view load, once).
- `barDraw`: bars scale in from the left, `.8s cubic-bezier(.16,1,.3,1)`.
- `caret/blink`: `1–1.4s steps(1)` loops.
- State changes (tabs, density, expanders, editors) may be instant.

## Platforms
- **Breakpoints**: <720 mobile (1 col) · 720–1120 tablet · 1120–1600 desktop · >1600 content capped ~1440px, centered.
- Mem (command layout) has no sidebar; other family products map bottom tab bar (mobile) → left sidebar (desktop). Icons live only in that nav.
- **Hover is desktop-only** and is always a faint background lift, never a color change. Keyboard focus = 1px accent border/outline.
- Touch targets ≥44px on mobile; desktop rows may compress to ~36px.
