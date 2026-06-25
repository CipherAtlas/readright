<p align="center">
  <img src="public/readright-logo.png" alt="ReadRight logo" width="180">
</p>

# ReadRight

ReadRight is a local-first prototype for checking claims made in research articles, health articles, public reports, and other evidence-backed writing.

It turns a topic, claim, or article into a visual evidence map so a user can see what supports the claim, what argues against it, which sources were used, and where the evidence is uncertain.

The name is a deliberate play on "read/write": ReadRight helps users read the right evidence first, then use that grounded understanding to write stronger essays, summaries, and reviews.

## What It Does

- Builds structured evidence reviews using the **ReadRight Integrity Framework (RRIF)**.
- Shows claims as a canvas with support, opposition, assumptions, source notes, and unresolved questions.
- Lets users add their own notes, highlights, sources, diagram shapes, and arrows.
- Saves review artifacts and canvas versions as local JSON files.
- Exports evidence summaries as JSON, CSV, XLSX, DOCX, or a print-ready PDF.

## ReadRight Integrity Framework

The **ReadRight Integrity Framework (RRIF)** is the review framework behind ReadRight. It is designed for research articles across domains, not only mental health. RRIF does not ask whether an article is simply "good" or "bad." Instead, it asks whether the article's claims are supported by the evidence it uses, whether the wording is proportional to that evidence, and what a careful reader should do with the claim.

RRIF currently checks 14 primary parameters:

1. **Claim specificity**: whether the article makes a clear, testable claim.
2. **Population fit**: whether the evidence studies the same people, group, setting, or sample implied by the claim.
3. **Intervention or exposure fit**: whether the evidence studies the same treatment, product, behavior, condition, variable, or intervention.
4. **Outcome fit**: whether the evidence measures the same outcome the article claims.
5. **Comparator fit**: whether the evidence uses a meaningful comparison group, baseline, placebo, control, or alternative.
6. **Effect meaning**: whether the reported effect is practically or clinically meaningful, not only statistically significant.
7. **Durability**: whether the effect lasts long enough to support the claim being made.
8. **Evidence gaps**: what is missing before the claim could be made more confidently.
9. **Safety and harms**: whether risks, adverse effects, dropouts, deterioration, or misuse are addressed when relevant.
10. **Mechanism overreach**: whether a mechanism or plausibility finding is being treated as proof of a real-world outcome.
11. **Commercial pressure**: whether the article or cited material is tied to selling a product, service, course, device, supplement, or program.
12. **Citation fidelity**: whether the cited papers actually support the article's exact claim.
13. **Balance and uncertainty**: whether the article includes limitations, conflicting evidence, null findings, and uncertainty.
14. **Practical usefulness**: whether the article helps a reader make a responsible judgment instead of only persuading them.

## How Scoring Works

RRIF uses structured labels instead of a single hidden numerical score. Each article is broken into claims, and each claim is evaluated against the evidence. This keeps a strong study from automatically validating an unrelated claim, and it keeps a readable article from receiving credit for overstating weak evidence.

Individual parameters are scored with transparent categorical labels:

- Fit parameters use `direct`, `partial`, `indirect`, or `mismatch`.
- Evidence certainty uses `high`, `moderate`, `low`, `very_low`, or `insufficient`.
- Claim direction uses `supports`, `supports_narrower`, `mixed`, `against`, `insufficient`, `misleading`, or `marketing_overreach`.
- Effect magnitude uses `none`, `small`, `moderate`, `large`, or `unclear`.
- Durability uses `immediate`, `short_term`, `medium_term`, `long_term`, or `unclear`.
- Safety signals use `adequately_addressed`, `partly_addressed`, `missing`, `risk_flagged`, or `not_applicable`.
- Citation-fidelity signals use `not_found`, `possible`, `present`, or `not_applicable`.
- Source-level fields include relevance, stance, evidence certainty, safety coverage, commercial bias, source type, and framework flags.

RRIF then produces a claim-level judgment and a responsible wording suggestion. The final judgment is conservative: a claim is not upgraded just because a source is prestigious, a mechanism sounds plausible, many weak sources repeat the same point, or the article is well written. Strong ratings require direct evidence, matching populations and outcomes, reasonable comparators, clear effect meaning, adequate safety or limitation coverage, and faithful citation use.

## How We Make The Framework Fair

RRIF is meant to be fair by being explicit and repeatable:

- It separates article quality from claim fit. A source can be rigorous but irrelevant, and an article can be readable but still overstate the evidence.
- It checks evidence for and against the claim, including skeptical, null, limitation, and harm-oriented sources when available.
- It avoids one black-box article score. The reader can see which parameter lowered or raised confidence.
- It applies the same labels across claims, so similar evidence problems are treated consistently.
- It records uncertainty instead of hiding it. Missing evidence, unclear effect sizes, weak comparators, and indirect populations are named directly.
- It treats commercial pressure as a reason to inspect wording and citations more carefully, not as automatic proof that a claim is false.
- It stores metadata, links, short trace notes, and derived judgments rather than copying whole articles or relying on unsupported summaries.

## How RRIF Was Built

RRIF was built by combining standard evidence-review frameworks with ReadRight's claim-level checks. We looked at what each established framework is good at, then converted those concerns into article-review parameters that work across research domains.

The framework draws from:

- **GRADE** for certainty across a body of evidence.
- **RoB 2** for randomized-trial bias.
- **ROBINS-I** for non-randomized intervention-study bias.
- **AMSTAR 2** for systematic review and meta-analysis quality.
- **PRISMA** for review reporting quality.
- **CONSORT** for randomized-trial reporting quality.
- **STROBE** for observational-study reporting quality.
- **DISCERN** for public health information quality.
- **JAMA benchmarks** for authorship, attribution, disclosure, and currency.
- **NICE Evidence Standards Framework** for digital health and technology evidence expectations.

Those frameworks cover study quality, reporting quality, bias, citation transparency, uncertainty, and consumer-facing communication. RRIF adds the article-level layer: it checks whether the article's exact claim matches the actual evidence, whether important limitations are visible, and whether the wording stays within what the evidence can responsibly support.

## How It Works

ReadRight has a React/Vite frontend and a small Node server.

The server can generate reviews in two ways:

- With the OpenAI API, using `OPENAI_API_KEY`.
- With the local Codex CLI, using an existing Codex login.

Generated review files are saved in `data/topics`. Canvas files and version history are saved in `data/canvases`.

## Run Locally

```bash
./run.sh
```

`run.sh` installs dependencies if needed, builds the app, starts the local server, and prints the URL to open. By default, ReadRight runs at `http://localhost:8787`.

Open **Settings** in the top bar before building live maps. You can either:

- Paste an OpenAI API key. ReadRight saves it to your local `.env` file, which is ignored by git.
- Choose Codex CLI after installing Codex and running `codex login` on the same machine.

The default `REVIEW_ENGINE=auto` uses the OpenAI API when a key is configured and otherwise falls back to Codex CLI.
