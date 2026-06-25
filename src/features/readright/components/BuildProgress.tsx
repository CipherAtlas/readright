import { Check, CircleDot, Loader2 } from "lucide-react";
import type { RunProgress } from "../progress";
import { runProgressSteps } from "../progress";
import { classNames } from "../utils/classNames";

export function BuildProgressOverlay({ progress }: { progress: RunProgress }) {
  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/[0.18] px-4 py-6 backdrop-blur-[12px]"
      role="status"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,253,247,0.42),transparent_36%),linear-gradient(180deg,rgba(244,239,227,0.12),rgba(16,16,14,0.16))]" />
      <BuildProgressPanel progress={progress} />
    </div>
  );
}

function BuildProgressPanel({ progress }: { progress: RunProgress }) {
  const activeIndex = runProgressSteps.findIndex((step) => step.id === progress.stepId);
  const boundedProgress = Math.min(100, Math.max(0, progress.progress));

  return (
    <div className="relative z-10 w-[min(92vw,550px)] overflow-hidden rounded-[18px] border border-white/[0.55] bg-[#fffdf7]/[0.86] p-7 shadow-[0_28px_90px_rgba(16,16,14,0.24)] ring-1 ring-ink/5 backdrop-blur-xl sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-bold leading-tight text-ink">
            {progress.status === "complete"
              ? "Map ready"
              : progress.status === "error"
                ? "Build interrupted"
                : "Building map"}
          </p>
          <p className="mt-3 max-w-[360px] text-lg font-semibold leading-8 text-ink/58">
            {progress.detail}
          </p>
        </div>
        <span className="shrink-0 rounded-xl border border-[#dfe5ef] bg-white/80 px-4 py-2 text-xl font-bold text-ink/55 shadow-[0_10px_26px_rgba(16,16,14,0.06)]">
          {Math.round(boundedProgress)}%
        </span>
      </div>
      <div
        aria-label="Map build progress"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(boundedProgress)}
        className="h-4 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
      >
        <div
          className={classNames(
            "h-full rounded-full transition-all duration-500",
            progress.status === "error" ? "bg-[#d34f32]" : "bg-[#4f8256]"
          )}
          style={{ width: `${boundedProgress}%` }}
        />
      </div>
      <div className="mt-7 space-y-4">
        {runProgressSteps.map((step, index) => {
          const isComplete = progress.status === "complete" || index < activeIndex;
          const isActive = index === activeIndex && progress.status === "running";
          const isError = index === activeIndex && progress.status === "error";

          return (
            <div
              className={classNames(
                "flex items-start gap-5 rounded-xl px-4 py-3 text-lg font-bold transition",
                isActive && "bg-[#e9f2e6]/82 text-[#31583a]",
                isError && "bg-[#fff0ea] text-[#b94736]",
                !isActive && !isError && (isComplete ? "text-ink/68" : "text-ink/38")
              )}
              key={step.id}
            >
              <span
                className={classNames(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                  isComplete && "border-[#4f8256] bg-[#4f8256] text-white",
                  isActive && "border-[#4f8256] bg-white text-[#4f8256]",
                  isError && "border-[#d34f32] bg-[#d34f32] text-white",
                  !isComplete && !isActive && !isError && "border-ink/18 bg-white/70 text-ink/32"
                )}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CircleDot className="h-4 w-4" />
                )}
              </span>
              <span>
                <span className="block">{step.label}</span>
                {(isActive || isError) && (
                  <span className="mt-2 block max-w-[360px] text-base font-semibold leading-7 opacity-75">
                    {step.detail}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

