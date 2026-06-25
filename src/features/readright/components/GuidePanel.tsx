import { Brain, ChevronDown, ChevronRight, ExternalLink, FileText, Minus, Shield } from "lucide-react";
import type { Branch, MapView, Workspace } from "../types";
import { SourceArticleLink } from "./SourceArticleLink";
import { classNames } from "../utils/classNames";
import { getSourceRecords } from "../workspace";

export function GuidePanel({
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

