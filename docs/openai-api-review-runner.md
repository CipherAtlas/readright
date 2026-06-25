# ReadRight Review Runners

ReadRight uses the OpenAI API to run the same RRIF protocol that Codex Desktop uses. Trusted local/internal installations can optionally use Codex CLI instead.

Single source of truth:

- Framework: `docs/rrif-review-protocol.md`
- Artifact contract: `server/evidence-topic.schema.json`
- Schema module: `server/evidence-schema.mjs`
- Example/template: `templates/evidence-topic-template.json`
- Frontend type shape: `src/types/evidence.ts`
- Product handoff/status: `docs/app-progress-for-agents.md`

## OpenAI API Runtime

The server reads `OPENAI_API_KEY` from the environment and calls the Responses API. The review call enables OpenAI web search so the model can find and read public, permitted web/scientific sources before producing a structured artifact.

The runner:

1. Loads `docs/rrif-review-protocol.md`.
2. Builds a conservative RRIF review prompt.
3. Calls OpenAI with `web_search`.
4. Requires strict JSON matching the evidence topic schema.
5. Saves the returned artifact to `data/topics`.
6. Returns the artifact to the frontend.

The runner receives `preSearchFilters` from the frontend and applies them before source discovery. Defaults are:

```json
{
  "topicArea": "General research",
  "evidenceTypes": ["Research studies"],
  "publicationWindow": "Last 10 years"
}
```

These filters are not final evidence judgments. They are pre-search constraints that keep the OpenAI/Codex source-discovery pass concise. If major safety, null, skeptical, or limitation evidence sits outside the filter, the runner can broaden search only when needed and should label that evidence as outside the filter.

## Endpoints

- `GET /api/health`
- `GET /api/topics`
- `GET /api/topics/:filename`
- `POST /api/review/claim` with `{ "query": "Does this intervention improve the measured outcome?", "preSearchFilters": { "topicArea": "General research", "evidenceTypes": ["Research studies", "Systematic reviews"], "publicationWindow": "Last 10 years" } }`
- `POST /api/review/article` with `{ "articleUrl": "https://...", "preSearchFilters": { ... } }` or `{ "articleText": "...", "preSearchFilters": { ... } }`
- `GET /api/canvas/:id`
- `GET /api/canvas/:id/versions`
- `POST /api/canvas`

`POST /api/canvas` stores the current canvas JSON and appends a version snapshot. Payload shape:

```json
{
  "id": "demo-workspace",
  "topicId": "breathwork-anxiety",
  "query": "Daily magnesium improves sleep quality.",
  "view": "overview",
  "selectedBranchId": "support-sleep-latency",
  "selectedReasonId": "faster-onset",
  "nodes": [],
  "arrows": []
}
```

Canvas files are intentionally simple local JSON:

- current state: `data/canvases/<canvas-id>.json`
- version history: `data/canvases/<canvas-id>.versions.json`

No local database is currently required.

## Boundaries

The runner is not a crawler and does not archive web pages. It stores only metadata, links, normalized claims, framework judgments, and short trace notes. It must not bypass paywalls, login walls, CAPTCHAs, or explicit technical restrictions.

Codex Desktop can still generate artifacts manually, but it should use the same framework document and artifact contract.

## Codex CLI Runtime

Set:

```bash
REVIEW_ENGINE=codex_cli
```

or leave:

```bash
REVIEW_ENGINE=auto
OPENAI_API_KEY=
```

The server runs `codex exec` with:

- `--sandbox read-only`
- `--ephemeral`
- `--skip-git-repo-check`
- `--output-schema server/evidence-topic.schema.json`
- `-o <tempfile>`

This mode reuses the local Codex CLI authentication. The server does not read, copy, or store `~/.codex/auth.json`.

Use this only on trusted local/internal machines. For open-source distribution, `REVIEW_ENGINE=openai_api` is simpler and less dependent on each user's Codex installation.
