import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { evidenceTopicJsonSchema } from "./evidence-schema.mjs";

const ROOT = process.cwd();
const FRAMEWORK_PATH = path.join(ROOT, "docs", "mhcif-codex-review-protocol.md");
const CALIBRATION_PATH = path.join(ROOT, "docs", "mhcif-calibration-examples.md");
const FRAMEWORK_VERSION = "mhcif-0.3-codex";

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "evidence-topic";
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`OpenAI did not return valid JSON: ${error.message}`);
  }
}

function defaultSafetySignals() {
  return {
    adverseEvents: "missing",
    dropout: "missing",
    symptomWorsening: "missing",
    contraindications: "missing",
    crisisEscalation: "missing",
    replacementOfCareRisk: "missing",
  };
}

function defaultCitationFidelitySignals() {
  return {
    wrongPopulation: "not_applicable",
    wrongIntervention: "not_applicable",
    wrongOutcome: "not_applicable",
    mechanismToTreatmentLeap: "not_applicable",
    correlationToCausationLeap: "not_applicable",
    durationOverreach: "not_applicable",
    limitationOmitted: "not_applicable",
  };
}

function normalizeClaim(claim, index) {
  return {
    ...claim,
    id: claim.id || `claim-${String(index + 1).padStart(3, "0")}`,
    evidenceGap: claim.evidenceGap || {
      summary: "Evidence gap was not separately specified in the source artifact.",
      missingEvidence: ["effect_size_unclear"],
      impact: claim.overstatementRisk === "high" ? "high" : "medium",
    },
    effectMagnitude: claim.effectMagnitude || "unclear",
    durability: claim.durability || "unclear",
    safetySignals: {
      ...defaultSafetySignals(),
      ...(claim.safetySignals || {}),
    },
    citationFidelitySignals: {
      ...defaultCitationFidelitySignals(),
      ...(claim.citationFidelitySignals || {}),
    },
  };
}

export function normalizeArtifact(
  artifact,
  fallbackQuery,
  reviewer = "openai_api"
) {
  const now = new Date().toISOString();
  const id = slugify(artifact.id || fallbackQuery);

  return {
    ...artifact,
    id,
    query: artifact.query || fallbackQuery,
    generatedAt: artifact.generatedAt || now,
    reviewer,
    frameworkVersion: FRAMEWORK_VERSION,
    claims: artifact.claims.map(normalizeClaim),
    sources: artifact.sources.map((source, index) => ({
      ...source,
      id: source.id || `src-${String(index + 1).padStart(3, "0")}`,
      publisher: source.publisher || "",
      authors: Array.isArray(source.authors) ? source.authors : [],
      publishedAt: source.publishedAt || "",
      accessedAt: source.accessedAt || now.slice(0, 10),
      studyType: source.studyType || "",
      frameworkFlags: Array.isArray(source.frameworkFlags)
        ? source.frameworkFlags
        : ["MHCIF"],
      shortSnippet: source.shortSnippet || "",
      year: Number.isInteger(source.year) ? source.year : 0,
    })),
  };
}

function formatPreSearchFilters(preSearchFilters = {}) {
  const evidenceTypeText = Array.isArray(preSearchFilters.evidenceTypes) && preSearchFilters.evidenceTypes.length
    ? preSearchFilters.evidenceTypes.join(", ")
    : preSearchFilters.evidenceType || "Human studies";
  const filters = {
    topicArea: preSearchFilters.topicArea || "Health",
    evidenceType: evidenceTypeText,
    publicationWindow: preSearchFilters.publicationWindow || "Last 10 years",
  };

  return `
Pre-search filters are mandatory source-discovery constraints:
- Topic area: ${filters.topicArea}
- Evidence type: ${filters.evidenceType}
- Publication window: ${filters.publicationWindow}

Apply these filters before web/source discovery. Keep searches concise by combining the claim with the topic area, evidence type, and publication window. Prefer sources that satisfy all three filters. If direct sources cannot be found inside these filters, state the evidence gap instead of silently broadening the search. Only broaden when needed to capture major safety, null, skeptical, or limitation evidence; label any broadened evidence as outside the pre-search filter.`;
}

export function reviewPrompt({ mode, query, articleUrl, articleText, framework, preSearchFilters = {} }) {
  const preSearchFilterText = formatPreSearchFilters(preSearchFilters);
  const common = `
You are generating a local evidence-map artifact for a mental-health claim integrity tool.

Use this exact framework as the judging protocol:

${framework}

Hard constraints:
- Follow the framework conservatively.
- Use public, permitted sources only.
- Do not bypass paywalls, login walls, CAPTCHAs, or explicit technical restrictions.
- Do not store full article bodies.
- Store only metadata, links, short trace notes, normalized claims, and derived judgments.
- Prefer systematic reviews, meta-analyses, guidelines, and direct trials where available.
- Include sources for support, narrower support, mixed/null/against evidence, limitations, safety, and overstatement risk where available.
- If a required evidence category cannot be found, state the gap in the artifact reasoning.
- Use "supports" only when the claim is direct, robust, and proportionate. Otherwise prefer "supports_narrower", "mixed", "insufficient", "misleading", or "marketing_overreach".
- Each claim reviewerNote must be a conclusion that answers what a careful writer, researcher, or product team should do with the claim.
- Every sourceId referenced by a claim must exist in sources.
- Do not invent URLs, titles, dates, authors, or publishers. If metadata is not available, use an empty string for string fields and 0 for unknown year.
- Return only JSON matching the schema.
${preSearchFilterText}
`;

  if (mode === "article") {
    return `${common}

Task: inspect a supplied article with the framework.
Article URL: ${articleUrl || "not supplied"}
Article text or excerpt:
${articleText || "not supplied"}

Output an EvidenceTopic artifact where claims are the mental-health claims extracted from the article. If a URL is supplied, use web search to read permitted public information about that URL and its cited evidence. If article text is supplied, analyze that text directly and use web search only to check citation fidelity and surrounding evidence when needed.`;
  }

  return `${common}

Task: search and review this mental-health claim or topic:
${query}

Output an EvidenceTopic artifact that maps relevant claims into supports, supports_narrower, mixed, against, insufficient, misleading, and marketing_overreach where applicable.`;
}

export async function runMhcifReview({
  mode,
  query,
  articleUrl = "",
  articleText = "",
  preSearchFilters = {},
}) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY is not set.");
    error.statusCode = 503;
    throw error;
  }

  if (mode === "query" && !query?.trim()) {
    const error = new Error("A query is required.");
    error.statusCode = 400;
    throw error;
  }

  if (mode === "article" && !articleUrl?.trim() && !articleText?.trim()) {
    const error = new Error("An article URL or article text is required.");
    error.statusCode = 400;
    throw error;
  }

  const [frameworkProtocol, calibrationExamples] = await Promise.all([
    fs.readFile(FRAMEWORK_PATH, "utf8"),
    fs.readFile(CALIBRATION_PATH, "utf8"),
  ]);
  const framework = `${frameworkProtocol}\n\n${calibrationExamples}`;
  const client = new OpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-5.5";
  const fallbackQuery =
    mode === "article"
      ? `Article inspection: ${articleUrl || articleText.slice(0, 80)}`
      : query;

  const response = await client.responses.create({
    model,
    reasoning: { effort: process.env.OPENAI_REASONING_EFFORT || "medium" },
    tools: [{ type: "web_search", search_context_size: "medium" }],
    text: {
      format: {
        type: "json_schema",
        name: "evidence_topic",
        strict: true,
        schema: evidenceTopicJsonSchema,
      },
    },
    input: reviewPrompt({
      mode,
      query,
      articleUrl,
      articleText: articleText.slice(0, 30000),
      framework,
      preSearchFilters,
    }),
  });

  const parsed = safeJsonParse(response.output_text);
  return normalizeArtifact(parsed, fallbackQuery);
}

export function artifactFilename(topic) {
  const timestamp = new Date(topic.generatedAt)
    .toISOString()
    .replace(/[:.]/g, "-");
  return `${topic.id}-${timestamp}.json`;
}
