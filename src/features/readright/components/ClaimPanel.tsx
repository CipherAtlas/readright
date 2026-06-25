import { useState, type RefObject } from "react";
import { Boxes, Calendar, Check, ChevronDown, Clock3, Filter, History, Loader2, Network, PanelLeftClose, RefreshCcw, SlidersHorizontal } from "lucide-react";
import type { MapView, Mode, PreSearchFilters, TopicHistoryItem, WorkspaceFilter } from "../types";
import { defaultPreSearchFilters, evidenceTypeOptions, preSearchFilterGroups, publicationWindowOptions } from "../filters";
import { confidenceLabels } from "../labels";
import { classNames } from "../utils/classNames";
import { formatHistoryDate } from "../utils/date";

export function ClaimPanel({
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

