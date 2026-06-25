import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import type { ReasonNode, WorkspaceSource } from "../types";
import { SourceArticleLink } from "./SourceArticleLink";
import { confidenceLabels } from "../labels";
import { classNames } from "../utils/classNames";

export function EvidenceDrawer({
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

