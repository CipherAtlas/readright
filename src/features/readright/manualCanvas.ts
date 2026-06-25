import type { ManualCanvasColor, ManualCanvasKind, Tone } from "./types";
import { classNames } from "./utils/classNames";

export function getToneClasses(tone: Tone, selected?: boolean) {
  const base = {
    claim:
      "border-[#e1c079]/70 bg-[#fffaf0] text-ink shadow-[0_16px_44px_rgba(183,129,28,0.12)]",
    support:
      "border-[#9ab894]/70 bg-[#f2f8ef] text-ink shadow-[0_14px_36px_rgba(76,125,72,0.09)]",
    oppose:
      "border-[#efa08f]/70 bg-[#fff4ef] text-ink shadow-[0_14px_36px_rgba(211,79,50,0.08)]",
    evidence:
      "border-[#e3ba67]/70 bg-[#fff8e9] text-ink shadow-[0_14px_36px_rgba(216,167,41,0.11)]",
    assumption:
      "border-ink/12 bg-white/96 text-ink shadow-[0_12px_30px_rgba(16,16,14,0.065)]",
    neutral:
      "border-ink/12 bg-white/96 text-ink shadow-[0_12px_30px_rgba(16,16,14,0.065)]",
  }[tone];

  return classNames(
    base,
    selected &&
      (tone === "support"
        ? "ring-4 ring-[#5b8a61]/18"
        : tone === "oppose"
          ? "ring-4 ring-[#e76e57]/16"
          : "ring-4 ring-amber-400/18")
  );
}

export function getManualColorClasses(color: ManualCanvasColor, selected?: boolean) {
  const base = {
    green: "border-[#6e9a72] bg-[#edf7eb] text-ink",
    amber: "border-[#e0a326] bg-[#fff7e6] text-ink",
    red: "border-[#ef7f68] bg-[#fff0ea] text-ink",
    ink: "border-ink/35 bg-white text-ink",
  }[color];

  return classNames(
    base,
    selected && "ring-4 ring-[#5d855e]/18"
  );
}

export function manualCanvasKindLabel(kind: ManualCanvasKind) {
  const labels: Record<ManualCanvasKind, string> = {
    box: "Box",
    text: "Text",
    note: "Sticky note",
    decision: "Decision",
    connector: "Circle",
    support: "Support proof",
    oppose: "Counter-proof",
    source: "Source",
    question: "Question",
    comment: "Comment",
    highlight: "Highlight",
  };
  return labels[kind];
}

export function manualCanvasBodyLabel(kind: ManualCanvasKind) {
  if (kind === "source") return "Citation / source notes";
  if (kind === "comment") return "Comment";
  if (kind === "question") return "Question detail";
  if (kind === "support" || kind === "oppose") return "Evidence summary";
  if (kind === "highlight") return "Highlighted finding";
  return "Body";
}

export function manualCanvasDefaults(kind: ManualCanvasKind): {
  title: string;
  body: string;
  color: ManualCanvasColor;
} {
  const defaults: Record<
    ManualCanvasKind,
    {
      title: string;
      body: string;
      color: ManualCanvasColor;
    }
  > = {
    box: {
      title: "Box",
      body: "Describe a review step or research workflow.",
      color: "green",
    },
    text: {
      title: "Canvas text",
      body: "",
      color: "ink",
    },
    note: {
      title: "Sticky note",
      body: "Write a note for this part of the map.",
      color: "amber",
    },
    decision: {
      title: "Decision",
      body: "Is this claim supported?",
      color: "amber",
    },
    connector: {
      title: "Circle",
      body: "",
      color: "ink",
    },
    support: {
      title: "Supporting proof",
      body: "Summarize evidence that supports the initial claim.",
      color: "green",
    },
    oppose: {
      title: "Counter-proof",
      body: "Summarize evidence that challenges the initial claim.",
      color: "red",
    },
    source: {
      title: "Source card",
      body: "Paste a citation, DOI, URL, or study note.",
      color: "amber",
    },
    question: {
      title: "Open question",
      body: "What still needs to be checked?",
      color: "ink",
    },
    comment: {
      title: "Research comment",
      body: "Add your interpretation, caveat, or next step.",
      color: "amber",
    },
    highlight: {
      title: "Important finding",
      body: "Call out a pattern, limitation, or key result.",
      color: "amber",
    },
  };
  return defaults[kind];
}

export type CanvasScreenRect = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

export function screenRectFromDomRect(rect: DOMRect | { bottom: number; left: number; right: number; top: number }): CanvasScreenRect {
  return {
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    top: rect.top,
  };
}

export function expandScreenRect(rect: CanvasScreenRect, padding: number): CanvasScreenRect {
  return {
    bottom: rect.bottom + padding,
    left: rect.left - padding,
    right: rect.right + padding,
    top: rect.top - padding,
  };
}

export function screenRectsOverlap(a: CanvasScreenRect, b: CanvasScreenRect) {
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

export function manualCanvasScreenSize(kind: ManualCanvasKind) {
  if (kind === "connector") return { height: 156, width: 156 };
  if (kind === "decision") return { height: 150, width: 230 };
  if (kind === "support" || kind === "oppose" || kind === "source" || kind === "question" || kind === "comment" || kind === "highlight") {
    return { height: 116, width: 250 };
  }
  if (kind === "text") return { height: 74, width: 190 };
  return { height: 96, width: 230 };
}

