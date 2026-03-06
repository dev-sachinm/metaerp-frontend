# Frontend testing plan (2026 AI-era)

A practical, AI-friendly testing strategy for the METAERP frontend (Vite + React + GraphQL).

---

## 1. Recommended stack

| Layer        | Tool                    | Why |
|-------------|--------------------------|-----|
| **Unit + integration** | [Vitest](https://vitest.dev/) | Same config as Vite, fast, ESM-native, coverage built-in. |
| **Component / DOM**    | [React Testing Library](https://testing-library.com/react) (RTL) | Query by role/text, avoids implementation details. |
| **Mocks**             | Vitest `vi.fn()` / `vi.mock()` + [MSW](https://mswjs.io/) (optional) | Mock GraphQL/API at network level when needed. |

**Add to the project:**

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Vitest config can live in `vite.config.ts` (test block) or `vitest.config.ts` reusing Vite’s `resolve.alias`.

---

## 2. How much coverage to aim for

- **Do not** target 100% line coverage. It’s expensive and often tests trivial code.
- **Do** target **meaningful** coverage on high-value, high-risk code.

Suggested **minimums** (enforced in CI):

| Area | Target | Rationale |
|------|--------|-----------|
| **`src/lib/`** (e.g. `graphqlErrors`, `permissions`, `utils`) | **≥ 85%** | Pure logic, easy to test, few dependencies. |
| **`src/hooks/`** (permissions, debounce, auth) | **≥ 70%** | Business rules; mock `useQuery`/store. |
| **`src/graphql/client.ts`** (error handling, 403, refresh) | **≥ 75%** | Critical path for all API calls. |
| **`src/stores/`** (auth, modules) | **≥ 60%** | State logic; avoid testing Zustand internals. |
| **`src/components/`** (guards, FieldGuard, OperationNotPermitted) | **≥ 50%** | Focus on permission and error UI. |
| **`src/pages/`** | **≥ 40%** | Smoke + critical flows (login, list load, permission denied). |
| **Whole project** | **≥ 60%** | Overall floor; above areas can be higher. |

- **Exclude from coverage:** `main.tsx`, route configs, `**/*.stories.*`, generated GraphQL types if any.
- **Raise** targets over time for new code; **don’t** block merges on a single file’s drop.

---

## 3. What to test first (priority order)

1. **Pure logic and error handling**
   - `lib/graphqlErrors.ts` — `isPermissionError`, `getErrorMessage` (various error shapes).
   - `lib/permissions.ts` — `mergeByRoleToEntities`, `getRoleNamesFromByRole`.
   - `lib/utils.ts` — any `cn`/formatting used in many places.

2. **Auth and API client**
   - `graphql/client.ts` — 401 → refresh, 403 → toast + rethrow, module-not-enabled, other errors.
   - Mock `graphql-request` and assert toasts / thrown errors.

3. **Permission and field visibility**
   - `hooks/usePermissions.ts` — `canShowColumn`, `useAccessibleFields` (with mock store).
   - `FieldGuard`, `OperationNotPermitted` — render when permission on/off.

4. **Critical user flows (integration-style with RTL)**
   - Login: submit invalid → error message; valid → redirect/navigation.
   - List with permission denied → “Operation not permitted” (or equivalent) visible.
   - List with empty data → “No records found” (or equivalent).

5. **Hooks that drive UI**
   - `useDebounce` — delay and value updates.
   - Permission hooks with mocked `useAuthStore` / `usePermissions`.

6. **Pages and heavy components**
   - Prefer **one or two key flows per major route** over testing every button.
   - Use AI-generated tests for repetitive list/detail pages, then trim to what’s stable.

---

## 4. Making the most of AI agents in testing

### 4.1 What AI is good at

- **Generating unit tests** for pure functions and small hooks (given a short spec or the function).
- **Writing RTL tests** for a component when you describe behavior (“when user has no permission, show OperationNotPermitted”).
- **Proposing edge cases** (e.g. “test when `error.response` is undefined”).
- **Keeping tests in sync** after refactors (e.g. rename a prop and ask to update tests).

### 4.2 How to prompt for tests

- **Be specific about scope:** “Write Vitest + RTL tests for `src/lib/graphqlErrors.ts`: cover `isPermissionError` for 403, FORBIDDEN code, and message patterns; cover `getErrorMessage` for permission vs other errors.”
- **Specify stack:** “Use Vitest and React Testing Library; mock `useAuthStore` with `vi.mock('@/stores/authStore')`.”
- **Ask for one concern per test:** “One test: when backend returns 403, `isPermissionError` returns true.”
- **Ask for a short comment per test** so future you (or AI) knows intent.

### 4.3 What to avoid with AI

- Don’t ask for “100% coverage” of a file without defining which branches matter.
- Don’t accept tests that assert implementation details (e.g. state variable names, internal functions).
- Don’t let AI add flaky timeouts; prefer `waitFor` and user events where possible.
- Do **review and run** AI-generated tests; delete or fix brittle ones.

### 4.4 Maintenance with AI

- After changing error handling: “Update tests in `graphqlErrors.test.ts` to match the new 403 handling.”
- After adding a field to Customer: “Add a test that CreateCustomer submit payload includes primaryContactEmail when the user has write permission.”
- Use AI to suggest **which files need tests** when you add a feature (“I added X; which existing tests or new test files should cover it?”).

---

## 5. Test layout and conventions

- **Colocate or mirror:** Either `src/lib/graphqlErrors.test.ts` next to the file, or `src/__tests__/lib/graphqlErrors.test.ts`; pick one and stick to it.
- **Naming:** `*.test.ts` / `*.test.tsx` (Vitest default).
- **Descriptive names:** `it('returns true when response.status is 403')` rather than `it('works')`.
- **Arrange–Act–Assert:** One logical assertion per test when possible; multiple assertions for one behavior are fine.
- **Mocks:** Prefer `vi.mock('@/stores/authStore')` and `vi.mocked(useAuthStore.getState).mockReturnValue({ ... })` over mocking every import.

Suggested structure:

```
src/
  lib/
    graphqlErrors.ts
    graphqlErrors.test.ts
  hooks/
    usePermissions.ts
    usePermissions.test.ts
  __tests__/
    setup.ts          # RTL cleanup, global mocks
    helpers/
      renderWithRouter.tsx
      mockAuth.ts
```

---

## 6. CI and gates

- **On every PR:** `npm run test` and `npm run test:coverage`.
- **Fail the build if:** coverage for the **project** (or per-directory thresholds) falls below the minimums in §2.
- **Optional:** only fail on coverage **regression** (e.g. “coverage on main was 62%; this PR is 58%” → fail).
- Store coverage artifact (e.g. `coverage/`) and optionally report to a dashboard (Codecov, Sonar, etc.) for visibility, not as the single source of truth for “good” tests.

---

## 7. Quick reference: coverage and scripts

**Example `vitest.config.ts` (or inside `vite.config.ts`):**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts', 'src/**/__tests__/**', '**/*.stories.*'],
      thresholds: {
        global: { statements: 60, branches: 50, functions: 55, lines: 60 },
        'src/lib/**': { statements: 85, lines: 85 },
        'src/hooks/usePermissions.ts': { statements: 70, lines: 70 },
        'src/graphql/client.ts': { statements: 75, lines: 75 },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

**`package.json` scripts:**

```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

---

## 8. Summary

| Question | Answer |
|----------|--------|
| **How much coverage?** | Aim for **60%+** globally; **70–85%** on lib, hooks, graphql client; **40%+** on pages. |
| **How to use AI?** | Use it to **generate** and **update** tests; you **define** what to test and **review** output. |
| **What to test first?** | `graphqlErrors`, `permissions`, `client.ts`, then permission hooks and guards, then critical flows. |
| **What else?** | Enforce coverage in CI, exclude noise (main, stories), prefer behavior over implementation, and treat tests as maintainable specs that AI can help extend and fix. |

This plan keeps the bar realistic, focuses on business and reliability impact, and uses AI as a force multiplier instead of a substitute for clear testing goals.

---

## 9. What’s in the repo already

- **`vitest.config.ts`** — Vitest + coverage config; coverage thresholds are commented out so `test:coverage` doesn’t fail until you add more tests. Uncomment and adjust when ready.
- **`src/__tests__/setup.ts`** — RTL cleanup and `@testing-library/jest-dom`; used by all tests.
- **Example tests:** `src/lib/graphqlErrors.test.ts`, `src/lib/permissions.test.ts` — Use these as templates for other lib/hook tests.

**Commands:** `npm run test` (watch), `npm run test:run`, `npm run test:coverage`.
