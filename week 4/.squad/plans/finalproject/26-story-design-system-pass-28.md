# Story 26 — Design System Tokens & Visual Consistency Pass (Story: 28)

## Prerequisites

- **Story 24 completed** ([24-story-build-and-test-baseline-28.md](24-story-build-and-test-baseline-28.md)) — the build and test gate is green, and `BadgeVariant` exists in `src/types/ui.ts`.
- **Story 25 completed** ([25-story-dead-code-and-duplication-sweep-28.md](25-story-dead-code-and-duplication-sweep-28.md)) — the scaffold components and `src/assets/styles/main.css` are gone, so this story styles only files that ship.

**This is a frontend-only story. `No backend changes required.`**

---

## Story Goal

Work item task 6 ("UI/UX Complete Redesign Pass"). The application already has a token file and a set of `Base*` primitives — it does **not** need a new design system. It needs the one it has to actually work:

1. **Define the 13 CSS custom properties that 25 files already use and no file defines.** There are **68 such declarations**, including `border` on every input and `background-color` on every primary button hover. Each is invalid at computed-value time, so the browser discards the whole declaration.
2. **Retire the Vue scaffold theme file** (`src/assets/base.css`), whose `prefers-color-scheme: dark` block silently repaints part of the UI for any user whose OS is in dark mode.
3. **Fix the primary colour's contrast.** `#3b82f6` with white text is **3.68:1** — below the 4.5:1 WCAG AA threshold for normal text, and it is the colour of every primary button, every link, and the active sidebar item.
4. **Add a visible keyboard focus style.** There is currently **not one `:focus-visible` rule in the codebase.**
5. **Standardise the primitives** — button border, badge palette, dialog chrome, card and table surfaces — so they draw from tokens instead of 29 hardcoded hex values.
6. **Fix the three RTL defects** that make the Arabic layout wrong rather than merely mirrored.

**Not in scope:**
- New components, a component library, a CSS framework, or a build-time theming layer. The work item forbids new infrastructure.
- Changing any markup structure, route, or label. Story 27 owns navigation and copy; this story touches `<style>` blocks, `class` attributes, and the token file.
- A dark theme. Task 2 **removes** the accidental one; it does not build a real one.
- Reformatting tests. Every existing spec must pass unchanged.

---

## Context — Read These Files First

1. `frontend-vuejs/src/assets/main.css` — the **whole file** (136 lines). **Lines 4–56** are the token block; **line 1** is `@import './base.css'`; **lines 58–79** are the reset and `body`. Note what the reset does **not** do: it never resets `border` on `button`.
2. `frontend-vuejs/src/assets/base.css` — the **whole file** (86 lines). The Vue scaffold theme: `--vt-c-*` at lines 2–22, a semantic layer at 25–37, and **`@media (prefers-color-scheme: dark)` at lines 39–51** which flips `--color-background`, `--color-text`, `--color-border`, and `--color-heading`. Line 82 sets `font-size: 15px` on `body`, which `main.css:75` then overrides to `1rem`.
3. `frontend-vuejs/src/components/ui/BaseInput.vue` — the **whole file** (95 lines). **Line 70**: `border: 1px solid var(--color-gray-300)`. The token is undefined, so **no input in the application has a border**. Line 63 (`--font-weight-medium`) and line 77 (`--color-gray-400`) fail the same way.
4. `frontend-vuejs/src/components/ui/BaseButton.vue` — the **whole file** (114 lines). **Line 74**: `background-color: var(--color-primary-dark)` on primary hover — undefined, so the button's background falls back and the hover **removes** the fill. **Line 83**: same on secondary hover. **Line 92** hardcodes `#991b1b`. Line 45 uses `--font-weight-medium`. And no rule anywhere sets `border`, so every button carries the user-agent button border.
5. `frontend-vuejs/src/components/ui/BaseBadge.vue` — the **whole file** (58 lines). **Nine hardcoded hex values** across six variants; only `danger` and `gray` use tokens.
6. `frontend-vuejs/src/components/ui/BaseDialog.vue` — the **whole file** (190 lines). **Line 5**: a `@click` handler on `<transition>`, a renderless component. **Line 74**: `background-color: white`. **Lines 150–156**: `[dir='rtl']` rules that flip an already-flipped header. **Lines 180 and 186**: two `.dialog-content` rules in the same media block.
7. `frontend-vuejs/src/components/ui/BaseCard.vue` (54 lines) and `frontend-vuejs/src/components/ui/EmptyState.vue` (53 lines) — the two clean primitives. `BaseCard` hardcodes `white` at line 27; otherwise both are token-driven. Use them as the model.
8. `frontend-vuejs/src/components/layout/AppSidebar.vue` — **lines 96–180**. `--color-gray-900` ground, `--color-primary` active state, and **lines 177–179**: `.sidebar.mobile { transform: translateX(-100%) }` under `inset-inline-start: 0`.
9. `frontend-vuejs/src/components/layout/AppTopbar.vue` — **lines 65–144**. `background-color: white` at line 71, and **two separate `@media (max-width: 768px)` blocks at lines 122 and 128**.
10. `frontend-vuejs/src/views/TicketsView.vue` — **lines 125–140** (the `<thead>`, which already carries `aria-sort` but no `scope`) and **lines 850–945** (the largest block of view-level styling, including `rgba(var(--color-primary-rgb), 0.1)` at line 931).
11. `frontend-vuejs/src/views/TicketDetailView.vue` — **lines 1120–1135**, **1325–1365**. Uses `--color-blue-50`, `--color-blue-200`, `--color-primary-200`, `--color-primary-rgb`, all undefined.
12. `frontend-vuejs/src/i18n/index.ts` and `src/stores/locale.store.ts` — where `dir` and `lang` are applied to the document. Task 8 depends on `[dir='rtl']` being on the root element.

Grep targets:
- `grep -rhoE "var\(--[a-z0-9-]+" frontend-vuejs/src --include=*.vue | sed 's/var(//' | sort -u` — every token the components ask for. Compare against `grep -ohE "^\s*--[a-z0-9-]+" frontend-vuejs/src/assets/*.css`. The difference is the list in task 1.
- `grep -rn "focus-visible" frontend-vuejs/src/` — **returns nothing today.**
- `grep -rhoE "#[0-9a-fA-F]{3,8}\b" frontend-vuejs/src --include=*.vue | wc -l` — **29 today.**

---

## Product rules (from story)

| Concern | Rule |
|---|---|
| **One token file** | Every colour, space, radius, shadow, and weight comes from `main.css`. A hex value in a `.vue` file is a defect unless it is inside a `rgba()` overlay on a neutral scrim. |
| **The palette is Tailwind's neutral + blue ramp** | The six greys already defined are exactly Tailwind's `gray-50/100/200/600/700/900`, and `--color-primary` is `blue-500`. The missing steps come from the same ramp. **Do not introduce a new hue.** |
| **Contrast** | Any text on a filled surface meets **4.5:1**. Any status colour meets **3:1** against its own background. Verified with a contrast checker, not by eye. |
| **Colour is never the only signal** | Every status badge carries its text label — that already holds. Additionally, SLA and ticket-status badges get a leading glyph so a colour-blind reader distinguishes them without reading the palette. |
| **Focus is always visible** | One global `:focus-visible` rule; no component removes it. `outline: none` is permitted only when the rule immediately restores an equivalent ring. |
| **Logical properties only** | `inset-inline`, `margin-inline`, `padding-inline`, `border-inline`. No `left`, `right`, `margin-left`, or `translateX` in a directional context. |
| **No new dependency** | No Tailwind, no CSS-in-JS, no PostCSS plugin. Plain CSS custom properties, as today. |
| **Tests pass unchanged** | This story changes no markup semantics. If a spec breaks, the change went too far. |

---

## Frontend Tasks

### 1 — Define the 13 missing tokens

**File: `frontend-vuejs/src/assets/main.css`**

These are used by **25 files, 68 times**, and defined nowhere. Each failing declaration is dropped entirely by the browser, which is why inputs have no border and the primary button's hover clears its fill.

| Token | Uses | Value | Why |
|---|---|---|---|
| `--color-gray-300` | 25 | `#d1d5db` | Tailwind `gray-300`. Every input and table border. |
| `--color-gray-400` | 3 | `#9ca3af` | Tailwind `gray-400`. Input hover border. |
| `--color-gray-500` | 18 | `#6b7280` | Tailwind `gray-500`. Secondary/meta text. |
| `--color-gray-800` | 1 | `#1f2937` | Tailwind `gray-800`. |
| `--font-weight-medium` | 9 | `500` | Sits between the defined `semibold` and normal. |
| `--radius-full` | 2 | `9999px` | Pill radius for filter chips. |
| `--color-primary-dark` | 1 | `#1d4ed8` | Tailwind `blue-700`. Primary button hover. |
| `--color-primary-50` | 4 | `#eff6ff` | Tailwind `blue-50`. |
| `--color-primary-200` | 2 | `#bfdbfe` | Tailwind `blue-200`. |
| `--color-primary-900` | 1 | `#1e3a8a` | Tailwind `blue-900`. |
| `--color-primary-rgb` | 2 | `37, 99, 235` | Channel triplet for `rgba(var(--color-primary-rgb), 0.1)` focus rings. **Must match `--color-primary` after task 2.** |
| `--color-blue-50` | 1 | `#eff6ff` | Alias of `--color-primary-50`. |
| `--color-blue-200` | 1 | `#bfdbfe` | Alias of `--color-primary-200`. |

Define `--color-blue-50` and `--color-blue-200` as `var(--color-primary-50)` / `var(--color-primary-200)` rather than repeating the hex, and add a comment: *"Aliases kept so `TicketDetailView.vue` compiles; prefer the `--color-primary-*` names in new code."*

Add `--font-weight-medium` next to the two existing weights at lines 39–40, and `--radius-full` after `--radius-lg` at line 45.

### 2 — Fix the primary colour's contrast

**File: `frontend-vuejs/src/assets/main.css`** — line 6.

`--color-primary: #3b82f6` against `#ffffff` text is **3.68:1**. `BaseButton.vue:69–71` puts white text on it, `AppSidebar.vue:146–149` puts white text on it, and `main.css:97` uses it as the link colour on a white ground. All three fail WCAG AA for normal text.

```css
--color-primary: #2563eb;       /* blue-600 — 5.11:1 on white, AA for normal text */
--color-primary-dark: #1d4ed8;  /* blue-700 — the hover step */
--color-primary-rgb: 37, 99, 235;
```

Then delete the now-redundant `a:hover { color: #2563eb }` at `main.css:98` and point it at `var(--color-primary-dark)`.

`--color-primary-light: #dbeafe` stays — it is a background, always paired with `#1e40af` text.

### 3 — Retire `base.css`

**File: `frontend-vuejs/src/assets/base.css`** — delete the file.
**File: `frontend-vuejs/src/assets/main.css`** — delete line 1, the `@import './base.css'`.

Reasons, all verified:

- **Lines 39–51 define a dark theme nobody asked for.** For any visitor whose OS is set to dark mode, `--color-background`, `--color-background-soft`, `--color-background-mute`, `--color-border`, `--color-border-hover`, `--color-heading`, and `--color-text` all flip to dark values — while `main.css:71–79` keeps `body` on `--color-gray-50` with `--color-gray-900` text, and every `BaseCard` keeps `background-color: white`. The result is dark text on dark surfaces in whichever components read those tokens. The demo machine's OS setting decides whether the app looks broken.
- **Its `body` rule fights `main.css`.** `font-size: 15px` (line 82) versus `var(--font-size-base)` = `1rem` (line 75); `background: var(--color-background)` versus `background-color: var(--color-gray-50)`.
- **Its reset sets `font-weight: normal` on `*`**, which is why several headings need an explicit weight that should be inherited.

**Before deleting, grep for the tokens it uniquely defines** and replace each use:

```bash
grep -rn "vt-c-\|--color-background\|--color-border\|--color-heading\|--color-text\|--section-gap" frontend-vuejs/src --include=*.vue
```

Map each hit onto the `main.css` scale — `--color-background` → `white` or `--color-gray-50`, `--color-border` → `--color-gray-200`, `--color-heading` and `--color-text` → `--color-gray-900`. **If the grep returns nothing, delete outright.** Do not keep the file "just in case"; that is precisely the dead code this work item is about.

### 4 — Add the global focus style

**File: `frontend-vuejs/src/assets/main.css`**

There is no `:focus-visible` rule anywhere in the project. A keyboard user tabbing through the sidebar, a table, or a dialog sees nothing move. Add, near the accessibility block at lines 122–130:

```css
/* Keyboard focus. `:focus-visible` (not `:focus`) so a mouse click on a button
   does not leave a ring behind, while Tab always shows where you are. */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

Then audit every `outline: none` in the tree. `BaseInput.vue:81` clears the outline and replaces it with a `box-shadow` ring — that is acceptable; change its hardcoded `rgba(37, 99, 235, 0.1)` at line 83 to `rgba(var(--color-primary-rgb), 0.1)`. `TicketsView.vue:927–931` and `TicketDetailView.vue:1358–1361` do the same for selects — leave the behaviour, fix the token.

### 5 — Standardise `BaseButton`

**File: `frontend-vuejs/src/components/ui/BaseButton.vue`**

- **Add `border: 1px solid transparent;`** to `.base-button` (line 40 block). Nothing in the reset clears the user-agent button border, so every button in the application currently renders the browser's default border around the fill. A transparent 1px keeps the box model identical to `.variant-secondary`, which gets a visible one.
- **`.variant-secondary`** — add `border-color: var(--color-gray-300)` so it reads as a real secondary rather than a grey block.
- **`.variant-danger:hover`** (line 92) — replace `#991b1b` with a `--color-danger-dark: #b91c1c` token added in task 1's block.
- **`.variant-ghost`** — add `border-color: transparent` explicitly and a `--color-primary-50` hover background instead of `--color-gray-100`, so a ghost button hovers in the primary family.
- **`.disabled`** — `opacity: 0.5` on a `#2563eb` fill drops white text to roughly 2:1. Replace with explicit disabled colours: `background-color: var(--color-gray-200); color: var(--color-gray-500); border-color: var(--color-gray-300);` and keep `cursor: not-allowed`. Apply the same for all four variants by making `.disabled` win on specificity.

### 6 — Standardise `BaseBadge`

**File: `frontend-vuejs/src/components/ui/BaseBadge.vue`**

Six variants, **nine hardcoded hex values**. Move all of them into the token file as `--badge-<name>-bg` / `--badge-<name>-fg` pairs, and note the verified contrast in a comment beside each. Keep the exact colours where they already pass — `#1e40af` on `#dbeafe` and `#166534` on `#dcfce7` both do. The two to check and adjust are `#92400e` on `#fed7aa` (warning) and the `--color-danger-light` / `#991b1b` pair.

- Add `border: 1px solid transparent` and give each variant a border one step darker than its background. On a white card, a filled pastel badge with no edge reads as a smudge; the border is what makes a table of badges scan as a column.
- Add `--radius-full` as the badge radius so status pills are visually distinct from buttons, which use `--radius-md`.

`primary` and `info` are currently the **same two colours**. Either give `info` its own pair or delete the `info` variant and update the callers — do not ship two names for one appearance. `ticketBadges.ts` (Story 25) returns `'info'` for `NEW` and `ASSIGNED`, so `info` is the one that stays; **retarget `primary` to the `--color-primary-light` / `#1e40af` pair and give `info` a distinct sky pair**, then check `AppTopbar.vue:18`, which renders the role badge as `primary`.

### 7 — Standardise `BaseDialog`

**File: `frontend-vuejs/src/components/ui/BaseDialog.vue`**

- **Line 5** — delete the `@click` handler from `<transition>`. `<transition>` is renderless; the handler either does nothing or falls through to the same element the backdrop at line 7 already handles. Dead code with a live-looking name.
- **Line 74** — `background-color: white` → `var(--color-surface)`, a new token defined as `#ffffff` in task 1's block. Do the same at `BaseCard.vue:27` and `AppTopbar.vue:71`. Three files hardcode the same surface colour; one token makes the card, the topbar, and the dialog provably the same white.
- **Line 76** — the two-part `box-shadow` is a fourth, undeclared shadow level. Add `--shadow-xl` to the token file with this exact value and reference it.
- **Lines 180 and 186** — two `.dialog-content` rules inside the same `@media (max-width: 640px)` block. Merge them.
- **Line 51** — `titleId` uses `Math.random()`. `BaseInput.vue:52` uses Vue's `useId()`. Switch to `useId()` for consistency and to guarantee stability across renders.

### 8 — Fix the three RTL defects

**a. `AppSidebar.vue` lines 168–179.** The mobile drawer sets `inset-inline-start: 0` — the **right** edge in Arabic — then hides itself with `transform: translateX(-100%)`, which moves it **further into** the viewport in RTL. The Arabic mobile sidebar does not close.

```css
.sidebar.mobile {
  /* A physical translate cannot follow `inset-inline-start`. The logical
     equivalent moves the drawer out through whichever edge it is docked to. */
  transform: translateX(calc(-100% * var(--drawer-direction, 1)));
}
```

with `:root { --drawer-direction: 1 }` and `:root:dir(rtl) { --drawer-direction: -1 }` in `main.css`. If `:dir()` support is a concern, key it off the `[dir='rtl']` attribute the locale store already sets — that attribute is guaranteed present, so prefer it.

**b. `BaseDialog.vue` lines 150–156.** The dialog is inside an `[dir='rtl']` document, so the header's `display: flex` already lays out right-to-left and `justify-content: space-between` already puts the close button on the correct side. Line 151's `flex-direction: row-reverse` flips it a second time, putting the close button back beside the title, and line 155's `margin-right: auto` is a physical property inside a direction rule. **Delete lines 150–156 entirely.** Line 158's `justify-content: flex-start` on the footer is the same double-flip — delete it too; `flex-end` is already direction-aware.

**c. Audit every physical property in a `.vue` style block:**

```bash
grep -rn "margin-left\|margin-right\|padding-left\|padding-right\|border-left\|border-right\|text-align: left\|text-align: right\|left:\|right:" frontend-vuejs/src --include=*.vue
```

Convert each to its logical equivalent (`margin-inline-start`, `padding-inline-end`, `border-inline-start`, `text-align: start`, `inset-inline-start`). `TicketDetailView.vue:1331` (`border-left: 4px solid …`) is one confirmed hit — a timeline rule that lands on the wrong side in Arabic.

### 9 — Standardise tables

Fifteen files render a `<table>`; **none has a `<caption>` and none has `scope` on a `<th>`.**

Add a single shared table style to `main.css` (not a component — the markup is already consistent and wrapping it would be the abstraction the work item forbids):

```css
/* Shared table shell. Views keep their own <table> markup; this gives every
   one of the fifteen the same header, row rhythm, and alignment. */
.data-table { width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); }
.data-table thead th {
  text-align: start;
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--color-gray-50);
  border-block-end: 1px solid var(--color-gray-200);
  color: var(--color-gray-600);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}
.data-table tbody td { padding: var(--spacing-3) var(--spacing-4); border-block-end: 1px solid var(--color-gray-100); vertical-align: middle; }
.data-table tbody tr:hover { background-color: var(--color-gray-50); }
```

Apply `class="data-table"` to all fifteen tables and add `scope="col"` to every `<th>`. Remove the per-view table rules those replace — that is the point of the exercise; leaving both means the shared style loses to view-level specificity and nothing changes.

Wrap each table in a `<div class="table-scroll">` with `overflow-x: auto` so a wide table scrolls inside its column instead of widening the page. Verify at 768 px and 1024 px.

### 10 — Sweep the remaining hardcoded colours

After tasks 5–9, re-run:

```bash
grep -rnoE "#[0-9a-fA-F]{3,8}\b" frontend-vuejs/src --include=*.vue
```

**29 hits today.** Each survivor must become a token or be justified in a comment. Known clusters: `#fee` (7 uses — an error-banner background; add `--color-danger-50: #fef2f2` and use it), `#991b1b` (3 — `--color-danger-dark`), and the badge pairs from task 6.

---

## Edge Cases & Failure Modes

- **An undefined custom property does not fall back to the shorthand's initial value in a useful way.** `border: 1px solid var(--undefined)` is *invalid at computed-value time*: the whole `border` becomes `unset`, so the element inherits or resets — it does **not** render `1px solid currentColor`. This is why the input border is missing rather than merely mis-coloured, and it is why task 1 is the highest-value edit in the story.
- **Deleting `base.css` can blank a component.** Anything still reading `--color-background`, `--color-text`, `--color-border`, `--color-heading`, or `--section-gap` loses its value and the declaration is dropped. Run the grep in task 3 **before** the delete, replace every hit, then delete — not the other way round.
- **Changing `--color-primary` changes the sidebar's active state and every link.** Check `AppSidebar.vue:146–149` (white on primary) and `main.css:96–99` (primary on `--color-gray-50`) after the change. `#2563eb` on `#f9fafb` is 4.8:1 — still AA.
- **`--color-primary-rgb` must be kept in sync by hand.** CSS cannot derive channels from a hex custom property. Put the two declarations on adjacent lines with a comment saying they must match, because a mismatch produces a focus ring in the *old* blue and nobody notices.
- **A global `:focus-visible` can look wrong on a dark ground.** The sidebar is `--color-gray-900`; a `--color-primary` outline on it is 2.2:1 against the ground. Add a sidebar-scoped override using white at 80 % opacity.
- **`.data-table` will lose to existing per-view rules.** View styles are `scoped`, which adds an attribute selector and raises specificity above a bare `.data-table thead th`. Removing the superseded view rules is mandatory, not optional — if you only add the shared class, nothing visibly changes and the story appears to have done nothing.
- **`overflow-x: auto` on a table wrapper clips a dropdown rendered inside it.** `TicketsView.vue` and `UsersView.vue` render row action menus. Verify those still escape the wrapper, or move them into a `teleport` as `BaseDialog` does.
- **The `info` / `primary` badge merge touches `AppTopbar.vue:18`.** The role badge is `variant="primary"`. After retargeting, confirm it still reads as an identity chip and not as a status.
- **Removing `flex-direction: row-reverse` changes the English dialog too — verify it does not.** Those rules are inside `:global([dir='rtl'])`, so LTR is untouched. Confirm by screenshot in both languages before and after.
- **`transform` on the mobile sidebar is inside a `@media (max-width: 768px)` block.** A desktop test will not show the RTL bug. Test at 375 px width, in Arabic, with the drawer closed.
- **`useId()` in `BaseDialog` changes the rendered `id` value.** If any spec asserts on `dialog-title-…`, it breaks. Grep the specs before switching.

---

## Test Plan

1. **Add** `frontend-vuejs/src/assets/__tests__/tokens.spec.ts` (unit) — read `main.css` from disk, extract every `--name` it defines, then extract every `var(--name)` referenced across `src/**/*.vue`, and assert the second set is a subset of the first. **This is the regression guard for the entire class of bug this story fixes**, and it is why the fix does not quietly come back. Fifteen lines with `fs.readFileSync` and two regexes; no new dependency.
2. **Add** to the same file — assert `--color-primary-rgb` parses to the same three channels as `--color-primary`. Guards the hand-sync hazard.
3. **Add** `frontend-vuejs/src/components/ui/__tests__/BaseButton.spec.ts` cases (the file exists) — each of the four variants renders its variant class, and `disabled` renders both the attribute and the class.
4. **Extend** `frontend-vuejs/src/components/ui/__tests__/BaseBadge.spec.ts` (added in Story 24) — assert `primary` and `info` render **different** classes, so the merge in task 6 cannot be undone silently.
5. **Add** a table test to `frontend-vuejs/src/views/__tests__/TicketsView.spec.ts` — every `<th>` in the rendered table has a `scope` attribute. One assertion, and it generalises: repeat it in `UsersView.spec.ts` and `CustomersView.spec.ts`.
6. **Run unchanged and expect green:** every existing frontend spec. **This story changes no markup semantics** — a broken spec means a task went further than its brief.

---

## Verification Steps

1. **No undefined token remains:** run the tokens spec from Test Plan item 1 — it must pass. Equivalently, by hand: the `comm -23` of used-versus-defined tokens is empty (13 entries today).
2. **`base.css` is gone:** `ls frontend-vuejs/src/assets/base.css` fails, and `grep -rn "base.css\|vt-c-" frontend-vuejs/src/` returns nothing.
3. **Focus is visible:** `grep -rn "focus-visible" frontend-vuejs/src/assets/main.css` returns the rule. Then, in the browser, Tab from the top of `/tickets` through the sidebar, the search box, the filter chips, the table links, and the create button — **every stop shows a ring**.
4. **Contrast:** check `--color-primary` on white, `--color-primary` under white text, and each of the six badge pairs with a contrast checker. Record the numbers in the commit message.
5. **Hardcoded colours:** `grep -rhoE "#[0-9a-fA-F]{3,8}\b" frontend-vuejs/src --include=*.vue | wc -l` is at or near **0** (29 today); any survivor carries a comment.
6. **Physical properties:** the grep in task 8c returns only hits inside `rgba()` or a non-directional context.
7. **Frontend runs:** `npm run dev` in `frontend-vuejs/`. Walk **every** route — login, dashboard, customers, customer detail, tickets, ticket detail, reports, kb, kb article, portal, portal new, portal detail, roles, users, admin, admin/sla, audit. On each: inputs have a visible border, primary buttons darken on hover instead of clearing, badges are legible, tables share one header treatment.
8. **Dark-mode check:** set the OS to dark mode and reload. **Nothing may change.** This is the specific regression task 3 exists to prevent.
9. **RTL check:** switch to Arabic and repeat step 7. Then narrow to 375 px and confirm the sidebar drawer **closes**, and open a dialog and confirm the close button sits on the correct side.
10. **Responsive check:** 1440 px, 1024 px, and 768 px. No horizontal page scrollbar on any route; wide tables scroll within their own container.
11. **Frontend typechecks, tests, lints, builds:** `npm run type-check`, `npx vitest run`, `npm run lint`, `npm run build`.
12. **Backend regression:** `npm test` in `backend-nodejs/`. This story touches no backend file, so **every backend test must pass unchanged**.

---

## Done Criteria

- [ ] Every `var(--token)` used in a component resolves; a test enforces it.
- [ ] `--color-primary` is `#2563eb` and meets 4.5:1 with white text; `--color-primary-rgb` matches it.
- [ ] `src/assets/base.css` is deleted and no token it defined is referenced anywhere.
- [ ] Switching the OS to dark mode changes nothing in the application.
- [ ] A global `:focus-visible` rule exists and every interactive element on `/tickets` shows a ring under Tab.
- [ ] Every input has a visible border; every primary button darkens on hover.
- [ ] `BaseButton` sets an explicit border and a real disabled treatment rather than `opacity: 0.5`.
- [ ] `BaseBadge` draws every colour from tokens, `primary` and `info` are visually distinct, and each pair's contrast is recorded.
- [ ] `BaseCard`, `BaseDialog`, and `AppTopbar` share one `--color-surface` token.
- [ ] The dead `@click` on `<transition>` is gone and the duplicate `.dialog-content` rule is merged.
- [ ] All fifteen tables use `.data-table`, every `<th>` has `scope="col"`, and the superseded view-level table rules are deleted.
- [ ] The Arabic mobile sidebar closes; the Arabic dialog's close button is on the correct side; no physical directional property remains in a `.vue` style block.
- [ ] No horizontal page scrollbar at 1440, 1024, or 768 px.
- [ ] Every frontend and backend test passes **without being edited**, and both projects build.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 27.**
