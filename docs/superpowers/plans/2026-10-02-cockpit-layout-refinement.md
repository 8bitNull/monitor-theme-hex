# Cockpit Layout Refinement Implementation Plan (v0.3.9)

- **Spec**: `docs/superpowers/specs/2026-10-02-cockpit-layout-refinement-design.md`
- **Goal**: Resolve live production layout imbalances on ipw.cc: uncouple top overview to full width, enrich right aside with live top-speed leaderboard and health widget, adjust card responsive breakpoints, and balance node detail workbench.

### Task 1: Top Overview Uncoupling & Full-Width Deck

**Files:**
- Modify: `src/App.tsx:310-345`
- Modify: `src/styles/home.css:80-140`

**Interfaces:**
- Produces: Top-level full-width deck for `overview-heading`, `Summary`, and `streamlined-browser`. Lower `.cockpit-layout` only wraps `#node-results` and `<aside className="cockpit-aside">`.

- [ ] **Step 1: Uncouple top overview in `src/App.tsx`**
Extract `overview-heading`, `Summary`, and `streamlined-browser` out of `.cockpit-layout`. Place them directly under `<main>` before `.cockpit-layout`.

- [ ] **Step 2: Update `src/styles/home.css`**
Ensure summary cards and header span 100% width on wide screens (`max-width: 1680px; margin: 0 auto;`). Ensure `<1024px` single-column fallback remains clean.

- [ ] **Step 3: Run test suite & lint**
`npm run test && npm run lint`

- [ ] **Step 4: Commit**
`git commit -m "feat(home): uncouple top overview to full width deck"`

### Task 2: Right Aside Widgets (Traffic Leaderboard & Health Pulse)

**Files:**
- Create: `src/components/CockpitWidgets.tsx`
- Modify: `src/lib/en.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles/home.css`

**Interfaces:**
- Produces: `CockpitLiveLeaderboard` component (Top 5 fastest nodes by instant traffic rate) and `CockpitStatusCard` component.

- [ ] **Step 1: Create `src/components/CockpitWidgets.tsx`**
Implement `CockpitLiveLeaderboard` and `CockpitStatusCard` with glassmorphic cards and click-to-filter / click-to-jump.

- [ ] **Step 2: Add i18n keys in `src/lib/en.ts`**
Add translations for leaderboard and status widget.

- [ ] **Step 3: Wire into `.cockpit-aside` in `src/App.tsx`**
Place leaderboard and status card beneath `MapPanel`.

- [ ] **Step 4: Run test suite & lint**
`npm run test && npm run lint`

- [ ] **Step 5: Commit**
`git commit -m "feat(cockpit): add live traffic leaderboard and health status aside widgets"`

### Task 3: Card Density Breakpoints & Detail Workbench Harmonization

**Files:**
- Modify: `src/styles/home.css`
- Modify: `src/styles/detail.css`
- Modify: `src/components/NodeDetail.tsx`

**Interfaces:**
- Produces: 1-column card density for `1024px-1365px`, 2-column for `>=1366px`; compact 2-column facts in detail workbench.

- [ ] **Step 1: Adjust home card breakpoints in `src/styles/home.css`**
Set 1-column for 1024px-1365px and 2-column for >=1366px in `.cockpit-layout`.

- [ ] **Step 2: Balance detail workbench in `src/styles/detail.css` & `src/components/NodeDetail.tsx`**
Compact sidebar facts into 2-column key-value pills to eliminate vertical disparity.

- [ ] **Step 3: Run test suite & lint**
`npm run test && npm run lint`

- [ ] **Step 4: Commit**
`git commit -m "feat(layout): tune card breakpoints and balance detail workbench"`

### Task 4: Cross-Device Verification, Visual Regression & Packaging

**Files:**
- Create: `scratch/verify-cockpit-refinement.cjs`
- Modify: `package.json`, `theme.json`, `CHANGELOG.md`

**Interfaces:**
- Produces: Verified 0px horizontal overflow across all screens, `theme.tar.gz` and sha256 checksum for v0.3.9.

- [ ] **Step 1: Run Playwright cross-device test**
`node scratch/verify-cockpit-refinement.cjs`

- [ ] **Step 2: Bump version and package**
Bump to `0.3.9`, run `npm run package`.

- [ ] **Step 3: Commit**
`git commit -m "docs: release v0.3.9 with refined cockpit layout"`
