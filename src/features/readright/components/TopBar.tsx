import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clock3, Download, History, Loader2, RefreshCcw, Save, Settings } from "lucide-react";
import type { ExportFormat, MapView, TopicHistoryItem } from "../types";
import { classNames } from "../utils/classNames";
import { formatHistoryDate } from "../utils/date";
import { shortTitle } from "../workspace";

export function TopBar({
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

