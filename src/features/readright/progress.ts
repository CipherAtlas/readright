import type { RunProgressStatus } from "./types";

export const runProgressSteps = [
  {
    id: "prepare",
    label: "Prepare request",
    detail: "Checking the claim and selected filters.",
  },
  {
    id: "request",
    label: "Start review",
    detail: "Sending the review to the local evidence runner.",
  },
  {
    id: "search",
    label: "Find evidence",
    detail: "Gathering studies and source metadata.",
  },
  {
    id: "analyze",
    label: "Assess claims",
    detail: "Comparing support, limits, and counterpoints.",
  },
  {
    id: "compose",
    label: "Build artifact",
    detail: "Structuring branches, reasons, sources, and verdict.",
  },
  {
    id: "render",
    label: "Render map",
    detail: "Saving the review and drawing the updated canvas.",
  },
] as const;
export type RunProgressStepId = (typeof runProgressSteps)[number]["id"];
export type RunProgress = {
  stepId: RunProgressStepId;
  progress: number;
  detail: string;
  status: RunProgressStatus;
};

