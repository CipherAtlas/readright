# Frontend Visual And Interaction Pass

Date: 2026-06-24

## Scope

- Local app: `http://localhost:8787`
- Flow: claim entry, top bar, side navigation, filters, view toggles, map navigation, focus mode, evidence drawer, local history empty state, responsive breakpoints.
- Evidence folder: `/Users/sabar/Documents/health/audit/frontend-visual-pass`

## Captured Screens

- `01-desktop-overview.png`: baseline desktop-ish state before fixes.
- `02-tablet-before.png`: baseline tablet state before fixes.
- `03-mobile-before.png`: baseline mobile state before fixes.
- `11-desktop-final-readable.png`: final 1280px desktop state.
- `12-tablet-final-readable.png`: final 1024px tablet state.
- `10-mobile-final-readable.png`: final 390px mobile state.

## Issues Found And Fixed

1. Many labeled buttons were inert.
   - Search now focuses/selects the claim input.
   - Share copies the local link text and shows feedback.
   - Side navigation changes the relevant view/filter/history/help state.
   - Challenge, Pin, Focus toolbar, rationale close, and evidence drawer tabs now perform visible actions.

2. Filters and view options looked interactive but did not affect the graph.
   - Scope chips now toggle selected state and are passed through the review payload.
   - `For`, `Against`, `Evidence`, `Assumptions`, and `Unresolved` change the displayed map state.
   - `Show counts` hides/shows count labels in the graph.
   - `Group similar` changes branch/reason display density.
   - `Evidence drawer` opens/closes the evidence drawer view.

3. Evidence drawer tabs were decorative.
   - `Evidence`, `Assumptions`, and `Notes` now switch drawer content.
   - Source rows still expand inline.

4. Panel collapse had ambiguous accessible names.
   - Claim-panel hide is now unique.
   - Side rail controls use `Toggle claim panel`.
   - Collapse/reopen path was verified.

5. Mobile layout showed only a narrow off-screen slice of the desktop graph.
   - Mobile now stacks the claim panel above a readable map list.
   - Desktop/tablet keep the React Flow canvas.
   - Desktop-only zoom controls are hidden on mobile where the card list is active.

## Verification

- `npm run build` passes.
- `/api/health` returns healthy with `mhcif-0.3-codex`.
- Desktop click sweep passed:
  - Search focus
  - Share feedback
  - Article/Claim tab switching
  - Sidebar Evidence opens drawer
  - Drawer Assumptions content
  - Drawer hide
  - Show counts toggle
  - Against filter
  - Claim panel hide/reopen
- Mobile click sweep passed:
  - Branch card opens branch view
  - Reason card opens evidence drawer

## Limits

- `Build map` was not triggered during the visual pass because it can launch a long Codex/OpenAI review run.
- Full WCAG compliance was not certified; checks were limited to visible layout, accessible-name uniqueness for touched controls, focus behavior, and interaction state changes.
