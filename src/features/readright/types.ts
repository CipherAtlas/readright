import type { MouseEvent as ReactMouseEvent } from "react";
import type { Node } from "@xyflow/react";
import type { EvidenceCertainty, EvidenceDirection } from "../../types/evidence";

export type Mode = "query" | "article";
export type MapView = "overview" | "branch" | "evidence";
export type ExportFormat = "json" | "pdf" | "docx" | "xlsx" | "csv";
export type WorkspaceFilter = "All" | "For" | "Against" | "Evidence" | "Assumptions" | "Unresolved";
export type RunProgressStatus = "running" | "complete" | "error";
export type ManualCanvasKind =
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
export type CanvasTool = "select" | ManualCanvasKind | "arrow";
export type ManualCanvasColor = "green" | "amber" | "red" | "ink";
export type PreSearchFilters = {
  topicArea: string;
  evidenceTypes: string[];
  publicationWindow: string;
};
export type ReviewEngine = "auto" | "openai_api" | "codex_cli";
export type ReasoningEffort = "minimal" | "low" | "medium" | "high";
export type RuntimeSettings = {
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
export type Tone = "claim" | "support" | "oppose" | "evidence" | "assumption" | "neutral";
export type WorkspaceSource = {
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

export type ReasonNode = {
  id: string;
  title: string;
  tone: Tone;
  badge: string;
  detail: string;
  sourceIds: string[];
};

export type Branch = {
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

export type Workspace = {
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

export type TopicHistoryItem = {
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

export type ManualCanvasNodeRecord = {
  id: string;
  kind: ManualCanvasKind;
  title: string;
  body: string;
  x: number;
  y: number;
  color: ManualCanvasColor;
};

export type ManualCanvasArrowRecord = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type CanvasDocument = {
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

export type CanvasEditorState = {
  nodes: ManualCanvasNodeRecord[];
  arrows: ManualCanvasArrowRecord[];
};

export type CanvasVersionRecord = {
  id: string;
  versionNumber: number;
  createdAt: string;
  label?: string;
  summary?: string;
  canvas: CanvasDocument;
};


export type ArgumentNodeData = {
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

export type ArgumentNode = Node<ArgumentNodeData, "argument">;
export type LaneNodeData = {
  count: string;
  title: string;
  tone: "support" | "oppose" | "neutral";
};
export type LaneNode = Node<LaneNodeData, "lane">;
export type ManualCanvasNodeData = {
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
export type ManualCanvasNode = Node<ManualCanvasNodeData, "manual">;
export type CanvasFlowNode = ArgumentNode | LaneNode | ManualCanvasNode;
export type CanvasContextMenuState = {
  nodeId: string;
  x: number;
  y: number;
};
