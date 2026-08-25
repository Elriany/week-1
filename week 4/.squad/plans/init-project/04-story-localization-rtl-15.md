# Story 04 — Arabic/English localization and RTL/LTR layout support (Story: 15)

## Prerequisites

- **Story 03 completed:** the app shell, UI primitives, router, and Pinia store exist. Two of its Done Criteria are hard gates for this story:
  - all layout CSS uses **logical properties** (its verification step 9 returns no matches), and
  - no `components/ui/` file contains a hard-coded display string.
  If either is untrue, fix it **before** starting here — otherwise this story turns into a stylesheet rewrite.
- **Story 02 completed** is recommended: the seeded `NameEn`/`NameAr` column pairs are what section 6 renders.
- `AppTopbar.vue` still has the reserved right-hand slot from Story 03 section 6.

---

## Story Goal

Make the application fully bilingual and direction-aware:

1. Arabic and English translation catalogues, with English as the fallback.
2. A language switcher that changes locale **without a page reload** and persists the choice.
3. Automatic `dir="rtl"` / `dir="ltr"` and `lang` switching on the document root.
4. Layout, typography, and iconography that mirror correctly in RTL.
5. Locale-aware date and number formatting.
6. A documented convention for rendering the backend's bilingual `*En`/`*Ar` columns.

**Not in scope:** translating business screens that do not yet exist; server-side localization of API error messages (noted as a follow-up in section 7); component tests (Story 05).

---

## Context — Read These Files First

1. `.squad/stories/init-project/15/intake.md` — this story covers implementation tasks **15–16**. The acceptance criteria requires "Arabic/English and RTL/LTR readiness".
2. [`03-story-frontend-foundation-15.md`](03-story-frontend-foundation-15.md) — section 5 defines the UI primitives and the logical-properties rule; section 6 defines the shell and the reserved topbar slot. Re-read both.
3. [`02-story-database-foundation-15.md`](02-story-database-foundation-15.md) — section 5's column conventions establish the `*En` / `*Ar` pairs, and section 6 seeds real Arabic reference data (`TicketStatuses`, `TicketPriorities`). That seeded data is this story's test fixture.
4. **Files you will edit, all created in Story 03** — read each before changing it:
   - `frontend-vuejs/src/main.ts` — where the i18n plugin is registered.
   - `frontend-vuejs/src/router/index.ts` — the `meta.titleKey` fields and the `afterEach` hook that sets `document.title`.
   - `frontend-vuejs/src/components/layout/AppTopbar.vue` — the reserved slot.
   - `frontend-vuejs/src/components/layout/AppSidebar.vue` — the typed nav array with `titleKey`.
   - `frontend-vuejs/src/assets/styles/main.css` — the `--font-family-base` token.
5. **Precedent:** the previous implementation had **no** localization — `git ls-tree -r --name-only f0776b4 -- "week 4/frontend-vuejs/src"` shows no `locales/` or i18n module. This story is genuinely new ground; there is no prior pattern to match.

---

## Product rules (from story)

| Concern | Current behaviour (after Story 03) | Required behaviour (this story) |
|---|---|---|
| Display strings | English literals at call sites | Every string resolved through `t('key')` |
| Document direction | Always LTR | `dir` follows the active locale |
| Default locale | English only | English default; Arabic selectable and persisted |
| Dates / numbers | Raw or `toString()` | Formatted per active locale |
| Backend bilingual fields | Not rendered | Resolved by active locale with an English fallback |

---

## Implementation tasks

### 1 — Install and configure vue-i18n

From `frontend-vuejs/`, install `vue-i18n` (11.x — verified 11.4.9 at time of writing).

**Create file: `frontend-vuejs/src/i18n/index.ts`**

```ts
import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import ar from './locales/ar.json';

export const SUPPORTED_LOCALES = ['en', 'ar'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_CONFIG: Record<AppLocale, { name: string; dir: 'ltr' | 'rtl'; font: string }> = {
  en: { name: 'English', dir: 'ltr', font: "'Inter', system-ui, sans-serif" },
  ar: { name: 'العربية', dir: 'rtl', font: "'Cairo', 'Tajawal', system-ui, sans-serif" },
};

export const i18n = createI18n({
  legacy: false,              // REQUIRED for the Composition API and <script setup>
  globalInjection: true,      // exposes $t in templates
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ar },
});
```

**`legacy: false` is mandatory.** With the default (`true`), `useI18n()` throws inside `<script setup>` and every Composition-API example fails in a way that looks like a bad import.

**File: `frontend-vuejs/src/main.ts`** — register with `app.use(i18n)` **before** `app.use(router)`, so a router guard can resolve translations.

---

### 2 — Translation catalogues

**Create files: `frontend-vuejs/src/i18n/locales/en.json` and `ar.json`**

Both must be saved as **UTF-8 without BOM**. A BOM makes `JSON.parse` fail with an unhelpful position-0 error.

Use nested namespaces mirroring the app's structure, so keys stay findable as the CRM grows:

```jsonc
{
  "common":  { "save": "Save", "cancel": "Cancel", "loading": "Loading…", "retry": "Retry" },
  "nav":     { "dashboard": "Dashboard", "about": "About" },
  "app":     { "title": "AZM Customer Support CRM" },
  "errors":  { "unreachable": "Cannot reach the server", "notFound": "Page not found" },
  "ticket":  { "status": { "NEW": "New", "OPEN": "Open", "PENDING": "Pending", "RESOLVED": "Resolved", "CLOSED": "Closed" } }
}
```

`ar.json` must have **exactly** the same key structure with Arabic values ("حفظ", "إلغاء", "لوحة التحكم", "نظام إدارة دعم العملاء"…).

**Conventions:**
- Keys are `camelCase`, dot-namespaced; values are never reused across namespaces just because the English happens to match — Arabic frequently diverges where English does not.
- Use vue-i18n **pluralization** (`"item": "no items | one item | {count} items"`) for any count-bearing string. Arabic has six plural forms against English's two; vue-i18n handles this, but only if you use the plural syntax from the start rather than string concatenation.
- **Never** build a sentence by concatenating translated fragments — word order differs between the languages. Use named interpolation: `t('greeting', { name })`.

Replace every hard-coded string introduced in Story 03 — in `AppSidebar.vue` (via its `titleKey` array), `AppTopbar.vue`, the three views, and `EmptyState.vue` call sites — with `t()` lookups.

---

### 3 — Locale store, persistence, and direction switching

**Create file: `frontend-vuejs/src/stores/locale.store.ts`** — a Pinia setup store (keep it separate from `app.store.ts`):

```ts
export const useLocaleStore = defineStore('locale', () => {
  const current = ref<AppLocale>('en');

  function apply(locale: AppLocale) {
    current.value = locale;
    i18n.global.locale.value = locale;                 // .value — because legacy: false
    const { dir, font } = LOCALE_CONFIG[locale];
    document.documentElement.setAttribute('lang', locale);
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.style.setProperty('--font-family-base', font);
    localStorage.setItem('azm-crm-locale', locale);
  }

  function initialize() {
    const saved = localStorage.getItem('azm-crm-locale');
    const detected = navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
    apply(SUPPORTED_LOCALES.includes(saved as AppLocale) ? (saved as AppLocale) : detected);
  }

  return { current, apply, initialize };
});
```

- With `legacy: false`, the locale is a **ref** — assigning `i18n.global.locale = 'ar'` (without `.value`) silently does nothing. This is the single most common vue-i18n mistake.
- **Validate the persisted value** against `SUPPORTED_LOCALES` before applying it; `localStorage` is user-writable and a stale or hand-edited value would otherwise put the app in an undefined locale.
- Call `initialize()` in `main.ts` **after** Pinia is installed but **before** `app.mount()`, so the first paint is already in the correct direction — otherwise Arabic users see a visible LTR-to-RTL flash.

**Set the initial `dir` and `lang` in `index.html`** on the `<html>` element too, so the pre-hydration markup is not mis-directed.

---

### 4 — Language switcher

**Create file: `frontend-vuejs/src/components/common/LanguageSwitcher.vue`**

A `BaseButton`-based toggle (two locales do not warrant a dropdown) placed in the `AppTopbar.vue` slot reserved by Story 03. It shows the **target** language in that language's own script — "العربية" while in English, "English" while in Arabic — which is the convention users expect, since someone who cannot read the current UI language still recognizes their own.

Requirements: an `aria-label` from the translation catalogue; keyboard operable as a real `<button>`; switching must **not** reload the page or lose the current route.

---

### 5 — RTL layout, typography, and mirroring

Because Story 03 mandated logical properties, most layout mirrors for free once `dir="rtl"` is set. Handle what remains:

**File: `frontend-vuejs/src/assets/styles/main.css`**

- **Fonts.** Latin faces render Arabic poorly, and Arabic requires more vertical space for its diacritics and descenders. `--font-family-base` is swapped by the locale store; add an Arabic-appropriate stack (Cairo or Tajawal, with a system fallback) and give `[dir="rtl"] body` a slightly larger `line-height` (≈1.7 against 1.5).
- **Directional icons must mirror.** Chevrons, arrows, and back buttons point the wrong way in RTL. Add:
  ```css
  [dir="rtl"] .icon-directional { transform: scaleX(-1); }
  ```
  Apply `.icon-directional` to navigational icons only. **Do not** mirror logos, media-playback controls, or checkmarks — they are direction-neutral and look broken when flipped.
- **Numerals stay Western.** Do not switch to Eastern Arabic-Indic digits (٠١٢٣) — Saudi/Gulf business software conventionally uses Western digits, and ticket numbers must stay comparable across locales. This is a deliberate decision; record it in a comment.
- **Do not mirror the shadow direction** or otherwise chase per-property RTL fixes; if something does not mirror, the cause is almost always a surviving physical property in Story 03's CSS.

**Verify no physical properties crept back in** — re-run the Story 03 grep from verification step 9.

---

### 6 — Locale-aware formatting and backend bilingual fields

**Create file: `frontend-vuejs/src/composables/useFormat.ts`**

Wrap `Intl.DateTimeFormat` and `Intl.NumberFormat`, keyed on the active locale, and return **computed** formatters so they re-evaluate when the locale changes. Use the `en-US` and `ar-SA` BCP-47 tags.

> **`ar-SA` selects the Umm al-Qura (Hijri) calendar by default in `Intl`.** A ticket dated `2026-08-25` renders as a Hijri date, which is correct for some Saudi contexts and confusing in others. Decide deliberately and pass `{ calendar: 'gregory' }` if Gregorian dates are wanted. **Do not leave this to the default** — record the decision in a comment.

**Create file: `frontend-vuejs/src/composables/useLocalizedName.ts`**

The single convention for rendering the backend's bilingual columns:

```ts
export function useLocalizedName() {
  const { locale } = useI18n();
  // Falls back to the English value when the Arabic column is null or empty.
  return (entity: { nameEn?: string | null; nameAr?: string | null }) =>
    (locale.value === 'ar' ? entity.nameAr : entity.nameEn) || entity.nameEn || '';
}
```

Every screen that renders a `*En`/`*Ar` pair uses this helper — **never** an inline ternary. Reference data seeded in Story 02 already has both columns populated; customer-entered data often will not, which is exactly why the fallback chain matters.

Render one seeded entity (a ticket status from Story 02) in `DashboardView.vue` to prove the end-to-end path: SQL Server `nvarchar` → API JSON → Vue render, in both locales.

---

### 7 — Follow-up noted, not implemented

Backend API error messages from Story 01 are English-only. Localizing them requires an `Accept-Language` header and a server-side catalogue. **Out of scope here.** Add a comment in `src/api/client.ts` recording the follow-up, and have the UI display error messages by **`error.code`** looked up in the `errors` namespace where a translation exists, falling back to the server's English `message`. That keeps the client translatable without a backend change.

---

## Edge Cases & Failure Modes

- **`legacy: false` omitted** — `useI18n()` throws inside `<script setup>` with a message that reads like a missing plugin. Enforced in `src/i18n/index.ts`.
- **Assigning `i18n.global.locale` without `.value`** — silently does nothing; the UI stays English while the store reports Arabic. Enforced in `locale.store.ts`.
- **Missing key in `ar.json`** — vue-i18n falls back to English and logs a warning, so a partial catalogue produces a *mixed-language* screen rather than a crash. Caught by the parity test in the Test Plan, not by the build.
- **Corrupt or hand-edited `localStorage` value** — validated against `SUPPORTED_LOCALES` before use.
- **`localStorage` unavailable** — throws in Safari private mode and under some enterprise policies. Wrap reads and writes in `try/catch`; the app must still run with an unpersisted locale.
- **Direction flash on first paint** — visible if `dir` is set after mount. Prevented by calling `initialize()` before `app.mount()` and by seeding `dir` in `index.html`.
- **String concatenation across translations** — produces grammatically wrong Arabic because word order differs. Always use named interpolation.
- **Arabic plural forms** — Arabic has six categories; a hand-rolled `count === 1 ? … : …` is wrong in both languages. Use vue-i18n's plural syntax.
- **BOM in a locale JSON file** — `JSON.parse` fails at position 0. Save as UTF-8 **without** BOM.
- **Mixed Arabic and Latin in one line** — the Unicode bidi algorithm can reorder trailing punctuation unexpectedly (e.g. a ticket number inside an Arabic sentence). Wrap the Latin run in `<bdi>` or apply `unicode-bidi: isolate`.
- **`ar-SA` Hijri default** — see the warning in section 6; the wrong calendar is a data-correctness bug, not a cosmetic one.
- **Icons mirrored indiscriminately** — flipping logos and checkmarks looks broken. Only `.icon-directional` elements mirror.
- **Text input direction** — a field for an English email inside an RTL form should be `dir="ltr"`, or the cursor and placeholder sit on the wrong side. Set `dir` per input where the expected content is Latin.

---

## Test Plan

Tests are written in **Story 05**; record them here as this story's required coverage:

1. `src/i18n/__tests__/locale-parity.spec.ts` — **the most valuable test in this story.** Recursively flatten `en.json` and `ar.json` and assert the key sets are identical. Fails the build when a translator adds an English key without its Arabic counterpart, which is otherwise invisible until a user sees a mixed-language screen.
2. `src/i18n/__tests__/catalogue.spec.ts` — no value in `ar.json` is empty, and no `ar.json` value is byte-identical to its `en.json` counterpart (catches untranslated placeholders). Allow a short whitelist for genuinely identical strings such as "CRM".
3. `src/stores/__tests__/locale.store.spec.ts` — `apply('ar')` sets `documentElement` `dir` to `rtl` and `lang` to `ar`, and writes to `localStorage`; `initialize()` rejects an invalid persisted value and falls back to the detected locale.
4. `src/components/common/__tests__/LanguageSwitcher.spec.ts` — renders the target language label; clicking calls `apply` with the other locale (mount with the i18n plugin and a fresh Pinia).
5. `src/composables/__tests__/useLocalizedName.spec.ts` — returns `nameAr` in Arabic; falls back to `nameEn` when `nameAr` is `null` or `''`; returns `''` when both are absent.
6. `src/composables/__tests__/useFormat.spec.ts` — asserts the chosen calendar for `ar-SA`, pinning the section 6 decision so a future change is deliberate.

---

## Verification Steps

Run from `frontend-vuejs/`.

1. **Frontend typechecks:** `npm run type-check` exits `0`.
2. **Frontend builds:** `npm run build` exits `0`; both locale JSON files are bundled.
3. **Frontend runs:** `npm run dev`; the app loads in English with `<html lang="en" dir="ltr">`.
4. **Switching works:** click the switcher — the UI becomes Arabic, `<html>` flips to `lang="ar" dir="rtl"`, and **the current route is preserved**.
5. **Layout mirrors:** in Arabic the sidebar is on the right, text is right-aligned, and directional icons point the other way. Logos and checkmarks are **not** mirrored.
6. **Persistence:** reload the page — Arabic persists, with **no** LTR flash before paint.
7. **Responsive RTL:** at 375px width the mobile drawer slides in from the **right** in Arabic and from the left in English.
8. **No physical CSS:** re-run the Story 03 grep — `grep -rnE "(margin|padding|border)-(left|right)|[^-]\b(left|right):" src/` returns no layout matches.
9. **No stray literals:** `grep -rnE ">[A-Za-z]{3,}[ <]" src/components src/views` surfaces no untranslated user-visible text.
10. **Bilingual data:** with the Story 02 backend running, the dashboard renders a seeded ticket status as "New" in English and "جديد" in Arabic — confirming `nvarchar` storage through to render.
11. **Fallback:** temporarily remove a key from `ar.json`; the UI shows the English string and logs a warning rather than an empty label. Restore it.
12. **Formatting:** dates and numbers change format with the locale, using the calendar decided in section 6.
13. **Regression:** every Story 03 check still passes in English — routing, the 404 view, responsive behaviour, and the "backend unreachable" message.

---

## Done Criteria

- [ ] `vue-i18n` is configured with `legacy: false`, `globalInjection: true`, and English as `fallbackLocale`.
- [ ] `en.json` and `ar.json` exist as UTF-8 **without BOM**, with identical key structures.
- [ ] No user-visible hard-coded string remains in `src/components/` or `src/views/`.
- [ ] `locale.store.ts` applies locale, `lang`, `dir`, and the font token, and persists to `localStorage` behind `try/catch`.
- [ ] The persisted locale is validated against `SUPPORTED_LOCALES` before use.
- [ ] `initialize()` runs before `app.mount()`, and `index.html` seeds `lang`/`dir` — no direction flash.
- [ ] The language switcher sits in the `AppTopbar.vue` slot, shows the target language in its own script, and preserves the current route.
- [ ] RTL mirrors correctly at both breakpoints; only `.icon-directional` icons flip.
- [ ] An Arabic-appropriate font stack and a larger RTL `line-height` are applied.
- [ ] `useFormat.ts` formats dates and numbers per locale, with the `ar-SA` calendar choice made explicitly and commented.
- [ ] `useLocalizedName.ts` is the single convention for `*En`/`*Ar` fields, with a fallback chain.
- [ ] A seeded Story 02 entity renders correctly in both locales.
- [ ] The backend error-localization follow-up is recorded as a comment in `src/api/client.ts`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 05.**
