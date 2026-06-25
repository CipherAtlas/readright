import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bookmark,
  Boxes,
  Brain,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  Columns3,
  CircleDot,
  Copy,
  Diamond,
  Download,
  ExternalLink,
  FileText,
  FilePlus,
  Filter,
  GitBranch,
  Hand,
  Highlighter,
  History,
  Home,
  Keyboard,
  Layers,
  Loader2,
  Lock,
  Menu,
  MessageCircle,
  MessageSquare,
  Minus,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RefreshCcw,
  Redo2,
  Save,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  SquareDashedMousePointer,
  Star,
  StickyNote,
  Target,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import topicJson from "./data/breathwork-anxiety.json";
import type {
  ClaimAssessment,
  EvidenceCertainty,
  EvidenceDirection,
  EvidenceTopic,
  MatchQuality,
  SourceRecord,
} from "./types/evidence";

const bundledTopic = topicJson as EvidenceTopic;

type Mode = "query" | "article";
type MapView = "overview" | "branch" | "evidence";
type ExportFormat = "json" | "pdf" | "docx" | "xlsx" | "csv";
type WorkspaceFilter = "All" | "For" | "Against" | "Evidence" | "Assumptions" | "Unresolved";
type RunProgressStatus = "running" | "complete" | "error";
type ManualCanvasKind =
  | "box"
  | "text"
  | "note"
  | "decision"
  | "connector"
  | "support"
  | "oppose"
  | "source"
  | "question"
  | "comment"
  | "highlight";
type CanvasTool = "select" | ManualCanvasKind | "arrow";
type ManualCanvasColor = "green" | "amber" | "red" | "ink";
type PreSearchFilters = {
  topicArea: string;
  evidenceTypes: string[];
  publicationWindow: string;
};
type ReviewEngine = "auto" | "openai_api" | "codex_cli";
type ReasoningEffort = "minimal" | "low" | "medium" | "high";
type RuntimeSettings = {
  openaiConfigured: boolean;
  openaiModel: string;
  openaiReasoningEffort: ReasoningEffort;
  reviewEngine: ReviewEngine;
  activeEngine: "openai_api" | "codex_cli";
  codexBin: string;
  codexCli: {
    available: boolean;
    version: string;
    error: string;
    command?: string;
    candidates?: string[];
  };
  envFile: string;
};
type Tone = "claim" | "support" | "oppose" | "evidence" | "assumption" | "neutral";
type WorkspaceSource = {
  id: string;
  title: string;
  meta: string;
  year?: number;
  type: string;
  direction: "Supports" | "Opposes" | "Mixed";
  quality: EvidenceCertainty;
  takeaway: string;
  url?: string;
  sample?: string;
};

type ReasonNode = {
  id: string;
  title: string;
  tone: Tone;
  badge: string;
  detail: string;
  sourceIds: string[];
};

type Branch = {
  id: string;
  title: string;
  tone: "support" | "oppose" | "neutral";
  status: string;
  reasonsLabel: string;
  studiesLabel: string;
  assumptionsLabel: string;
  confidence: "Low" | "Mixed" | "Strong";
  rationale: string;
  counterpoint: string;
  children: ReasonNode[];
  sourceIds: string[];
};

type Workspace = {
  claim: string;
  normalizedClaim: string;
  confidence: EvidenceCertainty;
  status: string;
  supports: Branch[];
  opposes: Branch[];
  neutral: Branch[];
  sources: WorkspaceSource[];
  summary: string;
};

type TopicHistoryItem = {
  id?: string;
  query?: string;
  generatedAt?: string;
  frameworkVersion?: string;
  verdictSummary?: string;
  confidence?: EvidenceCertainty;
  claimCount?: number;
  sourceCount?: number;
  filename: string;
  unreadable?: boolean;
};

type ManualCanvasNodeRecord = {
  id: string;
  kind: ManualCanvasKind;
  title: string;
  body: string;
  x: number;
  y: number;
  color: ManualCanvasColor;
};

type ManualCanvasArrowRecord = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

type CanvasDocument = {
  id: string;
  topicId: string;
  query: string;
  view: MapView;
  selectedBranchId: string;
  selectedReasonId: string;
  nodes: ManualCanvasNodeRecord[];
  arrows: ManualCanvasArrowRecord[];
  updatedAt?: string;
};

type CanvasEditorState = {
  nodes: ManualCanvasNodeRecord[];
  arrows: ManualCanvasArrowRecord[];
};

type CanvasVersionRecord = {
  id: string;
  versionNumber: number;
  createdAt: string;
  label?: string;
  summary?: string;
  canvas: CanvasDocument;
};

const shortcutDefinitions = [
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

type ShortcutId = (typeof shortcutDefinitions)[number]["id"];
type ShortcutMap = Record<ShortcutId, string>;

const shortcutStorageKey = "readright.keybindings.v1";
const shortcutCategoryOrder = [
  "General",
  "Views",
  "Canvas tools",
  "Canvas navigation",
  "Canvas editing",
  "Add diagram nodes",
  "Add research nodes",
] as const;
const appShortcutIds: ShortcutId[] = [
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
const canvasShortcutIds: ShortcutId[] = shortcutDefinitions
  .map((definition) => definition.id)
  .filter((id) => !appShortcutIds.includes(id));

type ArgumentNodeData = {
  title: string;
  subtitle?: string;
  tone: Tone;
  icon: "claim" | "support" | "oppose" | "evidence" | "assumption" | "reason";
  count?: string;
  evidenceCount?: string;
  assumptionCount?: string;
  selected?: boolean;
  compact?: boolean;
  large?: boolean;
  wide?: boolean;
  expandable?: boolean;
  showHandles?: boolean;
  activePill?: "evidence" | "rationale" | "counterpoint";
  canvasToolActive?: boolean;
  onCanvasNodeClick?: () => void;
  onContextMenu?: (event: ReactMouseEvent) => void;
  onAction?: (action: "expand" | "evidence" | "rationale" | "counterpoint") => void;
};

type ArgumentNode = Node<ArgumentNodeData, "argument">;
type LaneNodeData = {
  count: string;
  title: string;
  tone: "support" | "oppose" | "neutral";
};
type LaneNode = Node<LaneNodeData, "lane">;
type ManualCanvasNodeData = {
  kind: ManualCanvasKind;
  title: string;
  body: string;
  color: ManualCanvasColor;
  selected: boolean;
  onDragBy: (deltaX: number, deltaY: number) => void;
  onDragEnd: () => void;
  onDragStart: () => void;
  onContextMenu?: (event: ReactMouseEvent) => void;
  onSelect: () => void;
};
type ManualCanvasNode = Node<ManualCanvasNodeData, "manual">;
type CanvasFlowNode = ArgumentNode | LaneNode | ManualCanvasNode;
type CanvasContextMenuState = {
  nodeId: string;
  x: number;
  y: number;
};
const validViews: MapView[] = ["overview", "branch", "evidence"];
const runProgressSteps = [
  {
    id: "prepare",
    label: "Prepare request",
    detail: "Checking the claim and selected filters.",
  },
  {
    id: "request",
    label: "Start review",
    detail: "Sending the review to the local evidence runner.",
  },
  {
    id: "search",
    label: "Find evidence",
    detail: "Gathering studies and source metadata.",
  },
  {
    id: "analyze",
    label: "Assess claims",
    detail: "Comparing support, limits, and counterpoints.",
  },
  {
    id: "compose",
    label: "Build artifact",
    detail: "Structuring branches, reasons, sources, and verdict.",
  },
  {
    id: "render",
    label: "Render map",
    detail: "Saving the review and drawing the updated canvas.",
  },
] as const;
type RunProgressStepId = (typeof runProgressSteps)[number]["id"];
type RunProgress = {
  stepId: RunProgressStepId;
  progress: number;
  detail: string;
  status: RunProgressStatus;
};

function getInitialView() {
  const requested = new URLSearchParams(window.location.search).get("view") as MapView | null;
  return requested && validViews.includes(requested) ? requested : "overview";
}

const confidenceLabels: Record<EvidenceCertainty, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
  very_low: "Very low",
  insufficient: "Insufficient",
};

const matchLabels: Record<MatchQuality, string> = {
  direct: "Direct",
  partial: "Partial",
  indirect: "Indirect",
  mismatch: "Mismatch",
};

const effectLabels = {
  none: "None",
  small: "Small",
  moderate: "Moderate",
  large: "Large",
  unclear: "Unclear",
} as const;

const durabilityLabels = {
  immediate: "Immediate",
  short_term: "Short term",
  medium_term: "Medium term",
  long_term: "Long term",
  unclear: "Unclear",
} as const;

function signalSummary(signals: Record<string, string>) {
  const values = Object.values(signals);
  const risks = values.filter((value) => value === "risk_flagged" || value === "present").length;
  const possible = values.filter((value) => value === "possible").length;
  const missing = values.filter((value) => value === "missing").length;
  if (risks) return `${risks} flagged`;
  if (possible) return `${possible} possible`;
  if (missing) return `${missing} missing`;
  return "Clear";
}

function formatHistoryDate(value?: string) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function cloneCanvasState(state: CanvasEditorState): CanvasEditorState {
  return {
    nodes: state.nodes.map((node) => ({ ...node })),
    arrows: state.arrows.map((arrow) => ({ ...arrow })),
  };
}

function canvasStateFromDocument(canvas: CanvasDocument): CanvasEditorState {
  return cloneCanvasState({
    nodes: Array.isArray(canvas.nodes) ? canvas.nodes : [],
    arrows: Array.isArray(canvas.arrows) ? canvas.arrows : [],
  });
}

function isSameCanvasState(first?: CanvasEditorState, second?: CanvasEditorState) {
  if (!first || !second) return false;
  return JSON.stringify(first) === JSON.stringify(second);
}

function firstAvailableBranch(workspace: Workspace) {
  return workspace.supports[0] || workspace.opposes[0] || workspace.neutral[0];
}

function canvasIdForTopic(topic: EvidenceTopic, live: boolean) {
  return live ? topic.id : "demo-workspace";
}

const defaultPreSearchFilters: PreSearchFilters = {
  topicArea: "Health",
  evidenceTypes: ["Human studies"],
  publicationWindow: "Last 10 years",
};

const topicAreaOptions = [
  "Health",
  "Mental health",
  "Clinical treatment",
  "Public health",
  "Nutrition",
  "Sleep",
  "Exercise and movement",
  "Wellness",
  "Digital health",
  "Neuroscience",
  "Psychology",
  "Education",
  "Workplace",
  "Parenting and family",
  "Aging",
  "Women's health",
  "Men's health",
  "Pediatrics",
  "Policy",
  "Technology",
  "Environment",
  "Consumer products",
] as const;

const evidenceTypeOptions = [
  "Human studies",
  "Systematic reviews",
  "Meta-analyses",
  "Randomized trials",
  "Clinical guidelines",
  "Cohort studies",
  "Case-control studies",
  "Qualitative research",
  "Mechanism studies",
  "Animal studies",
  "In vitro studies",
  "Safety reports",
  "Adverse event data",
  "Regulatory sources",
  "Public articles",
] as const;

const publicationWindowOptions = ["Last 10 years", "Last 5 years", "Since 2020", "Any year"] as const;

const preSearchFilterGroups = [
  {
    key: "topicArea",
    label: "Topic area",
    Icon: Shield,
    options: topicAreaOptions,
  },
] as const;

function filterWorkspace(workspace: Workspace, filter: WorkspaceFilter): Workspace {
  if (filter === "All" || filter === "Evidence") return workspace;

  const next =
    filter === "For"
      ? { supports: workspace.supports, opposes: [], neutral: [] }
      : filter === "Against"
        ? { supports: [], opposes: workspace.opposes, neutral: [] }
        : filter === "Assumptions"
          ? {
              supports: workspace.supports.filter((branch) => !branch.assumptionsLabel.startsWith("0 ")),
              opposes: workspace.opposes.filter((branch) => !branch.assumptionsLabel.startsWith("0 ")),
              neutral: workspace.neutral.filter((branch) => !branch.assumptionsLabel.startsWith("0 ")),
            }
          : {
              supports: workspace.supports.filter((branch) => branch.confidence !== "Strong"),
              opposes: workspace.opposes.filter((branch) => branch.confidence !== "Strong"),
              neutral: workspace.neutral,
            };

  if (!next.supports.length && !next.opposes.length && !next.neutral.length) {
    return workspace;
  }

  return {
    ...workspace,
    supports: next.supports,
    opposes: next.opposes,
    neutral: next.neutral,
  };
}

const demoWorkspace: Workspace = {
  claim: "Daily magnesium improves sleep quality.",
  normalizedClaim: "Magnesium may help some people sleep better, but the effect depends on baseline status, dose, and study quality.",
  confidence: "low",
  status: "Possible",
  summary:
    "The map treats this as a plausible but limited sleep claim. Stronger wording should wait for better-controlled studies.",
  supports: [
    {
      id: "support-sleep-latency",
      title: "Improves sleep latency",
      tone: "support",
      status: "Supported",
      reasonsLabel: "4 reasons",
      studiesLabel: "2 studies",
      assumptionsLabel: "1 assumption",
      confidence: "Mixed",
      rationale: "May reduce time to fall asleep in groups with lower magnesium or higher baseline sleep disruption.",
      counterpoint: "Several trials are small and outcomes vary by formulation.",
      sourceIds: ["rct-2021", "review-2024"],
      children: [
        {
          id: "faster-onset",
          title: "Faster onset",
          tone: "support",
          badge: "2 studies",
          detail: "Lower baseline magnesium linked to longer sleep latency.",
          sourceIds: ["rct-2021", "review-2024"],
        },
        {
          id: "relaxation-pathway",
          title: "Reduced arousal",
          tone: "support",
          badge: "1 study",
          detail: "Supplementation may shorten time to sleep onset.",
          sourceIds: ["rct-2021"],
        },
        {
          id: "deficiency-subgroup",
          title: "Deficiency subgroup",
          tone: "support",
          badge: "1 assumption",
          detail: "Effects may concentrate in users with lower baseline intake.",
          sourceIds: ["review-2024"],
        },
        {
          id: "small-trial-signal",
          title: "Small trial signal",
          tone: "support",
          badge: "1 study",
          detail: "Some outcomes favor magnesium, but estimates remain imprecise.",
          sourceIds: ["rct-2021"],
        },
      ],
    },
    {
      id: "support-duration",
      title: "Enhances sleep duration",
      tone: "support",
      status: "Supported",
      reasonsLabel: "3 reasons",
      studiesLabel: "3 studies",
      assumptionsLabel: "1 assumption",
      confidence: "Mixed",
      rationale: "Some study arms report longer sleep windows after repeated supplementation.",
      counterpoint: "Duration changes are inconsistent and often self-reported.",
      sourceIds: ["review-2024"],
      children: [],
    },
    {
      id: "support-quality",
      title: "Improves sleep quality metrics",
      tone: "support",
      status: "Supported",
      reasonsLabel: "4 studies",
      studiesLabel: "4 studies",
      assumptionsLabel: "1 assumption",
      confidence: "Low",
      rationale: "Subjective sleep scales sometimes move in a favorable direction.",
      counterpoint: "Different scales make the effects hard to compare.",
      sourceIds: ["review-2024"],
      children: [],
    },
  ],
  opposes: [
    {
      id: "oppose-effect-size",
      title: "Limited effect size in most studies",
      tone: "oppose",
      status: "Opposed",
      reasonsLabel: "4 studies",
      studiesLabel: "4 studies",
      assumptionsLabel: "1 assumption",
      confidence: "Mixed",
      rationale: "Small samples and varied controls make the observed benefit uncertain.",
      counterpoint: "Some subgroups may still benefit.",
      sourceIds: ["review-2024"],
      children: [
        {
          id: "small-effect",
          title: "Effect may be small",
          tone: "oppose",
          badge: "2 studies",
          detail: "Magnitude may be modest across pooled outcomes.",
          sourceIds: ["review-2024"],
        },
      ],
    },
    {
      id: "oppose-bias",
      title: "Publication bias concerns",
      tone: "oppose",
      status: "Opposed",
      reasonsLabel: "2 reasons",
      studiesLabel: "2 studies",
      assumptionsLabel: "1 assumption",
      confidence: "Low",
      rationale: "Positive studies are easier to find than null results.",
      counterpoint: "Sensitivity checks may reduce but not remove the concern.",
      sourceIds: ["review-2024"],
      children: [],
    },
    {
      id: "oppose-everyone",
      title: "Not effective for everyone",
      tone: "oppose",
      status: "Opposed",
      reasonsLabel: "3 reasons",
      studiesLabel: "3 studies",
      assumptionsLabel: "2 assumptions",
      confidence: "Mixed",
      rationale: "Benefit likely depends on baseline diet, formulation, and coexisting sleep problems.",
      counterpoint: "Low-risk adjunct framing can still be reasonable.",
      sourceIds: ["rct-2021"],
      children: [],
    },
  ],
  neutral: [
    {
      id: "neutral-measurement",
      title: "Measurement limitations",
      tone: "neutral",
      status: "Neutral",
      reasonsLabel: "1 note",
      studiesLabel: "1 study",
      assumptionsLabel: "1 assumption",
      confidence: "Low",
      rationale: "Subjective sleep outcomes vary widely.",
      counterpoint: "Objective measures would clarify the claim.",
      sourceIds: ["review-2024"],
      children: [
        {
          id: "subjective-outcomes",
          title: "Subjective outcomes vary widely",
          tone: "assumption",
          badge: "1 assumption",
          detail: "Sleep quality scores do not always align with objective sleep measures.",
          sourceIds: ["review-2024"],
        },
      ],
    },
  ],
  sources: [
    {
      id: "rct-2021",
      title: "The effect of magnesium supplementation on primary insomnia in elderly: A double-blind placebo-controlled clinical trial",
      meta: "RCT · N=46",
      year: 2012,
      type: "RCT",
      direction: "Supports",
      quality: "moderate",
      takeaway: "Magnesium reduced sleep onset latency vs placebo.",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3703169/",
      sample: "Journal of Research in Medical Sciences",
    },
    {
      id: "review-2024",
      title: "Oral magnesium supplementation for insomnia in older adults: a Systematic Review & Meta-Analysis",
      meta: "Systematic review · 3 RCTs",
      year: 2021,
      type: "Systematic review",
      direction: "Supports",
      quality: "moderate",
      takeaway: "Small to moderate improvements in sleep latency across studies.",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8053283/",
      sample: "BMC Complementary Medicine and Therapies",
    },
  ],
};

function classNames(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function defaultShortcutMap(): ShortcutMap {
  return shortcutDefinitions.reduce((bindings, definition) => {
    bindings[definition.id] = definition.defaultShortcut;
    return bindings;
  }, {} as ShortcutMap);
}

function normalizeShortcutKey(key: string) {
  if (key === " ") return "Space";
  if (key === "Esc") return "Escape";
  if (key === "Del") return "Delete";
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function normalizeShortcutText(value: string) {
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

function shortcutFromKeyboardEvent(event: KeyboardEvent | React.KeyboardEvent) {
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

function shortcutParts(value: string) {
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

function shortcutsEquivalent(first: string, second: string) {
  return normalizeShortcutText(first) === normalizeShortcutText(second);
}

function matchesShortcut(event: KeyboardEvent, shortcut: string) {
  const binding = shortcutParts(shortcut);
  if (!binding.key) return false;
  if (normalizeShortcutKey(event.key) !== binding.key) return false;
  const ctrlOrMetaMatches =
    binding.ctrl && !binding.meta
      ? event.ctrlKey || event.metaKey
      : event.ctrlKey === binding.ctrl && event.metaKey === binding.meta;
  return ctrlOrMetaMatches && event.altKey === binding.alt && event.shiftKey === binding.shift;
}

function getShortcutAction(event: KeyboardEvent, bindings: ShortcutMap, allowedIds: ShortcutId[]) {
  return allowedIds.find((id) => matchesShortcut(event, bindings[id]));
}

function isEditableEventTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function loadShortcutMap() {
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

function assignShortcutBinding(bindings: ShortcutMap, actionId: ShortcutId, shortcut: string) {
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

function formatShortcut(value: string) {
  const normalized = normalizeShortcutText(value);
  if (!normalized) return "Unassigned";
  return normalized.replace(/\bMeta\b/g, "Cmd").replace(/\+/g, " + ");
}

function isSupport(direction: EvidenceDirection) {
  return direction === "supports" || direction === "supports_narrower";
}

function isOppose(direction: EvidenceDirection) {
  return (
    direction === "against" ||
    direction === "misleading" ||
    direction === "marketing_overreach" ||
    direction === "insufficient"
  );
}

function sourceTone(source: SourceRecord): WorkspaceSource["direction"] {
  if (isSupport(source.stance)) return "Supports";
  if (isOppose(source.stance)) return "Opposes";
  return "Mixed";
}

function shortTitle(value: string, maxLength = 46) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}…`;
}

function exportSlug(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return slug || "readright-export";
}

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportRows(workspace: Workspace, topic: EvidenceTopic) {
  const branchRows = [
    ...workspace.supports.map((branch) => ["For", branch] as const),
    ...workspace.opposes.map((branch) => ["Against", branch] as const),
    ...workspace.neutral.map((branch) => ["Neutral", branch] as const),
  ].flatMap(([stance, branch]) => [
    {
      section: stance,
      type: "Argument",
      title: branch.title,
      detail: branch.rationale,
      evidence: branch.studiesLabel,
      confidence: branch.confidence,
      sources: branch.sourceIds.join(", "),
    },
	    ...getBranchReasonNodes(branch).map((reason) => ({
      section: stance,
      type: "Reason",
      title: reason.title,
      detail: reason.detail,
      evidence: reason.badge,
      confidence: branch.confidence,
      sources: reason.sourceIds.join(", "),
    })),
  ]);

  const sourceRows = workspace.sources.map((source) => ({
    section: "Sources",
    type: source.type,
    title: source.title,
    detail: source.takeaway,
    evidence: source.direction,
    confidence: confidenceLabels[source.quality],
    sources: source.url || source.id,
  }));

  return [
    {
      section: "Claim",
      type: "Verdict",
      title: workspace.claim,
      detail: topic.verdict.summary,
      evidence: `${topic.claims.length} claim assessment${topic.claims.length === 1 ? "" : "s"}`,
      confidence: confidenceLabels[workspace.confidence],
      sources: topic.sources.length.toString(),
    },
    {
      section: "Claim",
      type: "Responsible wording",
      title: workspace.normalizedClaim,
      detail: workspace.summary,
      evidence: "",
      confidence: confidenceLabels[workspace.confidence],
      sources: "",
    },
    ...branchRows,
    ...sourceRows,
  ];
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildCsv(workspace: Workspace, topic: EvidenceTopic) {
  const headers = ["Section", "Type", "Title", "Detail", "Evidence", "Confidence", "Sources"];
  const rows = exportRows(workspace, topic).map((row) => [
    row.section,
    row.type,
    row.title,
    row.detail,
    row.evidence,
    row.confidence,
    row.sources,
  ]);
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

function crc32(bytes: Uint8Array) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function zipFiles(files: Array<{ name: string; content: string }>) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    localParts.push(local, contentBytes);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, contentBytes.length, true);
    centralView.setUint32(24, contentBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);
    offset += local.length + contentBytes.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, offset, true);
  return concatBytes([...localParts, centralDirectory, end]);
}

function docxParagraph(text: unknown, style?: string) {
  return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function buildDocx(workspace: Workspace, topic: EvidenceTopic) {
  const rows = exportRows(workspace, topic);
  const body = [
    docxParagraph("ReadRight Evidence Review", "Title"),
    docxParagraph(workspace.claim, "Heading1"),
    docxParagraph(`Verdict: ${confidenceLabels[workspace.confidence]}`),
    docxParagraph(topic.verdict.summary),
    docxParagraph("Responsible wording", "Heading1"),
    docxParagraph(workspace.normalizedClaim),
    docxParagraph("Arguments and Evidence", "Heading1"),
    ...rows.slice(2).flatMap((row) => [
      docxParagraph(`${row.section} - ${row.type}: ${row.title}`, "Heading2"),
      docxParagraph(row.detail),
      docxParagraph(`Evidence: ${row.evidence || "n/a"} | Confidence: ${row.confidence || "n/a"}`),
      row.sources ? docxParagraph(`Sources: ${row.sources}`) : "",
    ]),
  ].join("");

  return zipFiles([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    {
      name: "word/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`,
    },
    {
      name: "word/document.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>`,
    },
  ]);
}

function spreadsheetCell(value: unknown) {
  return `<c t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function buildXlsx(workspace: Workspace, topic: EvidenceTopic) {
  const rows = [
    ["Section", "Type", "Title", "Detail", "Evidence", "Confidence", "Sources"],
    ...exportRows(workspace, topic).map((row) => [
      row.section,
      row.type,
      row.title,
      row.detail,
      row.evidence,
      row.confidence,
      row.sources,
    ]),
  ];
  const sheetRows = rows
    .map((row, index) => `<row r="${index + 1}">${row.map(spreadsheetCell).join("")}</row>`)
    .join("");

  return zipFiles([
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Evidence map" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
    },
  ]);
}

type PdfLine = {
  bold?: boolean;
  fontSize: number;
  text: string;
  x: number;
  y: number;
};

function normalizePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "?");
}

function escapePdfText(value: string) {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapPdfText(text: unknown, maxCharacters: number) {
  const normalized = normalizePdfText(text).replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const lines: string[] = [];
  let current = "";

  normalized.split(" ").forEach((word) => {
    if (word.length > maxCharacters) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let index = 0; index < word.length; index += maxCharacters) {
        lines.push(word.slice(index, index + maxCharacters));
      }
      return;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharacters && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines;
}

function buildPdf(workspace: Workspace, topic: EvidenceTopic) {
  const encoder = new TextEncoder();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const bottomMargin = 52;
  const maxTextWidth = pageWidth - margin * 2;
  const pages: PdfLine[][] = [[]];
  let y = pageHeight - margin;

  function startPage() {
    if (pages[pages.length - 1].length) {
      pages.push([]);
    }
    y = pageHeight - margin;
  }

  function addText(
    text: unknown,
    {
      bold = false,
      fontSize = 11,
      gapBefore = 0,
      indent = 0,
      leading = fontSize * 1.35,
    }: {
      bold?: boolean;
      fontSize?: number;
      gapBefore?: number;
      indent?: number;
      leading?: number;
    } = {}
  ) {
    y -= gapBefore;
    const averageCharacterWidth = fontSize * (bold ? 0.56 : 0.52);
    const maxCharacters = Math.max(18, Math.floor((maxTextWidth - indent) / averageCharacterWidth));
    wrapPdfText(text, maxCharacters).forEach((line) => {
      if (y < bottomMargin + leading) startPage();
      pages[pages.length - 1].push({
        bold,
        fontSize,
        text: line,
        x: margin + indent,
        y,
      });
      y -= leading;
    });
  }

  function addSectionTitle(text: string) {
    addText(text, { bold: true, fontSize: 15, gapBefore: 18, leading: 20 });
  }

  function addBranchList(title: string, branches: Branch[]) {
    addSectionTitle(`${title} (${branches.length})`);
    if (!branches.length) {
      addText("No branches in this group.", { fontSize: 10, indent: 12, leading: 14 });
      return;
    }

    branches.forEach((branch, index) => {
      addText(`${index + 1}. ${branch.title}`, { bold: true, fontSize: 10, gapBefore: index ? 6 : 2, leading: 14 });
      addText(`${branch.status} | ${branch.confidence} confidence | ${branch.reasonsLabel} | ${branch.studiesLabel}`, {
        fontSize: 9,
        indent: 12,
        leading: 12,
      });
      addText(branch.rationale, { fontSize: 9, indent: 12, leading: 12 });
    });
  }

  function addSourceSummary(source: WorkspaceSource, index: number) {
    addText(`${index + 1}. ${source.title}`, { bold: true, fontSize: 9, gapBefore: index ? 6 : 2, leading: 12 });
    addText(`${source.type} | ${source.direction} | ${confidenceLabels[source.quality]}${source.year ? ` | ${source.year}` : ""}`, {
      fontSize: 9,
      indent: 12,
      leading: 12,
    });
    addText(source.takeaway, { fontSize: 9, indent: 12, leading: 12 });
    if (source.url) addText(source.url, { fontSize: 8, indent: 12, leading: 11 });
  }

  const branchesBySection: Array<{ label: string; branches: Branch[] }> = [
    { label: "For", branches: workspace.supports },
    { label: "Against", branches: workspace.opposes },
    { label: "Neutral / Mixed", branches: workspace.neutral },
  ];
  const allBranches = branchesBySection.flatMap(({ label, branches }) =>
    branches.map((branch) => ({ branch, section: label }))
  );

  addText("ReadRight Evidence Review", { bold: true, fontSize: 22, leading: 28 });
  addText("Main overview", { bold: true, fontSize: 16, gapBefore: 8, leading: 20 });
  addText(`Claim: ${workspace.claim}`, { bold: true, fontSize: 13, gapBefore: 10, leading: 18 });
  addText(`Verdict: ${confidenceLabels[workspace.confidence]}`, { fontSize: 12, gapBefore: 4, leading: 16 });
  addText(topic.verdict.summary, { fontSize: 11, gapBefore: 8, leading: 15 });
  addText(
    `Branches: ${workspace.supports.length} for, ${workspace.opposes.length} against, ${workspace.neutral.length} neutral/mixed. Sources: ${workspace.sources.length}.`,
    { fontSize: 10, gapBefore: 8, leading: 14 }
  );
  addSectionTitle("Responsible wording");
  addText(workspace.normalizedClaim, { fontSize: 11, leading: 15 });
  branchesBySection.forEach(({ label, branches }) => addBranchList(label, branches));

  allBranches.forEach(({ branch, section }, index) => {
    startPage();
    addText(`Branch ${index + 1}: ${branch.title}`, { bold: true, fontSize: 20, leading: 26 });
    addText(`${section} | ${branch.status} | ${branch.confidence} confidence`, {
      bold: true,
      fontSize: 11,
      gapBefore: 4,
      leading: 15,
    });
    addText(`${branch.reasonsLabel} | ${branch.studiesLabel} | ${branch.assumptionsLabel}`, {
      fontSize: 10,
      gapBefore: 2,
      leading: 14,
    });
    addSectionTitle("Rationale");
    addText(branch.rationale, { fontSize: 10, leading: 14 });
    if (branch.counterpoint) {
      addSectionTitle("Counterpoint / reviewer note");
      addText(branch.counterpoint, { fontSize: 10, leading: 14 });
    }

    addSectionTitle("Reasons");
    getBranchReasonNodes(branch).forEach((reason, reasonIndex) => {
      addText(`${reasonIndex + 1}. ${reason.title}`, {
        bold: true,
        fontSize: 10,
        gapBefore: reasonIndex ? 8 : 2,
        leading: 14,
      });
      addText(`${reason.badge} | ${reason.tone}`, { fontSize: 9, indent: 12, leading: 12 });
      addText(reason.detail, { fontSize: 9, indent: 12, leading: 12 });
      if (reason.sourceIds.length) {
        addText(`Sources: ${reason.sourceIds.join(", ")}`, { fontSize: 8, indent: 12, leading: 11 });
      }
    });

    addSectionTitle("Attached sources");
    getSourceRecords(workspace, branch.sourceIds).forEach(addSourceSummary);
  });

  const pageObjects = pages.map((page) =>
    page
      .map(
        (line) =>
          `BT /${line.bold ? "F2" : "F1"} ${line.fontSize} Tf 1 0 0 1 ${line.x.toFixed(2)} ${line.y.toFixed(
            2
          )} Tm (${escapePdfText(line.text)}) Tj ET`
      )
      .join("\n")
  );
  const catalogId = 1;
  const pagesId = 2;
  const regularFontId = 3;
  const boldFontId = 4;
  const firstPageId = 5;
  const pageReferences = pageObjects.map((_, index) => `${firstPageId + index * 2} 0 R`).join(" ");
  const objects = [
    `<< /Type /Catalog /Pages ${pagesId} 0 R >>`,
    `<< /Type /Pages /Kids [${pageReferences}] /Count ${pageObjects.length} >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`,
  ];

  pageObjects.forEach((content, index) => {
    const pageId = firstPageId + index * 2;
    const contentId = pageId + 1;
    objects.push(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
    );
  });

  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(pdf);
}

function makeReasonNodes(claim: ClaimAssessment): ReasonNode[] {
  const fitRows: Array<[string, MatchQuality]> = [
    ["Population fit", claim.populationMatch],
    ["Intervention fit", claim.interventionMatch],
    ["Outcome fit", claim.outcomeMatch],
    ["Comparator fit", claim.comparatorMatch],
  ];

  const fitNodes: ReasonNode[] = fitRows.map(([label, value], index) => ({
    id: `${claim.id}-${label.toLowerCase().replace(/\s+/g, "-")}`,
    title: `${label}: ${matchLabels[value]}`,
    tone: value === "mismatch" ? "oppose" : value === "direct" ? "support" : "assumption",
    badge: index === 0 ? `${claim.sourceIds.length} studies` : "1 assumption",
    detail: claim.frameworkSignals[index] || claim.reviewerNote || claim.reasoning,
    sourceIds: claim.sourceIds,
  }));

  const effectTone: Tone =
    claim.effectMagnitude === "none"
      ? "oppose"
      : claim.effectMagnitude === "unclear"
        ? "assumption"
        : "support";
  const durabilityTone: Tone =
    claim.durability === "long_term" || claim.durability === "medium_term"
      ? "support"
      : claim.durability === "unclear"
        ? "assumption"
        : "neutral";
  const evidenceGapTone: Tone = claim.evidenceGap.impact === "high" ? "oppose" : "assumption";
  const safetyBadge = signalSummary(claim.safetySignals);
  const citationBadge = signalSummary(claim.citationFidelitySignals);

  return [
    ...fitNodes,
    {
      id: `${claim.id}-effect-magnitude`,
      title: `Effect: ${effectLabels[claim.effectMagnitude]}`,
      tone: effectTone,
      badge: claim.effectMagnitude,
      detail: claim.evidenceGap.summary,
      sourceIds: claim.sourceIds,
    },
    {
      id: `${claim.id}-durability`,
      title: `Durability: ${durabilityLabels[claim.durability]}`,
      tone: durabilityTone,
      badge: claim.durability.replace("_", " "),
      detail: "Durability should not exceed the longest reliable follow-up that matches the claim.",
      sourceIds: claim.sourceIds,
    },
    {
      id: `${claim.id}-evidence-gap`,
      title: `Evidence gap: ${claim.evidenceGap.impact}`,
      tone: evidenceGapTone,
      badge: `${claim.evidenceGap.missingEvidence.length} gaps`,
      detail: claim.evidenceGap.summary,
      sourceIds: claim.sourceIds,
    },
    {
      id: `${claim.id}-safety-signals`,
      title: `Safety: ${safetyBadge}`,
      tone: safetyBadge.includes("flagged") ? "oppose" : safetyBadge.includes("missing") ? "assumption" : "neutral",
      badge: safetyBadge,
      detail: "Safety review separates adverse events, dropout, worsening, contraindications, crisis escalation, and replacement-of-care risk.",
      sourceIds: claim.sourceIds,
    },
    {
      id: `${claim.id}-citation-fidelity`,
      title: `Citation fidelity: ${citationBadge}`,
      tone: citationBadge.includes("flagged") ? "oppose" : citationBadge.includes("possible") ? "assumption" : "neutral",
      badge: citationBadge,
      detail: "Citation review checks population, intervention, outcome, mechanism-to-treatment, causality, durability, and omitted limitations.",
      sourceIds: claim.sourceIds,
    },
  ];
}

function makeBranch(claim: ClaimAssessment): Branch {
  const tone = isSupport(claim.direction)
    ? "support"
    : isOppose(claim.direction)
      ? "oppose"
      : "neutral";

  return {
    id: claim.id,
    title: shortTitle(claim.claim, 38),
    tone,
    status:
      tone === "support"
        ? "Supported"
        : tone === "oppose"
          ? "Opposed"
          : "Mixed",
    reasonsLabel: `${Math.max(2, claim.frameworkSignals.length)} reasons`,
    studiesLabel: `${claim.sourceIds.length} ${claim.sourceIds.length === 1 ? "study" : "studies"}`,
    assumptionsLabel: `${[claim.populationMatch, claim.interventionMatch, claim.outcomeMatch, claim.comparatorMatch].filter(
      (value) => value !== "direct"
    ).length} assumptions`,
    confidence:
      claim.evidenceCertainty === "high" || claim.evidenceCertainty === "moderate"
        ? "Strong"
        : claim.evidenceCertainty === "insufficient" || claim.evidenceCertainty === "very_low"
          ? "Low"
          : "Mixed",
    rationale: claim.reasoning,
    counterpoint: claim.reviewerNote,
    children: makeReasonNodes(claim),
    sourceIds: claim.sourceIds,
  };
}

function makeWorkspaceFromTopic(currentTopic: EvidenceTopic, submittedQuery: string): Workspace {
  const branches = currentTopic.claims.map(makeBranch);
  const supports = branches.filter((branch) => branch.tone === "support");
  const opposes = branches.filter((branch) => branch.tone === "oppose");
  const neutral = branches.filter((branch) => branch.tone === "neutral");

  return {
    claim: submittedQuery || currentTopic.query,
    normalizedClaim: currentTopic.verdict.responsibleWording,
    confidence: currentTopic.verdict.confidence,
    status: confidenceLabels[currentTopic.verdict.confidence],
    summary: currentTopic.verdict.summary,
    supports: supports.length ? supports : demoWorkspace.supports.slice(0, 1),
    opposes: opposes.length ? opposes : demoWorkspace.opposes.slice(0, 1),
    neutral,
    sources: currentTopic.sources.map((source) => ({
      id: source.id,
      title: source.title,
      meta: `${String(source.sourceType).replace(/_/g, " ")}${source.publisher ? ` · ${source.publisher}` : ""}`,
      year: source.year,
      type: source.studyType || String(source.sourceType).replace(/_/g, " "),
      direction: sourceTone(source),
      quality: source.evidenceCertainty,
      takeaway: source.shortSnippet || "Evidence detail available in the source record.",
      url: source.url,
      sample: source.publisher,
    })),
  };
}

function getPrimaryBranch(workspace: Workspace, selectedBranchId: string) {
  return (
    [...workspace.supports, ...workspace.opposes, ...workspace.neutral].find(
      (branch) => branch.id === selectedBranchId
    ) ||
    workspace.supports[0] ||
    workspace.opposes[0] ||
    workspace.neutral[0]
  );
}

function getSourceRecords(workspace: Workspace, ids: string[]) {
  const selected = workspace.sources.filter((source) => ids.includes(source.id));
  return selected.length ? selected : workspace.sources.slice(0, 2);
}

function SourceArticleLink({
  source,
  compact = false,
}: {
  source: WorkspaceSource;
  compact?: boolean;
}) {
  if (!source.url) return null;

  return (
    <a
      aria-label={`Open article: ${source.title}`}
      className={classNames(
        "inline-flex items-center justify-center gap-1.5 rounded-md border border-[#d8a729]/35 bg-white font-semibold text-[#8b5d0d] transition hover:border-[#d8a729]/55 hover:bg-[#fff7e6]",
        compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
      )}
      href={source.url}
      onClick={(event) => event.stopPropagation()}
      rel="noreferrer"
      target="_blank"
    >
      Open article
      <ExternalLink className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </a>
  );
}

function getBranchReasonNodes(branch: Branch): ReasonNode[] {
  if (branch.children.length) return branch.children;

  const fallbackNodes: ReasonNode[] = [
    {
      id: `${branch.id}-rationale`,
      title: branch.tone === "oppose" ? "Why this challenges the claim" : "Why this supports the claim",
      tone: branch.tone,
      badge: branch.reasonsLabel,
      detail: branch.rationale,
      sourceIds: branch.sourceIds,
    },
    {
      id: `${branch.id}-caveat`,
      title: "Important caveat",
      tone: "assumption",
      badge: branch.assumptionsLabel,
      detail: branch.counterpoint || "Interpret with the limits of the current evidence base.",
      sourceIds: branch.sourceIds,
    },
    {
      id: `${branch.id}-evidence-base`,
      title: "Evidence base",
      tone: "evidence",
      badge: branch.studiesLabel,
      detail: `${branch.studiesLabel} connected to this branch. Open the evidence view for source details.`,
      sourceIds: branch.sourceIds,
    },
  ];

  return fallbackNodes;
}

function getToneClasses(tone: Tone, selected?: boolean) {
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

function getManualColorClasses(color: ManualCanvasColor, selected?: boolean) {
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

function manualCanvasKindLabel(kind: ManualCanvasKind) {
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

function manualCanvasBodyLabel(kind: ManualCanvasKind) {
  if (kind === "source") return "Citation / source notes";
  if (kind === "comment") return "Comment";
  if (kind === "question") return "Question detail";
  if (kind === "support" || kind === "oppose") return "Evidence summary";
  if (kind === "highlight") return "Highlighted finding";
  return "Body";
}

function manualCanvasDefaults(kind: ManualCanvasKind): {
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

type CanvasScreenRect = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

function screenRectFromDomRect(rect: DOMRect | { bottom: number; left: number; right: number; top: number }): CanvasScreenRect {
  return {
    bottom: rect.bottom,
    left: rect.left,
    right: rect.right,
    top: rect.top,
  };
}

function expandScreenRect(rect: CanvasScreenRect, padding: number): CanvasScreenRect {
  return {
    bottom: rect.bottom + padding,
    left: rect.left - padding,
    right: rect.right + padding,
    top: rect.top - padding,
  };
}

function screenRectsOverlap(a: CanvasScreenRect, b: CanvasScreenRect) {
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

function manualCanvasScreenSize(kind: ManualCanvasKind) {
  if (kind === "connector") return { height: 156, width: 156 };
  if (kind === "decision") return { height: 150, width: 230 };
  if (kind === "support" || kind === "oppose" || kind === "source" || kind === "question" || kind === "comment" || kind === "highlight") {
    return { height: 116, width: 250 };
  }
  if (kind === "text") return { height: 74, width: 190 };
  return { height: 96, width: 230 };
}

function NodeIcon({ data }: { data: ArgumentNodeData }) {
  const iconClass = classNames(
    "h-5 w-5",
    data.tone === "support" && "text-[#4f8256]",
    data.tone === "oppose" && "text-[#e35f49]",
    data.tone === "evidence" && "text-[#d99a18]",
    data.tone === "assumption" && "text-ink/45",
    data.tone === "claim" && "text-[#d99a18]",
    data.tone === "neutral" && "text-ink/45"
  );

  const Icon =
    data.icon === "claim"
      ? Star
      : data.icon === "support"
        ? Activity
        : data.icon === "oppose"
          ? Minus
          : data.icon === "evidence"
            ? FileText
            : data.icon === "assumption"
              ? CircleHelp
              : Brain;

  return (
    <span
      className={classNames(
        "flex shrink-0 items-center justify-center rounded-full border bg-white/75",
        data.large ? "h-11 w-11" : "h-8 w-8",
        data.tone === "support" && "border-[#8fb28c]",
        data.tone === "oppose" && "border-[#ef7f68]",
        data.tone === "evidence" && "border-[#e6ad44]",
        data.tone === "claim" && "border-[#e6ad44]",
        (data.tone === "assumption" || data.tone === "neutral") && "border-ink/12"
      )}
    >
      <Icon className={iconClass} />
    </span>
  );
}

function ArgumentNodeCard({ data }: NodeProps<ArgumentNode>) {
  return (
    <button
      className={classNames(
        "group relative block overflow-hidden rounded-lg border px-4 py-3 text-left backdrop-blur transition duration-200 hover:-translate-y-0.5",
        data.compact ? "w-[230px]" : data.wide ? "w-[360px]" : data.large ? "w-[300px]" : "w-[258px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/40",
        getToneClasses(data.tone, data.selected)
      )}
      onClick={(event) => {
        event.stopPropagation();
        if (data.canvasToolActive) {
          data.onCanvasNodeClick?.();
          return;
        }
        data.onAction?.("expand");
      }}
      onContextMenu={(event) => data.onContextMenu?.(event)}
      type="button"
    >
		      <Handle className="!pointer-events-none !h-2 !w-2 !border-ink/20 !bg-white !opacity-0" id="top" position={Position.Top} type="source" />
		      <Handle className="!pointer-events-none !h-2 !w-2 !border-ink/20 !bg-white !opacity-0" id="bottom" position={Position.Bottom} type="target" />
		      <Handle className="!pointer-events-none !h-2 !w-2 !border-ink/20 !bg-white !opacity-0" id="left" position={Position.Left} type="target" />
		      <Handle className="!pointer-events-none !h-2 !w-2 !border-ink/20 !bg-white !opacity-0" id="right" position={Position.Right} type="source" />
      <span
        className={classNames(
          "absolute inset-y-3 left-0 w-1 rounded-r-full",
          data.tone === "support" && "bg-[#5d855e]",
          data.tone === "oppose" && "bg-[#e76e57]",
          data.tone === "evidence" && "bg-[#d99a18]",
          data.tone === "claim" && "bg-[#d8a729]",
          (data.tone === "assumption" || data.tone === "neutral") && "bg-ink/18"
        )}
      />
      <div className="flex items-start gap-3">
        <NodeIcon data={data} />
        <div className="min-w-0 flex-1">
          <h3
            className={classNames(
              "font-semibold leading-tight tracking-[-0.01em]",
              data.large ? "text-xl" : "text-[15px]"
            )}
          >
            {data.title}
          </h3>
          {data.subtitle && (
            <p className="mt-1.5 text-xs font-medium leading-4 text-ink/52">
              {data.subtitle}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {data.count && <NodePill>{data.count}</NodePill>}
            {data.evidenceCount && (
              <NodePill
                active={data.activePill === "evidence"}
                tone="evidence"
                onClick={(event) => {
                  event.stopPropagation();
                  data.onAction?.("evidence");
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                {data.evidenceCount}
              </NodePill>
            )}
            {data.assumptionCount && (
              <NodePill tone="assumption">
                <CircleHelp className="h-3.5 w-3.5" />
                {data.assumptionCount}
                <ChevronRight className="h-3.5 w-3.5" />
              </NodePill>
            )}
            {data.activePill === "rationale" && <NodePill active>View rationale</NodePill>}
            {data.activePill === "counterpoint" && (
              <NodePill active tone="oppose">
                Counterpoint
              </NodePill>
            )}
          </div>
        </div>
        {data.expandable && (
          <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/70 text-current opacity-0 transition group-hover:scale-105 group-hover:opacity-100 group-focus-visible:opacity-100">
            {data.selected ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </span>
        )}
      </div>
    </button>
  );
}

function LaneNodeCard({ data }: NodeProps<LaneNode>) {
  return (
    <div
      className={classNames(
        "relative w-[360px] rounded-lg border bg-white/72 px-4 py-3 shadow-[0_10px_26px_rgba(16,16,14,0.05)] backdrop-blur",
        data.tone === "support" && "border-[#8fb28c]/55",
        data.tone === "oppose" && "border-[#ef7f68]/55",
        data.tone === "neutral" && "border-ink/10"
      )}
    >
      <Handle className="!pointer-events-none !h-2 !w-2 !border-ink/20 !bg-white !opacity-0" id="left" position={Position.Left} type="target" />
      <Handle className="!pointer-events-none !h-2 !w-2 !border-ink/20 !bg-white !opacity-0" id="right" position={Position.Right} type="source" />
      <div className="flex items-center justify-between gap-3">
        <p
          className={classNames(
            "text-sm font-semibold",
            data.tone === "support" && "text-[#4f8256]",
            data.tone === "oppose" && "text-[#d34f32]",
            data.tone === "neutral" && "text-ink/60"
          )}
        >
          {data.title}
        </p>
        <span className="rounded-md border border-ink/8 bg-white px-2 py-1 text-[11px] font-semibold text-ink/45">
          {data.count}
        </span>
      </div>
    </div>
  );
}

function ManualCanvasNodeCard({ data }: NodeProps<ManualCanvasNode>) {
  const dragStateRef = useRef<{ dirty: boolean; lastX: number; lastY: number; moved: boolean; pointerId: number; startX: number; startY: number } | null>(null);
  const Icon =
    data.kind === "text"
      ? Type
      : data.kind === "note"
        ? StickyNote
        : data.kind === "decision"
          ? Diamond
          : data.kind === "connector"
            ? CircleDot
            : data.kind === "support"
              ? ThumbsUp
              : data.kind === "oppose"
                ? ThumbsDown
                : data.kind === "source"
                  ? FilePlus
                  : data.kind === "question"
                    ? CircleHelp
                    : data.kind === "comment"
                      ? MessageCircle
                      : data.kind === "highlight"
                        ? Highlighter
                        : SquareDashedMousePointer;
  const isDecision = data.kind === "decision";
  const isConnector = data.kind === "connector";
  const isResearchCard = ["support", "oppose", "source", "question", "comment", "highlight"].includes(data.kind);

  return (
    <div
      aria-label={`Select ${data.title}`}
      className={classNames(
        "manual-node-drag-handle group relative block cursor-move border shadow-[0_14px_34px_rgba(16,16,14,0.09)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/45",
        isDecision
          ? "flex min-h-[150px] w-[230px] items-center justify-center px-10 py-7 text-center"
          : isConnector
            ? "flex h-[156px] w-[156px] items-center justify-center rounded-full px-5 py-5 text-center"
            : "min-w-[190px] max-w-[300px] rounded-lg px-4 py-3 text-left",
        data.kind === "text" && "border-dashed bg-white/90 shadow-none",
        data.kind === "highlight" && "border-dashed shadow-[0_10px_26px_rgba(216,167,41,0.12)]",
        isResearchCard && !isConnector && !isDecision && "w-[250px]",
        getManualColorClasses(data.color, data.selected)
      )}
      onClick={(event) => {
        event.stopPropagation();
        data.onSelect();
      }}
      onContextMenu={(event) => data.onContextMenu?.(event)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        data.onSelect();
      }}
      onPointerDownCapture={(event) => {
        if (event.button !== 0) return;
        if (dragStateRef.current) return;
        if ((event.target as HTMLElement).closest(".react-flow__handle")) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        dragStateRef.current = {
          dirty: false,
          lastX: event.clientX,
          lastY: event.clientY,
          moved: false,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
        };

        const handlePointerMove = (moveEvent: PointerEvent) => {
          const state = dragStateRef.current;
          if (!state || moveEvent.pointerId !== state.pointerId) return;
          const totalDistance = Math.hypot(moveEvent.clientX - state.startX, moveEvent.clientY - state.startY);
          if (!state.moved && totalDistance < 4) return;
          const deltaX = moveEvent.clientX - state.lastX;
          const deltaY = moveEvent.clientY - state.lastY;
          if (!state.dirty) {
            data.onDragStart();
            state.dirty = true;
          }
          state.moved = true;
          state.lastX = moveEvent.clientX;
          state.lastY = moveEvent.clientY;
          data.onDragBy(deltaX, deltaY);
          moveEvent.preventDefault();
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
          const state = dragStateRef.current;
          if (!state || upEvent.pointerId !== state.pointerId) return;
          dragStateRef.current = null;
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerup", handlePointerUp);
          window.removeEventListener("pointercancel", handlePointerUp);
          if (state.moved) data.onDragEnd();
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
      }}
      role="button"
      style={isDecision ? { clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" } : undefined}
      tabIndex={0}
    >
	      <Handle className="!pointer-events-none !h-2 !w-2 !border-ink/20 !bg-white !opacity-0" id="left" position={Position.Left} type="target" />
	      <Handle className="!pointer-events-none !h-2 !w-2 !border-ink/20 !bg-white !opacity-0" id="right" position={Position.Right} type="source" />
      <div
        className={classNames(
          "flex items-start gap-3",
          (isDecision || isConnector) && "max-w-[132px] flex-col items-center gap-2"
        )}
      >
        <span
          className={classNames(
            "flex h-8 w-8 shrink-0 items-center justify-center border border-current/15 bg-white/70",
            isConnector ? "rounded-full" : "rounded-md"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          {isResearchCard && (
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-ink/42">
              {manualCanvasKindLabel(data.kind)}
            </span>
          )}
          <p
            className={classNames(
              "font-semibold leading-tight",
              data.kind === "text" ? "text-lg" : isDecision || isConnector ? "text-[13px]" : "text-sm"
            )}
          >
            {data.title}
          </p>
          {data.body && (
            <p className="mt-2 whitespace-pre-wrap text-xs font-medium leading-5 text-ink/58">
              {data.body}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NodePill({
  children,
  active,
  tone = "neutral",
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  tone?: "neutral" | "evidence" | "assumption" | "oppose";
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
}) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold leading-none",
        active
          ? "border-[#5d855e] bg-white text-[#396a40]"
          : tone === "evidence"
            ? "border-[#e0a326]/45 bg-white/70 text-[#a46c0d]"
            : tone === "oppose"
              ? "border-[#ef7f68]/45 bg-white/75 text-[#d34f32]"
              : "border-ink/12 bg-white/70 text-ink/60",
        onClick && "cursor-pointer hover:border-ink/25 hover:text-ink"
      )}
      onClick={onClick}
    >
      {children}
    </span>
  );
}

function makeEdge(
  id: string,
  source: string,
  target: string,
  tone: Tone,
  direction: "up" | "down" = "up"
): Edge {
  const color =
    tone === "support"
      ? "#5d855e"
      : tone === "oppose"
        ? "#e7664f"
        : tone === "evidence"
          ? "#d99a18"
          : "#9a9a90";

	return {
	  id,
	  source,
	  target,
	  sourceHandle: direction === "up" ? "top" : "bottom",
	  targetHandle: direction === "up" ? "bottom" : "top",
	  type: "smoothstep",
	  animated: tone === "evidence",
	  interactionWidth: 24,
	  markerEnd: {
	    type: MarkerType.ArrowClosed,
	    color,
	    width: 13,
	    height: 13,
    },
    className: `claim-edge claim-edge-${tone}`,
    style: {
	      stroke: color,
	      strokeWidth: tone === "evidence" ? 1.9 : 1.7,
	      strokeDasharray: tone === "evidence" || tone === "assumption" ? "5 7" : undefined,
        opacity: 0.82,
	    },
	    zIndex: 1,
	  };
	}

const nodeTypes = { argument: ArgumentNodeCard, lane: LaneNodeCard, manual: ManualCanvasNodeCard };

function GraphCanvas({
  workspace,
  view,
  setView,
  showCounts,
  groupSimilar,
  onNotice,
  canvasTool,
  setCanvasTool,
  manualCanvasNodes,
  setManualCanvasNodes,
  manualCanvasArrows,
  setManualCanvasArrows,
  selectedManualNodeId,
  setSelectedManualNodeId,
  arrowDraftSourceId,
  setArrowDraftSourceId,
  onSaveCanvas,
  onCanvasDirty,
  onUndoCanvas,
  onRedoCanvas,
  canUndoCanvas,
  canRedoCanvas,
  canvasVersions,
  onRestoreCanvasVersion,
  isCanvasVersionsLoading,
  isCanvasSaving,
  canvasSavedAt,
  selectedBranchId,
  setSelectedBranchId,
  selectedReasonId,
  setSelectedReasonId,
  drawerOpen,
  setDrawerOpen,
  keybindings,
  shortcutsDisabled,
}: {
  workspace: Workspace;
  view: MapView;
  setView: (view: MapView) => void;
  showCounts: boolean;
  groupSimilar: boolean;
  onNotice: (message: string) => void;
  canvasTool: CanvasTool;
  setCanvasTool: (tool: CanvasTool) => void;
  manualCanvasNodes: ManualCanvasNodeRecord[];
  setManualCanvasNodes: Dispatch<SetStateAction<ManualCanvasNodeRecord[]>>;
  manualCanvasArrows: ManualCanvasArrowRecord[];
  setManualCanvasArrows: Dispatch<SetStateAction<ManualCanvasArrowRecord[]>>;
  selectedManualNodeId: string;
  setSelectedManualNodeId: Dispatch<SetStateAction<string>>;
  arrowDraftSourceId: string;
  setArrowDraftSourceId: (id: string) => void;
  onSaveCanvas: () => void;
  onCanvasDirty: () => void;
  onUndoCanvas: () => void;
  onRedoCanvas: () => void;
  canUndoCanvas: boolean;
  canRedoCanvas: boolean;
  canvasVersions: CanvasVersionRecord[];
  onRestoreCanvasVersion: (version: CanvasVersionRecord) => void;
  isCanvasVersionsLoading: boolean;
  isCanvasSaving: boolean;
  canvasSavedAt: string;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  selectedReasonId: string;
  setSelectedReasonId: (id: string) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  keybindings: ShortcutMap;
  shortcutsDisabled: boolean;
}) {
  const canvasSectionRef = useRef<HTMLElement>(null);
  const [flow, setFlow] = useState<ReactFlowInstance<CanvasFlowNode, Edge> | null>(null);
	  const [openCanvasMenu, setOpenCanvasMenu] = useState<"add" | "tools" | "history" | null>(null);
	  const [inlineBranchOpen, setInlineBranchOpen] = useState(false);
		  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
			  const [inlineBranchPanelPosition, setInlineBranchPanelPosition] = useState({ x: 20, y: 96 });
								  const [canvasContextMenu, setCanvasContextMenu] = useState<CanvasContextMenuState | null>(null);
				  const selectedBranch = getPrimaryBranch(workspace, selectedBranchId);
	  const selectedBranchReasons = useMemo(() => getBranchReasonNodes(selectedBranch), [selectedBranch]);
	  const selectedBranchSources = getSourceRecords(workspace, selectedBranch.sourceIds);
	  const selectedReason =
	    selectedBranchReasons.find((reason) => reason.id === selectedReasonId) ||
	    selectedBranchReasons[0];
	  const selectedManualNode = manualCanvasNodes.find((node) => node.id === selectedManualNodeId);
	  const recentCanvasVersions = [...canvasVersions].reverse();
	  const branchPickerGroups = [
	    ["For", workspace.supports],
	    ["Against", workspace.opposes],
	    ["Mixed", workspace.neutral],
	  ] as const;
	  const selectedBranchGroupLabel =
	    selectedBranch.tone === "support" ? "For" : selectedBranch.tone === "oppose" ? "Against" : "Mixed";
  const researchCanvasTools = [
    ["support", ThumbsUp, "Support proof"],
    ["oppose", ThumbsDown, "Counter-proof"],
    ["source", FilePlus, "Source"],
    ["question", CircleHelp, "Question"],
    ["comment", MessageCircle, "Comment"],
    ["highlight", Highlighter, "Highlight"],
  ] as const;
  const diagramCanvasTools = [
    ["box", SquareDashedMousePointer, "Box"],
    ["text", Type, "Text"],
    ["note", StickyNote, "Sticky note"],
    ["decision", Diamond, "Decision"],
    ["connector", CircleDot, "Circle"],
  ] as const;

  const findOpenCanvasScreenPoint = useCallback(
    ({
      excludeNodeId,
      height,
      width,
    }: {
      excludeNodeId?: string;
      height: number;
      width: number;
    }) => {
      const paneRect = document.querySelector(".claim-flow")?.getBoundingClientRect();
      const visiblePane =
        paneRect && paneRect.width > 120 && paneRect.height > 120
          ? {
              bottom: Math.min(paneRect.bottom, window.innerHeight),
              left: Math.max(paneRect.left, 0),
              right: Math.min(paneRect.right, window.innerWidth),
              top: Math.max(paneRect.top, 0),
            }
          : {
              bottom: window.innerHeight,
              left: Math.min(360, Math.max(16, window.innerWidth * 0.08)),
              right: window.innerWidth - 16,
              top: 88,
            };
      const occupiedRects = Array.from(document.querySelectorAll(".react-flow__node"))
        .filter((node) => {
          const nodeId = node.getAttribute("data-id") || "";
          if (excludeNodeId && nodeId === excludeNodeId) return false;
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((node) => expandScreenRect(screenRectFromDomRect(node.getBoundingClientRect()), 22));

      document.querySelectorAll("[data-canvas-avoid]").forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          occupiedRects.push(expandScreenRect(screenRectFromDomRect(rect), 20));
        }
      });

      const startX = visiblePane.left + 48;
      const endX = Math.max(startX, visiblePane.right - width - 48);
      const startY = visiblePane.top + 126;
      const endY = Math.max(startY, visiblePane.bottom - height - 24);
      const stepX = Math.max(width + 34, 230);
      const stepY = Math.max(height + 34, 150);

      for (let y = startY; y <= endY; y += stepY) {
        for (let x = startX; x <= endX; x += stepX) {
          const candidate = { bottom: y + height, left: x, right: x + width, top: y };
          if (!occupiedRects.some((rect) => screenRectsOverlap(candidate, rect))) {
            return { x, y };
          }
        }
      }

      const lowestBottom = occupiedRects.length
        ? Math.max(...occupiedRects.map((rect) => rect.bottom))
        : startY;
      return {
        x: startX,
        y: Math.max(startY, lowestBottom + 34),
      };
    },
    []
  );

  const addManualNode = useCallback(
    (kind: ManualCanvasKind) => {
      const defaults = manualCanvasDefaults(kind);
      const id = `manual-${kind}-${Date.now()}`;
      onCanvasDirty();
      setManualCanvasNodes((current) => {
        const baseSize = manualCanvasScreenSize(kind);
        const zoom = flow?.getZoom?.() || 1;
        const size = {
          height: baseSize.height * zoom,
          width: baseSize.width * zoom,
        };
        const screenPoint = findOpenCanvasScreenPoint(size);
        const paneRect = document.querySelector(".claim-flow")?.getBoundingClientRect();
        const visibleBounds =
          paneRect && paneRect.width > 120 && paneRect.height > 120
            ? {
                bottom: Math.min(paneRect.bottom, window.innerHeight),
                left: Math.max(paneRect.left, 0),
                right: Math.min(paneRect.right, window.innerWidth),
                top: Math.max(paneRect.top, 0),
              }
            : {
                bottom: window.innerHeight,
                left: Math.min(360, Math.max(16, window.innerWidth * 0.08)),
                right: window.innerWidth - 16,
                top: 88,
              };
        const bottomAvoidTop = Math.min(
          ...Array.from(document.querySelectorAll("[data-canvas-bottom-avoid]"))
            .map((element) => element.getBoundingClientRect())
            .filter((rect) => rect.width > 0 && rect.height > 0)
            .map((rect) => rect.top)
        );
        const safeVisibleBottom = Number.isFinite(bottomAvoidTop)
          ? Math.min(visibleBounds.bottom, bottomAvoidTop - 24)
          : visibleBounds.bottom;
        const clampedScreenPoint = {
          x: Math.min(
            Math.max(screenPoint.x, visibleBounds.left + 24),
            Math.max(visibleBounds.left + 24, visibleBounds.right - size.width - 24)
          ),
          y: Math.min(
            Math.max(screenPoint.y, visibleBounds.top + 96),
            Math.max(visibleBounds.top + 96, safeVisibleBottom - size.height - 24)
          ),
        };
        const position = flow?.screenToFlowPosition
          ? flow.screenToFlowPosition(clampedScreenPoint)
          : {
              x: 520,
              y: 220 + current.length * 160,
            };

        return [
          ...current,
          {
            id,
            kind,
            title: defaults.title,
            body: defaults.body,
            color: defaults.color,
            x: position.x,
            y: position.y,
          },
        ];
      });
      setSelectedManualNodeId(id);
      setCanvasTool("select");
      onNotice(`${manualCanvasKindLabel(kind)} added to the canvas.`);
    },
    [findOpenCanvasScreenPoint, flow, onCanvasDirty, onNotice, setCanvasTool, setManualCanvasNodes, setSelectedManualNodeId]
  );

  const updateManualNode = useCallback(
    (id: string, patch: Partial<ManualCanvasNodeRecord>, options?: { trackUndo?: boolean }) => {
      if (options?.trackUndo !== false) onCanvasDirty();
      setManualCanvasNodes((current) =>
        current.map((node) => (node.id === id ? { ...node, ...patch } : node))
      );
    },
    [onCanvasDirty, setManualCanvasNodes]
  );

  const deleteManualNode = useCallback(
    (nodeId: string) => {
      if (!nodeId) return;
      onCanvasDirty();
      setManualCanvasNodes((current) => current.filter((node) => node.id !== nodeId));
      setManualCanvasArrows((current) =>
        current.filter((arrow) => arrow.source !== nodeId && arrow.target !== nodeId)
      );
      setSelectedManualNodeId((current) => (current === nodeId ? "" : current));
      setCanvasContextMenu(null);
      onNotice("Canvas element deleted.");
    },
    [onCanvasDirty, onNotice, setManualCanvasArrows, setManualCanvasNodes, setSelectedManualNodeId]
  );

  const duplicateManualNode = useCallback(
    (nodeId: string) => {
      const sourceNode = manualCanvasNodes.find((node) => node.id === nodeId);
      if (!sourceNode) return;
      const id = `manual-${sourceNode.kind}-${Date.now()}`;
      onCanvasDirty();
      setManualCanvasNodes((current) => [
        ...current,
        {
          ...sourceNode,
          id,
          title: `${sourceNode.title} copy`,
          x: sourceNode.x + 32,
          y: sourceNode.y + 32,
        },
      ]);
      setSelectedManualNodeId(id);
      setCanvasContextMenu(null);
      onNotice("Canvas element duplicated.");
    },
    [manualCanvasNodes, onCanvasDirty, onNotice, setManualCanvasNodes, setSelectedManualNodeId]
  );

  const deleteSelectedManualNode = useCallback(() => {
    if (!selectedManualNodeId) return;
    deleteManualNode(selectedManualNodeId);
  }, [deleteManualNode, selectedManualNodeId]);

  const startArrowFromNode = useCallback(
    (nodeId: string) => {
      setCanvasTool("arrow");
      setArrowDraftSourceId(nodeId);
      setSelectedManualNodeId(nodeId.startsWith("manual-") ? nodeId : "");
      setCanvasContextMenu(null);
      onNotice("Arrow source selected. Pick a target node.");
    },
    [onNotice, setArrowDraftSourceId, setCanvasTool, setSelectedManualNodeId]
  );

  const branchTargetForNode = useCallback(
    (nodeId: string) => {
	      const branches = [...workspace.supports, ...workspace.opposes, ...workspace.neutral];
	      const branch = branches.find((item) => item.id === nodeId);
	      if (branch) return { branch, reason: getBranchReasonNodes(branch)[0] };
	      for (const item of branches) {
	        const reason = getBranchReasonNodes(item).find((child) => child.id === nodeId);
	        if (reason) return { branch: item, reason };
	      }
      return null;
    },
    [workspace.neutral, workspace.opposes, workspace.supports]
  );

  const openContextNodeSeparate = useCallback(
    (nodeId: string) => {
      const target = branchTargetForNode(nodeId);
      if (!target) return;
	      setSelectedBranchId(target.branch.id);
	      setSelectedReasonId(target.reason?.id || getBranchReasonNodes(target.branch)[0]?.id || "");
	      setInlineBranchOpen(false);
	      setBranchPickerOpen(false);
	      setView("branch");
	      setCanvasContextMenu(null);
	    },
    [branchTargetForNode, setSelectedBranchId, setSelectedReasonId, setView]
  );

  const openManualNodeEditor = useCallback(
    (nodeId: string) => {
      setSelectedManualNodeId(nodeId);
      setOpenCanvasMenu(null);
      setCanvasContextMenu(null);
      onNotice("Canvas element selected for editing.");
    },
    [onNotice, setSelectedManualNodeId]
  );

  useEffect(() => {
    if (!canvasContextMenu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCanvasContextMenu(null);
    };
    const closeOnPointerDown = (event: PointerEvent) => {
      if ((event.target as Element | null)?.closest?.('[data-testid="canvas-context-menu"]')) return;
      setCanvasContextMenu(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnPointerDown);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnPointerDown);
    };
  }, [canvasContextMenu]);

  const openContextMenuForNode = useCallback(
    (event: ReactMouseEvent, nodeId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const sectionRect = canvasSectionRef.current?.getBoundingClientRect();
      const rawX = sectionRect ? event.clientX - sectionRect.left : event.clientX;
      const rawY = sectionRect ? event.clientY - sectionRect.top : event.clientY;
      const maxX = Math.max(12, (sectionRect?.width || window.innerWidth) - 236);
      const maxY = Math.max(12, (sectionRect?.height || window.innerHeight) - 316);
      setCanvasContextMenu({
        nodeId,
        x: Math.min(Math.max(12, rawX), maxX),
        y: Math.min(Math.max(12, rawY), maxY),
      });
      setOpenCanvasMenu(null);
      setSelectedManualNodeId(nodeId.startsWith("manual-") ? nodeId : "");
    },
    [setSelectedManualNodeId]
  );

  const handleCanvasNodeClick = useCallback(
    (nodeId: string) => {
      if (canvasTool !== "arrow") {
        setSelectedManualNodeId(nodeId.startsWith("manual-") ? nodeId : "");
        return;
      }

      if (!arrowDraftSourceId) {
        setArrowDraftSourceId(nodeId);
        onNotice("Arrow source selected. Pick a target node.");
        return;
      }

      if (arrowDraftSourceId === nodeId) {
        setArrowDraftSourceId("");
        onNotice("Arrow cancelled.");
        return;
      }

      const id = `manual-arrow-${Date.now()}`;
      onCanvasDirty();
      setManualCanvasArrows((current) => [
        ...current,
        {
          id,
          source: arrowDraftSourceId,
          target: nodeId,
        },
      ]);
      setArrowDraftSourceId("");
      setCanvasTool("select");
      onNotice("Arrow added.");
    },
    [
      arrowDraftSourceId,
      canvasTool,
      onCanvasDirty,
      onNotice,
      setArrowDraftSourceId,
      setCanvasTool,
      setManualCanvasArrows,
      setSelectedManualNodeId,
    ]
  );

  const nodeAction = useCallback(
    (
      action: "expand" | "evidence" | "rationale" | "counterpoint",
      branchId?: string,
      reasonId?: string
    ) => {
	      if (branchId) setSelectedBranchId(branchId);
	      if (reasonId) setSelectedReasonId(reasonId);
	      if (action === "evidence") {
	        setInlineBranchOpen(false);
	        setBranchPickerOpen(false);
	        setDrawerOpen(true);
	        setView("evidence");
	        return;
	      }
	      if (action === "rationale") {
	        setInlineBranchOpen(false);
	        setBranchPickerOpen(false);
	        setView("branch");
	        return;
	      }
	      if (action === "expand") {
	        setDrawerOpen(false);
	        setBranchPickerOpen(false);
	        setInlineBranchOpen(true);
	      }
	    },
	    [setDrawerOpen, setSelectedBranchId, setSelectedReasonId, setView, view]
	  );

  const moveInlineBranchPanel = useCallback((deltaX: number, deltaY: number) => {
    const sectionRect = canvasSectionRef.current?.getBoundingClientRect();
    const panelRect = document.querySelector('[data-testid="inline-branch-panel"]')?.getBoundingClientRect();
    setInlineBranchPanelPosition((current) => {
      if (!sectionRect) {
        return {
          x: Math.max(12, current.x + deltaX),
          y: Math.max(12, current.y + deltaY),
        };
      }

      const panelWidth = panelRect?.width || Math.min(760, sectionRect.width - 40);
      const panelHeight = panelRect?.height || Math.min(460, sectionRect.height - 40);
      const maxX = Math.max(12, sectionRect.width - panelWidth - 12);
      const maxY = Math.max(12, sectionRect.height - panelHeight - 12);

      return {
        x: Math.min(Math.max(12, current.x + deltaX), maxX),
        y: Math.min(Math.max(12, current.y + deltaY), maxY),
      };
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    const nextNodes: CanvasFlowNode[] = [];
    const nextEdges: Edge[] = [];
    const addNode = (
      id: string,
      x: number,
      y: number,
      data: ArgumentNodeData,
      type: "argument" = "argument"
    ) => {
      nextNodes.push({
        id,
        type,
        position: { x, y },
	        data: {
	          ...data,
	          canvasToolActive: canvasTool === "arrow",
	          onContextMenu: (event) => openContextMenuForNode(event, id),
	          onCanvasNodeClick: () => handleCanvasNodeClick(id),
	        },
        draggable: false,
      });
    };
    const addLaneNode = (id: string, x: number, y: number, data: LaneNodeData) => {
      nextNodes.push({
        id,
        type: "lane",
        position: { x, y },
        data,
        draggable: false,
        selectable: false,
      });
    };

    const appendManualCanvas = () => {
      manualCanvasNodes.forEach((node) => {
        nextNodes.push({
          id: node.id,
          type: "manual",
          position: { x: node.x, y: node.y },
          draggable: false,
          data: {
            kind: node.kind,
            title: node.title,
            body: node.body,
            color: node.color,
            selected: node.id === selectedManualNodeId,
            onDragBy: (deltaX, deltaY) => {
              const zoom = flow?.getZoom?.() || 1;
              setManualCanvasNodes((current) =>
                current.map((item) =>
                  item.id === node.id
                    ? {
                        ...item,
                        x: item.x + deltaX / zoom,
                        y: item.y + deltaY / zoom,
                      }
                    : item
                )
              );
            },
	            onDragEnd: () => undefined,
            onDragStart: onCanvasDirty,
            onContextMenu: (event) => openContextMenuForNode(event, node.id),
            onSelect: () => handleCanvasNodeClick(node.id),
          },
        });
      });

	      manualCanvasArrows.forEach((arrow) => {
	        nextEdges.push({
	          id: arrow.id,
	          source: arrow.source,
	          sourceHandle: "right",
	          target: arrow.target,
	          targetHandle: "left",
          type: "smoothstep",
          animated: arrow.source === arrowDraftSourceId,
          label: arrow.label,
          interactionWidth: 18,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#10100e",
          },
          style: {
            stroke: "#10100e",
            strokeWidth: 2.5,
          },
          zIndex: 85,
          labelStyle: {
            fill: "#10100e",
            fontSize: 12,
            fontWeight: 700,
          },
        });
      });
    };

    if (view === "overview") {
      const overviewLimit = groupSimilar ? 3 : 6;

      addNode("claim", 420, 78, {
        title: shortTitle(workspace.claim, 52),
        subtitle: `${workspace.status} evidence review`,
        tone: "claim",
        icon: "claim",
        large: true,
        wide: true,
        showHandles: false,
      });

      addLaneNode("overview-for-lane", 155, 235, {
        title: "For the claim",
        count: `${workspace.supports.length} argument${workspace.supports.length === 1 ? "" : "s"}`,
        tone: "support",
      });
      addLaneNode("overview-against-lane", 640, 235, {
        title: "Against the claim",
        count: `${workspace.opposes.length} argument${workspace.opposes.length === 1 ? "" : "s"}`,
        tone: "oppose",
      });

      workspace.supports.slice(0, overviewLimit).forEach((branch, index) => {
        const id = branch.id;
        addNode(id, 155, 310 + index * 142, {
          title: branch.title,
          subtitle: shortTitle(branch.rationale, 82),
          tone: "support",
          icon: "support",
          count: showCounts ? branch.reasonsLabel : undefined,
          evidenceCount: showCounts ? branch.studiesLabel : undefined,
          assumptionCount: showCounts ? branch.assumptionsLabel : undefined,
          expandable: true,
          showHandles: false,
          wide: true,
          selected: inlineBranchOpen && branch.id === selectedBranch.id,
	          onAction: (action) => nodeAction(action, branch.id, getBranchReasonNodes(branch)[0]?.id),
        });
      });

      workspace.opposes.slice(0, overviewLimit).forEach((branch, index) => {
        const id = branch.id;
        addNode(id, 640, 310 + index * 142, {
          title: branch.title,
          subtitle: shortTitle(branch.rationale, 82),
          tone: "oppose",
          icon: "oppose",
          count: showCounts ? branch.reasonsLabel : undefined,
          evidenceCount: showCounts ? branch.studiesLabel : undefined,
          assumptionCount: showCounts ? branch.assumptionsLabel : undefined,
          expandable: true,
          showHandles: false,
          wide: true,
          selected: inlineBranchOpen && branch.id === selectedBranch.id,
	          onAction: (action) => nodeAction(action, branch.id, getBranchReasonNodes(branch)[0]?.id),
        });
      });

      appendManualCanvas();
      return { nodes: nextNodes, edges: nextEdges };
    }

	    if (view === "branch" || view === "evidence") {
	      const visibleReasons = selectedBranchReasons.slice(0, groupSimilar ? 4 : 8);
	      const centerX = 500;
	      const claimY = 72;
	      const branchY = 246;
	      const reasonsStartY = 438;
	      const reasonRowGap = 166;
        const reasonLanes =
          visibleReasons.length === 1
            ? [centerX]
            : visibleReasons.length === 2
              ? [240, 760]
              : visibleReasons.length === 3
                ? [120, 500, 880]
                : [80, 390, 700, 1010];
	      const reasonXForIndex = (index: number) => {
          if (!reasonLanes.length) return centerX;
          return reasonLanes[index % reasonLanes.length] ?? centerX;
	      };
	      const reasonYForIndex = (index: number) =>
	        reasonsStartY + Math.floor(index / reasonLanes.length) * reasonRowGap;

	      addNode("claim", centerX, claimY, {
	        title: shortTitle(workspace.claim, 46),
	        subtitle: `${workspace.status} confidence · responsible wording available`,
	        tone: "claim",
	        icon: "claim",
	        wide: true,
	      });

	      addNode(selectedBranch.id, centerX, branchY, {
	        title: selectedBranch.title,
	        subtitle: shortTitle(selectedBranch.rationale, 108),
	        tone: selectedBranch.tone,
	        icon: selectedBranch.tone === "oppose" ? "oppose" : "support",
        count: showCounts ? selectedBranch.reasonsLabel : undefined,
        evidenceCount: showCounts ? selectedBranch.studiesLabel : undefined,
        assumptionCount: showCounts ? selectedBranch.assumptionsLabel : undefined,
        selected: true,
        expandable: true,
        wide: true,
	        onAction: (action) =>
	          nodeAction(action, selectedBranch.id, selectedBranchReasons[0]?.id),
	      });
	      nextEdges.push(
	        makeEdge(
	          `edge-${selectedBranch.id}-claim`,
	          selectedBranch.id,
	          "claim",
	          selectedBranch.tone
	        )
	      );

	      visibleReasons.forEach((reason, index) => {
	        const id = reason.id;
	        addNode(id, reasonXForIndex(index), reasonYForIndex(index), {
	          title: reason.title,
	          tone: reason.tone,
	          icon: reason.tone === "oppose" ? "oppose" : reason.tone === "assumption" ? "assumption" : "reason",
	          evidenceCount: showCounts && reason.badge.includes("stud") ? reason.badge : undefined,
	          assumptionCount: showCounts && reason.badge.includes("assumption") ? reason.badge : undefined,
	          activePill: drawerOpen && reason.id === selectedReason?.id ? "evidence" : undefined,
	          expandable: true,
	          selected: reason.id === selectedReason?.id,
	          compact: true,
	          onAction: (action) => nodeAction(action, selectedBranch.id, reason.id),
	        });
	        nextEdges.push(makeEdge(`edge-${id}`, id, selectedBranch.id, reason.tone));
	      });

	      if (drawerOpen && selectedReason) {
	        const selectedReasonIndex = Math.max(
	          0,
	          visibleReasons.findIndex((reason) => reason.id === selectedReason.id)
	        );
        const lastReasonY = visibleReasons.length
          ? Math.max(...visibleReasons.map((_, index) => reasonYForIndex(index)))
          : reasonsStartY;
	        const evidenceStartY =
	          lastReasonY + reasonRowGap + 12;
	        getSourceRecords(workspace, selectedReason.sourceIds).slice(0, 3).forEach((source, index) => {
	          const id = `evidence-${source.id}`;
	          const evidenceX =
	            visibleReasons.length === 1
	              ? centerX
	              : index % 2 === 0
	                ? Math.max(70, reasonXForIndex(selectedReasonIndex) - 185)
	                : reasonXForIndex(selectedReasonIndex) + 205;
	          addNode(id, evidenceX, evidenceStartY + Math.floor(index / 2) * 152, {
	            title: source.year ? `${source.type} ${source.year}` : source.type,
	            subtitle: shortTitle(source.takeaway || source.title, 88),
	            tone: "evidence",
	            icon: "evidence",
	            wide: true,
	            count: source.direction,
	          });
	          nextEdges.push(makeEdge(`edge-${id}`, id, selectedReason.id, "evidence"));
	        });
	      }

      appendManualCanvas();
      return { nodes: nextNodes, edges: nextEdges };
    }

    appendManualCanvas();
    return { nodes: nextNodes, edges: nextEdges };
  }, [
    arrowDraftSourceId,
    canvasTool,
    drawerOpen,
    findOpenCanvasScreenPoint,
    flow,
    groupSimilar,
    handleCanvasNodeClick,
    inlineBranchOpen,
    manualCanvasArrows,
    manualCanvasNodes,
    nodeAction,
    onNotice,
	    openContextMenuForNode,
	    selectedBranch,
	    selectedBranchReasons,
	    selectedBranchId,
	    selectedManualNodeId,
    selectedReason,
    showCounts,
    view,
    workspace,
  ]);

  const contextMenuNode = canvasContextMenu
    ? nodes.find((node) => node.id === canvasContextMenu.nodeId)
    : undefined;
  const contextMenuManualNode = contextMenuNode?.type === "manual"
    ? manualCanvasNodes.find((node) => node.id === contextMenuNode.id)
    : undefined;
  const contextMenuArgumentNode = contextMenuNode?.type === "argument" ? contextMenuNode : undefined;
  const contextMenuBranchTarget = canvasContextMenu
    ? branchTargetForNode(canvasContextMenu.nodeId)
    : null;
	  const flowDefaultViewport =
	    view === "branch" || view === "evidence"
	        ? { x: 90, y: 38, zoom: 0.72 }
	        : { x: 35, y: 35, zoom: 0.83 };

  const copyCanvasNodeText = useCallback(
    async (nodeId: string) => {
      const manualNode = manualCanvasNodes.find((node) => node.id === nodeId);
      const flowNode = nodes.find((node) => node.id === nodeId);
      const text = manualNode
        ? [manualNode.title, manualNode.body].filter(Boolean).join("\n")
        : flowNode?.type === "argument"
          ? [
              flowNode.data.title,
              flowNode.data.subtitle,
              flowNode.data.count,
              flowNode.data.evidenceCount,
              flowNode.data.assumptionCount,
            ]
              .filter(Boolean)
              .join("\n")
          : flowNode?.type === "lane"
            ? [flowNode.data.title, flowNode.data.count].filter(Boolean).join("\n")
            : "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        onNotice("Canvas element copied.");
      } catch {
        onNotice("Copy failed: clipboard access is blocked.");
      }
      setCanvasContextMenu(null);
    },
    [manualCanvasNodes, nodes, onNotice]
  );

  const openContextNodeInline = useCallback(
    (nodeId: string) => {
      const flowNode = nodes.find((node) => node.id === nodeId);
      if (flowNode?.type === "argument" && flowNode.data.onAction) {
        flowNode.data.onAction("expand");
        setCanvasContextMenu(null);
      }
    },
    [nodes]
  );

  const openContextNodeEvidence = useCallback(
    (nodeId: string) => {
      const flowNode = nodes.find((node) => node.id === nodeId);
      if (flowNode?.type === "argument" && flowNode.data.onAction) {
        flowNode.data.onAction("evidence");
        setCanvasContextMenu(null);
      }
    },
    [nodes]
  );

	  const openNodeContextMenu = useCallback(
	    (event: ReactMouseEvent, node: CanvasFlowNode) => {
	      openContextMenuForNode(event, node.id);
	    },
	    [openContextMenuForNode]
	  );

		  const handleCanvasClickCapture = useCallback(
		    (event: ReactMouseEvent<HTMLElement>) => {
	      if (canvasTool !== "arrow") return;
	      const target = event.target as HTMLElement;
	      if (target.closest('[data-testid="canvas-toolbar"], [data-testid="canvas-context-menu"]')) return;
	      const nodeElement = target.closest(".react-flow__node");
	      if (!nodeElement || !canvasSectionRef.current?.contains(nodeElement)) return;
	      const nodeId = nodeElement.getAttribute("data-id");
	      if (!nodeId) return;
	      event.preventDefault();
	      event.stopPropagation();
	      handleCanvasNodeClick(nodeId);
	    },
	    [canvasTool, handleCanvasNodeClick]
		  );

  const runCanvasShortcut = useCallback(
    (actionId: ShortcutId) => {
      if (actionId === "canvasSelect") {
        setCanvasTool("select");
        setArrowDraftSourceId("");
        onNotice("Select tool enabled.");
        return true;
      }
      if (actionId === "canvasConnect") {
        setCanvasTool("arrow");
        setSelectedManualNodeId("");
        setArrowDraftSourceId("");
        onNotice("Connect tool enabled.");
        return true;
      }
      if (actionId === "canvasCancel") {
        setCanvasTool("select");
        setArrowDraftSourceId("");
        setCanvasContextMenu(null);
        setOpenCanvasMenu(null);
        setInlineBranchOpen(false);
        setBranchPickerOpen(false);
        setSelectedManualNodeId("");
        if (drawerOpen) {
          setDrawerOpen(false);
          setView("branch");
        }
        onNotice("Canvas action cancelled.");
        return true;
      }
      if (actionId === "canvasZoomIn") {
        flow?.zoomIn();
        return Boolean(flow);
      }
      if (actionId === "canvasZoomOut") {
        flow?.zoomOut();
        return Boolean(flow);
      }
      if (actionId === "canvasFit") {
        flow?.fitView();
        return Boolean(flow);
      }
      if (actionId === "canvasCopy") {
        if (!selectedManualNodeId) {
          onNotice("Select a canvas element first.");
          return true;
        }
        void copyCanvasNodeText(selectedManualNodeId);
        return true;
      }
      if (actionId === "canvasDuplicate") {
        if (!selectedManualNodeId) {
          onNotice("Select a canvas element first.");
          return true;
        }
        duplicateManualNode(selectedManualNodeId);
        return true;
      }
      if (actionId === "canvasDelete") {
        if (!selectedManualNodeId) {
          onNotice("Select a canvas element first.");
          return true;
        }
        deleteManualNode(selectedManualNodeId);
        return true;
      }

      const addNodeByShortcut: Partial<Record<ShortcutId, ManualCanvasKind>> = {
        addBox: "box",
        addText: "text",
        addNote: "note",
        addDecision: "decision",
        addConnector: "connector",
        addSupport: "support",
        addOppose: "oppose",
        addSource: "source",
        addQuestion: "question",
        addComment: "comment",
        addHighlight: "highlight",
      };
      const kind = addNodeByShortcut[actionId];
      if (!kind) return false;
      addManualNode(kind);
      return true;
    },
    [
      addManualNode,
      copyCanvasNodeText,
      deleteManualNode,
      drawerOpen,
      duplicateManualNode,
      flow,
      onNotice,
      selectedManualNodeId,
      setArrowDraftSourceId,
      setCanvasTool,
      setDrawerOpen,
      setSelectedManualNodeId,
      setView,
    ]
  );

  useEffect(() => {
    if (shortcutsDisabled) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableEventTarget(event.target)) return;
      const actionId = getShortcutAction(event, keybindings, canvasShortcutIds);
      if (!actionId) return;
      if (!runCanvasShortcut(actionId)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keybindings, runCanvasShortcut, shortcutsDisabled]);

			  return (
	    <section
	      ref={canvasSectionRef}
	      className="relative min-h-[560px] flex-1 overflow-hidden border-l border-ink/8 bg-[#fbf8f0] md:min-h-0"
	      onClickCapture={handleCanvasClickCapture}
	    >
      <div className="absolute inset-0 hidden md:block">
	        <ReactFlow
		          className={classNames("claim-flow", (view === "branch" || view === "evidence") && "claim-flow-branch")}
	          defaultViewport={flowDefaultViewport}
	          edges={edges}
	          key={view === "branch" || view === "evidence" ? "branch-map" : view}
          maxZoom={1.35}
          minZoom={0.22}
          nodes={nodes}
	          nodesDraggable={false}
          nodesFocusable
          nodeTypes={nodeTypes}
          onInit={setFlow}
          onNodesChange={(changes) => {
            setManualCanvasNodes((current) => {
              let changed = false;
              const next = current.map((manualNode) => {
                const positionChange = changes.find(
                  (change) =>
                    change.type === "position" &&
                    change.id === manualNode.id &&
                    change.position
                );
                if (!positionChange || !("position" in positionChange) || !positionChange.position) {
                  return manualNode;
                }
                changed = true;
                return {
                  ...manualNode,
                  x: positionChange.position.x,
                  y: positionChange.position.y,
                };
              });
              return changed ? next : current;
            });
          }}
          onNodeClick={(_, node) => {
            setCanvasContextMenu(null);
            if (canvasTool === "arrow" || node.id.startsWith("manual-")) {
              handleCanvasNodeClick(node.id);
            }
          }}
		          onNodeContextMenu={openNodeContextMenu}
		          onPaneClick={() => {
		            setCanvasContextMenu(null);
		            if (canvasTool !== "arrow") setSelectedManualNodeId("");
		          }}
	          panOnDrag
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#d8d1c4" gap={18} size={1} />
	          {view === "evidence" && (
            <MiniMap
              className="flow-minimap"
              maskColor="rgba(247,244,236,0.24)"
              nodeBorderRadius={4}
              nodeColor={(node) => {
                const tone = (node as CanvasFlowNode).type === "argument"
                  ? (node as ArgumentNode).data.tone
                  : "neutral";
                if (tone === "support") return "#9fbe98";
                if (tone === "oppose") return "#f49882";
                if (tone === "evidence") return "#e6ad44";
                if (tone === "claim") return "#ffffff";
                return "#bdb8ad";
              }}
              nodeStrokeColor="#8b867c"
              pannable
              zoomable
            />
          )}
	        </ReactFlow>
	      </div>

			      {canvasContextMenu && contextMenuNode && (
        <div
          className="pointer-events-auto absolute z-40 hidden w-[224px] rounded-lg border border-ink/10 bg-white/96 p-1.5 shadow-[0_18px_48px_rgba(16,16,14,0.18)] backdrop-blur md:block"
          data-testid="canvas-context-menu"
          onContextMenu={(event) => event.preventDefault()}
          style={{ left: canvasContextMenu.x, top: canvasContextMenu.y }}
        >
          <div className="border-b border-ink/8 px-2.5 py-2">
            <p className="truncate text-xs font-bold uppercase tracking-[0.08em] text-ink/38">
              {contextMenuManualNode
                ? manualCanvasKindLabel(contextMenuManualNode.kind)
                : contextMenuNode.type === "lane"
                  ? "Section"
                  : "Canvas element"}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-ink">
              {contextMenuManualNode?.title || contextMenuNode.data.title}
            </p>
          </div>

          <div className="py-1">
            {contextMenuManualNode && (
              <>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-ink/72 transition hover:bg-[#f4f8f1] hover:text-ink"
                  onClick={() => openManualNodeEditor(contextMenuManualNode.id)}
                  type="button"
                >
                  <Pencil className="h-4 w-4 text-[#4f8256]" />
                  Edit
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-ink/72 transition hover:bg-[#f4f8f1] hover:text-ink"
                  onClick={() => duplicateManualNode(contextMenuManualNode.id)}
                  type="button"
                >
                  <Plus className="h-4 w-4 text-[#4f8256]" />
                  Duplicate
                </button>
              </>
            )}

            {contextMenuArgumentNode?.data.onAction && (
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-ink/72 transition hover:bg-[#f4f8f1] hover:text-ink"
                onClick={() => openContextNodeInline(contextMenuArgumentNode.id)}
                type="button"
              >
                <ExternalLink className="h-4 w-4 text-[#4f8256]" />
                Open here
              </button>
            )}

            {contextMenuBranchTarget && (
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-ink/72 transition hover:bg-[#f4f8f1] hover:text-ink"
                onClick={() => openContextNodeSeparate(contextMenuBranchTarget.reason?.id || contextMenuBranchTarget.branch.id)}
                type="button"
              >
                <GitBranch className="h-4 w-4 text-[#4f8256]" />
                Separate branch
              </button>
            )}

            {contextMenuArgumentNode?.data.onAction && contextMenuArgumentNode.data.evidenceCount && (
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-ink/72 transition hover:bg-[#f4f8f1] hover:text-ink"
                onClick={() => openContextNodeEvidence(contextMenuArgumentNode.id)}
                type="button"
              >
                <FileText className="h-4 w-4 text-[#4f8256]" />
                Open evidence
              </button>
            )}

            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-ink/72 transition hover:bg-[#f4f8f1] hover:text-ink"
              onClick={() => void copyCanvasNodeText(contextMenuNode.id)}
              type="button"
            >
              <Copy className="h-4 w-4 text-[#4f8256]" />
              Copy text
            </button>

            {contextMenuNode.type !== "lane" && (
              <button
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-ink/72 transition hover:bg-[#f4f8f1] hover:text-ink"
                onClick={() => startArrowFromNode(contextMenuNode.id)}
                type="button"
              >
                <ArrowUpRight className="h-4 w-4 text-[#4f8256]" />
                Connect from this
              </button>
            )}

            {contextMenuManualNode && (
              <button
                className="mt-1 flex w-full items-center gap-2 rounded-md border-t border-ink/8 px-2.5 py-2 text-left text-sm font-semibold text-[#d34f32] transition hover:bg-[#fff0ea]"
                onClick={() => deleteManualNode(contextMenuManualNode.id)}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      <div className="absolute inset-0 overflow-y-auto px-4 pb-24 pt-24 md:hidden">
        <div className="mx-auto max-w-md space-y-3">
          <div className="rounded-lg border border-amber-300 bg-[#fffaf0] p-4 shadow-[0_12px_30px_rgba(183,129,28,0.10)]">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#a46c0d]">Claim</p>
            <h3 className="mt-2 text-lg font-semibold leading-snug">{workspace.claim}</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-ink/58">{workspace.summary}</p>
          </div>

          <div className="rounded-lg border border-ink/10 bg-white/78 p-3 shadow-[0_10px_26px_rgba(16,16,14,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Research canvas</p>
                <p className="mt-0.5 text-xs font-medium leading-5 text-ink/48">
                  Add your own proof, sources, questions, and diagram notes.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-1 rounded-md bg-[#24542c] px-3 py-2 text-xs font-semibold text-white"
                disabled={isCanvasSaving}
                onClick={onSaveCanvas}
                type="button"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
            <details className="mt-3 rounded-lg border border-ink/8 bg-white/70 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[#4f8256]" />
                  Add to canvas
                </span>
                <ChevronDown className="h-4 w-4 text-ink/42" />
              </summary>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] text-ink/45">Research</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {researchCanvasTools.map(([kind, Icon, label]) => (
                  <button
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-ink/10 bg-white px-2 py-2 text-xs font-semibold"
                    key={kind}
                    onClick={() => addManualNode(kind)}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] text-ink/45">Tools</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {diagramCanvasTools.map(([kind, Icon, label]) => (
                  <button
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-ink/10 bg-white px-2 py-2 text-xs font-semibold"
                    key={kind}
                    onClick={() => addManualNode(kind)}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-ink/10 bg-white px-2 py-2 text-xs font-semibold disabled:opacity-40"
                  disabled={!canUndoCanvas}
                  onClick={onUndoCanvas}
                  type="button"
                >
                  <Undo2 className="h-4 w-4" />
                  Undo
                </button>
                <button
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-ink/10 bg-white px-2 py-2 text-xs font-semibold disabled:opacity-40"
                  disabled={!canRedoCanvas}
                  onClick={onRedoCanvas}
                  type="button"
                >
                  <Redo2 className="h-4 w-4" />
                  Redo
                </button>
              </div>
            </details>
            <details className="mt-3 rounded-lg border border-ink/8 bg-white/70 p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
                <span className="inline-flex items-center gap-2">
                  <History className="h-4 w-4 text-ink/45" />
                  Version history
                </span>
                <span className="text-[11px] font-semibold text-ink/42">
                  {canvasVersions.length} save{canvasVersions.length === 1 ? "" : "s"}
                </span>
              </summary>
              <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                {isCanvasVersionsLoading ? (
                  <p className="text-xs font-semibold text-ink/45">Loading versions</p>
                ) : recentCanvasVersions.length ? (
                  recentCanvasVersions.map((version) => (
                    <button
                      className="w-full rounded-md border border-ink/8 bg-white px-3 py-2 text-left"
                      key={version.id}
                      onClick={() => onRestoreCanvasVersion(version)}
                      type="button"
                    >
                      <span className="block text-xs font-bold">
                        v{version.versionNumber} · {formatHistoryDate(version.createdAt)}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-semibold text-ink/45">
                        {version.summary || "Canvas snapshot"}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-xs font-semibold text-ink/45">No saved versions yet.</p>
                )}
              </div>
            </details>
            {manualCanvasNodes.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink/45">Canvas elements</p>
                {manualCanvasNodes.map((node) => (
                  <button
                    className={classNames(
                      "w-full rounded-lg border p-3 text-left",
                      getManualColorClasses(node.color, node.id === selectedManualNodeId)
                    )}
                    key={node.id}
                    onClick={() => setSelectedManualNodeId(node.id)}
                    type="button"
                  >
                    <p className="text-sm font-semibold">{node.title}</p>
                    {node.body && <p className="mt-1 text-xs font-medium leading-5 text-ink/58">{node.body}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {view === "overview" ? (
            <>
              {([
                ["For", workspace.supports],
                ["Against", workspace.opposes],
                ["Mixed", workspace.neutral],
              ] as const).map(([label, branches]) =>
                branches.length ? (
                  <div className="space-y-2" key={label}>
                    <p className="pt-2 text-xs font-bold uppercase tracking-[0.08em] text-ink/46">{label}</p>
                    {branches.map((branch) => (
                      <button
                        className={classNames(
                          "w-full rounded-lg border p-4 text-left shadow-[0_10px_26px_rgba(16,16,14,0.06)]",
                          branch.tone === "support"
                            ? "border-[#88aa87] bg-[#eef6e9]"
                            : branch.tone === "oppose"
                              ? "border-[#ef7f68] bg-[#fff0ea]"
                              : "border-ink/12 bg-white"
                        )}
                        key={branch.id}
	                        onClick={() => nodeAction("expand", branch.id, getBranchReasonNodes(branch)[0]?.id)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold leading-5">{branch.title}</p>
                            <p className="mt-1 text-xs font-semibold text-ink/48">{branch.status}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-ink/42" />
                        </div>
                        {showCounts && (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-ink/56">
                            <span>{branch.reasonsLabel}</span>
                            <span>{branch.studiesLabel}</span>
                            <span>{branch.assumptionsLabel}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : null
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div
                className={classNames(
                  "rounded-lg border p-4",
                  selectedBranch.tone === "support"
                    ? "border-[#88aa87] bg-[#eef6e9]"
                    : selectedBranch.tone === "oppose"
                      ? "border-[#ef7f68] bg-[#fff0ea]"
                      : "border-ink/12 bg-white"
                )}
              >
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink/46">Selected branch</p>
                <h3 className="mt-2 text-lg font-semibold">{selectedBranch.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-ink/58">{selectedBranch.rationale}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {selectedBranchSources.slice(0, 2).map((source) => (
                    <SourceArticleLink compact key={source.id} source={source} />
                  ))}
                </div>
              </div>
	              {selectedBranchReasons.map((reason) => (
                <button
                  className={classNames(
                    "w-full rounded-lg border bg-white p-4 text-left shadow-[0_10px_26px_rgba(16,16,14,0.05)]",
                    reason.id === selectedReason?.id ? "border-[#5d855e]/45" : "border-ink/10"
                  )}
                  key={reason.id}
                  onClick={() => nodeAction("evidence", selectedBranch.id, reason.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold leading-5">{reason.title}</p>
                    </div>
                    <FileText className="h-4 w-4 shrink-0 text-[#d99a18]" />
                  </div>
                  {showCounts && <p className="mt-3 text-xs font-semibold text-ink/46">{reason.badge}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute left-5 top-5 z-10 flex flex-wrap items-center gap-3">
        {view !== "overview" && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-ink/10 bg-white/90 px-3 py-2 text-sm font-semibold shadow-[0_10px_28px_rgba(16,16,14,0.07)] backdrop-blur">
	            <span className="text-ink/55">Claim</span>
	            <ChevronRight className="h-4 w-4 text-ink/28" />
	            <button
	              className="text-[#4f8256]"
	              onClick={() => {
	                setView("branch");
	                setDrawerOpen(false);
	                setBranchPickerOpen(true);
	              }}
	              type="button"
	            >
	              {selectedBranchGroupLabel}
	            </button>
	            <ChevronRight className="h-4 w-4 text-ink/28" />
		            <span>{selectedBranch.title}</span>
          </div>
        )}
      </div>

	      <div className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2">
	        <div className="pointer-events-auto flex rounded-lg border border-ink/10 bg-white/90 p-1 shadow-[0_10px_28px_rgba(16,16,14,0.07)] backdrop-blur">
		          {(["overview", "branch"] as const).map((item) => (
            <button
              className={classNames(
                "rounded-md px-4 py-2.5 text-sm font-semibold transition sm:px-8",
                (view === item || (item === "branch" && view === "evidence"))
                  ? "bg-[#5d855e] text-white shadow-[0_8px_20px_rgba(76,125,72,0.22)]"
                  : "text-ink/60 hover:bg-ink/[0.04] hover:text-ink"
              )}
	              key={item}
	              onClick={() => {
	                setInlineBranchOpen(false);
	                setDrawerOpen(false);
	                setBranchPickerOpen(item === "branch");
	                setView(item);
	              }}
              type="button"
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
	          ))}
	        </div>
	      </div>

	      {view === "branch" && branchPickerOpen && (
	        <div className="pointer-events-none absolute left-1/2 top-24 z-30 hidden w-[min(920px,calc(100%-3rem))] -translate-x-1/2 md:block">
	          <div className="pointer-events-auto rounded-lg border border-ink/10 bg-white/95 p-4 shadow-[0_22px_70px_rgba(16,16,14,0.16)] backdrop-blur">
	            <div className="flex items-start justify-between gap-4">
	              <div>
	                <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink/42">Branch view</p>
	                <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em]">
	                  What branch would you like to open?
	                </h2>
	              </div>
	              <button
	                className="rounded-md border border-ink/10 px-3 py-2 text-xs font-semibold text-ink/60 transition hover:bg-ink/[0.04] hover:text-ink"
	                onClick={() => setBranchPickerOpen(false)}
	                type="button"
	              >
	                Keep current
	              </button>
	            </div>

	            <div className="mt-4 grid max-h-[54vh] gap-3 overflow-y-auto pr-1 md:grid-cols-3">
	              {branchPickerGroups.map(([label, branches]) =>
	                branches.length ? (
	                  <div className="space-y-2" key={label}>
	                    <p className="px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/42">{label}</p>
	                    {branches.map((branch) => {
	                      const active = branch.id === selectedBranch.id;
	                      return (
	                        <button
	                          className={classNames(
	                            "w-full rounded-lg border p-3 text-left transition hover:-translate-y-0.5",
	                            active && "ring-2 ring-[#5d855e]/35",
	                            branch.tone === "support"
	                              ? "border-[#88aa87] bg-[#eef6e9]"
	                              : branch.tone === "oppose"
	                                ? "border-[#ef7f68] bg-[#fff4ef]"
	                                : "border-ink/12 bg-[#f8f7f2]"
	                          )}
	                          key={branch.id}
	                          onClick={() => {
	                            const firstReason = getBranchReasonNodes(branch)[0];
	                            setSelectedBranchId(branch.id);
	                            setSelectedReasonId(firstReason?.id || "");
	                            setInlineBranchOpen(false);
	                            setDrawerOpen(false);
	                            setBranchPickerOpen(false);
	                            setView("branch");
	                          }}
	                          type="button"
	                        >
	                          <div className="flex items-start justify-between gap-3">
	                            <div className="min-w-0">
	                              <p className="font-semibold leading-5">{branch.title}</p>
	                              <p className="mt-1 text-xs font-medium leading-4 text-ink/56">
	                                {shortTitle(branch.rationale, 92)}
	                              </p>
	                            </div>
	                            {active ? (
	                              <Check className="h-4 w-4 shrink-0 text-[#4f8256]" />
	                            ) : (
	                              <GitBranch className="h-4 w-4 shrink-0 text-ink/38" />
	                            )}
	                          </div>
	                          {showCounts && (
	                            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold text-ink/52">
	                              <span>{branch.reasonsLabel}</span>
	                              <span>{branch.studiesLabel}</span>
	                            </div>
	                          )}
	                        </button>
	                      );
	                    })}
	                  </div>
	                ) : null
	              )}
	            </div>
	          </div>
	        </div>
	      )}

	      {inlineBranchOpen && view !== "evidence" && (
	        <InlineBranchPanel
          branch={selectedBranch}
          onMove={moveInlineBranchPanel}
          onChallenge={() => {
            const challengeBranch =
              workspace.opposes.find((branch) => branch.id !== selectedBranch.id) ||
              workspace.opposes[0] ||
              workspace.neutral[0];
            if (!challengeBranch) {
              onNotice("No challenge branch is available in this map.");
              return;
            }
            setSelectedBranchId(challengeBranch.id);
	            setSelectedReasonId(getBranchReasonNodes(challengeBranch)[0]?.id || "");
            setInlineBranchOpen(true);
          }}
          onClose={() => setInlineBranchOpen(false)}
          onEvidence={(reasonId) => {
            setSelectedReasonId(reasonId);
            setInlineBranchOpen(false);
            setDrawerOpen(true);
            setView("evidence");
          }}
          onOpenSeparate={() => {
            setInlineBranchOpen(false);
            setView("branch");
          }}
          onReasonSelect={(reasonId) => setSelectedReasonId(reasonId)}
          position={inlineBranchPanelPosition}
          selectedReasonId={selectedReason?.id || ""}
          sources={selectedBranchSources}
        />
      )}

      <div className="pointer-events-none absolute bottom-12 left-1/2 z-20 hidden w-[min(620px,calc(100%-3rem))] -translate-x-1/2 md:block">
        <div className="pointer-events-auto relative">
          {openCanvasMenu && (
            <div
              className="absolute bottom-full left-1/2 mb-3 w-[min(420px,100%)] -translate-x-1/2 rounded-lg border border-ink/10 bg-white/96 p-3 shadow-[0_24px_70px_rgba(16,16,14,0.16)] backdrop-blur"
            >
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-ink/8 pb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/38">Canvas menu</p>
                  <h3 className="mt-0.5 text-sm font-semibold text-ink">
                    {openCanvasMenu === "add"
                      ? "Add to canvas"
                      : openCanvasMenu === "tools"
                        ? "Shape and edit"
                        : "Saved versions"}
                  </h3>
                </div>
                <button
                  aria-label="Close canvas menu"
                  className="rounded-md border border-ink/10 p-2 text-ink/52 transition hover:bg-ink/[0.04] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35"
                  onClick={() => setOpenCanvasMenu(null)}
                  type="button"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              {openCanvasMenu === "add" && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/42">Research</p>
                  <div className="mt-2 space-y-1">
                    {researchCanvasTools.map(([kind, Icon, label]) => (
                      <button
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-semibold transition hover:bg-[#f4f8f1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35"
                        key={kind}
                        onClick={() => {
                          addManualNode(kind);
                          setOpenCanvasMenu(null);
                        }}
                        type="button"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[#4f8256]" />
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

            {openCanvasMenu === "tools" && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/42">Canvas tools</p>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  <button
                    className={classNames(
                      "inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold transition hover:bg-ink/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35",
                      canvasTool === "select" && "bg-[#e9f2e6] text-[#31583a]"
                    )}
                    onClick={() => {
                      setCanvasTool("select");
                      setArrowDraftSourceId("");
                    }}
                    type="button"
                  >
                    <Hand className="h-4 w-4" />
                    Move
                  </button>
                  <button
                    className={classNames(
                      "inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold transition hover:bg-ink/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35",
                      canvasTool === "arrow" && "bg-[#e9f2e6] text-[#31583a]"
                    )}
                    onClick={() => {
                      setCanvasTool("arrow");
                      setSelectedManualNodeId("");
                    }}
                    type="button"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Connect
                  </button>
                  {diagramCanvasTools.map(([kind, Icon, label]) => (
                    <button
                      className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold transition hover:bg-ink/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35"
                      key={kind}
                      onClick={() => {
                        addManualNode(kind);
                        setOpenCanvasMenu(null);
                      }}
                      type="button"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                  <button
                    className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold transition hover:bg-ink/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35 disabled:opacity-40"
                    disabled={!canUndoCanvas}
                    onClick={onUndoCanvas}
                    type="button"
                  >
                    <Undo2 className="h-4 w-4" />
                    Undo
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold transition hover:bg-ink/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35 disabled:opacity-40"
                    disabled={!canRedoCanvas}
                    onClick={onRedoCanvas}
                    type="button"
                  >
                    <Redo2 className="h-4 w-4" />
                    Redo
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold text-[#d34f32] transition hover:bg-[#fff0ea] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d34f32]/25 disabled:opacity-40"
                    disabled={!selectedManualNode}
                    onClick={deleteSelectedManualNode}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
                <button
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md bg-[#174b2a] px-3 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35 disabled:cursor-wait disabled:opacity-70"
                  disabled={isCanvasSaving}
                  onClick={onSaveCanvas}
                  type="button"
                >
                  {isCanvasSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isCanvasSaving ? "Saving" : "Save canvas"}
                </button>
                <p className="mt-2 text-[11px] font-semibold leading-4 text-ink/45">
                  {canvasTool === "arrow"
                    ? arrowDraftSourceId
                      ? "Pick a target card."
                      : "Pick a source card."
                    : canvasSavedAt
                      ? `Saved ${canvasSavedAt}`
                      : "Unsaved canvas"}
                </p>
              </>
            )}

            {openCanvasMenu === "history" && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/42">Version history</p>
                  <span className="text-[11px] font-semibold text-ink/42">
                    {canvasVersions.length} save{canvasVersions.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
                  {isCanvasVersionsLoading ? (
                    <p className="rounded-md border border-ink/8 bg-white/70 px-3 py-2 text-xs font-semibold text-ink/45">
                      Loading versions
                    </p>
                  ) : recentCanvasVersions.length ? (
                    recentCanvasVersions.map((version) => (
                      <button
                        aria-label={`Restore canvas version ${version.versionNumber}`}
                        className="flex w-full items-center justify-between gap-3 rounded-md border border-ink/8 bg-white/78 px-3 py-2 text-left transition hover:border-[#5d855e]/35 hover:bg-[#f4f8f1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35"
                        key={version.id}
                        onClick={() => onRestoreCanvasVersion(version)}
                        type="button"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold">
                            v{version.versionNumber} · {formatHistoryDate(version.createdAt)}
                          </span>
                          <span className="block truncate text-[11px] font-semibold text-ink/42">
                            {version.summary || "Canvas snapshot"}
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px] font-bold text-[#4f8256]">Restore</span>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-md border border-ink/8 bg-white/70 px-3 py-2 text-xs font-semibold text-ink/45">
                      No saved versions yet.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          )}

          <div
            className="flex items-center gap-2 rounded-lg border border-ink/10 bg-white/94 p-1.5 shadow-[0_18px_54px_rgba(16,16,14,0.14)] backdrop-blur"
            data-canvas-bottom-avoid="true"
            data-canvas-avoid="true"
            data-testid="canvas-toolbar"
          >
            <div className="hidden items-center gap-2 border-r border-ink/10 px-3 py-1.5 lg:flex">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-[#eef6e9] text-[#31583a]">
                <Layers className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-ink/72">Canvas</span>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-1">
              {([
                ["add", Plus, "Add"],
                ["tools", SlidersHorizontal, "Tools"],
                ["history", History, "History"],
              ] as const).map(([menu, Icon, label]) => (
                <button
                  aria-expanded={openCanvasMenu === menu}
                  className={classNames(
                    "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35",
                    openCanvasMenu === menu
                      ? "bg-[#174b2a] text-white shadow-[0_8px_18px_rgba(23,75,42,0.22)]"
                      : "text-ink/62 hover:bg-ink/[0.04] hover:text-ink"
                  )}
                  key={menu}
                  onClick={() => setOpenCanvasMenu(openCanvasMenu === menu ? null : menu)}
                  type="button"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedManualNode && (
        <div className="pointer-events-none absolute right-5 top-20 z-20 hidden w-[300px] max-w-[calc(100%-2rem)] md:block">
          <div
            className="pointer-events-auto mt-3 rounded-lg border border-ink/10 bg-white/95 p-4 shadow-[0_18px_48px_rgba(16,16,14,0.13)] backdrop-blur"
            data-canvas-avoid="true"
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              setSelectedManualNodeId("");
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Edit {manualCanvasKindLabel(selectedManualNode.kind)}</p>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-ink/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-ink/45">
                  {manualCanvasKindLabel(selectedManualNode.kind)}
                </span>
                <button
                  aria-label="Close properties"
                  className="rounded-md border border-ink/10 p-1.5 text-ink/45 transition hover:bg-ink/[0.04] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35"
                  onClick={() => setSelectedManualNodeId("")}
                  title="Close properties"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <label className="block" htmlFor={`canvas-node-title-${selectedManualNode.id}`}>
              <span className="text-xs font-semibold text-ink/45">Title</span>
              <input
                aria-label="Title"
                className="mt-1 w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#5d855e]/45"
                id={`canvas-node-title-${selectedManualNode.id}`}
                onChange={(event) => updateManualNode(selectedManualNode.id, { title: event.target.value })}
                value={selectedManualNode.title}
              />
            </label>
            <label className="mt-3 block" htmlFor={`canvas-node-body-${selectedManualNode.id}`}>
              <span className="text-xs font-semibold text-ink/45">{manualCanvasBodyLabel(selectedManualNode.kind)}</span>
              <textarea
                aria-label={manualCanvasBodyLabel(selectedManualNode.kind)}
                className="mt-1 h-20 w-full resize-none rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-medium leading-5 outline-none focus:border-[#5d855e]/45"
                id={`canvas-node-body-${selectedManualNode.id}`}
                onChange={(event) => updateManualNode(selectedManualNode.id, { body: event.target.value })}
                value={selectedManualNode.body}
              />
            </label>
            <div className="mt-3">
              <p className="text-xs font-semibold text-ink/45">Color</p>
              <div className="mt-2 flex gap-2">
                {(["green", "amber", "red", "ink"] as ManualCanvasColor[]).map((color) => (
                  <button
                    aria-label={`Set ${color} color`}
                    className={classNames(
                      "h-8 w-8 rounded-md border transition hover:scale-105",
                      getManualColorClasses(color, color === selectedManualNode.color)
                    )}
                    key={color}
                    onClick={() => updateManualNode(selectedManualNode.id, { color })}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="absolute bottom-12 left-5 z-10 hidden flex-col items-center overflow-hidden rounded-lg border border-ink/10 bg-white/90 shadow-[0_12px_34px_rgba(16,16,14,0.08)] backdrop-blur md:flex"
        data-canvas-bottom-avoid="true"
        data-canvas-avoid="true"
      >
        <button aria-label="Zoom out" className="border-b border-ink/10 px-3.5 py-3 hover:bg-ink/[0.04]" onClick={() => flow?.zoomOut()} type="button">
          <Minus className="h-4 w-4" />
        </button>
        <span className="border-b border-ink/10 px-2 py-2 text-xs font-semibold">100%</span>
        <button aria-label="Zoom in" className="border-b border-ink/10 px-3.5 py-3 hover:bg-ink/[0.04]" onClick={() => flow?.zoomIn()} type="button">
          <Plus className="h-4 w-4" />
        </button>
        <button aria-label="Fit view" className="px-3.5 py-3 hover:bg-ink/[0.04]" onClick={() => flow?.fitView()} type="button">
          <SquareDashedMousePointer className="h-4 w-4" />
        </button>
      </div>

      {drawerOpen && view === "evidence" && selectedReason && (
        <EvidenceDrawer
          onClose={() => {
            setDrawerOpen(false);
            setView("branch");
          }}
          reason={selectedReason}
          sources={getSourceRecords(workspace, selectedReason.sourceIds)}
        />
      )}
    </section>
  );
}

function InlineBranchPanel({
  branch,
  selectedReasonId,
  sources,
  onChallenge,
  onClose,
  onEvidence,
  onMove,
  onOpenSeparate,
  onReasonSelect,
  position,
}: {
  branch: Branch;
  selectedReasonId: string;
  sources: WorkspaceSource[];
  onChallenge: () => void;
  onClose: () => void;
  onEvidence: (reasonId: string) => void;
  onMove: (deltaX: number, deltaY: number) => void;
  onOpenSeparate: () => void;
  onReasonSelect: (reasonId: string) => void;
  position: { x: number; y: number };
}) {
	  const [activeTab, setActiveTab] = useState<"reasons" | "evidence" | "balance">("reasons");
	  const dragStateRef = useRef<{ lastX: number; lastY: number; moved: boolean; startX: number; startY: number } | null>(null);
	  const branchReasons = getBranchReasonNodes(branch);
	  const selectedReason =
	    branchReasons.find((reason) => reason.id === selectedReasonId) ||
	    branchReasons[0];
  const toneLabel =
    branch.tone === "support" ? "For" : branch.tone === "oppose" ? "Against" : "Mixed";

  return (
    <aside
      className="absolute z-30 hidden w-[min(760px,calc(100%-1.5rem))] overflow-hidden rounded-lg border border-ink/10 bg-white/95 shadow-[0_22px_70px_rgba(16,16,14,0.18)] backdrop-blur md:block"
      data-testid="inline-branch-panel"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className={classNames(
          "h-1.5",
          branch.tone === "support"
            ? "bg-[#5d855e]"
            : branch.tone === "oppose"
              ? "bg-[#e76e57]"
              : "bg-[#d8a729]"
        )}
      />
      <div
        className="flex cursor-move flex-wrap items-start justify-between gap-4 border-b border-ink/8 px-5 py-4"
        onMouseDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return;
          event.preventDefault();
          dragStateRef.current = {
            lastX: event.clientX,
            lastY: event.clientY,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
          };

          const handleMouseMove = (moveEvent: MouseEvent) => {
            const state = dragStateRef.current;
            if (!state) return;
            const totalDistance = Math.hypot(moveEvent.clientX - state.startX, moveEvent.clientY - state.startY);
            if (!state.moved && totalDistance < 3) return;
            state.moved = true;
            const deltaX = moveEvent.clientX - state.lastX;
            const deltaY = moveEvent.clientY - state.lastY;
            state.lastX = moveEvent.clientX;
            state.lastY = moveEvent.clientY;
            onMove(deltaX, deltaY);
          };

          const handleMouseUp = () => {
            dragStateRef.current = null;
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
          };

          window.addEventListener("mousemove", handleMouseMove);
          window.addEventListener("mouseup", handleMouseUp);
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={classNames(
                "rounded-md border px-2.5 py-1 text-xs font-bold",
                branch.tone === "support"
                  ? "border-[#8fb28c]/50 bg-[#eef6e9] text-[#4f8256]"
                  : branch.tone === "oppose"
                    ? "border-[#ef7f68]/50 bg-[#fff0ea] text-[#d34f32]"
                    : "border-[#e0a326]/45 bg-[#fff7e6] text-[#9b690e]"
              )}
            >
              {toneLabel}
            </span>
            <span className="text-xs font-semibold text-ink/45">{branch.status}</span>
            <span className="text-xs font-semibold text-ink/45">{branch.studiesLabel}</span>
          </div>
          <h2 className="mt-2 max-w-[48rem] text-xl font-semibold leading-tight">
            {branch.title}
          </h2>
          <p className="mt-2 max-w-[60ch] text-sm font-medium leading-6 text-ink/58">
            {branch.rationale}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-ink/[0.04]"
            onClick={onOpenSeparate}
            type="button"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Separate view
          </button>
          <button
            aria-label="Close branch details"
            className="rounded-md p-2 text-ink/45 transition hover:bg-ink/[0.04] hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid max-h-[360px] overflow-hidden lg:grid-cols-[190px_1fr]">
        <div className="border-b border-ink/8 bg-[#fbf8f0]/82 p-3 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-3 gap-1 lg:grid-cols-1">
            {([
              ["reasons", Network, "Reasons"],
              ["evidence", FileText, "Evidence"],
              ["balance", Shield, "Balance"],
            ] as const).map(([tab, Icon, label]) => (
              <button
                className={classNames(
                  "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition lg:justify-start",
                  activeTab === tab
                    ? "bg-white text-[#31583a] shadow-sm"
                    : "text-ink/58 hover:bg-white/70 hover:text-ink"
                )}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <button
            className="mt-3 hidden w-full items-center justify-center gap-2 rounded-md border border-[#e76e57]/35 bg-white px-3 py-2 text-sm font-semibold text-[#d34f32] transition hover:bg-[#fff0ea] lg:inline-flex"
            onClick={onChallenge}
            type="button"
          >
            <ThumbsDown className="h-4 w-4" />
            Challenge
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-4">
          {activeTab === "reasons" && (
            <div className="grid gap-3 md:grid-cols-2">
	              {branchReasons.map((reason) => (
                <div
                  className={classNames(
                    "rounded-lg border bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#5d855e]/35 hover:shadow-[0_12px_30px_rgba(16,16,14,0.08)]",
                    reason.id === selectedReason?.id ? "border-[#5d855e]/45 ring-4 ring-[#5d855e]/10" : "border-ink/8"
                  )}
                  key={reason.id}
                >
                  <button
                    className="block w-full text-left"
                    onClick={() => onReasonSelect(reason.id)}
                    type="button"
                  >
                    <span className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-5">{reason.title}</span>
                      </span>
                      <span className="max-w-full shrink-0 rounded-md border border-ink/8 bg-ink/[0.035] px-2 py-1 text-[11px] font-semibold leading-4 text-ink/52">
                        {reason.badge}
                      </span>
                    </span>
                  </button>
                  <button
                    className="mt-3 inline-flex items-center gap-1 rounded-md px-0 py-1 text-xs font-semibold text-[#4f8256] transition hover:text-[#31583a]"
                    onClick={() => onEvidence(reason.id)}
                    type="button"
                  >
                    Open evidence
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === "evidence" && (
            <div className="space-y-2">
              {sources.slice(0, 4).map((source) => (
                <div
                  className="grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 rounded-lg border border-ink/8 bg-[#fffdf8] px-4 py-3 text-left transition hover:border-[#d8a729]/45 hover:bg-[#fff9ed]"
                  key={source.id}
                >
                  <FileText className="mt-0.5 h-4 w-4 text-[#d99a18]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-5">{source.title}</span>
                    <span className="mt-1 block text-xs font-medium leading-5 text-ink/55">
                      {source.takeaway}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-md px-0 py-1 text-xs font-semibold text-[#4f8256] transition hover:text-[#31583a]"
                        onClick={() => selectedReason && onEvidence(selectedReason.id)}
                        type="button"
                      >
                        View details
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                      <SourceArticleLink compact source={source} />
                    </span>
                  </span>
                  <span className="rounded-md border border-ink/8 bg-white px-2 py-1 text-[11px] font-semibold text-ink/52">
                    {source.year || "n/a"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "balance" && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-ink/8 bg-white p-4">
                <p className="text-sm font-semibold">Counterpoint</p>
                <p className="mt-2 text-sm font-medium leading-6 text-ink/58">{branch.counterpoint}</p>
              </div>
              <div className="rounded-lg border border-ink/8 bg-white p-4">
                <p className="text-sm font-semibold">Confidence</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="rounded-md border border-[#d8a729]/35 bg-[#fff7e6] px-3 py-1 text-xs font-semibold text-[#9b690e]">
                    {branch.confidence}
                  </span>
                  <span className="text-xs font-semibold text-ink/45">
                    {branch.reasonsLabel} · {branch.assumptionsLabel}
                  </span>
                </div>
                <button
                  className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#e76e57]/35 px-3 py-2 text-sm font-semibold text-[#d34f32] transition hover:bg-[#fff0ea]"
                  onClick={onChallenge}
                  type="button"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Show challenge branch
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function EvidenceDrawer({
  reason,
  sources,
  onClose,
}: {
  reason: ReasonNode;
  sources: WorkspaceSource[];
  onClose: () => void;
}) {
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"evidence" | "assumptions" | "notes">("evidence");

	  return (
	    <aside className="absolute inset-x-3 bottom-3 z-50 max-h-[72%] overflow-y-auto rounded-lg border border-ink/10 bg-white/96 shadow-[0_24px_80px_rgba(16,16,14,0.18)] backdrop-blur md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:h-[calc(100%-2rem)] md:w-[560px] md:max-h-none">
	      <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-ink/18 md:hidden" />
	      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/8 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Evidence for {reason.title}</h2>
          <span className="rounded-md border border-[#e0a326]/45 bg-[#fff7e6] px-2.5 py-1 text-xs font-semibold text-[#9b690e]">
            {sources.length} {sources.length === 1 ? "study" : "studies"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(["evidence", "assumptions", "notes"] as const).map((tabName) => (
            <button
              className={classNames(
                "rounded-lg px-4 py-2 text-sm font-semibold hover:bg-ink/[0.04]",
                activeTab === tabName
                  ? "border border-ink/10 bg-white shadow-sm"
                  : "text-ink/48"
              )}
              key={tabName}
              onClick={() => setActiveTab(tabName)}
              type="button"
            >
              {tabName[0].toUpperCase() + tabName.slice(1)}
            </button>
          ))}
          <button className="rounded-lg border border-ink/10 px-4 py-2 text-sm font-semibold hover:bg-ink/[0.04]" onClick={onClose} type="button">
            Hide details
          </button>
        </div>
      </div>
      {activeTab === "evidence" && (
        <>
	          <div className="space-y-3 p-5">
	            {sources.slice(0, 3).map((source) => (
	              <div
	                className="block w-full rounded-lg border border-ink/8 bg-[#fffdf8] px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[#d8a729]/45 hover:bg-[#fff9ed] hover:shadow-[0_12px_30px_rgba(16,16,14,0.08)]"
	                key={source.id}
	              >
	                <button
	                  className="block w-full text-left"
	                  onClick={() => setExpandedSource((current) => (current === source.id ? null : source.id))}
	                  type="button"
	                >
	                  <div className="flex items-start gap-3">
	                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#e0a326]/30 bg-white text-[#d99a18]">
	                    <FileText className="h-4 w-4" />
	                  </span>
	                  <span className="min-w-0 flex-1">
	                    <span className="block text-sm font-semibold leading-5">{source.title}</span>
	                    {expandedSource === source.id && (
	                      <span className="mt-1.5 block text-xs font-medium leading-5 text-ink/55">
	                        {source.takeaway}
	                      </span>
	                    )}
	                  </span>
	                  <ChevronDown
	                    className={classNames(
	                      "mt-2 h-4 w-4 shrink-0 text-ink/42 transition",
	                      expandedSource === source.id && "rotate-180"
	                    )}
	                  />
	                  </div>
	                </button>
	                <div className="mt-3 flex flex-wrap items-center gap-2">
	                  <SourceArticleLink compact source={source} />
	                </div>
	                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
	                  <Metric label="Year" value={String(source.year || "n/a")} />
	                  <Metric label="Study type" value={source.type} />
	                  <Metric label="Publisher" value={source.sample || "n/a"} />
	                  <Metric label="Direction" tone="green" value={source.direction} />
	                  <Metric label="Quality" value={confidenceLabels[source.quality]} />
	                </div>
	              </div>
	            ))}
	          </div>
	        </>
	      )}
      {activeTab === "assumptions" && (
        <div className="grid gap-3 p-5 md:grid-cols-2">
          <div className="rounded-lg border border-ink/8 bg-white/75 p-4">
            <p className="text-sm font-semibold">Reason reviewed</p>
            <p className="mt-2 text-sm font-medium leading-6 text-ink/58">{reason.title}</p>
          </div>
          <div className="rounded-lg border border-ink/8 bg-white/75 p-4">
            <p className="text-sm font-semibold">Assumption count</p>
            <p className="mt-2 text-sm font-medium leading-6 text-ink/58">{reason.badge}</p>
          </div>
        </div>
      )}
      {activeTab === "notes" && (
        <div className="p-5">
          <div className="rounded-lg border border-ink/8 bg-white/75 p-4">
            <p className="text-sm font-semibold">Reviewer note</p>
            <p className="mt-2 text-sm font-medium leading-6 text-ink/58">
              Use the linked evidence to check whether this reason changes the claim direction or only narrows the responsible wording.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "green";
}) {
  return (
    <div className="min-w-0">
      <p
        className={classNames(
          "truncate rounded-md border px-2 py-1 text-xs font-semibold",
          tone === "green"
            ? "border-[#8fb28c]/40 bg-[#eef6e9] text-[#4f8256]"
            : "border-ink/8 bg-ink/[0.035] text-ink"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-ink/45">{label}</p>
    </div>
  );
}

function ShellSidebar({
  compact,
  activeItem,
  onSelect,
  panelOpen,
  onTogglePanel,
}: {
  compact: boolean;
  activeItem: string;
  onSelect: (label: string) => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const items = [
    [Home, "Dashboard"],
    [Network, "Analyses"],
    [FileText, "Evidence"],
    [Layers, "Compare"],
    [Bookmark, "Saved"],
    [Settings, "Settings"],
  ] as const;

  return (
    <aside
      className={classNames(
        "hidden shrink-0 flex-col border-r border-ink/10 bg-white/78 backdrop-blur md:flex",
        compact ? "w-[68px]" : "w-20"
      )}
    >
      <div className="flex h-[72px] items-center justify-center border-b border-ink/10">
        <button
          aria-label="Toggle claim panel"
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-ink/[0.04]"
          onClick={onTogglePanel}
          title={panelOpen ? "Hide claim panel" : "Show claim panel"}
          type="button"
        >
          <Menu className="h-5 w-5 text-ink/62" />
        </button>
      </div>
      <nav className="flex flex-1 flex-col items-center gap-3 pt-6">
        {items.map(([Icon, label]) => (
          <button
            aria-label={label}
            className={classNames(
              "flex h-12 w-12 items-center justify-center rounded-lg border text-ink/70 transition hover:border-ink/10 hover:bg-ink/[0.04] hover:text-ink",
              activeItem === label
                ? "border-[#d8e7d4] bg-[#e9f2e6] text-[#4f8256]"
                : "border-transparent"
            )}
            key={label}
            onClick={() => onSelect(label)}
            title={label}
            type="button"
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </nav>
      <div className="flex flex-col items-center gap-3 pb-6">
        <button
          aria-label="Toggle claim panel"
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-ink/[0.04]"
          onClick={onTogglePanel}
          title={panelOpen ? "Hide claim panel" : "Show claim panel"}
          type="button"
        >
          <PanelLeftClose className="h-5 w-5 text-ink/55" />
        </button>
        <button
          aria-label="Help"
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-ink/[0.04]"
          onClick={() => onSelect("Help")}
          title="Help"
          type="button"
        >
          <CircleHelp className="h-5 w-5 text-ink/55" />
        </button>
      </div>
    </aside>
  );
}

function TopBar({
  view,
  onExport,
  onSave,
  onOpenSettings,
  isLiveArtifact,
  isSaving,
  title,
  history,
  activeFilename,
  isHistoryLoading,
  historyError,
  onLoadHistory,
  onRefreshHistory,
}: {
  view: MapView;
  onExport: (format: ExportFormat) => void;
  onSave: () => void;
  onOpenSettings: () => void;
  isLiveArtifact: boolean;
  isSaving: boolean;
  title: string;
  history: TopicHistoryItem[];
  activeFilename: string;
  isHistoryLoading: boolean;
  historyError: string;
  onLoadHistory: (item: TopicHistoryItem) => void;
  onRefreshHistory: () => void;
}) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [claimMenuOpen, setClaimMenuOpen] = useState(false);
  const claimMenuRef = useRef<HTMLDivElement>(null);
  const exportOptions: Array<{ format: ExportFormat; label: string; detail: string }> = [
    { format: "pdf", label: "PDF", detail: "Downloadable report for class submission" },
    { format: "docx", label: "Word .docx", detail: "Editable written report" },
    { format: "xlsx", label: "Excel .xlsx", detail: "Spreadsheet of arguments and sources" },
    { format: "csv", label: "CSV", detail: "Simple spreadsheet import" },
    { format: "json", label: "JSON backup", detail: "Full app data for re-use" },
  ];

  useEffect(() => {
    if (!claimMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof globalThis.Node && claimMenuRef.current?.contains(event.target)) return;
      setClaimMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [claimMenuOpen]);

  return (
    <header className="relative z-[100] flex h-[80px] shrink-0 items-center justify-between overflow-visible border-b border-ink/8 bg-white/88 px-5 backdrop-blur md:px-7">
      <div className="flex min-w-0 items-center gap-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink/10 bg-ink shadow-[0_10px_30px_rgba(16,16,14,0.14)]">
            <img
              alt=""
              aria-hidden="true"
              className="h-8 w-8 object-contain"
              src="/readright-logo.png"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            ReadRight
          </h1>
        </div>
        <div ref={claimMenuRef} className="relative hidden min-w-0 border-l border-ink/10 pl-6 md:block">
          <button
            aria-expanded={claimMenuOpen}
            className="flex max-w-[520px] min-w-0 items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-ink/[0.035]"
            onClick={() => {
              setExportMenuOpen(false);
              setClaimMenuOpen((open) => !open);
            }}
            type="button"
          >
            <span className="min-w-0 flex-1 truncate text-base font-semibold tracking-[-0.01em]">
              {shortTitle(title, 60)}
            </span>
            <ChevronDown
              className={classNames(
                "h-4 w-4 shrink-0 text-ink/45 transition",
                claimMenuOpen && "rotate-180"
              )}
            />
            <span className="shrink-0 rounded-md border border-ink/10 bg-white px-2.5 py-1 text-xs font-semibold text-ink/52">
              {isLiveArtifact ? "Saved" : "Draft"}
            </span>
          </button>
          {claimMenuOpen && (
            <div className="absolute left-6 top-[calc(100%+0.65rem)] z-50 w-[420px] overflow-hidden rounded-lg border border-ink/10 bg-white shadow-[0_22px_64px_rgba(16,16,14,0.18)]">
              <div className="border-b border-ink/8 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink/42">Current claim</p>
                <p className="mt-1 truncate text-sm font-semibold">{title}</p>
              </div>

              <div className="max-h-[360px] overflow-y-auto p-2">
                <div className="flex items-center justify-between px-2 py-2">
                  <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-ink/42">
                    <History className="h-3.5 w-3.5" />
                    Past claims
                  </p>
                  <button
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-ink/45 transition hover:bg-ink/[0.04] hover:text-ink"
                    onClick={onRefreshHistory}
                    type="button"
                  >
                    <RefreshCcw className={classNames("h-3.5 w-3.5", isHistoryLoading && "animate-spin")} />
                    Refresh
                  </button>
                </div>

                <div className="space-y-1">
                  {history.length ? (
                    history.slice(0, 6).map((item) => (
                      <button
                        className={classNames(
                          "w-full rounded-md px-3 py-2.5 text-left transition",
                          activeFilename === item.filename
                            ? "bg-[#e9f2e6] text-[#31583a]"
                            : "hover:bg-ink/[0.035]"
                        )}
                        disabled={Boolean(item.unreadable)}
                        key={item.filename}
                        onClick={() => {
                          setClaimMenuOpen(false);
                          onLoadHistory(item);
                        }}
                        type="button"
                      >
                        <span className="block truncate text-sm font-semibold">
                          {item.unreadable ? item.filename : item.query || "Untitled evaluation"}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-ink/45">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatHistoryDate(item.generatedAt)}
                          <span>{item.claimCount || 0} claims</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="rounded-md border border-dashed border-ink/12 bg-ink/[0.025] px-3 py-3 text-xs font-semibold leading-5 text-ink/45">
                      {isHistoryLoading ? "Loading saved claims." : "No past claims saved yet."}
                    </p>
                  )}
                </div>
              </div>

              {historyError && (
                <p className="border-t border-ink/8 px-4 py-3 text-xs font-semibold leading-5 text-[#b94736]">
                  {historyError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <button
          aria-label="Open settings"
          className="inline-flex items-center gap-2 rounded-lg border border-ink/10 bg-white/78 px-3 py-3 text-sm font-semibold text-ink/62 shadow-[0_8px_20px_rgba(16,16,14,0.06)] transition hover:-translate-y-0.5 hover:border-[#4f8256]/25 hover:bg-[#f4f8ef] hover:text-[#31583a] md:px-4"
          onClick={onOpenSettings}
          type="button"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden lg:inline">Settings</span>
        </button>
        <button
          aria-label="Save canvas"
          className="inline-flex items-center gap-2 rounded-lg border border-[#4f8256]/20 bg-gradient-to-br from-white via-[#f4f8ef] to-[#e6f0df] px-3 py-3 text-sm font-semibold text-[#31583a] shadow-[0_10px_24px_rgba(76,125,114,0.12)] transition hover:-translate-y-0.5 hover:border-[#4f8256]/30 hover:shadow-[0_14px_32px_rgba(76,125,114,0.18)] disabled:cursor-wait disabled:opacity-70 md:px-4"
          disabled={isSaving}
          onClick={onSave}
          type="button"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="hidden sm:inline">{isSaving ? "Saving" : "Save"}</span>
        </button>
        <div className="relative">
          <button
            aria-expanded={exportMenuOpen}
            className="inline-flex items-center gap-2 rounded-lg border border-[#d34f32]/18 bg-gradient-to-br from-white via-[#fff8ea] to-[#f8e4d5] px-4 py-3 text-sm font-semibold text-[#6f382b] shadow-[0_10px_24px_rgba(211,79,50,0.1)] transition hover:-translate-y-0.5 hover:border-[#d34f32]/28 hover:shadow-[0_14px_32px_rgba(211,79,50,0.16)]"
            onClick={() => {
              setClaimMenuOpen(false);
              setExportMenuOpen((open) => !open);
            }}
            type="button"
          >
            <Download className="h-4 w-4" />
            Export
            <ChevronDown className="h-4 w-4 text-[#8f4938]/70" />
          </button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[260px] rounded-lg border border-ink/10 bg-white/95 p-1.5 shadow-[0_18px_48px_rgba(16,16,14,0.16)] backdrop-blur">
              {exportOptions.map((option) => (
                <button
                  className="flex w-full items-start gap-2 rounded-md px-2.5 py-2.5 text-left transition hover:bg-[#f4f8f1]"
                  key={option.format}
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExport(option.format);
                  }}
                  type="button"
                >
                  <Download className="mt-0.5 h-4 w-4 shrink-0 text-[#4f8256]" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{option.label}</span>
                    <span className="mt-0.5 block text-xs font-medium leading-4 text-ink/48">
                      {option.detail}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e9f2e6] text-sm font-bold text-[#31583a] md:hidden">
          {view === "evidence" ? "EV" : "AS"}
        </div>
      </div>
    </header>
  );
}

function SettingsModal({
  open,
  settings,
  isLoading,
  isSaving,
  error,
  onClose,
  onRefresh,
  onOpenKeybindings,
  onSave,
}: {
  open: boolean;
  settings: RuntimeSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  onClose: () => void;
  onRefresh: () => void;
  onOpenKeybindings: () => void;
  onSave: (payload: {
    reviewEngine: ReviewEngine;
    openaiApiKey?: string;
    clearOpenaiApiKey?: boolean;
    openaiModel: string;
    openaiReasoningEffort: ReasoningEffort;
    codexBin: string;
  }) => void;
}) {
  const [reviewEngine, setReviewEngine] = useState<ReviewEngine>("auto");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [clearOpenaiApiKey, setClearOpenaiApiKey] = useState(false);
  const [openaiModel, setOpenaiModel] = useState("gpt-5.5");
  const [openaiReasoningEffort, setOpenaiReasoningEffort] = useState<ReasoningEffort>("medium");
  const [codexBin, setCodexBin] = useState("codex");

  useEffect(() => {
    if (!settings) return;
    setReviewEngine(settings.reviewEngine);
    setOpenaiApiKey("");
    setClearOpenaiApiKey(false);
    setOpenaiModel(settings.openaiModel || "gpt-5.5");
    setOpenaiReasoningEffort(settings.openaiReasoningEffort || "medium");
    setCodexBin(settings.codexBin || "codex");
  }, [settings]);

  if (!open) return null;

  const activeEngineLabel =
    settings?.activeEngine === "openai_api" ? "OpenAI API" : "Codex CLI";
  const codexConnected = Boolean(settings?.codexCli.available);
  const codexCommand = settings?.codexCli.command || codexBin || "codex";
  const codexNotFound = !codexConnected && /not found|ENOENT/i.test(settings?.codexCli.error || "");
  const codexStatusLabel = codexConnected ? "Connected" : codexNotFound ? "Not found" : "Needs login";
  const codexStatusMessage = codexConnected
    ? `${settings?.codexCli.version || "Codex is available."} · ${codexCommand}`
    : codexNotFound
      ? "The server cannot find the Codex binary. Install Codex or paste the full path below."
      : settings?.codexCli.error || "Codex was found, but the CLI needs attention before it can run reviews.";
  const canSubmit = !isSaving && !isLoading;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/32 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-ink/10 bg-[#fffdf7] shadow-[0_28px_90px_rgba(16,16,14,0.24)]">
        <div className="flex shrink-0 items-start justify-between gap-5 border-b border-ink/8 px-5 py-4 md:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#4f8256]">
              Runtime settings
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em]">
              Review engine
            </h2>
          </div>
          <button
            aria-label="Close settings"
            className="rounded-md p-2 text-ink/45 transition hover:bg-ink/[0.04] hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                value: "auto" as ReviewEngine,
                title: "Auto",
                detail: "Use OpenAI API when a key is saved, otherwise Codex CLI.",
                Icon: Sparkles,
              },
              {
                value: "openai_api" as ReviewEngine,
                title: "OpenAI API",
                detail: "Run reviews with the saved API key on this server.",
                Icon: Lock,
              },
              {
                value: "codex_cli" as ReviewEngine,
                title: "Codex CLI",
                detail: "Run through a local Codex install and existing login.",
                Icon: Network,
              },
            ].map(({ value, title, detail, Icon }) => (
              <button
                className={classNames(
                  "min-h-[128px] rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:bg-white",
                  reviewEngine === value
                    ? "border-[#5d855e]/45 bg-[#e9f2e6] text-[#31583a]"
                    : "border-ink/10 bg-white/58 text-ink"
                )}
                key={value}
                onClick={() => setReviewEngine(value)}
                type="button"
              >
                <span className="flex items-center justify-between gap-3">
                  <Icon className="h-5 w-5" />
                  {reviewEngine === value && <Check className="h-4 w-4" />}
                </span>
                <span className="mt-4 block text-sm font-semibold">{title}</span>
                <span className="mt-1 block text-xs font-medium leading-5 opacity-70">
                  {detail}
                </span>
              </button>
            ))}
          </div>

          <button
            className="mt-5 flex w-full items-center justify-between gap-4 rounded-lg border border-[#5d855e]/24 bg-[#eef6eb] px-5 py-4 text-left text-[#31583a] shadow-[0_12px_30px_rgba(76,125,72,0.08)] transition hover:-translate-y-0.5 hover:border-[#5d855e]/38 hover:bg-[#e4f0df] hover:shadow-[0_16px_36px_rgba(76,125,72,0.12)]"
            onClick={onOpenKeybindings}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#5d855e]/22 bg-white/75">
                <Keyboard className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold">Keybinds</span>
                <span className="mt-1 block text-sm font-semibold leading-5 text-[#31583a]/68">
                  Customize keyboard shortcuts for app actions and canvas tools.
                </span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 opacity-70" />
          </button>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <section className="rounded-lg border border-ink/10 bg-white/72 p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">OpenAI API</h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-ink/48">
                    {settings?.openaiConfigured
                      ? "An API key is saved on the local server."
                      : "No API key is saved yet."}
                  </p>
                </div>
                <span
                  className={classNames(
                    "rounded-md border px-2 py-1 text-[11px] font-bold",
                    settings?.openaiConfigured
                      ? "border-[#5d855e]/35 bg-[#e9f2e6] text-[#31583a]"
                      : "border-[#d34f32]/25 bg-[#fff0ea] text-[#b94736]"
                  )}
                >
                  {settings?.openaiConfigured ? "Configured" : "Missing"}
                </span>
              </div>

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-ink/44">
                  API key
                </span>
                <input
                  autoComplete="off"
                  className="w-full rounded-md border border-ink/10 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[#5d855e]/55 focus:ring-2 focus:ring-[#5d855e]/12"
                  onChange={(event) => {
                    setOpenaiApiKey(event.target.value);
                    setClearOpenaiApiKey(false);
                  }}
                  placeholder={settings?.openaiConfigured ? "Leave blank to keep saved key" : "sk-..."}
                  type="password"
                  value={openaiApiKey}
                />
              </label>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px]">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-ink/44">
                    Model
                  </span>
                  <input
                    className="w-full rounded-md border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#5d855e]/55"
                    onChange={(event) => setOpenaiModel(event.target.value)}
                    value={openaiModel}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-ink/44">
                    Effort
                  </span>
                  <span className="relative block">
                    <select
                      className="w-full appearance-none rounded-md border border-ink/10 bg-white px-3 py-2.5 pr-8 text-sm font-semibold outline-none focus:border-[#5d855e]/55"
                      onChange={(event) =>
                        setOpenaiReasoningEffort(event.target.value as ReasoningEffort)
                      }
                      value={openaiReasoningEffort}
                    >
                      {(["minimal", "low", "medium", "high"] as ReasoningEffort[]).map((effort) => (
                        <option key={effort} value={effort}>
                          {effort}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
                  </span>
                </label>
              </div>

              {settings?.openaiConfigured && (
                <button
                  aria-checked={clearOpenaiApiKey}
                  className="mt-3 flex w-full items-center justify-between rounded-md border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold text-ink/62 transition hover:bg-[#fff0ea] hover:text-[#b94736]"
                  onClick={() => {
                    setClearOpenaiApiKey((clear) => !clear);
                    setOpenaiApiKey("");
                  }}
                  role="checkbox"
                  type="button"
                >
                  Clear saved API key
                  <span
                    className={classNames(
                      "flex h-5 w-5 items-center justify-center rounded border",
                      clearOpenaiApiKey ? "border-[#d34f32] bg-[#d34f32] text-white" : "border-ink/18 bg-white"
                    )}
                  >
                    {clearOpenaiApiKey && <Check className="h-3 w-3" />}
                  </span>
                </button>
              )}
            </section>

            <section className="rounded-lg border border-ink/10 bg-white/72 p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">Codex CLI</h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-ink/48">
                    {codexStatusMessage}
                  </p>
                </div>
                <span
                  className={classNames(
                    "rounded-md border px-2 py-1 text-[11px] font-bold",
                    codexConnected
                      ? "border-[#5d855e]/35 bg-[#e9f2e6] text-[#31583a]"
                      : "border-[#d34f32]/25 bg-[#fff0ea] text-[#b94736]"
                  )}
                >
                  {codexStatusLabel}
                </span>
              </div>

              <label className="block">
                <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.08em] text-ink/44">
                  Codex binary
                </span>
                <input
                  className="w-full rounded-md border border-ink/10 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[#5d855e]/55"
                  onChange={(event) => setCodexBin(event.target.value)}
                  placeholder="/Applications/Codex.app/Contents/Resources/codex"
                  value={codexBin}
                />
              </label>

              {settings?.codexCli.command && settings.codexCli.command !== codexBin && (
                <button
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#5d855e]/20 bg-[#eef6eb] px-3 py-2.5 text-sm font-semibold text-[#31583a] transition hover:bg-[#e4f0df]"
                  onClick={() => setCodexBin(settings.codexCli.command || "codex")}
                  type="button"
                >
                  Use detected path
                </button>
              )}

              <button
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-ink/10 bg-white px-3 py-2.5 text-sm font-semibold text-ink/62 transition hover:bg-[#f4f8ef] hover:text-[#31583a]"
                onClick={onRefresh}
                type="button"
              >
                <RefreshCcw className={classNames("h-4 w-4", isLoading && "animate-spin")} />
                Recheck Codex
              </button>

              <div className="mt-4 rounded-md border border-ink/8 bg-[#f7f4ec] p-3 text-xs font-semibold leading-5 text-ink/52">
                {codexNotFound ? (
                  <>
                    On macOS with Codex installed, this is usually{" "}
                    <code className="rounded bg-white px-1.5 py-0.5">
                      /Applications/Codex.app/Contents/Resources/codex
                    </code>
                    . Paste that path, save, then refresh.
                  </>
                ) : (
                  <>
                    If reviews fail after Codex is found, run{" "}
                    <code className="rounded bg-white px-1.5 py-0.5">codex login</code>
                    {" "}once in a terminal.
                  </>
                )}
              </div>
            </section>
          </div>

          <div className="mt-4 rounded-lg border border-ink/10 bg-white/62 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Current runtime</p>
                <p className="mt-1 text-xs font-semibold text-ink/48">
                  Active engine: {activeEngineLabel} · Settings file: {settings?.envFile || ".env"}
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-xs font-semibold text-ink/52 hover:bg-ink/[0.035]"
                onClick={onRefresh}
                type="button"
              >
                <RefreshCcw className={classNames("h-3.5 w-3.5", isLoading && "animate-spin")} />
                Refresh status
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-[#e76e57]/25 bg-[#fff0ea] p-3 text-xs font-semibold leading-5 text-[#b94736]">
              {error}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-ink/8 bg-white/64 px-5 py-4 md:px-6">
          <button
            className="rounded-lg border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink/58 transition hover:bg-ink/[0.035] hover:text-ink"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-[#174b2a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(23,75,42,0.22)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
            disabled={!canSubmit}
            onClick={() =>
              onSave({
                reviewEngine,
                openaiApiKey: openaiApiKey.trim() || undefined,
                clearOpenaiApiKey,
                openaiModel: openaiModel.trim() || "gpt-5.5",
                openaiReasoningEffort,
                codexBin: codexBin.trim() || "codex",
              })
            }
            type="button"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}

function KeybindingsModal({
  open,
  bindings,
  onChange,
  onClose,
  onReset,
}: {
  open: boolean;
  bindings: ShortcutMap;
  onChange: (actionId: ShortcutId, shortcut: string) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const [listeningActionId, setListeningActionId] = useState<ShortcutId | null>(null);

  useEffect(() => {
    if (!open) setListeningActionId(null);
  }, [open]);

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[220] flex items-center justify-center bg-ink/36 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-ink/10 bg-[#fffdf7] shadow-[0_28px_90px_rgba(16,16,14,0.25)]">
        <div className="shrink-0 flex items-start justify-between gap-5 border-b border-ink/8 px-5 py-4 md:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#4f8256]">
              Settings
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em]">
              Keybinds
            </h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-ink/48">
              Click a shortcut, press the new key combination, and duplicates are cleared automatically.
            </p>
          </div>
          <button
            aria-label="Close keybinds"
            className="rounded-md p-2 text-ink/45 transition hover:bg-ink/[0.04] hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {shortcutCategoryOrder.map((category) => {
              const definitions = shortcutDefinitions.filter((definition) => definition.category === category);
              return (
                <section className="rounded-lg border border-ink/10 bg-white/72 p-4" key={category}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{category}</h3>
                    <span className="rounded-md border border-ink/8 bg-[#f7f4ec] px-2 py-1 text-[11px] font-bold text-ink/42">
                      {definitions.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {definitions.map((definition) => {
                      const listening = listeningActionId === definition.id;
                      return (
                        <div
                          className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-ink/8 bg-white px-3 py-2"
                          key={definition.id}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{definition.label}</p>
                            <p className="mt-0.5 text-[11px] font-semibold text-ink/42">
                              Default {formatShortcut(definition.defaultShortcut)}
                            </p>
                          </div>
                          <button
                            aria-label={`Change ${definition.label} keybind`}
                            className={classNames(
                              "min-w-[116px] rounded-md border px-3 py-2 text-center text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35",
                              listening
                                ? "border-[#5d855e] bg-[#e9f2e6] text-[#31583a]"
                                : "border-ink/10 bg-[#f7f4ec] text-ink/65 hover:bg-[#eef6eb] hover:text-[#31583a]"
                            )}
                            onBlur={() => setListeningActionId((current) => (current === definition.id ? null : current))}
                            onClick={() => setListeningActionId(definition.id)}
                            onKeyDown={(event) => {
                              if (!listening) return;
                              event.preventDefault();
                              event.stopPropagation();
                              const shortcut = shortcutFromKeyboardEvent(event.nativeEvent);
                              if (!shortcut) return;
                              onChange(definition.id, shortcut);
                              setListeningActionId(null);
                            }}
                            type="button"
                          >
                            {listening ? "Press keys" : formatShortcut(bindings[definition.id])}
                          </button>
                          <button
                            aria-label={`Clear ${definition.label} keybind`}
                            className="rounded-md p-2 text-ink/38 transition hover:bg-[#fff0ea] hover:text-[#b94736]"
                            onClick={() => onChange(definition.id, "")}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 bg-white/64 px-5 py-4 md:px-6">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink/58 transition hover:bg-ink/[0.035] hover:text-ink"
            onClick={onReset}
            type="button"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset defaults
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-[#174b2a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(23,75,42,0.22)] transition hover:-translate-y-0.5"
            onClick={onClose}
            type="button"
          >
            <Check className="h-4 w-4" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ClaimPanel({
  open,
  onToggleOpen,
  mode,
  setMode,
  query,
  setQuery,
  queryInputRef,
  articleUrl,
  setArticleUrl,
  articleText,
  setArticleText,
  onRun,
  isRunning,
  view,
  setView,
  apiError,
  activeFilter,
  onFilterChange,
  preSearchFilters,
  setPreSearchFilters,
  showCounts,
  setShowCounts,
  groupSimilar,
  setGroupSimilar,
  history,
  activeFilename,
  isHistoryLoading,
  historyError,
	onLoadHistory,
	onRefreshHistory,
}: {
  open: boolean;
  onToggleOpen: () => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  query: string;
  setQuery: (value: string) => void;
  queryInputRef: RefObject<HTMLTextAreaElement>;
  articleUrl: string;
  setArticleUrl: (value: string) => void;
  articleText: string;
  setArticleText: (value: string) => void;
  onRun: () => void;
  isRunning: boolean;
  view: MapView;
  setView: (view: MapView) => void;
  apiError: string;
  activeFilter: WorkspaceFilter;
  onFilterChange: (filter: WorkspaceFilter) => void;
  preSearchFilters: PreSearchFilters;
  setPreSearchFilters: (filters: PreSearchFilters) => void;
  showCounts: boolean;
  setShowCounts: (value: boolean) => void;
  groupSimilar: boolean;
  setGroupSimilar: (value: boolean) => void;
  history: TopicHistoryItem[];
  activeFilename: string;
  isHistoryLoading: boolean;
  historyError: string;
	onLoadHistory: (item: TopicHistoryItem) => void;
	onRefreshHistory: () => void;
}) {
  const [evidenceTypesExpanded, setEvidenceTypesExpanded] = useState(false);

  if (!open) return null;

  const selectedEvidenceTypes = preSearchFilters.evidenceTypes.length
    ? preSearchFilters.evidenceTypes
    : defaultPreSearchFilters.evidenceTypes;
  const evidenceTypeSummary =
    selectedEvidenceTypes.length === 1
      ? selectedEvidenceTypes[0]
      : `${selectedEvidenceTypes.length} evidence types`;
  const evidenceTypePreview = selectedEvidenceTypes.slice(0, 2).join(", ");

  return (
    <aside
      className={classNames(
        "shrink-0 overflow-y-auto border-r border-ink/8 bg-[#f7f4ec] p-4 pb-24 transition-all md:max-h-full md:p-6 md:pb-24",
        "w-full md:w-[340px]"
      )}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-[-0.01em]">Your claim</h2>
        <button
          aria-label="Hide claim panel"
          className="hidden rounded-md p-1.5 text-ink/40 hover:bg-ink/[0.04] hover:text-ink md:block"
          onClick={onToggleOpen}
          title="Hide claim panel"
          type="button"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-ink/8 bg-ink/[0.035] p-1">
        <button
          className={classNames(
            "rounded-md py-2 text-xs font-semibold",
            mode === "query" ? "bg-white shadow-sm" : "text-ink/50"
          )}
          onClick={() => setMode("query")}
          type="button"
        >
          Claim
        </button>
        <button
          className={classNames(
            "rounded-md py-2 text-xs font-semibold",
            mode === "article" ? "bg-white shadow-sm" : "text-ink/50"
          )}
          onClick={() => setMode("article")}
          type="button"
        >
          Article
        </button>
      </div>

      {mode === "query" ? (
        <label className="block rounded-lg border border-ink/10 bg-white p-5 shadow-[0_18px_55px_rgba(16,16,14,0.06)]">
          <textarea
            ref={queryInputRef}
            className="h-36 w-full resize-none bg-transparent text-2xl font-semibold leading-snug tracking-[-0.025em] outline-none placeholder:text-ink/28"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter a claim"
            value={query}
          />
          <span className="block text-right text-xs font-semibold text-ink/38">
            {query.length}/200
          </span>
        </label>
      ) : (
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-ink/10 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[#5d855e]/45"
            onChange={(event) => setArticleUrl(event.target.value)}
            placeholder="Article URL"
            value={articleUrl}
          />
          <textarea
            className="h-28 w-full resize-none rounded-lg border border-ink/10 bg-white px-3 py-3 text-sm font-medium leading-5 outline-none focus:border-[#5d855e]/45"
            onChange={(event) => setArticleText(event.target.value)}
            placeholder="Optional article excerpt"
            value={articleText}
          />
        </div>
      )}

      <details
        className="mt-4 rounded-lg border border-ink/10 bg-white/72 p-4 shadow-[0_10px_30px_rgba(16,16,14,0.04)]"
        open
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-[#4f8256]" />
            Search filters
          </span>
          <span className="text-xs font-semibold text-ink/42">
            {preSearchFilters.topicArea} · {evidenceTypeSummary}
          </span>
        </summary>
        <div className="mt-4 space-y-3">
          {preSearchFilterGroups.map(({ key, label, Icon, options }) => (
            <label className="block" key={key}>
              <span className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/44">
                <Icon className="h-4 w-4 text-[#4f8256]" />
                {label}
              </span>
              <span className="relative block">
                <select
                  className="w-full appearance-none rounded-md border border-ink/10 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-ink outline-none transition focus:border-[#5d855e]/55 focus:ring-2 focus:ring-[#5d855e]/12"
                  onChange={(event) =>
                    setPreSearchFilters({
                      ...preSearchFilters,
                      [key]: event.target.value,
                    })
                  }
                  value={preSearchFilters[key]}
                >
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
              </span>
            </label>
          ))}
	          <div className="rounded-lg border border-ink/10 bg-white">
	            <button
	              aria-expanded={evidenceTypesExpanded}
	              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-ink/[0.025]"
	              onClick={() => setEvidenceTypesExpanded((expanded) => !expanded)}
	              type="button"
	            >
	              <span className="min-w-0">
	                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/44">
	                  <Boxes className="h-4 w-4 text-[#4f8256]" />
	                  Evidence type
	                </span>
	                <span className="mt-1 block truncate text-sm font-semibold text-ink/66">
	                  {evidenceTypePreview}
	                  {selectedEvidenceTypes.length > 2 ? ` +${selectedEvidenceTypes.length - 2}` : ""}
	                </span>
	              </span>
	              <span className="flex shrink-0 items-center gap-2">
	                <span className="rounded-md border border-ink/8 bg-[#f7f4ec] px-2 py-1 text-[11px] font-bold text-ink/45">
	                  {selectedEvidenceTypes.length}
	                </span>
	                <ChevronDown
	                  className={classNames(
	                    "h-4 w-4 text-ink/45 transition",
	                    evidenceTypesExpanded && "rotate-180"
	                  )}
	                />
	              </span>
	            </button>
	            {evidenceTypesExpanded && (
	              <div className="space-y-1 border-t border-ink/8 p-2">
	                {evidenceTypeOptions.map((option) => {
	                  const checked = selectedEvidenceTypes.includes(option);
	                  const nextEvidenceTypes = checked
	                    ? selectedEvidenceTypes.filter((item) => item !== option)
	                    : [...selectedEvidenceTypes, option];
	                  return (
	                    <button
	                      aria-checked={checked}
	                      className={classNames(
	                        "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-semibold transition",
	                        checked ? "bg-[#e9f2e6] text-[#31583a]" : "text-ink/66 hover:bg-ink/[0.035]"
	                      )}
	                      key={option}
	                      onClick={() =>
	                        setPreSearchFilters({
	                          ...preSearchFilters,
	                          evidenceTypes: nextEvidenceTypes.length
	                            ? nextEvidenceTypes
	                            : defaultPreSearchFilters.evidenceTypes,
	                        })
	                      }
	                      role="checkbox"
	                      type="button"
	                    >
	                      <span
	                        className={classNames(
	                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
	                          checked ? "border-[#4f8256] bg-[#4f8256] text-white" : "border-ink/20 bg-white"
	                        )}
	                      >
	                        {checked && <Check className="h-3 w-3" />}
	                      </span>
	                      <span>{option}</span>
	                    </button>
	                  );
	                })}
	              </div>
	            )}
	          </div>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink/44">
              <Calendar className="h-4 w-4 text-[#4f8256]" />
              Publication window
            </span>
            <span className="relative block">
              <select
                className="w-full appearance-none rounded-md border border-ink/10 bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-ink outline-none transition focus:border-[#5d855e]/55 focus:ring-2 focus:ring-[#5d855e]/12"
                onChange={(event) =>
                  setPreSearchFilters({
                    ...preSearchFilters,
                    publicationWindow: event.target.value,
                  })
                }
                value={preSearchFilters.publicationWindow}
              >
                {publicationWindowOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
            </span>
          </label>
        </div>
      </details>

      <button
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#174b2a] px-5 py-4 text-base font-semibold text-white shadow-[0_18px_42px_rgba(23,75,42,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isRunning}
        onClick={onRun}
        type="button"
      >
        {isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Network className="h-5 w-5" />}
        {isRunning ? "Building map" : "Build map"}
      </button>
      {apiError && (
        <div className="mt-4 rounded-lg border border-[#e76e57]/25 bg-[#fff0ea] p-3 text-xs font-semibold leading-5 text-[#b94736]">
          {apiError}
        </div>
      )}

      <details className="mt-4 rounded-lg border border-ink/10 bg-white/62 p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
          <span className="inline-flex items-center gap-2">
            <History className="h-4 w-4 text-ink/45" />
            Saved reviews
          </span>
          <span className="text-xs font-semibold text-ink/42">{history.length} saved</span>
        </summary>
        <button
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-ink/45 hover:text-ink"
          onClick={onRefreshHistory}
          type="button"
        >
          <RefreshCcw className={classNames("h-3.5 w-3.5", isHistoryLoading && "animate-spin")} />
          Refresh list
        </button>
        <div className="max-h-[248px] space-y-2 overflow-y-auto pr-1">
          {history.length ? (
            history.slice(0, 12).map((item) => (
              <button
                className={classNames(
                  "w-full rounded-lg border px-3 py-3 text-left transition hover:bg-white",
                  activeFilename === item.filename
                    ? "border-[#5d855e]/40 bg-[#e9f2e6]"
                    : "border-ink/8 bg-white/55"
                )}
                disabled={Boolean(item.unreadable)}
                key={item.filename}
                onClick={() => onLoadHistory(item)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-5">
                    {item.unreadable ? item.filename : item.query || "Untitled evaluation"}
                  </p>
                  <span className="shrink-0 rounded-md border border-ink/8 bg-white/70 px-2 py-1 text-[11px] font-semibold text-ink/52">
                    {item.confidence ? confidenceLabels[item.confidence] : "n/a"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-ink/45">
                  <Clock3 className="h-3.5 w-3.5" />
                  <span>{formatHistoryDate(item.generatedAt)}</span>
                  <span>{item.claimCount || 0} claims</span>
                  <span>{item.sourceCount || 0} sources</span>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-ink/12 bg-white/40 p-3 text-xs font-semibold leading-5 text-ink/45">
              {isHistoryLoading ? "Loading saved evaluations." : "No saved local evaluations yet."}
            </div>
          )}
        </div>
        {historyError && (
          <p className="mt-2 text-xs font-semibold leading-5 text-[#b94736]">{historyError}</p>
        )}
      </details>

      <details className="mt-4 rounded-lg border border-ink/10 bg-white/62 p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
          <span className="inline-flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink/45" />
            View settings
          </span>
          <span className="text-xs font-semibold text-ink/42">{activeFilter}</span>
        </summary>
        <div className="mt-4 mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-ink/42">Show</p>
          <button
            className="text-xs font-semibold text-ink/45 hover:text-ink"
            onClick={() => onFilterChange("All")}
            type="button"
          >
            Reset
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["All", "For", "Against", "Evidence", "Assumptions", "Unresolved"] as WorkspaceFilter[]).map((label) => (
            <button
              className={classNames(
                "rounded-full border px-3 py-2 text-xs font-semibold transition hover:bg-white",
                activeFilter === label
                  ? "border-[#5d855e]/35 bg-[#e9f2e6] text-[#31583a]"
                  : "border-ink/10 bg-white/55 text-ink/65"
              )}
              key={label}
              onClick={() => onFilterChange(label)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 border-t border-ink/8 pt-2">
          {[
            ["Show counts", showCounts],
            ["Group similar", groupSimilar],
            ["Evidence drawer", view === "evidence"],
          ].map(([label, checked]) => (
          <button
            className="flex w-full items-center justify-between border-t border-ink/8 py-3 text-sm font-medium first:border-t-0"
            key={label as string}
            onClick={() => {
              if (label === "Show counts") setShowCounts(!showCounts);
              if (label === "Group similar") setGroupSimilar(!groupSimilar);
              if (label === "Evidence drawer") setView(view === "evidence" ? "branch" : "evidence");
            }}
            type="button"
          >
            {label as string}
            <span
              className={classNames(
                "flex h-5 w-9 items-center rounded-full p-0.5 transition",
                checked ? "bg-[#5d855e]" : "bg-ink/16"
              )}
            >
              <span
                className={classNames(
                  "h-4 w-4 rounded-full bg-white transition",
                  checked && "translate-x-4"
                )}
              />
            </span>
          </button>
          ))}
        </div>
      </details>
    </aside>
  );
}

function BuildProgressOverlay({ progress }: { progress: RunProgress }) {
  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/[0.18] px-4 py-6 backdrop-blur-[12px]"
      role="status"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,253,247,0.42),transparent_36%),linear-gradient(180deg,rgba(244,239,227,0.12),rgba(16,16,14,0.16))]" />
      <BuildProgressPanel progress={progress} />
    </div>
  );
}

function BuildProgressPanel({ progress }: { progress: RunProgress }) {
  const activeIndex = runProgressSteps.findIndex((step) => step.id === progress.stepId);
  const boundedProgress = Math.min(100, Math.max(0, progress.progress));

  return (
    <div className="relative z-10 w-[min(92vw,550px)] overflow-hidden rounded-[18px] border border-white/[0.55] bg-[#fffdf7]/[0.86] p-7 shadow-[0_28px_90px_rgba(16,16,14,0.24)] ring-1 ring-ink/5 backdrop-blur-xl sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-bold leading-tight text-ink">
            {progress.status === "complete"
              ? "Map ready"
              : progress.status === "error"
                ? "Build interrupted"
                : "Building map"}
          </p>
          <p className="mt-3 max-w-[360px] text-lg font-semibold leading-8 text-ink/58">
            {progress.detail}
          </p>
        </div>
        <span className="shrink-0 rounded-xl border border-[#dfe5ef] bg-white/80 px-4 py-2 text-xl font-bold text-ink/55 shadow-[0_10px_26px_rgba(16,16,14,0.06)]">
          {Math.round(boundedProgress)}%
        </span>
      </div>
      <div
        aria-label="Map build progress"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(boundedProgress)}
        className="h-4 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
      >
        <div
          className={classNames(
            "h-full rounded-full transition-all duration-500",
            progress.status === "error" ? "bg-[#d34f32]" : "bg-[#4f8256]"
          )}
          style={{ width: `${boundedProgress}%` }}
        />
      </div>
      <div className="mt-7 space-y-4">
        {runProgressSteps.map((step, index) => {
          const isComplete = progress.status === "complete" || index < activeIndex;
          const isActive = index === activeIndex && progress.status === "running";
          const isError = index === activeIndex && progress.status === "error";

          return (
            <div
              className={classNames(
                "flex items-start gap-5 rounded-xl px-4 py-3 text-lg font-bold transition",
                isActive && "bg-[#e9f2e6]/82 text-[#31583a]",
                isError && "bg-[#fff0ea] text-[#b94736]",
                !isActive && !isError && (isComplete ? "text-ink/68" : "text-ink/38")
              )}
              key={step.id}
            >
              <span
                className={classNames(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                  isComplete && "border-[#4f8256] bg-[#4f8256] text-white",
                  isActive && "border-[#4f8256] bg-white text-[#4f8256]",
                  isError && "border-[#d34f32] bg-[#d34f32] text-white",
                  !isComplete && !isActive && !isError && "border-ink/18 bg-white/70 text-ink/32"
                )}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CircleDot className="h-4 w-4" />
                )}
              </span>
              <span>
                <span className="block">{step.label}</span>
                {(isActive || isError) && (
                  <span className="mt-2 block max-w-[360px] text-base font-semibold leading-7 opacity-75">
                    {step.detail}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GuidePanel({
  workspace,
  selectedBranch,
  view,
  setView,
  setDrawerOpen,
  pinned,
  onChallenge,
  onTogglePin,
}: {
  workspace: Workspace;
  selectedBranch: Branch;
  view: MapView;
  setView: (view: MapView) => void;
  setDrawerOpen: (open: boolean) => void;
  pinned: boolean;
  onChallenge: () => void;
  onTogglePin: () => void;
}) {
  if (view === "evidence") return null;

  const selectedSources = getSourceRecords(workspace, selectedBranch.sourceIds);

  return (
    <aside className="hidden w-[314px] shrink-0 border-l border-ink/10 bg-white/66 p-5 backdrop-blur xl:block">
      {view === "overview" ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Map guide</h2>
            <ChevronDown className="h-4 w-4 rotate-180 text-ink/45" />
          </div>
          <div className="mt-6 space-y-0">
            {[
              ["1", "Claim", "Define the statement to analyze."],
              ["2", "Reasons", "Explore arguments for and against."],
              ["3", "Evidence", "Review studies behind each reason."],
              ["4", "Confidence", "Assess overall confidence."],
            ].map(([number, title, copy], index) => (
              <div className="grid grid-cols-[44px_1fr] gap-3" key={title}>
                <div className="flex flex-col items-center">
                  <span
                    className={classNames(
                      "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                      index === 0 ? "bg-[#5d855e] text-white" : "bg-ink/10 text-ink/70"
                    )}
                  >
                    {number}
                  </span>
                  {index < 3 && <span className="h-14 w-px bg-ink/12" />}
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm font-medium leading-5 text-ink/50">{copy}</p>
                </div>
              </div>
            ))}
          </div>
          <Legend />
          <MapOverview />
        </>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">{selectedBranch.title}</h2>
              <span className="mt-2 inline-flex rounded-md bg-[#e9f2e6] px-3 py-1 text-xs font-bold uppercase tracking-[0.06em] text-[#4f8256]">
                {selectedBranch.status}
              </span>
            </div>
            <button
              aria-label="Close branch guide"
              className="rounded-md p-1 text-ink/46 hover:bg-ink/[0.04] hover:text-ink"
              onClick={() => setView("overview")}
              type="button"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {[
              { title: "Why it supports", copy: selectedBranch.rationale, Icon: Brain, showSources: false },
              {
                title: "Evidence attached",
                copy: `${selectedBranch.studiesLabel} connected to this branch`,
                Icon: FileText,
                showSources: true,
              },
              { title: "Counterpoints", copy: selectedBranch.counterpoint, Icon: Shield, showSources: false },
            ].map(({ title, copy, Icon, showSources }) => (
              <details className="group rounded-lg border border-ink/10 bg-white p-4" key={title}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <Icon className="h-5 w-5 text-[#4f8256]" />
                    {title}
                  </span>
                  <ChevronDown className="h-4 w-4 text-ink/45 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm font-medium leading-6 text-ink/56">{copy}</p>
                {showSources && (
                  <div className="mt-3 space-y-2">
                    {selectedSources.slice(0, 3).map((source) => (
                      <div className="rounded-md border border-ink/8 bg-[#fffdf8] p-3" key={source.id}>
                        <p className="text-xs font-semibold leading-5 text-ink">{source.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-ink/45">
                            {source.year || "n/a"} · {source.direction}
                          </span>
                          <SourceArticleLink compact source={source} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            ))}
          </div>

	          <button
	            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#5d855e] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(76,125,72,0.18)]"
	            onClick={() => setView("branch")}
	            type="button"
	          >
	            Open branch
	            <ExternalLink className="h-4 w-4" />
	          </button>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              className="rounded-lg border border-[#e76e57]/40 px-4 py-3 text-sm font-semibold text-[#d34f32] hover:bg-[#fff0ea]"
              onClick={onChallenge}
              type="button"
            >
              Challenge
            </button>
            <button
              className={classNames(
                "rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-ink/[0.04]",
                pinned
                  ? "border-[#5d855e]/35 bg-[#e9f2e6] text-[#31583a]"
                  : "border-ink/10"
              )}
              onClick={onTogglePin}
              type="button"
            >
              {pinned ? "Pinned" : "Pin"}
            </button>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Confidence</p>
              <span className="rounded-full border border-[#d8a729]/35 px-3 py-1 text-xs font-semibold text-[#b47d16]">
                {selectedBranch.confidence}
              </span>
            </div>
            <div className="h-2 rounded-full bg-ink/8">
              <div className="h-2 w-1/2 rounded-full bg-[#5d855e]" />
            </div>
            <div className="mt-3 flex justify-between text-xs font-semibold text-ink/55">
              <span>Low</span>
              <span>Mixed</span>
              <span>Strong</span>
            </div>
          </div>

          <button
            className="mt-6 flex w-full items-center justify-between rounded-lg border border-[#e0a326]/35 bg-[#fff7e6] px-4 py-3 text-sm font-semibold text-[#9b690e]"
            onClick={() => {
              setDrawerOpen(true);
              setView("evidence");
            }}
            type="button"
          >
            Open evidence drawer
            <ChevronRight className="h-4 w-4" />
          </button>
          <Legend />
        </>
      )}
    </aside>
  );
}

function Legend() {
  const rows = [
    ["Supports", "#dcebd6"],
    ["Opposes", "#ffd8ce"],
    ["Evidence", "#ffe6ad"],
    ["Assumption", "#e7e1d7"],
  ];
  return (
    <div className="mt-7 rounded-lg border border-ink/10 bg-white/58 p-4">
      <div className="grid gap-3">
        {rows.map(([label, color]) => (
          <div className="flex items-center gap-3 text-sm font-medium" key={label}>
            <span className="h-4 w-7 rounded border border-ink/10" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function MapOverview() {
  return (
    <div className="mt-3 rounded-lg border border-ink/10 bg-white/58 p-4">
      <p className="mb-3 text-sm font-semibold">Map overview</p>
      <div className="relative h-32 rounded-lg border border-ink/8 bg-[#fffdf8]">
        <span className="absolute left-16 top-14 h-5 w-8 rounded bg-[#dcebd6]" />
        <span className="absolute left-52 top-9 h-5 w-8 rounded bg-[#ffd8ce]" />
        <span className="absolute left-52 top-20 h-5 w-8 rounded bg-[#ffd8ce]" />
        <span className="absolute left-[128px] top-[58px] h-4 w-6 rounded border border-ink/15 bg-white" />
        <span className="absolute bottom-2 right-2 h-9 w-9 rounded border border-dashed border-ink/45" />
      </div>
    </div>
  );
}

export function App() {
  const initialView = getInitialView();
  const queryInputRef = useRef<HTMLTextAreaElement>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runProgressTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [mode, setMode] = useState<Mode>("query");
  const [query, setQuery] = useState(demoWorkspace.claim);
  const [articleUrl, setArticleUrl] = useState("");
  const [articleText, setArticleText] = useState("");
  const [activeTopic, setActiveTopic] = useState<EvidenceTopic>(bundledTopic);
  const [isLiveArtifact, setIsLiveArtifact] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState<RunProgress | null>(null);
  const [apiError, setApiError] = useState("");
  const [history, setHistory] = useState<TopicHistoryItem[]>([]);
  const [activeFilename, setActiveFilename] = useState("");
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keybindingsOpen, setKeybindingsOpen] = useState(false);
  const [keybindings, setKeybindings] = useState<ShortcutMap>(() => loadShortcutMap());
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings | null>(null);
  const [settingsError, setSettingsError] = useState("");
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [claimPanelOpen, setClaimPanelOpen] = useState(true);
  const [activeSidebarItem, setActiveSidebarItem] = useState("Analyses");
  const [activeFilter, setActiveFilter] = useState<WorkspaceFilter>("All");
  const [preSearchFilters, setPreSearchFilters] = useState<PreSearchFilters>(defaultPreSearchFilters);
  const [showCounts, setShowCounts] = useState(false);
  const [groupSimilar, setGroupSimilar] = useState(true);
  const [pinnedBranchIds, setPinnedBranchIds] = useState<string[]>([]);
  const [canvasTool, setCanvasTool] = useState<CanvasTool>("select");
  const [manualCanvasNodes, setManualCanvasNodes] = useState<ManualCanvasNodeRecord[]>([]);
  const [manualCanvasArrows, setManualCanvasArrows] = useState<ManualCanvasArrowRecord[]>([]);
  const [selectedManualNodeId, setSelectedManualNodeId] = useState("");
  const [arrowDraftSourceId, setArrowDraftSourceId] = useState("");
  const [isCanvasSaving, setIsCanvasSaving] = useState(false);
  const [canvasSavedAt, setCanvasSavedAt] = useState("");
  const [canvasVersions, setCanvasVersions] = useState<CanvasVersionRecord[]>([]);
  const [isCanvasVersionsLoading, setIsCanvasVersionsLoading] = useState(false);
  const [canvasUndoStack, setCanvasUndoStack] = useState<CanvasEditorState[]>([]);
  const [canvasRedoStack, setCanvasRedoStack] = useState<CanvasEditorState[]>([]);
	  const [view, setView] = useState<MapView>(initialView);
	  const [drawerOpen, setDrawerOpen] = useState(initialView === "evidence");
	  const [selectedBranchId, setSelectedBranchId] = useState(demoWorkspace.supports[0].id);
	  const [selectedReasonId, setSelectedReasonId] = useState(getBranchReasonNodes(demoWorkspace.supports[0])[0].id);

  const workspace = useMemo(() => {
    if (!isLiveArtifact) return demoWorkspace;
    return makeWorkspaceFromTopic(activeTopic, query);
  }, [activeTopic, isLiveArtifact, query]);
  const activeCanvasId = canvasIdForTopic(activeTopic, isLiveArtifact);
  const shortcutsDisabled = settingsOpen || keybindingsOpen;

  const filteredWorkspace = useMemo(
    () => filterWorkspace(workspace, activeFilter),
    [activeFilter, workspace]
  );

  const selectedBranch = getPrimaryBranch(filteredWorkspace, selectedBranchId);

  const currentCanvasState = useCallback(
    () => cloneCanvasState({ nodes: manualCanvasNodes, arrows: manualCanvasArrows }),
    [manualCanvasArrows, manualCanvasNodes]
  );

  const applyCanvasState = useCallback((state: CanvasEditorState) => {
    const nextState = cloneCanvasState(state);
    setManualCanvasNodes(nextState.nodes);
    setManualCanvasArrows(nextState.arrows);
    setSelectedManualNodeId("");
    setArrowDraftSourceId("");
  }, []);

  const applyCanvasDocument = useCallback(
    (canvas: CanvasDocument) => {
      applyCanvasState(canvasStateFromDocument(canvas));
      if (validViews.includes(canvas.view)) setView(canvas.view);
      setSelectedBranchId(canvas.selectedBranchId || "");
      setSelectedReasonId(canvas.selectedReasonId || "");
    },
    [applyCanvasState]
  );

  const markCanvasDirty = useCallback(() => {
    const snapshot = currentCanvasState();
    setCanvasUndoStack((past) => {
      if (isSameCanvasState(past[past.length - 1], snapshot)) return past;
      return [...past.slice(-79), snapshot];
    });
    setCanvasRedoStack([]);
    setCanvasSavedAt("");
  }, [currentCanvasState]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(""), 2400);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(shortcutStorageKey, JSON.stringify(keybindings));
  }, [keybindings]);

  const updateKeybinding = useCallback(
    (actionId: ShortcutId, shortcut: string) => {
      setKeybindings((current) => assignShortcutBinding(current, actionId, shortcut));
    },
    []
  );

  const resetKeybindings = useCallback(() => {
    setKeybindings(defaultShortcutMap());
    showNotice("Keybinds reset to defaults.");
  }, [showNotice]);

  const clearRunProgressTimers = useCallback(() => {
    runProgressTimersRef.current.forEach((timer) => clearTimeout(timer));
    runProgressTimersRef.current = [];
  }, []);

  useEffect(() => clearRunProgressTimers, [clearRunProgressTimers]);

  const queueRunProgress = useCallback(
    (updates: Array<{ delay: number; progress: RunProgress }>) => {
      clearRunProgressTimers();
      runProgressTimersRef.current = updates.map(({ delay, progress }) =>
        setTimeout(() => setRunProgress(progress), delay)
      );
    },
    [clearRunProgressTimers]
  );

  const undoCanvas = useCallback(() => {
    const previous = canvasUndoStack[canvasUndoStack.length - 1];
    if (!previous) return;

    setCanvasUndoStack((past) => past.slice(0, -1));
    setCanvasRedoStack((future) => [currentCanvasState(), ...future].slice(0, 80));
    applyCanvasState(previous);
    setCanvasSavedAt("");
    showNotice("Canvas change undone.");
  }, [applyCanvasState, canvasUndoStack, currentCanvasState, showNotice]);

  const redoCanvas = useCallback(() => {
    const next = canvasRedoStack[0];
    if (!next) return;

    setCanvasRedoStack((future) => future.slice(1));
    setCanvasUndoStack((past) => [...past.slice(-79), currentCanvasState()]);
    applyCanvasState(next);
    setCanvasSavedAt("");
    showNotice("Canvas change redone.");
  }, [applyCanvasState, canvasRedoStack, currentCanvasState, showNotice]);

  const loadCanvasVersions = useCallback(async (canvasId: string) => {
    setIsCanvasVersionsLoading(true);
    try {
      const response = await fetch(`/api/canvas/${encodeURIComponent(canvasId)}/versions`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load canvas versions.");
      setCanvasVersions(Array.isArray(data.versions) ? data.versions : []);
    } catch {
      setCanvasVersions([]);
    } finally {
      setIsCanvasVersionsLoading(false);
    }
  }, []);

  const restoreCanvasVersion = useCallback(
    (version: CanvasVersionRecord) => {
      if (!version.canvas) return;
      markCanvasDirty();
      applyCanvasDocument(version.canvas);
      setCanvasSavedAt("");
      showNotice(`Restored v${version.versionNumber}. Save to make it current.`);
    },
    [applyCanvasDocument, markCanvasDirty, showNotice]
  );

  useEffect(() => {
    const branches = [
      ...filteredWorkspace.supports,
      ...filteredWorkspace.opposes,
      ...filteredWorkspace.neutral,
    ];
    if (!branches.length) return;
	    if (branches.some((branch) => branch.id === selectedBranchId)) return;
	    const nextBranch = branches[0];
	    setSelectedBranchId(nextBranch.id);
	    setSelectedReasonId(getBranchReasonNodes(nextBranch)[0]?.id || "");
  }, [filteredWorkspace, selectedBranchId]);

  const refreshHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await fetch("/api/topics");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not load saved evaluations.");
      }
      setHistory(Array.isArray(data.topics) ? data.topics : []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Could not load saved evaluations.");
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const refreshRuntimeSettings = useCallback(async () => {
    setIsSettingsLoading(true);
    setSettingsError("");
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load runtime settings.");
      setRuntimeSettings(data as RuntimeSettings);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Could not load runtime settings.");
    } finally {
      setIsSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRuntimeSettings();
  }, [refreshRuntimeSettings]);

  const saveRuntimeSettings = useCallback(
    async (payload: {
      reviewEngine: ReviewEngine;
      openaiApiKey?: string;
      clearOpenaiApiKey?: boolean;
      openaiModel: string;
      openaiReasoningEffort: ReasoningEffort;
      codexBin: string;
    }) => {
      setIsSettingsSaving(true);
      setSettingsError("");
      try {
        const response = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not save runtime settings.");
        setRuntimeSettings(data as RuntimeSettings);
        showNotice("Runtime settings saved.");
        setSettingsOpen(false);
      } catch (error) {
        setSettingsError(error instanceof Error ? error.message : "Could not save runtime settings.");
      } finally {
        setIsSettingsSaving(false);
      }
    },
    [showNotice]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCanvas() {
      try {
        const response = await fetch(`/api/canvas/${encodeURIComponent(activeCanvasId)}`);
        if (response.status === 404) {
          if (!cancelled) {
            setManualCanvasNodes([]);
            setManualCanvasArrows([]);
            setSelectedManualNodeId("");
            setArrowDraftSourceId("");
            setCanvasSavedAt("");
            setCanvasUndoStack([]);
            setCanvasRedoStack([]);
          }
          return;
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Canvas load failed.");
        const canvas = data.canvas as CanvasDocument;
        if (!cancelled) {
          applyCanvasDocument(canvas);
          setCanvasSavedAt(canvas.updatedAt ? formatHistoryDate(canvas.updatedAt) : "");
          setCanvasUndoStack([]);
          setCanvasRedoStack([]);
        }
      } catch {
        if (!cancelled) {
          setManualCanvasNodes([]);
          setManualCanvasArrows([]);
          setSelectedManualNodeId("");
          setArrowDraftSourceId("");
          setCanvasSavedAt("");
          setCanvasUndoStack([]);
          setCanvasRedoStack([]);
        }
      }
    }

    void loadCanvas();

    return () => {
      cancelled = true;
    };
  }, [activeCanvasId, applyCanvasDocument]);

  useEffect(() => {
    void loadCanvasVersions(activeCanvasId);
  }, [activeCanvasId, loadCanvasVersions]);

  function selectTopic(nextTopic: EvidenceTopic, filename = "") {
    const nextWorkspace = makeWorkspaceFromTopic(nextTopic, nextTopic.query);
    const firstBranch = firstAvailableBranch(nextWorkspace);
    setActiveTopic(nextTopic);
    setQuery(nextTopic.query);
    setIsLiveArtifact(true);
    setActiveFilename(filename);
	    setActiveFilter("All");
	    setActiveSidebarItem("Analyses");
	    setSelectedBranchId(firstBranch?.id || "");
	    setSelectedReasonId(firstBranch ? getBranchReasonNodes(firstBranch)[0]?.id || "" : "");
    setApiError("");
    setDrawerOpen(false);
    setView("overview");
  }

  async function loadHistoryItem(item: TopicHistoryItem) {
    if (item.unreadable) return;
    setApiError("");
    try {
      const response = await fetch(`/api/topics/${encodeURIComponent(item.filename)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not load the saved evaluation.");
      }
      selectTopic(data.topic as EvidenceTopic, item.filename);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Could not load the saved evaluation.");
    }
  }

  async function saveCanvas() {
    setIsCanvasSaving(true);
    setApiError("");
    try {
      const payload: CanvasDocument = {
        id: activeCanvasId,
        topicId: activeTopic.id,
        query: workspace.claim,
        view,
        selectedBranchId,
        selectedReasonId,
        nodes: manualCanvasNodes,
        arrows: manualCanvasArrows,
      };
      const response = await fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Canvas save failed.");
      setCanvasSavedAt(formatHistoryDate(data.canvas.updatedAt));
      if (Array.isArray(data.versions)) setCanvasVersions(data.versions);
      showNotice(data.version?.versionNumber ? `Canvas saved as v${data.version.versionNumber}.` : "Canvas saved locally.");
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Canvas save failed.");
    } finally {
      setIsCanvasSaving(false);
    }
  }

  function handleSidebarSelect(label: string) {
    setActiveSidebarItem(label);
    if (label === "Dashboard") {
      setView("overview");
      setDrawerOpen(false);
      setActiveFilter("All");
      return;
    }
    if (label === "Analyses") {
      setView("branch");
      setDrawerOpen(false);
      return;
    }
    if (label === "Evidence") {
      setView("evidence");
      setDrawerOpen(true);
      return;
    }
    if (label === "Compare") {
      setActiveFilter("Against");
      setView("branch");
      setDrawerOpen(false);
      return;
    }
    if (label === "Saved") {
      setClaimPanelOpen(true);
      showNotice("History is open in the claim panel.");
      return;
    }
    if (label === "Settings") {
      setSettingsOpen(true);
      void refreshRuntimeSettings();
      return;
    }
    showNotice("Help: build a map, pick a branch, then open evidence.");
  }

  function handleFilterChange(filter: WorkspaceFilter) {
    setActiveFilter(filter);
    if (filter === "Evidence") {
      setDrawerOpen(true);
      setView("evidence");
      return;
    }
    setDrawerOpen(false);
    setView(filter === "All" ? "overview" : "branch");
  }

  function handleChallenge() {
    const challengeBranch =
      filteredWorkspace.opposes.find((branch) => branch.id !== selectedBranch.id) ||
      filteredWorkspace.opposes[0] ||
      filteredWorkspace.neutral[0];
    if (!challengeBranch) {
      showNotice("No challenge branch is available in this map.");
      return;
	    }
	    setSelectedBranchId(challengeBranch.id);
	    setSelectedReasonId(getBranchReasonNodes(challengeBranch)[0]?.id || "");
    setActiveFilter("Against");
    setView("branch");
  }

  function handleTogglePin() {
    setPinnedBranchIds((current) =>
      current.includes(selectedBranch.id)
        ? current.filter((id) => id !== selectedBranch.id)
        : [...current, selectedBranch.id]
    );
    showNotice(
      pinnedBranchIds.includes(selectedBranch.id)
        ? "Branch unpinned."
        : "Branch pinned locally."
    );
  }

  async function run() {
    setApiError("");
    setIsRunning(true);
    setRunProgress({
      stepId: "prepare",
      progress: 8,
      detail: "Checking the claim, article input, and selected filters.",
      status: "running",
    });
    setDrawerOpen(false);
    setView("overview");
    queueRunProgress([
      {
        delay: 450,
        progress: {
          stepId: "request",
          progress: 22,
          detail: "Sending the review to the local evidence runner.",
          status: "running",
        },
      },
      {
        delay: 2200,
        progress: {
          stepId: "search",
          progress: 42,
          detail: "Gathering relevant studies, summaries, and source metadata.",
          status: "running",
        },
      },
      {
        delay: 6200,
        progress: {
          stepId: "analyze",
          progress: 64,
          detail: "Checking support, limitations, conflicts, and assumptions.",
          status: "running",
        },
      },
      {
        delay: 12000,
        progress: {
          stepId: "compose",
          progress: 82,
          detail: "Converting the review into map branches, reasons, and evidence cards.",
          status: "running",
        },
      },
      {
        delay: 20000,
        progress: {
          stepId: "compose",
          progress: 91,
          detail: "Still working on the evidence artifact. The map will update when the runner returns.",
          status: "running",
        },
      },
    ]);

    const endpoint =
      mode === "query" ? "/api/review/claim" : "/api/review/article";
    const payload =
      mode === "query"
        ? { query, preSearchFilters }
        : { query: articleUrl || "Article framework review", articleUrl, articleText, preSearchFilters };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "The review runner failed.");
      }

      clearRunProgressTimers();
      setRunProgress({
        stepId: "render",
        progress: 94,
        detail: "Validating the returned artifact and preparing the map.",
        status: "running",
      });
      const nextTopic = data.topic as EvidenceTopic;
      selectTopic(nextTopic, data.saved?.filename || "");
      setRunProgress({
        stepId: "render",
        progress: 98,
        detail: "Refreshing saved reviews and rendering the updated map.",
        status: "running",
      });
      await refreshHistory();
      setRunProgress({
        stepId: "render",
        progress: 100,
        detail: "Map rendered with the latest evidence review.",
        status: "complete",
      });
    } catch (error) {
      clearRunProgressTimers();
      setRunProgress((current) => ({
        stepId: current?.stepId || "request",
        progress: Math.max(current?.progress || 18, 18),
        detail: "The runner stopped before a new map was available.",
        status: "error",
      }));
      setIsLiveArtifact(false);
      setApiError(
        `${
          error instanceof Error ? error.message : "The review runner failed."
        } Demo map remains visible; run the API server with its configured review engine for live evidence.`
      );
    } finally {
      setIsRunning(false);
      runProgressTimersRef.current.push(
        setTimeout(() => setRunProgress(null), 3200)
      );
    }
  }

  function exportMap(format: ExportFormat) {
    const filenameBase = exportSlug(workspace.claim);
    if (format === "json") {
      downloadBlob(
        new Blob([JSON.stringify({ workspace, activeTopic }, null, 2)], {
          type: "application/json",
        }),
        `${filenameBase}.json`
      );
      showNotice("JSON export downloaded.");
      return;
    }
    if (format === "csv") {
      downloadBlob(new Blob([buildCsv(workspace, activeTopic)], { type: "text/csv;charset=utf-8" }), `${filenameBase}.csv`);
      showNotice("CSV export downloaded.");
      return;
    }
    if (format === "docx") {
      downloadBlob(
        new Blob([buildDocx(workspace, activeTopic)], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        `${filenameBase}.docx`
      );
      showNotice("Word report downloaded.");
      return;
    }
    if (format === "xlsx") {
      downloadBlob(
        new Blob([buildXlsx(workspace, activeTopic)], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `${filenameBase}.xlsx`
      );
      showNotice("Excel sheet downloaded.");
      return;
    }

    downloadBlob(
      new Blob([buildPdf(workspace, activeTopic)], {
        type: "application/pdf",
      }),
      `${filenameBase}.pdf`
    );
    showNotice("PDF report downloaded.");
  }

  const runAppShortcut = useCallback(
    (actionId: ShortcutId) => {
      if (actionId === "saveCanvas") {
        if (!isCanvasSaving) void saveCanvas();
        return true;
      }
      if (actionId === "undoCanvas") {
        if (canvasUndoStack.length) undoCanvas();
        return true;
      }
      if (actionId === "redoCanvas") {
        if (canvasRedoStack.length) redoCanvas();
        return true;
      }
      if (actionId === "runReview") {
        if (!isRunning) void run();
        return true;
      }
      if (actionId === "focusClaim") {
        setClaimPanelOpen(true);
        window.setTimeout(() => queryInputRef.current?.focus(), 0);
        return true;
      }
      if (actionId === "openSettings") {
        setSettingsOpen(true);
        void refreshRuntimeSettings();
        return true;
      }
      if (actionId === "openKeybindings") {
        setKeybindingsOpen(true);
        return true;
      }
      if (actionId === "viewOverview") {
        setDrawerOpen(false);
        setView("overview");
        return true;
      }
      if (actionId === "viewBranch") {
        setDrawerOpen(false);
        setView("branch");
        return true;
      }
      if (actionId === "viewEvidence") {
        setDrawerOpen(true);
        setView("evidence");
        return true;
      }
      return false;
    },
    [
      canvasRedoStack.length,
      canvasUndoStack.length,
      isCanvasSaving,
      isRunning,
      redoCanvas,
      refreshRuntimeSettings,
      undoCanvas,
    ]
  );

  useEffect(() => {
    if (shortcutsDisabled) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      const actionId = getShortcutAction(event, keybindings, appShortcutIds);
      if (!actionId) return;
      const editable = isEditableEventTarget(event.target);
      if (
        editable &&
        !["saveCanvas", "runReview", "focusClaim", "openSettings", "openKeybindings"].includes(actionId)
      ) {
        return;
      }
      if (!runAppShortcut(actionId)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keybindings, runAppShortcut, shortcutsDisabled]);

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#f7f4ec] font-sans text-ink lg:h-screen lg:min-h-[760px] lg:overflow-hidden">
      <TopBar
        activeFilename={activeFilename}
        history={history}
        historyError={historyError}
        isLiveArtifact={isLiveArtifact}
        isHistoryLoading={isHistoryLoading}
        isSaving={isCanvasSaving}
        onExport={exportMap}
        onLoadHistory={loadHistoryItem}
        onOpenSettings={() => {
          setSettingsOpen(true);
          void refreshRuntimeSettings();
        }}
        onRefreshHistory={refreshHistory}
        onSave={saveCanvas}
        title={workspace.claim}
        view={view}
      />
      <div className="flex min-h-[calc(100vh-80px)] flex-col md:h-[calc(100vh-80px)] md:min-h-[680px] md:flex-row">
        <ClaimPanel
          activeFilter={activeFilter}
          apiError={apiError}
          articleText={articleText}
          articleUrl={articleUrl}
          activeFilename={activeFilename}
          groupSimilar={groupSimilar}
          history={history}
          historyError={historyError}
          isHistoryLoading={isHistoryLoading}
          isRunning={isRunning}
          mode={mode}
          onFilterChange={handleFilterChange}
          onLoadHistory={loadHistoryItem}
          onRefreshHistory={refreshHistory}
          onRun={run}
          onToggleOpen={() => setClaimPanelOpen(false)}
          open={claimPanelOpen}
          preSearchFilters={preSearchFilters}
          query={query}
          queryInputRef={queryInputRef}
          setArticleText={setArticleText}
          setArticleUrl={setArticleUrl}
          setGroupSimilar={setGroupSimilar}
          setMode={setMode}
          setPreSearchFilters={setPreSearchFilters}
          setQuery={setQuery}
          setShowCounts={setShowCounts}
          setView={setView}
          showCounts={showCounts}
          view={view}
        />
	        <div className="relative flex min-h-[560px] min-w-0 flex-1 md:min-h-0">
	          {!claimPanelOpen && (
	            <button
	              aria-label="Show claim panel"
	              className="absolute left-4 top-4 z-30 hidden items-center gap-2 rounded-lg border border-ink/10 bg-white/92 px-3 py-2 text-sm font-semibold shadow-[0_12px_30px_rgba(16,16,14,0.10)] backdrop-blur transition hover:bg-[#f4f8f1] md:inline-flex"
	              onClick={() => setClaimPanelOpen(true)}
	              type="button"
	            >
	              <PanelLeftOpen className="h-4 w-4 text-[#4f8256]" />
	              Claim panel
	            </button>
	          )}
	          <GraphCanvas
            arrowDraftSourceId={arrowDraftSourceId}
            canvasSavedAt={canvasSavedAt}
            canvasTool={canvasTool}
            drawerOpen={drawerOpen}
            groupSimilar={groupSimilar}
            canRedoCanvas={canvasRedoStack.length > 0}
            canUndoCanvas={canvasUndoStack.length > 0}
            canvasVersions={canvasVersions}
            isCanvasSaving={isCanvasSaving}
            isCanvasVersionsLoading={isCanvasVersionsLoading}
            keybindings={keybindings}
            manualCanvasArrows={manualCanvasArrows}
            manualCanvasNodes={manualCanvasNodes}
            onCanvasDirty={markCanvasDirty}
            onNotice={showNotice}
            onRedoCanvas={redoCanvas}
            onRestoreCanvasVersion={restoreCanvasVersion}
            onSaveCanvas={saveCanvas}
            onUndoCanvas={undoCanvas}
            selectedBranchId={selectedBranch.id}
            selectedManualNodeId={selectedManualNodeId}
            selectedReasonId={selectedReasonId}
            setArrowDraftSourceId={setArrowDraftSourceId}
            setCanvasTool={setCanvasTool}
            setDrawerOpen={setDrawerOpen}
            setManualCanvasArrows={setManualCanvasArrows}
            setManualCanvasNodes={setManualCanvasNodes}
            setSelectedBranchId={setSelectedBranchId}
            setSelectedManualNodeId={setSelectedManualNodeId}
            setSelectedReasonId={setSelectedReasonId}
            setView={setView}
            showCounts={showCounts}
            shortcutsDisabled={shortcutsDisabled}
            view={view}
            workspace={filteredWorkspace}
          />
        </div>
      </div>
      {runProgress && <BuildProgressOverlay progress={runProgress} />}
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg border border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink shadow-[0_18px_52px_rgba(16,16,14,0.18)]">
          {notice}
        </div>
      )}
      <SettingsModal
        error={settingsError}
        isLoading={isSettingsLoading}
        isSaving={isSettingsSaving}
        onClose={() => setSettingsOpen(false)}
        onOpenKeybindings={() => {
          setSettingsOpen(false);
          setKeybindingsOpen(true);
        }}
        onRefresh={refreshRuntimeSettings}
        onSave={saveRuntimeSettings}
        open={settingsOpen}
        settings={runtimeSettings}
      />
      <KeybindingsModal
        bindings={keybindings}
        onChange={updateKeybinding}
        onClose={() => setKeybindingsOpen(false)}
        onReset={resetKeybindings}
        open={keybindingsOpen}
      />
    </main>
  );
}
