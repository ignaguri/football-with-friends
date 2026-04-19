# Accessibility & Automation Identifiers

This document defines how we annotate interactive UI elements so that:

1. Screen readers and keyboard users can use the app.
2. Chrome DevTools MCP (`take_snapshot`) and agent-browser automation can reliably identify and click elements.

These two goals are aligned: a well-labelled, semantically correct UI is also an easily automatable one.

## Priority: accessibility first, `testID` as fallback

Chrome DevTools MCP and similar agents snapshot the **accessibility tree**, not the raw DOM. An element only appears as a clickable node when it has a semantic **role** and an **accessible name**. `testID` (mapped by React Native Web to `data-testid`) is useful only as a disambiguator for repeated or ambiguous elements — it is NOT what automation primarily uses.

The right ordering when making an element identifiable:

1. **Semantic role** — use Tamagui's `<Button>` (renders a real `<button>` on web) or set `accessibilityRole="button"` on a `Pressable`.
2. **Accessible name** — visible text content, or `accessibilityLabel` for icon-only / ambiguous elements.
3. **`testID`** — only for repeated list items, generic containers acting as targets, or elements whose name is dynamic/translated.

## Platform mapping

React Native Web performs these translations automatically — props flow through without any extra wrapper code. Tamagui v2 forwards web-standard ARIA equivalents.

| React Native prop         | Web output                  |
| ------------------------- | --------------------------- |
| `testID="x"`              | `data-testid="x"`           |
| `accessibilityLabel="x"`  | `aria-label="x"`            |
| `accessibilityRole="x"`   | `role="x"`                  |
| `accessibilityHint="x"`   | `aria-describedby` / hint   |
| `accessibilityState={...}`| `aria-disabled`, `aria-selected`, etc. |

The shared `Button` wrapper (`packages/ui/src/components/Button.tsx`) spreads `...props` to Tamagui's `Button`, so these props flow through at all call sites without modification.

## Rules

### 1. Icon-only buttons MUST have `accessibilityLabel`

Labels come from the i18n `a11y` namespace (see below). Applies to any interactive element whose visible content is only an icon.

```tsx
// Bad
<Button onPress={handleAdd}>
  <Plus size={28} />
</Button>

// Good
<Button
  onPress={handleAdd}
  accessibilityLabel={t("a11y.addMatch")}
  testID="matches-fab-add"
>
  <Plus size={28} />
</Button>
```

### 2. `Pressable` used as a button MUST have `accessibilityRole="button"`

React Native's `Pressable` renders as a `<div>` with no role on web by default. It will not appear in the a11y tree — agents cannot see it. Tamagui's `<Button>` does not have this problem, but we often use `Pressable` directly for custom-styled cards.

```tsx
// Bad — invisible to agents and screen readers
<Pressable onPress={() => router.push(`/matches/${match.id}`)}>
  <YStack>...</YStack>
</Pressable>

// Good
<Pressable
  onPress={() => router.push(`/matches/${match.id}`)}
  accessibilityRole="button"
  accessibilityLabel={t("a11y.openMatch", { date, location })}
  testID={`matches-card-${match.id}`}
>
  <YStack>...</YStack>
</Pressable>
```

### 3. Add `testID` only when semantics are insufficient

Don't blanket-add `testID`. Use it when:

- An element is repeated (list rows, grid items, reaction buttons).
- The element's accessible name is translated and unstable across locales.
- A generic container (`View`, `YStack`) is the interactive target and there is no single text child for agents to match on.

Otherwise rely on role + accessible name.

### 4. `testID` naming convention

Kebab-case, hierarchical: `{screen}-{element}[-{dynamic-id}][-{action}]`.

| Use case                | Pattern                              | Example                          |
| ----------------------- | ------------------------------------ | -------------------------------- |
| Simple button           | `{screen}-{element}-btn`             | `match-detail-join-btn`          |
| Floating action button  | `{screen}-fab-{purpose}`             | `matches-fab-add`                |
| Repeated card / row     | `{screen}-{type}-{id}`               | `matches-card-42`, `social-user-row-abc123` |
| Row sub-action          | `{screen}-{type}-{id}-{action}`      | `admin-match-row-42-edit`        |
| Form field              | `{screen}-{form}-{field}`            | `auth-signin-email`              |
| Tab / segmented control | `{screen}-tab-{value}`               | `matches-tab-upcoming`           |

Stable IDs (database IDs) are preferred over array indices.

### 5. i18n for accessibility labels

Screen-reader-only strings live in a dedicated `a11y` namespace under `locales/en/common.json` and `locales/es/common.json`. This keeps translator focus separate from visible UI copy and makes it obvious what's for assistive tech.

```json
{
  "a11y": {
    "addMatch": "Add match",
    "openMatch": "Open match on {{date}} at {{location}}",
    "editMatch": "Edit match",
    "deleteMatch": "Delete match",
    "joinMatch": "Join match",
    "leaveMatch": "Leave match"
  }
}
```

## Lint guardrail

`eslint-plugin-jsx-a11y` is enabled (warn level) for `apps/mobile-web/**/*.tsx`. Key rules it catches:

- `jsx-a11y/no-static-element-interactions` — a `div`/`View` with `onClick` but no role.
- `jsx-a11y/click-events-have-key-events` — missing keyboard equivalents.
- `jsx-a11y/no-noninteractive-element-to-interactive-role` — improper role overrides.

Warnings, not errors: the goal is visibility in code review, not blocking unrelated work. React Native-only props (`accessibilityLabel`, `accessibilityRole`) aren't fully covered by jsx-a11y — those are checked in review.

## Verification

Before merging a PR that touches a screen:

1. **Static**: `pnpm lint` and `pnpm typecheck` pass.
2. **Runtime**: start the app (`pnpm dev:app`), open it in a web browser (what Chrome DevTools MCP sees).
3. **Snapshot check** with Chrome DevTools MCP:
   - `navigate_page` to the screen's URL.
   - `take_snapshot` and confirm every interactive element appears with a `role` and an accessible name.
   - For added `testID`s, confirm they reach the DOM as `data-testid` (inspect via `evaluate_script` if needed).
4. **Click-by-name**: try clicking a primary CTA by its accessible name alone. If the agent can, so can screen readers.

## Rollout scope

The audit is phased as separate PRs:

- Tier 1 — match list + match detail (highest traffic)
- Tier 2 — admin flows
- Tier 3 — social & multimedia
- Tier 4 — auth flows
- Tier 5 — `eslint-plugin-jsx-a11y` wired in

Each tier ships independently and is reversible. No visible UI changes in any of them — only added props.
