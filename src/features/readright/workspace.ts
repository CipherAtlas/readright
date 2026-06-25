import type { ClaimAssessment, EvidenceDirection, EvidenceTopic, MatchQuality, SourceRecord } from "../../types/evidence";
import type { Branch, ReasonNode, Tone, Workspace, WorkspaceFilter, WorkspaceSource } from "./types";
import { confidenceLabels, durabilityLabels, effectLabels, matchLabels, signalSummary } from "./labels";

export function firstAvailableBranch(workspace: Workspace) {
  return workspace.supports[0] || workspace.opposes[0] || workspace.neutral[0];
}

export function filterWorkspace(workspace: Workspace, filter: WorkspaceFilter): Workspace {
  if (filter === "All" || filter === "Evidence") return workspace;

  const next =
    filter === "For"
      ? { supports: workspace.supports, opposes: [], neutral: [] }
      : filter === "Against"
        ? { supports: [], opposes: workspace.opposes, neutral: [] }
        : filter === "Assumptions"
          ? {
              supports: workspace.supports.filter((branch) => !branch.assumptionsLabel.startsWith("0 ")),
              opposes: workspace.opposes.filter((branch) => !branch.assumptionsLabel.startsWith("0 ")),
              neutral: workspace.neutral.filter((branch) => !branch.assumptionsLabel.startsWith("0 ")),
            }
          : {
              supports: workspace.supports.filter((branch) => branch.confidence !== "Strong"),
              opposes: workspace.opposes.filter((branch) => branch.confidence !== "Strong"),
              neutral: workspace.neutral,
            };

  if (!next.supports.length && !next.opposes.length && !next.neutral.length) {
    return workspace;
  }

  return {
    ...workspace,
    supports: next.supports,
    opposes: next.opposes,
    neutral: next.neutral,
  };
}

export const demoWorkspace: Workspace = {
  claim: "Daily magnesium improves sleep quality.",
  normalizedClaim: "Magnesium may help some people sleep better, but the effect depends on baseline status, dose, and study quality.",
  confidence: "low",
  status: "Possible",
  summary:
    "The map treats this as a plausible but limited sleep claim. Stronger wording should wait for better-controlled studies.",
  supports: [
    {
      id: "support-sleep-latency",
      title: "Improves sleep latency",
      tone: "support",
      status: "Supported",
      reasonsLabel: "4 reasons",
      studiesLabel: "2 studies",
      assumptionsLabel: "1 assumption",
      confidence: "Mixed",
      rationale: "May reduce time to fall asleep in groups with lower magnesium or higher baseline sleep disruption.",
      counterpoint: "Several trials are small and outcomes vary by formulation.",
      sourceIds: ["rct-2021", "review-2024"],
      children: [
        {
          id: "faster-onset",
          title: "Faster onset",
          tone: "support",
          badge: "2 studies",
          detail: "Lower baseline magnesium linked to longer sleep latency.",
          sourceIds: ["rct-2021", "review-2024"],
        },
        {
          id: "relaxation-pathway",
          title: "Reduced arousal",
          tone: "support",
          badge: "1 study",
          detail: "Supplementation may shorten time to sleep onset.",
          sourceIds: ["rct-2021"],
        },
        {
          id: "deficiency-subgroup",
          title: "Deficiency subgroup",
          tone: "support",
          badge: "1 assumption",
          detail: "Effects may concentrate in users with lower baseline intake.",
          sourceIds: ["review-2024"],
        },
        {
          id: "small-trial-signal",
          title: "Small trial signal",
          tone: "support",
          badge: "1 study",
          detail: "Some outcomes favor magnesium, but estimates remain imprecise.",
          sourceIds: ["rct-2021"],
        },
      ],
    },
    {
      id: "support-duration",
      title: "Enhances sleep duration",
      tone: "support",
      status: "Supported",
      reasonsLabel: "3 reasons",
      studiesLabel: "3 studies",
      assumptionsLabel: "1 assumption",
      confidence: "Mixed",
      rationale: "Some study arms report longer sleep windows after repeated supplementation.",
      counterpoint: "Duration changes are inconsistent and often self-reported.",
      sourceIds: ["review-2024"],
      children: [],
    },
    {
      id: "support-quality",
      title: "Improves sleep quality metrics",
      tone: "support",
      status: "Supported",
      reasonsLabel: "4 studies",
      studiesLabel: "4 studies",
      assumptionsLabel: "1 assumption",
      confidence: "Low",
      rationale: "Subjective sleep scales sometimes move in a favorable direction.",
      counterpoint: "Different scales make the effects hard to compare.",
      sourceIds: ["review-2024"],
      children: [],
    },
  ],
  opposes: [
    {
      id: "oppose-effect-size",
      title: "Limited effect size in most studies",
      tone: "oppose",
      status: "Opposed",
      reasonsLabel: "4 studies",
      studiesLabel: "4 studies",
      assumptionsLabel: "1 assumption",
      confidence: "Mixed",
      rationale: "Small samples and varied controls make the observed benefit uncertain.",
      counterpoint: "Some subgroups may still benefit.",
      sourceIds: ["review-2024"],
      children: [
        {
          id: "small-effect",
          title: "Effect may be small",
          tone: "oppose",
          badge: "2 studies",
          detail: "Magnitude may be modest across pooled outcomes.",
          sourceIds: ["review-2024"],
        },
      ],
    },
    {
      id: "oppose-bias",
      title: "Publication bias concerns",
      tone: "oppose",
      status: "Opposed",
      reasonsLabel: "2 reasons",
      studiesLabel: "2 studies",
      assumptionsLabel: "1 assumption",
      confidence: "Low",
      rationale: "Positive studies are easier to find than null results.",
      counterpoint: "Sensitivity checks may reduce but not remove the concern.",
      sourceIds: ["review-2024"],
      children: [],
    },
    {
      id: "oppose-everyone",
      title: "Not effective for everyone",
      tone: "oppose",
      status: "Opposed",
      reasonsLabel: "3 reasons",
      studiesLabel: "3 studies",
      assumptionsLabel: "2 assumptions",
      confidence: "Mixed",
      rationale: "Benefit likely depends on baseline diet, formulation, and coexisting sleep problems.",
      counterpoint: "Low-risk adjunct framing can still be reasonable.",
      sourceIds: ["rct-2021"],
      children: [],
    },
  ],
  neutral: [
    {
      id: "neutral-measurement",
      title: "Measurement limitations",
      tone: "neutral",
      status: "Neutral",
      reasonsLabel: "1 note",
      studiesLabel: "1 study",
      assumptionsLabel: "1 assumption",
      confidence: "Low",
      rationale: "Subjective sleep outcomes vary widely.",
      counterpoint: "Objective measures would clarify the claim.",
      sourceIds: ["review-2024"],
      children: [
        {
          id: "subjective-outcomes",
          title: "Subjective outcomes vary widely",
          tone: "assumption",
          badge: "1 assumption",
          detail: "Sleep quality scores do not always align with objective sleep measures.",
          sourceIds: ["review-2024"],
        },
      ],
    },
  ],
  sources: [
    {
      id: "rct-2021",
      title: "The effect of magnesium supplementation on primary insomnia in elderly: A double-blind placebo-controlled clinical trial",
      meta: "RCT · N=46",
      year: 2012,
      type: "RCT",
      direction: "Supports",
      quality: "moderate",
      takeaway: "Magnesium reduced sleep onset latency vs placebo.",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3703169/",
      sample: "Journal of Research in Medical Sciences",
    },
    {
      id: "review-2024",
      title: "Oral magnesium supplementation for insomnia in older adults: a Systematic Review & Meta-Analysis",
      meta: "Systematic review · 3 RCTs",
      year: 2021,
      type: "Systematic review",
      direction: "Supports",
      quality: "moderate",
      takeaway: "Small to moderate improvements in sleep latency across studies.",
      url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8053283/",
      sample: "BMC Complementary Medicine and Therapies",
    },
  ],
};

export function isSupport(direction: EvidenceDirection) {
  return direction === "supports" || direction === "supports_narrower";
}

export function isOppose(direction: EvidenceDirection) {
  return (
    direction === "against" ||
    direction === "misleading" ||
    direction === "marketing_overreach" ||
    direction === "insufficient"
  );
}

export function sourceTone(source: SourceRecord): WorkspaceSource["direction"] {
  if (isSupport(source.stance)) return "Supports";
  if (isOppose(source.stance)) return "Opposes";
  return "Mixed";
}

export function shortTitle(value: string, maxLength = 46) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}…`;
}


export function makeReasonNodes(claim: ClaimAssessment): ReasonNode[] {
  const fitRows: Array<[string, MatchQuality]> = [
    ["Population fit", claim.populationMatch],
    ["Intervention fit", claim.interventionMatch],
    ["Outcome fit", claim.outcomeMatch],
    ["Comparator fit", claim.comparatorMatch],
  ];

  const fitNodes: ReasonNode[] = fitRows.map(([label, value], index) => ({
    id: `${claim.id}-${label.toLowerCase().replace(/\s+/g, "-")}`,
    title: `${label}: ${matchLabels[value]}`,
    tone: value === "mismatch" ? "oppose" : value === "direct" ? "support" : "assumption",
    badge: index === 0 ? `${claim.sourceIds.length} studies` : "1 assumption",
    detail: claim.frameworkSignals[index] || claim.reviewerNote || claim.reasoning,
    sourceIds: claim.sourceIds,
  }));

  const effectTone: Tone =
    claim.effectMagnitude === "none"
      ? "oppose"
      : claim.effectMagnitude === "unclear"
        ? "assumption"
        : "support";
  const durabilityTone: Tone =
    claim.durability === "long_term" || claim.durability === "medium_term"
      ? "support"
      : claim.durability === "unclear"
        ? "assumption"
        : "neutral";
  const evidenceGapTone: Tone = claim.evidenceGap.impact === "high" ? "oppose" : "assumption";
  const safetyBadge = signalSummary(claim.safetySignals);
  const citationBadge = signalSummary(claim.citationFidelitySignals);

  return [
    ...fitNodes,
    {
      id: `${claim.id}-effect-magnitude`,
      title: `Effect: ${effectLabels[claim.effectMagnitude]}`,
      tone: effectTone,
      badge: claim.effectMagnitude,
      detail: claim.evidenceGap.summary,
      sourceIds: claim.sourceIds,
    },
    {
      id: `${claim.id}-durability`,
      title: `Durability: ${durabilityLabels[claim.durability]}`,
      tone: durabilityTone,
      badge: claim.durability.replace("_", " "),
      detail: "Durability should not exceed the longest reliable follow-up that matches the claim.",
      sourceIds: claim.sourceIds,
    },
    {
      id: `${claim.id}-evidence-gap`,
      title: `Evidence gap: ${claim.evidenceGap.impact}`,
      tone: evidenceGapTone,
      badge: `${claim.evidenceGap.missingEvidence.length} gaps`,
      detail: claim.evidenceGap.summary,
      sourceIds: claim.sourceIds,
    },
    {
      id: `${claim.id}-safety-signals`,
      title: `Safety: ${safetyBadge}`,
      tone: safetyBadge.includes("flagged") ? "oppose" : safetyBadge.includes("missing") ? "assumption" : "neutral",
      badge: safetyBadge,
      detail: "Safety review separates adverse events, dropout, worsening, contraindications, crisis escalation, and replacement-of-care risk.",
      sourceIds: claim.sourceIds,
    },
    {
      id: `${claim.id}-citation-fidelity`,
      title: `Citation fidelity: ${citationBadge}`,
      tone: citationBadge.includes("flagged") ? "oppose" : citationBadge.includes("possible") ? "assumption" : "neutral",
      badge: citationBadge,
      detail: "Citation review checks population, intervention, outcome, mechanism-to-treatment, causality, durability, and omitted limitations.",
      sourceIds: claim.sourceIds,
    },
  ];
}

export function makeBranch(claim: ClaimAssessment): Branch {
  const tone = isSupport(claim.direction)
    ? "support"
    : isOppose(claim.direction)
      ? "oppose"
      : "neutral";

  return {
    id: claim.id,
    title: shortTitle(claim.claim, 38),
    tone,
    status:
      tone === "support"
        ? "Supported"
        : tone === "oppose"
          ? "Opposed"
          : "Mixed",
    reasonsLabel: `${Math.max(2, claim.frameworkSignals.length)} reasons`,
    studiesLabel: `${claim.sourceIds.length} ${claim.sourceIds.length === 1 ? "study" : "studies"}`,
    assumptionsLabel: `${[claim.populationMatch, claim.interventionMatch, claim.outcomeMatch, claim.comparatorMatch].filter(
      (value) => value !== "direct"
    ).length} assumptions`,
    confidence:
      claim.evidenceCertainty === "high" || claim.evidenceCertainty === "moderate"
        ? "Strong"
        : claim.evidenceCertainty === "insufficient" || claim.evidenceCertainty === "very_low"
          ? "Low"
          : "Mixed",
    rationale: claim.reasoning,
    counterpoint: claim.reviewerNote,
    children: makeReasonNodes(claim),
    sourceIds: claim.sourceIds,
  };
}

export function makeWorkspaceFromTopic(currentTopic: EvidenceTopic, submittedQuery: string): Workspace {
  const branches = currentTopic.claims.map(makeBranch);
  const supports = branches.filter((branch) => branch.tone === "support");
  const opposes = branches.filter((branch) => branch.tone === "oppose");
  const neutral = branches.filter((branch) => branch.tone === "neutral");

  return {
    claim: submittedQuery || currentTopic.query,
    normalizedClaim: currentTopic.verdict.responsibleWording,
    confidence: currentTopic.verdict.confidence,
    status: confidenceLabels[currentTopic.verdict.confidence],
    summary: currentTopic.verdict.summary,
    supports: supports.length ? supports : demoWorkspace.supports.slice(0, 1),
    opposes: opposes.length ? opposes : demoWorkspace.opposes.slice(0, 1),
    neutral,
    sources: currentTopic.sources.map((source) => ({
      id: source.id,
      title: source.title,
      meta: `${String(source.sourceType).replace(/_/g, " ")}${source.publisher ? ` · ${source.publisher}` : ""}`,
      year: source.year,
      type: source.studyType || String(source.sourceType).replace(/_/g, " "),
      direction: sourceTone(source),
      quality: source.evidenceCertainty,
      takeaway: source.shortSnippet || "Evidence detail available in the source record.",
      url: source.url,
      sample: source.publisher,
    })),
  };
}

export function getPrimaryBranch(workspace: Workspace, selectedBranchId: string) {
  return (
    [...workspace.supports, ...workspace.opposes, ...workspace.neutral].find(
      (branch) => branch.id === selectedBranchId
    ) ||
    workspace.supports[0] ||
    workspace.opposes[0] ||
    workspace.neutral[0]
  );
}

export function getSourceRecords(workspace: Workspace, ids: string[]) {
  const selected = workspace.sources.filter((source) => ids.includes(source.id));
  return selected.length ? selected : workspace.sources.slice(0, 2);
}

export function getBranchReasonNodes(branch: Branch): ReasonNode[] {
  if (branch.children.length) return branch.children;

  const fallbackNodes: ReasonNode[] = [
    {
      id: `${branch.id}-rationale`,
      title: branch.tone === "oppose" ? "Why this challenges the claim" : "Why this supports the claim",
      tone: branch.tone,
      badge: branch.reasonsLabel,
      detail: branch.rationale,
      sourceIds: branch.sourceIds,
    },
    {
      id: `${branch.id}-caveat`,
      title: "Important caveat",
      tone: "assumption",
      badge: branch.assumptionsLabel,
      detail: branch.counterpoint || "Interpret with the limits of the current evidence base.",
      sourceIds: branch.sourceIds,
    },
    {
      id: `${branch.id}-evidence-base`,
      title: "Evidence base",
      tone: "evidence",
      badge: branch.studiesLabel,
      detail: `${branch.studiesLabel} connected to this branch. Open the evidence view for source details.`,
      sourceIds: branch.sourceIds,
    },
  ];

  return fallbackNodes;
}
