import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent as ReactMouseEvent, type SetStateAction } from "react";
import { Background, Controls, MarkerType, MiniMap, ReactFlow, type Edge, type ReactFlowInstance, type Viewport } from "@xyflow/react";
import { ArrowUpRight, Check, ChevronDown, ChevronRight, CircleDot, CircleHelp, Copy, Diamond, ExternalLink, FilePlus, FileText, GitBranch, Hand, Highlighter, History, Loader2, MessageCircle, Minus, Pencil, Plus, Redo2, Save, SlidersHorizontal, SquareDashedMousePointer, StickyNote, ThumbsDown, ThumbsUp, Trash2, Type, Undo2, X } from "lucide-react";
import type { ArgumentNode, ArgumentNodeData, Branch, CanvasContextMenuState, CanvasFlowNode, CanvasTool, CanvasVersionRecord, LaneNodeData, ManualCanvasArrowRecord, ManualCanvasColor, ManualCanvasKind, ManualCanvasNodeRecord, ReasonNode, Workspace, WorkspaceSource, MapView } from "../../types";
import { canvasShortcutIds, formatShortcut, getShortcutAction, isEditableEventTarget, type ShortcutId, type ShortcutMap } from "../../shortcuts";
import { expandScreenRect, getManualColorClasses, manualCanvasBodyLabel, manualCanvasDefaults, manualCanvasKindLabel, manualCanvasScreenSize, screenRectFromDomRect, screenRectsOverlap } from "../../manualCanvas";
import { getBranchReasonNodes, getPrimaryBranch, getSourceRecords, shortTitle } from "../../workspace";
import { formatHistoryDate } from "../../utils/date";
import { classNames } from "../../utils/classNames";
import { EvidenceDrawer } from "../EvidenceDrawer";
import { InlineBranchPanel } from "../InlineBranchPanel";
import { SourceArticleLink } from "../SourceArticleLink";
import { makeEdge, nodeTypes } from "./CanvasNodes";

export function GraphCanvas({
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
  const [canvasZoomPercent, setCanvasZoomPercent] = useState(100);
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
  const flowDefaultViewport = useMemo<Viewport>(
    () =>
      view === "branch" || view === "evidence"
        ? { x: 90, y: 38, zoom: 0.72 }
        : { x: 35, y: 35, zoom: 0.83 },
    [view]
  );

  const updateCanvasZoomPercent = useCallback((zoom: number) => {
    setCanvasZoomPercent(Math.round(zoom * 100));
  }, []);

  useEffect(() => {
    updateCanvasZoomPercent(flowDefaultViewport.zoom);
  }, [flowDefaultViewport.zoom, updateCanvasZoomPercent]);

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
          onInit={(instance) => {
            setFlow(instance);
            updateCanvasZoomPercent(instance.getZoom());
          }}
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
          onViewportChange={(viewport) => updateCanvasZoomPercent(viewport.zoom)}
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
        <span className="border-b border-ink/10 px-2 py-2 text-xs font-semibold">{canvasZoomPercent}%</span>
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
