# Canvas Functionality Audit

Date: 2026-06-25

## Comparator Patterns

- Miro emphasizes fast shape insertion, connectors, icons, colors, layers, and diagramming-focused toolbars.
- Lucidchart emphasizes drag/drop flowchart symbols, connector styling, comments/chat, and a blank-canvas workflow.
- FigJam makes sticky notes, shapes, and connectors primary toolbar actions.
- draw.io centers the experience on a canvas with movable/resizable shapes, connectors, labels, style controls, and export.

Sources:
- https://miro.com/flowchart/
- https://www.lucidchart.com/pages/examples/flowchart_software
- https://help.figma.com/hc/en-us/articles/1500004414322-Sticky-notes-in-FigJam
- https://www.drawio.com/docs/manual/
- https://help.miro.com/hc/en-us/articles/4403634496402-Miro-for-mapping-diagramming

## Findings

- The prior canvas toolbar read like a generic drawing toolbar. It did not foreground the claim-review workflow: support proof, counter-proof, sources, questions, comments, and highlights.
- The inspector used internal element terms and a generic body label. It also lacked explicit accessible names for the editable fields.
- Automatic React Flow fitting re-framed the canvas after adding objects, which made new cards land under the toolbar or outside the visible work area.
- The desktop toolbar was too wide for the center canvas while the right guide was open, covering proof cards.
- The mobile layout needed the same semantic research tools, not only diagramming controls.

## Changes Made

- Added semantic research card types: support proof, counter-proof, source, question, comment, and highlight.
- Split canvas controls into Research cards and Diagram tools.
- Added contextual defaults and inspector labels for each card type.
- Added explicit accessible names to inspector title/body fields.
- Removed automatic React Flow fit behavior during manual canvas editing.
- Added visible-lane placement so new canvas elements appear in a usable lane instead of under the toolbar.
- Narrowed the desktop canvas toolbar to avoid covering proof cards.
- Kept Save, Undo, Redo, Delete, Connect, local versions, and Restore available in the canvas workflow.

## Verification

- `npm run build` passes.
- Desktop QA: added proof/source/comment cards, edited fields, connected support to counter-proof, undid/redid the arrow, saved canvas, and verified 9 manual nodes with 2 manual arrows.
- Desktop final visual check: no proof card overlaps the narrowed toolbar.
- Mobile QA: verified compact controls include Save, Support proof, Counter-proof, Source, Question, Comment, Highlight, Box, Text, Sticky note, Decision, Circle, Undo, Redo, and local versions. Desktop toolbar is hidden on mobile.
- Browser console errors: none in the final desktop and mobile passes.

## Later Simplification Pass

- The permanent nav rail and right map-guide rail were removed from the default workspace.
- The desktop canvas controls now live behind `Add`, `Tools`, and `History` menus.
- The current shape labels are intentionally non-technical: `Box`, `Text`, `Sticky note`, `Decision`, and `Circle`.
- Added no-overlap placement and drag correction. See `docs/app-progress-for-agents.md` and `design-qa.md` for the latest handoff state.

## Evidence

- `audit/canvas-functionality-audit/07-desktop-narrow-toolbar-final.png`
- `audit/canvas-functionality-audit/08-mobile-research-canvas.png`
