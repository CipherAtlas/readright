import { useEffect, useState } from "react";
import { Check, CircleDot, Minus, RefreshCcw, Trash2 } from "lucide-react";
import type { ShortcutId, ShortcutMap } from "../shortcuts";
import { formatShortcut, shortcutCategoryOrder, shortcutDefinitions, shortcutFromKeyboardEvent, shortcutsEquivalent } from "../shortcuts";
import { classNames } from "../utils/classNames";

export function KeybindingsModal({
  open,
  bindings,
  onChange,
  onClose,
  onReset,
}: {
  open: boolean;
  bindings: ShortcutMap;
  onChange: (actionId: ShortcutId, shortcut: string) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const [listeningActionId, setListeningActionId] = useState<ShortcutId | null>(null);

  useEffect(() => {
    if (!open) setListeningActionId(null);
  }, [open]);

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[220] flex items-center justify-center bg-ink/36 px-4 py-6 backdrop-blur-sm"
      role="dialog"
    >
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-ink/10 bg-[#fffdf7] shadow-[0_28px_90px_rgba(16,16,14,0.25)]">
        <div className="shrink-0 flex items-start justify-between gap-5 border-b border-ink/8 px-5 py-4 md:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#4f8256]">
              Settings
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em]">
              Keybinds
            </h2>
            <p className="mt-1 text-xs font-semibold leading-5 text-ink/48">
              Click a shortcut, press the new key combination, and duplicates are cleared automatically.
            </p>
          </div>
          <button
            aria-label="Close keybinds"
            className="rounded-md p-2 text-ink/45 transition hover:bg-ink/[0.04] hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {shortcutCategoryOrder.map((category) => {
              const definitions = shortcutDefinitions.filter((definition) => definition.category === category);
              return (
                <section className="rounded-lg border border-ink/10 bg-white/72 p-4" key={category}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{category}</h3>
                    <span className="rounded-md border border-ink/8 bg-[#f7f4ec] px-2 py-1 text-[11px] font-bold text-ink/42">
                      {definitions.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {definitions.map((definition) => {
                      const listening = listeningActionId === definition.id;
                      return (
                        <div
                          className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-ink/8 bg-white px-3 py-2"
                          key={definition.id}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{definition.label}</p>
                            <p className="mt-0.5 text-[11px] font-semibold text-ink/42">
                              Default {formatShortcut(definition.defaultShortcut)}
                            </p>
                          </div>
                          <button
                            aria-label={`Change ${definition.label} keybind`}
                            className={classNames(
                              "min-w-[116px] rounded-md border px-3 py-2 text-center text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5d855e]/35",
                              listening
                                ? "border-[#5d855e] bg-[#e9f2e6] text-[#31583a]"
                                : "border-ink/10 bg-[#f7f4ec] text-ink/65 hover:bg-[#eef6eb] hover:text-[#31583a]"
                            )}
                            onBlur={() => setListeningActionId((current) => (current === definition.id ? null : current))}
                            onClick={() => setListeningActionId(definition.id)}
                            onKeyDown={(event) => {
                              if (!listening) return;
                              event.preventDefault();
                              event.stopPropagation();
                              const shortcut = shortcutFromKeyboardEvent(event.nativeEvent);
                              if (!shortcut) return;
                              onChange(definition.id, shortcut);
                              setListeningActionId(null);
                            }}
                            type="button"
                          >
                            {listening ? "Press keys" : formatShortcut(bindings[definition.id])}
                          </button>
                          <button
                            aria-label={`Clear ${definition.label} keybind`}
                            className="rounded-md p-2 text-ink/38 transition hover:bg-[#fff0ea] hover:text-[#b94736]"
                            onClick={() => onChange(definition.id, "")}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 bg-white/64 px-5 py-4 md:px-6">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink/58 transition hover:bg-ink/[0.035] hover:text-ink"
            onClick={onReset}
            type="button"
          >
            <RefreshCcw className="h-4 w-4" />
            Reset defaults
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-[#174b2a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(23,75,42,0.22)] transition hover:-translate-y-0.5"
            onClick={onClose}
            type="button"
          >
            <Check className="h-4 w-4" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

