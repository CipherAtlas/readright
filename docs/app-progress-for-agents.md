# App Progress For Agents

Last updated: 2026-06-25

This file is the handoff note for agents working on the local ReadRight app. It summarizes the product direction and implementation state from the recent design, functionality, and canvas passes.

Branding: the company name and product name are both `ReadRight`. Use `ReadRight` in app chrome, exports, docs, and user-facing status text when naming the product.

## Product Direction

The app is local-first. The default experience should feel like a simple research canvas for a non-technical user:

1. Enter or paste a claim.
2. Set pre-search filters before review generation.
3. Build an evidence map.
4. Review proof for and proof against the claim.
5. Add personal research notes, sources, comments, highlights, and diagram shapes directly on the canvas.
6. Save the canvas and restore earlier local versions when needed.

Avoid visual clutter. Advanced actions should stay behind clear menus. Do not reintroduce permanent side rails, permanent guide panels, oversized tool palettes, or always-visible advanced controls unless the user explicitly asks for them.

## Framework State

The active review framework is `rrif-0.3`.

Source of truth:

- Human guide: `docs/rrif-framework-guide.md`
- Machine runner protocol: `docs/rrif-review-protocol.md`
- Calibration examples: `docs/rrif-calibration-examples.md`
- Schema: `server/evidence-topic.schema.json`
- Frontend types: `src/types/evidence.ts`

Current review criteria include:

- claim specificity
- population fit
- intervention fit
- outcome fit
- comparator fit
- effect meaning
- durability
- evidence gaps
- safety and harms
- mechanism overreach
- commercial pressure
- citation fidelity
- balance and uncertainty
- practical usefulness

Structured claim output includes `direction`, `evidenceCertainty`, `overstatementRisk`, `evidenceGap`, `effectMagnitude`, `durability`, `safetySignals`, `citationFidelitySignals`, population/intervention/outcome/comparator match fields, reasoning, framework signals, reviewer note, and source ids.

## Review Runners

The server supports two review engines:

- `openai_api`: calls the OpenAI Responses API with web search and strict JSON output.
- `codex_cli`: shells out to local `codex exec` using the same RRIF protocol and schema.
- `auto`: uses OpenAI API when `OPENAI_API_KEY` is present, otherwise Codex CLI.

The review prompt must honor pre-search filters before source discovery:

- topic area, default `General research`
- evidence types, default `Research studies`; the frontend supports multi-select checkboxes and sends `evidenceTypes`
- publication window, default `Last 10 years`

The frontend sends these as `preSearchFilters`. The server also accepts the older `evidenceType` string and `scopes` array and maps them into the same filter object for compatibility.

## Local Storage

Reviews and canvases are file-backed JSON. A local database was considered, but JSON is still the current implementation because the data shape is small and inspectable.

Topic review history:

- Each completed review is saved as an independent JSON file in `data/topics`.
- Files are named from the topic id plus generation timestamp.
- `GET /api/topics` lists saved reviews for the History UI.
- `GET /api/topics/:filename` reloads a saved evaluation.

Canvas state:

- Current canvas files live in `data/canvases/<canvas-id>.json`.
- Every save appends a snapshot to `data/canvases/<canvas-id>.versions.json`.
- `GET /api/canvas/:id` loads the current canvas.
- `GET /api/canvas/:id/versions` loads local version history.
- `POST /api/canvas` saves the current canvas and creates the next version snapshot.

The demo canvas file `data/canvases/demo-workspace.json` is intentionally clean after the last UI pass: `nodes: []`, `arrows: []`. Do not commit QA-created canvas nodes into the demo state unless the task explicitly asks for seeded examples.

## Current Frontend State

Primary file: `src/App.tsx`.

The simplified UI currently has:

- Top bar: `Search`, `Save`, `Export`, `New review`. Export opens a format menu for PDF/print, Word `.docx`, Excel `.xlsx`, CSV, and JSON.
- Left claim panel: claim/article tabs, claim text area, scrollable panel body, open `Search filters`, expanded topic area list, collapsed-by-default multi-select evidence type control, collapsed `Saved reviews`, collapsed `View settings`, and primary `Build map`.
- Main canvas: React Flow workspace on desktop/tablet. The default overview is intentionally a simple claim board with `For the claim` and `Against the claim` lanes, no connector lines, and no visible React Flow handles. Branch view uses a clearer column layout with reasons, selected branch, claim, and objections spaced apart with arrowheads on graph edges. Focus mode has been removed; view navigation is now Overview/Branch, with Evidence opened as a drawer/view state.
- Branch expansion: clicking a for/against branch opens an inline branch panel inside the canvas by default. The panel can be moved around the canvas by dragging its header. The separate Branch view is still available only through the explicit `Separate view` action or the view switch.
- Canvas context menu: right-clicking canvas elements opens a compact menu. Manual elements support edit, duplicate, copy text, connect from this, and delete. Research/argument elements support open here, separate branch when applicable, copy text, and connect from this.
- Floating canvas menu: `Add`, `Tools`, `History`.
- Collapsed claim panel recovery: hiding the left claim panel shows a `Claim panel` restore button over the canvas.
- Mobile: claim panel first, then a readable stacked map and collapsed canvas controls.

Advanced canvas actions are intentionally hidden behind menus:

- `Add`: support proof, counter-proof, source, question, comment, highlight.
- `Tools`: move, connect, box, text, sticky note, decision, circle, undo, redo, delete, save canvas.
- `History`: local canvas versions and restore actions.

Student-friendly exports are generated in-browser without extra dependencies:

- PDF uses a print-ready report window so the user can choose Save as PDF.
- DOCX and XLSX use minimal Office Open XML zip packages generated client-side.
- CSV provides a simple spreadsheet import path.
- JSON remains the full app-data backup.

Current naming is intentionally non-technical. Prefer `Box`, `Sticky note`, and `Circle` over internal labels like `Process` or `Connector`.

## Canvas Behavior

The canvas is meant to be a proper research workspace, not just a static evidence graph.

Manual element types:

- support proof
- counter-proof
- source
- question
- comment
- highlight
- box
- text
- sticky note
- decision
- circle

Supported actions:

- add manual elements
- select and move elements. Dragging a manual canvas element moves that element; dragging empty canvas space pans the whole canvas.
- edit title/body/color
- connect elements with arrows
- undo and redo unsaved canvas edits
- delete selected manual elements and attached manual arrows
- save canvas
- restore local versions

Important constraint: canvas elements must not overlap.

Current implementation:

- New manual elements use `findOpenCanvasScreenPoint` to scan the visible rendered canvas and choose open space.
- Placement accounts for current React Flow zoom and occupied DOM rectangles.
- Manual React Flow nodes are explicitly kept visible via CSS because React Flow can leave newly added custom nodes with inline `visibility: hidden` even after they have a real size and position.
- Drag release uses a deferred rendered-rectangle collision check after React Flow finishes positioning the node.
- If a dragged manual element collides with any rendered graph node or manual node, it snaps to the next open space and shows `Moved to the next open space to avoid overlap.`
- The temporary collision state is not recorded as a separate undo step.

When touching canvas layout, test overlap visually and by measuring rendered `.react-flow__node` rectangles. Data coordinates alone are not enough.

## Verification Evidence

Build:

- `npm run build` passed after the simplified UI and no-overlap changes.

Simplified UI pass:

- `audit/simplified-ui-pass/04-final-desktop-default.png`
- `audit/simplified-ui-pass/05-final-mobile.png`
- `audit/simplified-ui-pass/06-final-desktop-add-menu.png`
- `audit/simplified-ui-pass/07-source-vs-implementation.png`

Canvas functionality:

- `audit/canvas-functionality-audit/07-desktop-narrow-toolbar-final.png`
- `audit/canvas-functionality-audit/08-mobile-research-canvas.png`

No-overlap pass:

- `audit/canvas-overlap-pass/10-after-eleven-added-fixed.png`
- `audit/canvas-overlap-pass/11-after-drag-overlap-guard-fixed.png`

Recorded QA:

- `design-qa.md`
- `audit/frontend-visual-pass/audit-notes.md`
- `audit/canvas-feature-pass/audit-notes.md`
- `audit/canvas-functionality-audit/audit-notes.md`

## Known Limits

- `Build map` was not triggered during visual QA because it can launch a long review run.
- Full WCAG compliance has not been certified.
- The generated design reference had richer evidence-card copy than the current demo data. The shipped app keeps the existing real data shape.
- The app is still a local prototype. It does not include auth, sync, collaboration, or a multi-user database.

## Agent Rules For Future Work

- Preserve the local-first JSON workflow unless the task clearly needs a database.
- Keep review artifacts as independent JSON files in `data/topics`.
- Keep canvas saves versioned locally.
- Do not store full article bodies.
- Do not bypass paywalls, logins, CAPTCHAs, or publisher restrictions.
- Keep the UI calm and menu-driven.
- Do not expose every canvas control at once.
- Do not let boxes/cards/nodes overlap, including after drag.
- Re-run `npm run build` after code changes.
- For visual work, capture desktop and mobile screenshots and update `design-qa.md` or the relevant audit note.
