# Cockpit Layout Refinement Design Specification (v0.3.9)

## 1. Problem Statement & Live Findings on ipw.cc
After rolling out the initial dual-column cockpit layout (v0.3.8) to the live production site `https://ipw.cc`, practical inspection revealed several significant visual and ergonomic shortcomings:
1. **Severe Right-Column Asymmetry & White/Black Space Void**:
   - The right `.cockpit-aside` column only held a 240px-high map widget, while the left `.cockpit-main` column spanned >2800px with 16 node cards.
   - Once scrolled, the right 35% of the viewport became an empty black void.
2. **Top Overview & Summary Cramped**:
   - The primary heading (`overview-heading`), the 4-card metric summary (`Summary`), and the system quick filters were forced into the 65% left column, ruining their horizontal impact and creating a strange top-heavy asymmetry.
3. **Card Grid Density Squeeze**:
   - Forcing 2-column cards inside a ~900px left container resulted in cards ~430px wide, cramping 4 gauge bars, traffic numbers, and matrix chips.
4. **Node Detail Workbench Imbalance**:
   - The left sidebar was ~808px tall with long specs, while the right charts were ~539px tall ("tall left, stubby right").

## 2. Refined Architectural Layout

### A. Full-Width Top Deck (100% Width on >=1024px)
- `overview-heading`: Stretches full width with server title, live radio badge, and last updated timestamp.
- `Summary`: Restores full-width 4/5-card grid displaying online ratio, total today's traffic, and load alerts.
- `node-browser`: Quick system filter pills (Linux, Windows, etc.) stretch across the top deck.

### B. Lower Deck Cockpit Split (Cockpit Lower Split)
- Only the node results area and the NOC operations HUD participate in the 2-column split on `>=1024px`:
  - **Left Work Area (65%~70%)**: Search toolbar, density toggles, group filter, and node cards/table.
  - **Right NOC Aside (30%~35%, Sticky at top: 76px)**:
    1. **World Map HUD (`MapPanel`)**: 240px compact radar view with region click-to-filter.
    2. **Live Traffic Leaderboard (`CockpitLiveLeaderboard`)**: Top 5 active nodes sorted by instantaneous network rate (Rx/Tx), with country flags, node names, and throughput badges. Clicking jumps directly to that node.
    3. **System Status & Alert Pulse (`CockpitStatusCard`)**: Live health summary pill (all clear vs warning count).

### C. Adaptive Grid Breakpoints for Left Cards
- `1024px - 1365px`: Left main column renders cards in a generous 1-column layout (~620px-800px), allowing metrics to breathe.
- `>=1366px`: Left main column enables 2-column cards when width > 950px.
- `<1024px` & `data-cockpit="false"`: Full single-column waterfall fallback without layout regressions.

### D. Node Detail Workbench Visual Harmonization
- Left sidebar specs grouped compactly into 2-column key-value pills.
- Right telemetry container height and timeline aligned smoothly to eliminate the "tall left, stubby right" gap.

## 3. Testing & Verification Gates
1. Unit tests pass (18 test suites).
2. `oxlint` passes with 0 warnings/errors.
3. Playwright headless verification across 1440x900 (Desktop), 1280x800 (Laptop), and 390x844 (Mobile) asserting 0px overflow and balanced column heights.
4. Package generation of `theme.tar.gz` and sha256 checksum.
