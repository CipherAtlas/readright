import { useRef, useState } from "react";
import { Check, ChevronRight, ExternalLink, FileText, Minus, Network, Shield, ThumbsDown } from "lucide-react";
import type { Branch, WorkspaceSource } from "../types";
import { SourceArticleLink } from "./SourceArticleLink";
import { classNames } from "../utils/classNames";
import { getBranchReasonNodes } from "../workspace";

export function InlineBranchPanel({
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

