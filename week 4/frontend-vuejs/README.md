# AZM CRM Frontend

Vue 3 + TypeScript + Vite frontend for the AZM Customer Support CRM. See the [root README](../README.md) for setup, architecture overview, and troubleshooting.

---

## Component Conventions

### UI Primitives

Components in `src/components/ui/` are **reusable and display-string-free**:

```vue
<!-- ✓ Good: all text via props/slots -->
<BaseButton variant="primary" size="md">
  {{ t('action.save') }}
</BaseButton>

<!-- ✗ Bad: hard-coded string -->
<BaseButton>Save</BaseButton>
```

Props and slots carry all user-visible text. Display strings come from `t('key')` calls that resolve to `src/i18n/locales/en.json` and `ar.json`.

### Layout Components

Components in `src/components/layout/` (e.g., `AppLayout`, `AppSidebar`) manage structure and app chrome. They compose UI primitives.

### View Components

Components in `src/views/` are page-level and route-bound. They fetch data and compose layout + content.

---

## CSS & Logical Properties

Use **logical properties only** — never `left`/`right`, `margin-left`, `padding-right`, etc.

```css
/* ✓ Correct: works in RTL and LTR */
.sidebar {
  padding-inline-start: 1rem;     /* left in LTR, right in RTL */
  border-inline-end: 1px solid;   /* right border in LTR, left in RTL */
  inset-inline-start: 0;          /* left: 0 in LTR, right: 0 in RTL */
}

/* ✗ Wrong: breaks in RTL */
.sidebar {
  padding-left: 1rem;
  border-right: 1px solid;
  left: 0;
}
```

This single rule is why the app mirrors correctly when `dir="rtl"` is applied to `<html>`.

---

## Translation Setup

Every UI string lives in `src/i18n/locales/`:

- **English:** `en.json` — the source of truth
- **Arabic:** `ar.json` — must have **identical keys** with Arabic values

### Adding a New Translation Key

1. Add to both `en.json` and `ar.json`:
   ```json
   {
     "action": {
       "save": "Save",
       "delete": "Delete"
     }
   }
   ```
   ```json
   {
     "action": {
       "save": "حفظ",
       "delete": "حذف"
     }
   }
   ```

2. Use in components:
   ```vue
   <BaseButton>{{ t('action.save') }}</BaseButton>
   ```

3. Run tests to verify parity:
   ```bash
   npm test
   ```
   The `locale-parity.spec.ts` test will fail if keys don't match between files.

### Bilingual Backend Fields

When the backend returns `nameEn` and `nameAr` fields, use the `useLocalizedName` composable:

```ts
import { useLocalizedName } from '@/composables/useLocalizedName';

export default {
  setup() {
    const getName = useLocalizedName();
    return { getName };
  }
}
```

```vue
<p>{{ getName(branch) }}</p>
<!-- Returns branch.nameAr in Arabic, branch.nameEn in English -->
```

---

## Stores

Pinia stores use the **setup store pattern** and live in `src/stores/`:

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMyStore = defineStore('myStore', () => {
  const count = ref(0);
  
  function increment() {
    count.value++;
  }

  return { count, increment };
});
```

---

## Testing

```bash
npm test              # Run tests once
npm run test:watch   # Watch mode
npm run test:coverage  # Coverage report
```

Co-locate tests: `src/components/ui/__tests__/BaseButton.spec.ts`.

---

## Key Paths

- Translations: `src/i18n/locales/` (en.json, ar.json)
- UI primitives: `src/components/ui/`
- Layout: `src/components/layout/`
- Pages: `src/views/`
- Stores: `src/stores/`
- Router: `src/router/index.ts`
- API: `src/api/client.ts`
- Composables: `src/composables/`

---

See the [root README](../README.md) for more.
