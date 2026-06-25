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
import { BuildProgressOverlay } from "./features/readright/components/BuildProgress";
import { ClaimPanel } from "./features/readright/components/ClaimPanel";
import { EvidenceDrawer } from "./features/readright/components/EvidenceDrawer";
import { GraphCanvas } from "./features/readright/components/canvas/GraphCanvas";
import { InlineBranchPanel } from "./features/readright/components/InlineBranchPanel";
import { KeybindingsModal } from "./features/readright/components/KeybindingsModal";
import { SettingsModal } from "./features/readright/components/SettingsModal";
import { TopBar } from "./features/readright/components/TopBar";
import { SourceArticleLink } from "./features/readright/components/SourceArticleLink";
import { canvasIdForTopic, canvasStateFromDocument, cloneCanvasState, isSameCanvasState } from "./features/readright/canvasState";
import { buildCsv, buildDocx, buildPdf, buildXlsx, downloadBlob, exportSlug } from "./features/readright/exporters";
import { confidenceLabels } from "./features/readright/labels";
import { getInitialView, validViews } from "./features/readright/navigation";
import { formatHistoryDate } from "./features/readright/utils/date";
import { demoWorkspace, filterWorkspace, firstAvailableBranch, getBranchReasonNodes, getPrimaryBranch, getSourceRecords, makeWorkspaceFromTopic, shortTitle } from "./features/readright/workspace";
import { expandScreenRect, getManualColorClasses, getToneClasses, manualCanvasBodyLabel, manualCanvasDefaults, manualCanvasKindLabel, manualCanvasScreenSize, screenRectFromDomRect, screenRectsOverlap } from "./features/readright/manualCanvas";
import { defaultPreSearchFilters, evidenceTypeOptions, preSearchFilterGroups, publicationWindowOptions } from "./features/readright/filters";
import type { RunProgress } from "./features/readright/progress";
import { classNames } from "./features/readright/utils/classNames";
import type {
  ArgumentNode,
  ArgumentNodeData,
  Branch,
  CanvasContextMenuState,
  CanvasDocument,
  CanvasEditorState,
  CanvasFlowNode,
  CanvasTool,
  CanvasVersionRecord,
  ExportFormat,
  LaneNode,
  LaneNodeData,
  ManualCanvasArrowRecord,
  ManualCanvasColor,
  ManualCanvasKind,
  ManualCanvasNodeRecord,
  ManualCanvasNode,
  ManualCanvasNodeData,
  MapView,
  Mode,
  PreSearchFilters,
  ReasoningEffort,
  ReasonNode,
  ReviewEngine,
  RunProgressStatus,
  RuntimeSettings,
  Tone,
  TopicHistoryItem,
  Workspace,
  WorkspaceFilter,
  WorkspaceSource,
} from "./features/readright/types";
import {
  appShortcutIds,
  assignShortcutBinding,
  canvasShortcutIds,
  defaultShortcutMap,
  formatShortcut,
  getShortcutAction,
  isEditableEventTarget,
  loadShortcutMap,
  shortcutCategoryOrder,
  shortcutDefinitions,
  shortcutFromKeyboardEvent,
  shortcutStorageKey,
  shortcutsEquivalent,
} from "./features/readright/shortcuts";
import type { ShortcutId, ShortcutMap } from "./features/readright/shortcuts";

const bundledTopic = topicJson as EvidenceTopic;

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

  async function exportMap(format: ExportFormat) {
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
      new Blob([await buildPdf(workspace, activeTopic)], {
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
