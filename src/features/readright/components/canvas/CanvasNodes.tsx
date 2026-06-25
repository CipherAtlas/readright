import { useRef } from "react";
import { Handle, MarkerType, Position, type Edge, type NodeProps } from "@xyflow/react";
import { Activity, Brain, ChevronRight, CircleDot, CircleHelp, ClipboardList, Copy, Diamond, FilePlus, FileText, GitBranch, Highlighter, MessageCircle, MessageSquare, Minus, Network, Pencil, Plus, Shield, Sparkles, SquareDashedMousePointer, Star, StickyNote, Target, ThumbsDown, ThumbsUp, Type } from "lucide-react";
import type { ArgumentNode, ArgumentNodeData, LaneNode, ManualCanvasNode, ManualCanvasColor, Tone } from "../../types";
import { getManualColorClasses, getToneClasses, manualCanvasKindLabel } from "../../manualCanvas";
import { classNames } from "../../utils/classNames";

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

export function makeEdge(
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

export const nodeTypes = { argument: ArgumentNodeCard, lane: LaneNodeCard, manual: ManualCanvasNodeCard };
