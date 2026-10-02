# Cockpit Layout Refinement Implementation Plan (v0.3.9)

- **Spec**: `docs/superpowers/specs/2026-10-02-cockpit-layout-refinement-design.md`
- **Goal**: Resolve live production layout imbalances on ipw.cc: uncouple top overview to full width, enrich right aside with live top-speed leaderboard and health widget, adjust card responsive breakpoints, and balance node detail workbench.

## Tasks

- [ ] **Task 1: Top Overview Uncoupling & Full-Width Deck**
  - Extract `overview-heading`, `Summary`, and `streamlined-browser` out of `.cockpit-layout` in `src/App.tsx`.
  - Wrap only `#node-results` and `<aside className="cockpit-aside">` inside `.cockpit-layout`.
  - Update `src/styles/home.css` so summary cards span 100% width on wide screens.
  - Verify `npm run test` and `npm run lint`.

- [ ] **Task 2: Right Aside Widgets (Traffic Leaderboard & Health Pulse)**
  - Create `src/components/CockpitWidgets.tsx` with `CockpitLiveLeaderboard` (Top 5 instantaneous throughput) and `CockpitStatusCard`.
  - Add i18n translation keys in `src/lib/en.ts`.
  - Wire widgets into `.cockpit-aside` in `src/App.tsx` below `MapPanel`.
  - Add unit test coverage or assertions in `src/lib/design.test.ts`.
  - Verify `npm run test && npm run lint`.

- [ ] **Task 3: Card Density Breakpoints & Detail Workbench Harmonization**
  - In `src/styles/home.css`, tune `.node-grid` inside `.cockpit-main`: single-column for 1024px-1365px, dual-column for >=1366px.
  - In `src/styles/detail.css` and `src/components/NodeDetail.tsx`, compact the sidebar facts into clean 2-column key-value tokens to reduce vertical disparity.
  - Verify `npm run test && npm run lint`.

- [ ] **Task 4: Cross-Device Verification, Visual Regression & Packaging**
  - Run Playwright test script (`scratch/verify-cockpit-refinement.cjs`) against desktop (1440x900), laptop (1280x800), and mobile (390x844).
  - Verify 0px horizontal overflow and right-aside visual density.
  - Run `npm run test && npm run lint && npm run package`.
  - Bump version to `0.3.9` and prepare package.
