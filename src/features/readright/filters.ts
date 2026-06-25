import { Shield } from "lucide-react";
import type { PreSearchFilters } from "./types";

export const defaultPreSearchFilters: PreSearchFilters = {
  topicArea: "General research",
  evidenceTypes: ["Research studies"],
  publicationWindow: "Last 10 years",
};

export const topicAreaOptions = [
  "General research",
  "Health",
  "Technology",
  "Education",
  "Climate and environment",
  "Economics",
  "Policy",
  "Social science",
  "Psychology",
  "Neuroscience",
  "Workplace",
  "Digital products",
  "Consumer products",
  "Public health",
  "Nutrition",
  "Sleep",
  "Exercise and movement",
  "Clinical treatment",
] as const;

export const evidenceTypeOptions = [
  "Research studies",
  "Human studies",
  "Systematic reviews",
  "Meta-analyses",
  "Randomized trials",
  "Guidelines and standards",
  "Technical reports",
  "Benchmarks",
  "Field studies",
  "Cohort studies",
  "Case-control studies",
  "Qualitative research",
  "Mechanism studies",
  "Dataset analyses",
  "Animal studies",
  "In vitro studies",
  "Safety reports",
  "Adverse event data",
  "Regulatory sources",
  "Public articles",
] as const;

export const publicationWindowOptions = ["Last 10 years", "Last 5 years", "Since 2020", "Any year"] as const;

export const preSearchFilterGroups = [
  {
    key: "topicArea",
    label: "Topic area",
    Icon: Shield,
    options: topicAreaOptions,
  },
] as const;
