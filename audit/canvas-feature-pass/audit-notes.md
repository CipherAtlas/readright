# Canvas Feature Visual and Functional Pass

Date: 2026-06-25

## Screenshots

- `01-before-graph.png`: baseline graph before manual canvas tooling.
- `02-after-toolbar-empty.png`: first toolbar placement pass.
- `03-after-toolbar-positioned.png`: toolbar moved below the map tabs.
- `04-after-elements-restored.png`: desktop restored state with saved manual elements and arrow.
- `05-mobile-canvas.png`: mobile top-of-page responsive check.
- `06-mobile-canvas-tools.png`: mobile canvas tools and saved element list area.
- `08-version-control-toolbar.png`: desktop undo/redo and local version list after two saved versions.

## Verified

- Desktop toolbar exposes Move, Connect, Box, Text, Sticky note, Decision, Circle, Undo, Redo, Delete, and Save canvas behind the simplified `Tools` menu.
- Manual Box, Decision, Circle, Sticky note, and Text elements can be added and edited.
- Arrow mode closes the element inspector, prompts for source/target, creates a manual edge, and marks the canvas unsaved.
- Save writes a local JSON document at `data/canvases/demo-workspace.json`.
- Reload restores the saved nodes and manual arrow.
- Delete removes a selected manual node and any attached manual arrow, marks the canvas unsaved, and does not alter the saved file until Save is pressed.
- Mobile view exposes compact Canvas tools and saved Canvas elements instead of forcing the desktop graph editor into a narrow viewport.
- Undo removes the most recent unsaved canvas change and Redo reapplies it.
- Every Save appends a local version snapshot in `data/canvases/demo-workspace.versions.json`.
- Restoring v1 from the Local versions list reapplies that snapshot in the frontend and marks the canvas unsaved until the user saves it as current.
- Later simplification moved advanced controls into `Add`, `Tools`, and `History` menus and added rendered-rectangle no-overlap placement for added and dragged elements. See `docs/app-progress-for-agents.md`.
