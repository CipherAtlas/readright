import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export const shortcutDefinitions = [
  {
    id: "saveCanvas",
    label: "Save canvas",
    category: "General",
    defaultShortcut: "Ctrl+S",
  },
  {
    id: "undoCanvas",
    label: "Undo canvas change",
    category: "General",
    defaultShortcut: "Ctrl+Z",
  },
  {
    id: "redoCanvas",
    label: "Redo canvas change",
    category: "General",
    defaultShortcut: "Ctrl+Shift+Z",
  },
  {
    id: "runReview",
    label: "Build map",
    category: "General",
    defaultShortcut: "Ctrl+Enter",
  },
  {
    id: "focusClaim",
    label: "Focus claim input",
    category: "General",
    defaultShortcut: "Ctrl+K",
  },
  {
    id: "openSettings",
    label: "Open settings",
    category: "General",
    defaultShortcut: "Ctrl+,",
  },
  {
    id: "openKeybindings",
    label: "Open keybinds",
    category: "General",
    defaultShortcut: "Ctrl+/",
  },
  {
    id: "viewOverview",
    label: "Overview view",
    category: "Views",
    defaultShortcut: "Alt+1",
  },
  {
    id: "viewBranch",
    label: "Branch view",
    category: "Views",
    defaultShortcut: "Alt+2",
  },
  {
    id: "viewEvidence",
    label: "Evidence view",
    category: "Views",
    defaultShortcut: "Alt+3",
  },
  {
    id: "canvasSelect",
    label: "Select / move tool",
    category: "Canvas tools",
    defaultShortcut: "V",
  },
  {
    id: "canvasConnect",
    label: "Connect tool",
    category: "Canvas tools",
    defaultShortcut: "A",
  },
  {
    id: "canvasCancel",
    label: "Cancel canvas action",
    category: "Canvas tools",
    defaultShortcut: "Escape",
  },
  {
    id: "canvasZoomIn",
    label: "Zoom in",
    category: "Canvas navigation",
    defaultShortcut: "Ctrl+=",
  },
  {
    id: "canvasZoomOut",
    label: "Zoom out",
    category: "Canvas navigation",
    defaultShortcut: "Ctrl+-",
  },
  {
    id: "canvasFit",
    label: "Fit canvas to view",
    category: "Canvas navigation",
    defaultShortcut: "Ctrl+0",
  },
  {
    id: "canvasCopy",
    label: "Copy selected element",
    category: "Canvas editing",
    defaultShortcut: "Ctrl+C",
  },
  {
    id: "canvasDuplicate",
    label: "Duplicate selected element",
    category: "Canvas editing",
    defaultShortcut: "Ctrl+D",
  },
  {
    id: "canvasDelete",
    label: "Delete selected element",
    category: "Canvas editing",
    defaultShortcut: "Delete",
  },
  {
    id: "addBox",
    label: "Add box",
    category: "Add diagram nodes",
    defaultShortcut: "B",
  },
  {
    id: "addText",
    label: "Add text",
    category: "Add diagram nodes",
    defaultShortcut: "T",
  },
  {
    id: "addNote",
    label: "Add sticky note",
    category: "Add diagram nodes",
    defaultShortcut: "N",
  },
  {
    id: "addDecision",
    label: "Add decision",
    category: "Add diagram nodes",
    defaultShortcut: "D",
  },
  {
    id: "addConnector",
    label: "Add circle",
    category: "Add diagram nodes",
    defaultShortcut: "C",
  },
  {
    id: "addSupport",
    label: "Add support proof",
    category: "Add research nodes",
    defaultShortcut: "Alt+S",
  },
  {
    id: "addOppose",
    label: "Add counter-proof",
    category: "Add research nodes",
    defaultShortcut: "Alt+O",
  },
  {
    id: "addSource",
    label: "Add source",
    category: "Add research nodes",
    defaultShortcut: "Alt+U",
  },
  {
    id: "addQuestion",
    label: "Add question",
    category: "Add research nodes",
    defaultShortcut: "Alt+Q",
  },
  {
    id: "addComment",
    label: "Add comment",
    category: "Add research nodes",
    defaultShortcut: "Alt+M",
  },
  {
    id: "addHighlight",
    label: "Add highlight",
    category: "Add research nodes",
    defaultShortcut: "Alt+H",
  },
] as const;

export type ShortcutId = (typeof shortcutDefinitions)[number]["id"];
export type ShortcutMap = Record<ShortcutId, string>;

export const shortcutStorageKey = "readright.keybindings.v1";
export const shortcutCategoryOrder = [
  "General",
  "Views",
  "Canvas tools",
  "Canvas navigation",
  "Canvas editing",
  "Add diagram nodes",
  "Add research nodes",
] as const;
export const appShortcutIds: ShortcutId[] = [
  "saveCanvas",
  "undoCanvas",
  "redoCanvas",
  "runReview",
  "focusClaim",
  "openSettings",
  "openKeybindings",
  "viewOverview",
  "viewBranch",
  "viewEvidence",
];
export const canvasShortcutIds: ShortcutId[] = shortcutDefinitions
  .map((definition) => definition.id)
  .filter((id) => !appShortcutIds.includes(id));


export function defaultShortcutMap(): ShortcutMap {
  return shortcutDefinitions.reduce((bindings, definition) => {
    bindings[definition.id] = definition.defaultShortcut;
    return bindings;
  }, {} as ShortcutMap);
}

export function normalizeShortcutKey(key: string) {
  if (key === " ") return "Space";
  if (key === "Esc") return "Escape";
  if (key === "Del") return "Delete";
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export function normalizeShortcutText(value: string) {
  const parts = value
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return "";

  const modifiers = {
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  };
  let key = "";

  parts.forEach((part) => {
    const normalized = part.toLowerCase();
    if (normalized === "ctrl" || normalized === "control") modifiers.ctrl = true;
    else if (normalized === "alt" || normalized === "option") modifiers.alt = true;
    else if (normalized === "shift") modifiers.shift = true;
    else if (normalized === "meta" || normalized === "cmd" || normalized === "command") modifiers.meta = true;
    else key = normalizeShortcutKey(part);
  });

  if (!key) return "";
  return [
    modifiers.ctrl ? "Ctrl" : "",
    modifiers.meta ? "Meta" : "",
    modifiers.alt ? "Alt" : "",
    modifiers.shift ? "Shift" : "",
    key,
  ]
    .filter(Boolean)
    .join("+");
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent | ReactKeyboardEvent) {
  const key = normalizeShortcutKey(event.key);
  if (["Control", "Meta", "Alt", "Shift", "Tab"].includes(key)) return "";
  return [
    event.ctrlKey ? "Ctrl" : "",
    event.metaKey ? "Meta" : "",
    event.altKey ? "Alt" : "",
    event.shiftKey ? "Shift" : "",
    key,
  ]
    .filter(Boolean)
    .join("+");
}

export function shortcutParts(value: string) {
  const normalized = normalizeShortcutText(value);
  const parts = normalized.split("+").filter(Boolean);
  return {
    ctrl: parts.includes("Ctrl"),
    meta: parts.includes("Meta"),
    alt: parts.includes("Alt"),
    shift: parts.includes("Shift"),
    key: parts.find((part) => !["Ctrl", "Meta", "Alt", "Shift"].includes(part)) || "",
  };
}

export function shortcutsEquivalent(first: string, second: string) {
  return normalizeShortcutText(first) === normalizeShortcutText(second);
}

export function matchesShortcut(event: KeyboardEvent, shortcut: string) {
  const binding = shortcutParts(shortcut);
  if (!binding.key) return false;
  if (normalizeShortcutKey(event.key) !== binding.key) return false;
  const ctrlOrMetaMatches =
    binding.ctrl && !binding.meta
      ? event.ctrlKey || event.metaKey
      : event.ctrlKey === binding.ctrl && event.metaKey === binding.meta;
  return ctrlOrMetaMatches && event.altKey === binding.alt && event.shiftKey === binding.shift;
}

export function getShortcutAction(event: KeyboardEvent, bindings: ShortcutMap, allowedIds: ShortcutId[]) {
  return allowedIds.find((id) => matchesShortcut(event, bindings[id]));
}

export function isEditableEventTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function loadShortcutMap() {
  const defaults = defaultShortcutMap();
  try {
    const raw = window.localStorage.getItem(shortcutStorageKey);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<Record<ShortcutId, string>>;
    return shortcutDefinitions.reduce((bindings, definition) => {
      bindings[definition.id] =
        typeof saved[definition.id] === "string"
          ? normalizeShortcutText(saved[definition.id] || "")
          : definition.defaultShortcut;
      return bindings;
    }, {} as ShortcutMap);
  } catch {
    return defaults;
  }
}

export function assignShortcutBinding(bindings: ShortcutMap, actionId: ShortcutId, shortcut: string) {
  const normalized = normalizeShortcutText(shortcut);
  const next = { ...bindings, [actionId]: normalized };
  if (normalized) {
    shortcutDefinitions.forEach((definition) => {
      if (definition.id !== actionId && shortcutsEquivalent(next[definition.id], normalized)) {
        next[definition.id] = "";
      }
    });
  }
  return next;
}

export function formatShortcut(value: string) {
  const normalized = normalizeShortcutText(value);
  if (!normalized) return "Unassigned";
  return normalized.replace(/\bMeta\b/g, "Cmd").replace(/\+/g, " + ");
}

