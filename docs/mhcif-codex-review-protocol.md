# Mental Health Claim Integrity Framework

Version: `mhcif-0.3-codex`

This protocol tells Codex Desktop, Codex CLI, and the local OpenAI API runner how to generate evidence-map artifacts for ReadRight. It is the shared framework source of truth for every review engine. The goal is not to scrape and archive articles. The goal is to read permitted public or open scientific sources, extract claim-level judgments, and store only metadata, derived analysis, links, and short trace notes.

## Core Rule

Judge the relationship between a claim and the evidence. Do not judge an article as simply "good" or "bad."

A source can be credible but irrelevant to the claim. A public article can be readable but still overstate the evidence. A study can be useful but only support a narrower version of the claim.

## Source Discovery

Start broad, then tighten.

Preferred source order:

1. Systematic reviews, meta-analyses, and clinical guidelines.
2. Randomized controlled trials.
3. Non-randomized intervention studies.
4. Observational and mechanism studies.
5. Public health guidance from reputable institutions.
6. Consumer health articles and wellness/product pages.
7. Critical or skeptical sources that test overstatement.

Use official APIs when clean and available. Otherwise use normal browser/web reading for public pages that can be accessed without bypassing paywalls, logins, CAPTCHAs, or technical restrictions.

Do not store full article text.

Store:

- title
- URL
- publisher
- authors when available
- publication/access dates
- source type
- short trace note
- derived framework judgment
- source-to-claim relationship

## Pre-Search Filters

The app may send pre-search filters before source discovery. Treat them as mandatory search constraints, not as evidence-quality scores.

Current filter dimensions:

- topic area, for example `Health`, `Mental health`, `Clinical treatment`, `Wellness`, or `Digital health`
- evidence type, for example `Human studies`, `Systematic reviews`, `Randomized trials`, `Clinical guidelines`, `Mechanism studies`, or `Public articles`
- publication window, for example `Last 10 years`, `Last 5 years`, `Since 2020`, or `Any year`

Use these filters to make the initial web/search pass concise. Prefer sources that satisfy all selected filters. If direct evidence cannot be found inside the filters, state the evidence gap rather than silently broadening the search.

Only broaden beyond the filters when needed to capture important safety, null, skeptical, or limitation evidence. Label broadened evidence as outside the pre-search filter in reasoning or source notes.

## Adaptive Search Rules

The search should be guided by the custom framework, not by whatever sources are easiest to find.

For each topic, collect sources that can answer:

- Does the intervention actually match the claim?
- Does the population match?
- Does the outcome match?
- Is there a comparator?
- Is the effect clinically meaningful or only statistically significant?
- Does the evidence show durability?
- Are harms, dropout, deterioration, or contraindications discussed?
- Are there skeptical or null findings?
- Are public articles using the evidence faithfully?

Tighten search when:

- many sources repeat the same public article claims
- sources are mostly blogs or product pages
- claims depend on clinical treatment effects
- claims use phrases like "clinically proven," "cure," "reset," "rewire," or "evidence-based"
- safety is being implied

Loosen search when:

- no direct clinical trials exist
- the claim is mechanism-level rather than clinical
- the topic is emerging
- adjacent terms are needed to find evidence
- intervention names vary across studies

When loosening, label the evidence as indirect. Do not upgrade certainty simply because adjacent evidence exists.

## Existing Frameworks Included

Apply these as relevant:

- GRADE: certainty across a body of evidence.
- RoB 2: randomized trial bias.
- ROBINS-I: non-randomized intervention study bias.
- AMSTAR 2: systematic review/meta-analysis quality.
- PRISMA: review reporting quality.
- CONSORT: randomized trial reporting quality.
- STROBE: observational reporting quality.
- DISCERN: consumer health information quality.
- JAMA benchmarks: authorship, attribution, disclosure, and currency.
- NICE ESF: digital health technology evidence expectations.

These frameworks are inputs. The final judgment comes from MHCIF.

## MHCIF Criteria

For every extracted claim, score these fields:

### Claim Specificity

Ask whether the claim is concrete enough to evaluate.

Bad: "Breathwork heals anxiety."

Better: "Structured slow breathing may reduce short-term self-reported anxiety symptoms in adults with mild anxiety."

### Population Fit

Does the evidence study the same people the claim talks about?

- direct: same population
- partial: related but not exact
- indirect: different population, but possibly informative
- mismatch: the evidence does not apply

### Intervention Fit

Does the evidence study the same intervention?

Different breathing techniques, meditation protocols, therapy packages, apps, and lifestyle programs should not be treated as interchangeable.

### Outcome Fit

Does the evidence measure the same outcome?

Stress, anxiety symptoms, diagnosed anxiety disorder, panic attacks, mood, HRV, and neural activity are not the same outcome.

### Comparator Fit

What was the intervention compared against?

Rank comparators roughly:

1. active evidence-based treatment
2. credible placebo/sham
3. treatment as usual
4. waitlist/no treatment
5. before-after only
6. no comparator

### Effect Meaning

Check whether the effect is clinically meaningful, not merely statistically significant.

Record when effect sizes are unavailable, small, short-term, self-reported, or dependent on weak comparators.

Populate `effectMagnitude` separately from certainty:

- `none`: credible evidence shows no meaningful effect.
- `small`: effect appears limited, marginal, or mostly subjective.
- `moderate`: effect appears meaningful but not transformative.
- `large`: effect appears large and clinically important; use rarely and only with direct evidence.
- `unclear`: effect size cannot be responsibly inferred.

### Durability

Ask whether effects last beyond immediate or short-term follow-up.

Populate `durability`:

- `immediate`: post-session or same-day effect.
- `short_term`: days to weeks, or the nearest short follow-up.
- `medium_term`: multiple months.
- `long_term`: durable evidence over many months or longer.
- `unclear`: duration cannot be inferred.

Do not use a longer durability label than the evidence directly supports.

### Evidence Gap

Every claim must name the main evidence gap using `evidenceGap`.

Use `missingEvidence` values that apply:

- `no_direct_trials`
- `small_samples`
- `short_follow_up`
- `weak_comparators`
- `population_mismatch`
- `intervention_mismatch`
- `outcome_mismatch`
- `safety_missing`
- `effect_size_unclear`
- `replication_missing`
- `implementation_gap`

Set `impact` to `high` when the gap changes the direction label or prevents support for the claim as written.

### Safety and Harms

Check for adverse effects, dropout, worsening, contraindications, and warnings against replacing care.

Missing safety discussion should reduce article usefulness, especially for clinical or crisis-adjacent claims.

Populate `safetySignals` for:

- `adverseEvents`
- `dropout`
- `symptomWorsening`
- `contraindications`
- `crisisEscalation`
- `replacementOfCareRisk`

Use:

- `adequately_addressed`: directly and responsibly covered.
- `partly_addressed`: mentioned but incomplete.
- `missing`: relevant and not addressed.
- `risk_flagged`: evidence or wording raises a concern.
- `not_applicable`: genuinely not relevant to the claim.

### Mechanism Overreach

Mechanism evidence can explain plausibility. It cannot by itself prove clinical efficacy.

Flag claims using language like:

- reset the nervous system
- rewire the brain
- regulate trauma
- heal anxiety
- clinically proven

### Commercial Pressure

Assess whether the claim is used to sell an app, supplement, course, retreat, device, certification, or paid program.

Commercial pressure does not make a claim false, but it increases the need for citation fidelity and safety coverage.

### Citation Fidelity

Ask whether cited papers actually support the exact claim.

Common failure modes:

- mechanism study used as treatment proof
- healthy-volunteer study generalized to diagnosed disorders
- short-term state outcome generalized to durable recovery
- correlation written as causation
- review cited but limitations omitted

Populate `citationFidelitySignals`:

- `wrongPopulation`
- `wrongIntervention`
- `wrongOutcome`
- `mechanismToTreatmentLeap`
- `correlationToCausationLeap`
- `durationOverreach`
- `limitationOmitted`

Use `present` when the article or claim clearly commits the failure mode, `possible` when the wording suggests it but the source context is incomplete, `not_found` when checked and not found, and `not_applicable` when there is no cited-source relationship to evaluate.

### Practical Usefulness

Does the article help a reader understand uncertainty and act responsibly, or mainly persuade them?

## Direction Labels

Use exactly these directions:

- `supports`: the claim is reasonably supported as written.
- `supports_narrower`: evidence supports a more specific or weaker version.
- `mixed`: evidence is inconsistent, context-dependent, or too heterogeneous.
- `against`: evidence pushes against the claim.
- `insufficient`: not enough direct evidence.
- `misleading`: the wording implies evidence that is not there.
- `marketing_overreach`: vague or commercialized wording exceeds measurable evidence.

Prefer `supports_narrower`, `mixed`, or `insufficient` over `supports` unless the evidence is direct and robust.

## Certainty Labels

Use:

- `high`
- `moderate`
- `low`
- `very_low`
- `insufficient`

Default to conservative certainty. Upgrade only when evidence is direct, replicated, well-reported, clinically relevant, and not dependent on weak comparators.

## Required Claim Output

Each claim must include:

- original claim
- normalized claim
- direction
- evidence certainty
- overstatement risk
- evidence gap
- effect magnitude
- durability
- safety signals
- citation fidelity signals
- population/intervention/outcome/comparator match
- reasoning
- framework signals
- reviewer note
- source ids

Add a conclusion that answers:

> What should a careful writer, researcher, or product team do with this claim?

## Required Topic Output

Each topic must include:

- query
- generated timestamp
- reviewer: `codex`
- framework version
- overall verdict
- responsible wording
- claims
- sources

## Quality Bar

A run is not complete until it includes at least:

- one high-level review/guideline source when available
- one direct intervention study when available
- one public-facing source if public claims are common
- one skeptical, null, harm, or limitation-oriented source when available
- explicit notes on evidence gaps

## Calibration Examples

Use `docs/mhcif-calibration-examples.md` as calibration guidance when deciding between adjacent labels such as `supports_narrower` versus `misleading`, or `mixed` versus `insufficient`.

If any category cannot be found, say so in the artifact rather than silently omitting it.
