import type { EvidenceCertainty, MatchQuality } from "../../types/evidence";

export const confidenceLabels: Record<EvidenceCertainty, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
  very_low: "Very low",
  insufficient: "Insufficient",
};

export const matchLabels: Record<MatchQuality, string> = {
  direct: "Direct",
  partial: "Partial",
  indirect: "Indirect",
  mismatch: "Mismatch",
};

export const effectLabels = {
  none: "None",
  small: "Small",
  moderate: "Moderate",
  large: "Large",
  unclear: "Unclear",
} as const;

export const durabilityLabels = {
  immediate: "Immediate",
  short_term: "Short term",
  medium_term: "Medium term",
  long_term: "Long term",
  unclear: "Unclear",
} as const;

export function signalSummary(signals: Record<string, string>) {
  const values = Object.values(signals);
  const risks = values.filter((value) => value === "risk_flagged" || value === "present").length;
  const possible = values.filter((value) => value === "possible").length;
  const missing = values.filter((value) => value === "missing").length;
  if (risks) return `${risks} flagged`;
  if (possible) return `${possible} possible`;
  if (missing) return `${missing} missing`;
  return "Clear";
}

