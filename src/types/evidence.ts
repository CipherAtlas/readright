export type EvidenceCertainty =
  | "high"
  | "moderate"
  | "low"
  | "very_low"
  | "insufficient";

export type EvidenceDirection =
  | "supports"
  | "supports_narrower"
  | "mixed"
  | "against"
  | "insufficient"
  | "misleading"
  | "marketing_overreach";

export type MatchQuality = "direct" | "partial" | "indirect" | "mismatch";
export type EffectMagnitude = "none" | "small" | "moderate" | "large" | "unclear";
export type Durability = "immediate" | "short_term" | "medium_term" | "long_term" | "unclear";
export type EvidenceGapType =
  | "no_direct_trials"
  | "small_samples"
  | "short_follow_up"
  | "weak_comparators"
  | "population_mismatch"
  | "intervention_mismatch"
  | "outcome_mismatch"
  | "safety_missing"
  | "effect_size_unclear"
  | "replication_missing"
  | "implementation_gap";
export type SafetySignal =
  | "adequately_addressed"
  | "partly_addressed"
  | "missing"
  | "risk_flagged"
  | "not_applicable";
export type CitationFidelitySignal =
  | "not_found"
  | "possible"
  | "present"
  | "not_applicable";

export type SourceType =
  | "systematic_review"
  | "meta_analysis"
  | "rct"
  | "observational_study"
  | "guideline"
  | "public_article"
  | "product_page"
  | "other";

export type ClaimAssessment = {
  id: string;
  claim: string;
  normalizedClaim: string;
  direction: EvidenceDirection;
  evidenceCertainty: EvidenceCertainty;
  overstatementRisk: "low" | "medium" | "high";
  evidenceGap: {
    summary: string;
    missingEvidence: EvidenceGapType[];
    impact: "low" | "medium" | "high";
  };
  effectMagnitude: EffectMagnitude;
  durability: Durability;
  safetySignals: {
    adverseEvents: SafetySignal;
    dropout: SafetySignal;
    symptomWorsening: SafetySignal;
    contraindications: SafetySignal;
    crisisEscalation: SafetySignal;
    replacementOfCareRisk: SafetySignal;
  };
  citationFidelitySignals: {
    wrongPopulation: CitationFidelitySignal;
    wrongIntervention: CitationFidelitySignal;
    wrongOutcome: CitationFidelitySignal;
    mechanismToTreatmentLeap: CitationFidelitySignal;
    correlationToCausationLeap: CitationFidelitySignal;
    durationOverreach: CitationFidelitySignal;
    limitationOmitted: CitationFidelitySignal;
  };
  populationMatch: MatchQuality;
  interventionMatch: MatchQuality;
  outcomeMatch: MatchQuality;
  comparatorMatch: MatchQuality;
  reasoning: string;
  sourceIds: string[];
  frameworkSignals: string[];
  reviewerNote: string;
};

export type SourceRecord = {
  id: string;
  title: string;
  url: string;
  publisher?: string;
  authors?: string[];
  publishedAt?: string;
  accessedAt: string;
  sourceType: SourceType;
  studyType?: string;
  frameworkFlags: string[];
  commercialBias: "low" | "medium" | "high" | "unknown";
  safetyCoverage: "good" | "limited" | "missing" | "not_applicable";
  shortSnippet?: string;
  evidenceCertainty: EvidenceCertainty;
  stance: EvidenceDirection;
  relevance: "high" | "medium" | "low";
  year?: number;
};

export type EvidenceTopic = {
  id: string;
  query: string;
  generatedAt: string;
  reviewer: "codex" | "openai_api";
  frameworkVersion: string;
  verdict: {
    summary: string;
    confidence: EvidenceCertainty;
    responsibleWording: string;
  };
  claims: ClaimAssessment[];
  sources: SourceRecord[];
};
