# Cockpit Console Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the desktop experience of `monitor-theme-hex` into a high-density, dual-column Cockpit Console (NOC-style Home with map-card linkage, and Workbench-style Node Detail) with responsive fallback to classic single-column mode on mobile and toggleable user preference.

**Architecture:** Use pure CSS Grid/Flexbox progressive enhancement driven by `[data-cockpit="true"]` and `@media (min-width: 1024px)` with zero third-party UI overhead. In Home, place node matrix in 65% left main area and sticky Map HUD + telemetry stats in 35% right console with click-to-filter. In Node Detail, place host identity card and specs in 30% sticky left column and multi-metric charts in 70% right area.

**Tech Stack:** React 19, TypeScript, CSS Grid/Flexbox, Recharts, Lucide-React, Vite, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-01-cockpit-console-layout-design.md`

## Global Constraints

- Pure CSS layouts only, no heavy layout or window manager libraries.
- Respect `prefers-reduced-motion` and `prefers-reduced-transparency`.
- Responsive breakpoint at 1024px: `>=1024px` activates dual-column cockpit; `<1024px` automatically falls back to existing mobile-optimized single column.
- All existing 18 test suites must pass (`npm run test`).
- `oxlint` must pass with 0 errors and 0 warnings (`npm run lint`).
- Complete backward compatibility with existing preferences and themes.

---

### Task 1: Cockpit Preferences, Token Integration & i18n

**Files:**
- Modify: `src/lib/appearance.ts:40-110`
- Modify: `src/lib/appearance.test.ts:1-70`
- Modify: `src/lib/en.ts:740-770`
- Modify: `src/components/Preferences.tsx:140-170`
- Modify: `theme.json:20-40`

**Interfaces:**
- Consumes: Existing `Preferences` interface and `defaults` from `src/lib/appearance.ts`.
- Produces: `cockpitMode: boolean` field in `Preferences`, exported `defaults.cockpitMode = true`, and updated `data-cockpit` attribute on root.

- [ ] **Step 1: Write failing tests in `src/lib/appearance.test.ts`**

Add assertion for `cockpitMode`:
```typescript
assert.equal(defaults.cockpitMode, true)
const migrated = normalizePreferences({ cockpitMode: false })
assert.equal(migrated.cockpitMode, false)
const fallback = normalizePreferences({})
assert.equal(fallback.cockpitMode, true)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node src/lib/appearance.test.ts`
Expected: FAIL with undefined `cockpitMode`

- [ ] **Step 3: Implement minimal code in `src/lib/appearance.ts`**

Add `cockpitMode: boolean` to `Preferences`, `defaults`, `validatePreferences`, and `normalizePreferences`.

- [ ] **Step 4: Update `src/lib/en.ts`, `theme.json`, and `src/components/Preferences.tsx`**

1. In `src/lib/en.ts`:
```typescript
"前台驾驶舱模式": "Cockpit Console",
"大屏下启用双栏中控台": "Enable dual-column cockpit console on wide screens",
```
2. In `src/components/Preferences.tsx`: Add toggle switch for `cockpitMode` under "外观与布局".
3. In `theme.json`: Add config entry for `"cockpitMode"`.

- [ ] **Step 5: Run tests and lint**

Run: `node src/lib/appearance.test.ts && node scripts/check-i18n.mjs && npm run test && npm run lint`
Expected: PASS with 0 errors and 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/lib/appearance.ts src/lib/appearance.test.ts src/lib/en.ts src/components/Preferences.tsx theme.json
git commit -m "feat(preferences): add cockpit mode preference and i18n support"
```

---

### Task 2: Home Page Cockpit Layout & Map-to-List Linkage

**Files:**
- Modify: `src/App.tsx:280-370`
- Modify: `src/styles/home.css:50-130`
- Modify: `src/components/MapPanel.tsx:20-60`

**Interfaces:**
- Consumes: `desktopPreferences.cockpitMode` from `useDesktopPreferences()`.
- Produces: `.cockpit-layout`, `.cockpit-main`, and `.cockpit-aside` DOM containers and click-to-filter region linkage between Map and Node list.

- [ ] **Step 1: Inspect and prepare DOM structure in `src/App.tsx`**

Wrap Home page desktop elements inside `.cockpit-layout`:
- Left column `.cockpit-main`: Summary bar, Search/Filters, NodeCard/NodeTable list.
- Right column `.cockpit-aside`: MapPanel HUD, live flow metrics, and load alert cards.
- Add `data-cockpit={desktopPreferences.cockpitMode}` to root container.

- [ ] **Step 2: Implement responsive cockpit CSS in `src/styles/home.css`**

```css
@media (min-width: 1024px) {
  [data-cockpit="true"] .cockpit-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 20px;
    align-items: start;
    width: 100%;
    max-width: 1680px;
    margin: 0 auto;
    padding: 0 16px;
  }
  @media (min-width: 1440px) {
    [data-cockpit="true"] .cockpit-layout {
      grid-template-columns: minmax(0, 1fr) 420px;
      gap: 24px;
    }
  }
  [data-cockpit="true"] .cockpit-aside {
    position: sticky;
    top: 76px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: calc(100vh - 92px);
    overflow-y: auto;
    scrollbar-width: thin;
  }
}
```

- [ ] **Step 3: Connect Map region click to Node filtering**

In `src/components/MapPanel.tsx`, pass an `onSelectRegion?: (region: string) => void` prop. When a region marker is clicked on the map in desktop cockpit mode, trigger node list filtering or quick search focusing for that region.

- [ ] **Step 4: Verify test suite and lint**

Run: `npm run test && npm run lint`
Expected: PASS with 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/styles/home.css src/components/MapPanel.tsx
git commit -m "feat(home): implement dual-column cockpit layout and map-to-list linkage"
```

---

### Task 3: Node Detail Dual-Column Workbench (Desktop Cockpit)

**Files:**
- Modify: `src/components/NodeDetail.tsx:320-430`
- Modify: `src/styles/detail.css:20-120`

**Interfaces:**
- Consumes: `desktopPreferences.cockpitMode` from preferences.
- Produces: Dual-column workbench `.detail-cockpit`, `.detail-cockpit-sidebar`, and `.detail-cockpit-main` for wide screens with sticky host specs card.

- [ ] **Step 1: Structure `.detail-cockpit` in `src/components/NodeDetail.tsx`**

Reorganize detail components into:
- `.detail-cockpit-sidebar`: Host name & status badge, `DetailOverview` (real-time gauges: CPU/RAM/Disk/Net), and `DetailFacts` (OS, CPU model, Arch, IPs, Uptime, Expiry).
- `.detail-cockpit-main`: History controls, Ping latency charts (`HistoryState`), and resource historical trends (`ResourceHistory`).

- [ ] **Step 2: Implement dual-column workbench CSS in `src/styles/detail.css`**

```css
@media (min-width: 1024px) {
  [data-cockpit="true"] .detail-cockpit {
    display: grid;
    grid-template-columns: minmax(320px, 32%) minmax(0, 68%);
    gap: 24px;
    align-items: start;
    width: 100%;
    max-width: 1680px;
    margin: 0 auto;
  }
  @media (min-width: 1440px) {
    [data-cockpit="true"] .detail-cockpit {
      grid-template-columns: minmax(340px, 30%) minmax(0, 70%);
      gap: 28px;
    }
  }
  [data-cockpit="true"] .detail-cockpit-sidebar {
    position: sticky;
    top: 76px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: calc(100vh - 92px);
    overflow-y: auto;
    scrollbar-width: thin;
  }
  [data-cockpit="true"] .detail-cockpit-main {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }
}
```

- [ ] **Step 3: Ensure Recharts ResponsiveContainer auto-resizes properly**

Verify that all charts in `.detail-cockpit-main` resize smoothly on viewport resizing without layout jumps.

- [ ] **Step 4: Verify test suite and lint**

Run: `npm run test && npm run lint`
Expected: PASS with 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/NodeDetail.tsx src/styles/detail.css
git commit -m "feat(detail): implement dual-column console workbench for wide screens"
```

---

### Task 4: Cross-Device Verification, Visual Regression & Packaging

**Files:**
- Create: `scratch/verify-cockpit.cjs`
- Modify: `docs/superpowers/plans/2026-10-01-cockpit-console-layout.md`

**Interfaces:**
- Consumes: Fully integrated Home & Node Detail cockpit layouts.
- Produces: Clean multi-device Playwright screenshots, verified package archive, and finalized plan.

- [ ] **Step 1: Write Playwright visual inspection script**

Capture:
1. Desktop 1440x900 Dark Mode Home (verify 65%/35% dual column, map sticky on right, 0px horizontal overflow).
2. Desktop 1440x900 Dark Mode Detail (verify 30%/70% dual column, host card sticky on left, 0px horizontal overflow).
3. Desktop 1440x900 Light Mode Home & Detail.
4. Mobile 390x844 Dark Mode Home & Detail (verify smooth single-column fallback).

- [ ] **Step 2: Run verification script**

Run: `node scratch/verify-cockpit.cjs`
Expected: 5/5 viewports PASS with 0px horizontal overflow.

- [ ] **Step 3: Run full quality gates**

Run: `npm run test && npm run lint && npm run package`
Expected: 18/18 test suites pass, 0 oxlint warnings, `theme.tar.gz` built cleanly.

- [ ] **Step 4: Commit and finalize**

```bash
git add docs/superpowers/plans/2026-10-01-cockpit-console-layout.md
git commit -m "docs: finalize cockpit console layout implementation"
```
