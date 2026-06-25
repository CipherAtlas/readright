import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronRight, Keyboard, Loader2, Lock, Minus, Network, RefreshCcw, Save, Sparkles } from "lucide-react";
import type { ReasoningEffort, ReviewEngine, RuntimeSettings } from "../types";
import { classNames } from "../utils/classNames";

export function SettingsModal({
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
