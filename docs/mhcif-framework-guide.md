# MHCIF Framework Guide

Version: `mhcif-0.3-codex`

This document explains the Mental Health Claim Integrity Framework in human terms: what it is for, how to use it, how to improve it, and what mistakes to avoid.

The machine-facing protocol lives in `docs/mhcif-codex-review-protocol.md`. Treat that file as the active review instruction used by Codex Desktop, Codex CLI, and the OpenAI API runner. Treat this guide as the design rationale and improvement manual.

For the current ReadRight implementation state, UI decisions, local JSON storage, canvas behavior, and agent handoff notes, read `docs/app-progress-for-agents.md`.

## Purpose

MHCIF exists to answer one question:

> What does the available evidence actually allow someone to claim?

The framework is not trying to decide whether a topic is interesting, whether an article is well-written, or whether an intervention is worth studying. It judges the relationship between a specific claim and the evidence used to support it.

A good review should make it clear whether a claim is:

- supported as written
- supported only in a narrower form
- mixed or uncertain
- contradicted by evidence
- not directly evidenced
- misleading
- marketing overreach

## Core Principle

Evidence quality and claim fit are different.

A source can be rigorous but irrelevant to the claim. A trial can be real but too small, short, or indirect for public-facing confidence. A public article can be useful but overstate what the cited study actually found. MHCIF must keep these distinctions separate.

## Framework Inputs

MHCIF combines established evidence-quality frameworks with mental-health-specific claim checks.

Established frameworks:

- GRADE for certainty across a body of evidence
- RoB 2 for randomized trial bias
- ROBINS-I for non-randomized intervention studies
- AMSTAR 2 for systematic review and meta-analysis quality
- PRISMA for review reporting quality
- CONSORT for randomized trial reporting quality
- STROBE for observational reporting quality
- DISCERN for public health article quality
- JAMA benchmarks for authorship, attribution, disclosure, and currency
- NICE Evidence Standards Framework for digital health products

MHCIF-specific criteria:

- claim specificity
- population fit
- intervention fit
- outcome fit
- comparator fit
- effect meaning
- durability
- evidence gaps
- safety and harms
- mechanism overreach
- commercial pressure
- citation fidelity
- balance and uncertainty
- practical usefulness

The established frameworks are inputs. The final direction label comes from MHCIF.

## Review Model

Every review should move through five passes.

1. Define the claim.
   Convert vague language into a testable claim. Identify population, intervention, comparator, outcome, timeframe, and implied certainty.

2. Find the best available evidence.
   Prefer systematic reviews, meta-analyses, guidelines, and direct trials. Add public-facing sources only to evaluate communication quality, citation fidelity, and overstatement.

3. Check evidence fit.
   Ask whether the source actually studies the same people, intervention, comparator, outcome, and timeframe implied by the claim.

4. Judge strength and overstatement.
   Rate certainty conservatively. Separate plausible, preliminary, mechanism-level, and clinically established findings.

5. Write the conclusion.
   State what a careful writer, researcher, or product team should do with the claim.

## Direction Labels

Use the labels narrowly.

`supports`

The claim is proportionate, direct, replicated, clinically relevant, and not dependent on weak comparators. This should be uncommon.

`supports_narrower`

The evidence supports a more specific, weaker, or more caveated version. This will often be the most useful label.

`mixed`

Evidence is inconsistent, heterogeneous, population-dependent, intervention-dependent, or too sensitive to study design.

`against`

Evidence pushes against the claim, or credible limitation/safety evidence makes the claim irresponsible as written.

`insufficient`

There is not enough direct evidence to support the claim. This is not the same as false.

`misleading`

The wording implies stronger evidence, broader applicability, causality, durability, or clinical certainty than the evidence supports.

`marketing_overreach`

The claim uses vague, persuasive, commercial, or mechanism-heavy language that cannot be tied to a measurable evidence-backed outcome.

## Certainty Philosophy

Default low. Upgrade slowly.

High or moderate certainty should require direct evidence, low risk of bias, consistent results, clinically meaningful outcomes, reasonable comparators, and enough durability to match the claim.

Do not upgrade certainty because:

- the intervention feels low risk
- the mechanism is plausible
- a university article covered it
- the study is randomized but tiny
- several weak sources say the same thing
- the claim is emotionally appealing
- the article has many citations

## What Good Output Looks Like

A useful artifact should make the claim easier to use responsibly.

Good output:

- names the exact claim being judged
- rewrites vague claims into testable versions
- distinguishes short-term symptom effects from clinical treatment
- separates mechanism evidence from outcome evidence
- identifies the population actually studied
- states whether the source supports the exact claim or only a narrower claim
- includes skeptical, null, limitation, or harm-oriented evidence when available
- gives a practical conclusion for each claim
- names the evidence gap limiting the claim
- separates effect magnitude from certainty
- separates safety and citation-fidelity failure modes instead of hiding them in prose

Weak output:

- ranks sources as simply good or bad
- treats all anxiety/stress/mood outcomes as interchangeable
- treats all breathwork/meditation/somatic practices as interchangeable
- quotes paper conclusions without checking methods
- ignores safety coverage
- ignores commercial incentives
- stores large article text instead of derived judgments

## What Not To Do

Do not use MHCIF as a medical advice engine.

Do not produce treatment recommendations for individuals. The output can evaluate claims and suggest responsible wording, but it should not tell a user what care to choose.

Do not bypass access controls.

Only read public, permitted pages. Do not bypass paywalls, logins, CAPTCHAs, robots restrictions, or publisher access controls.

Do not archive copyrighted articles.

Store metadata, links, short trace notes, normalized claims, and derived judgments. Do not store full article bodies or scraped page archives.

Do not collapse different interventions.

Slow breathing, cyclic sighing, box breathing, pranayama, mindfulness, HRV biofeedback, exposure-based breathing retraining, and app-guided programs may be different interventions.

Do not collapse different outcomes.

Stress, state anxiety, trait anxiety, diagnosed anxiety disorder symptoms, panic attacks, HRV, sleep, mood, neural activation, and subjective calm are different outcomes.

Do not let mechanism evidence prove clinical efficacy.

Mechanism evidence can support plausibility. It cannot establish that an intervention treats a disorder.

Do not let safety silence be treated as safety evidence.

If harms, dropout, contraindications, or deterioration are not discussed, mark safety coverage as limited or missing.

For `mhcif-0.3-codex`, safety is tracked at subtype level. A review should state whether the source or evidence base addresses:

- adverse events
- dropout or discontinuation
- symptom worsening
- contraindications
- crisis escalation
- replacement-of-care risk

Do not let commercial context decide truth.

Commercial pressure does not make a claim false. It raises the evidence bar for wording, disclosure, citation fidelity, and safety coverage.

## Structured Claim Fields

Every claim now separates the following fields from the narrative reasoning.

`evidenceGap`

Use this to identify what is missing before the claim could be made more confidently. Common gaps include no direct trials, small samples, short follow-up, weak comparators, population mismatch, intervention mismatch, outcome mismatch, missing safety evidence, unclear effect size, missing replication, or implementation gaps.

`effectMagnitude`

Use `none`, `small`, `moderate`, `large`, or `unclear`. This is not the same as certainty. A large reported effect from a weak or indirect study can still have low certainty.

`durability`

Use `immediate`, `short_term`, `medium_term`, `long_term`, or `unclear`. Match the field to the longest reliable follow-up that is relevant to the claim. Do not infer long-term durability from acute or post-session outcomes.

`safetySignals`

Track adverse events, dropout, symptom worsening, contraindications, crisis escalation, and replacement-of-care risk separately. Use `missing` when a clinically relevant safety issue is not discussed, `risk_flagged` when the evidence or claim raises an actual concern, and `not_applicable` only when the subtype genuinely does not apply.

`citationFidelitySignals`

Track specific citation failures instead of saying only "citation problem." Failure modes include wrong population, wrong intervention, wrong outcome, mechanism-to-treatment leap, correlation-to-causation leap, duration overreach, and limitation omitted.

## How To Improve The Framework

Improve by adding sharper decision rules, not more labels for their own sake.

Good improvements:

- clearer thresholds for direct, partial, indirect, and mismatch ratings
- examples for common mental-health domains
- stronger safety and contraindication prompts
- explicit evidence-gap fields
- better article-inspection criteria for citation misuse
- domain-specific addenda for digital therapeutics, psychedelics, supplements, coaching, trauma claims, or workplace wellness
- calibration examples showing why one claim is `supports_narrower` and another is `misleading`

Poor improvements:

- adding many vague scoring dimensions
- creating numerical scores without validation
- making the framework look more objective than it is
- rewarding source prestige without checking claim fit
- using a single total score to hide important tradeoffs
- optimizing for persuasive summaries instead of conservative judgments

## Suggested Additions And Future Versions

Implemented in `mhcif-0.3-codex`:

- Evidence gap field per claim. Added in `mhcif-0.3-codex`.
- Separate `effectMagnitude` field: none, small, moderate, large, unclear. Added in `mhcif-0.3-codex`.
- Separate `durability` field: immediate, short_term, medium_term, long_term, unclear. Added in `mhcif-0.3-codex`.
- Citation fidelity subtypes: wrong population, wrong outcome, mechanism-to-treatment leap, correlation-to-causation leap, limitation omitted. Added in `mhcif-0.3-codex`.
- Safety subtypes: adverse events, dropout, symptom worsening, contraindications, crisis disclaimers, replacement-of-care risk. Added in `mhcif-0.3-codex`.
- Calibration set of reviewed claims used as regression tests for future prompt/schema changes. Started in `docs/mhcif-calibration-examples.md`.

Still useful for future versions:

- Separate `clinicalPopulation` flag for diagnosed versus non-clinical populations.
- Digital product subframework for app claims, engagement evidence, real-world adherence, privacy, and escalation paths.
- Larger calibration set across supplements, apps, psychedelics, coaching, workplace wellness, and trauma claims.

## Calibration Questions

Use these questions when checking whether the framework is working.

- Would two careful reviewers choose the same direction label?
- Did the review distinguish exact support from narrower support?
- Did the review include evidence against or limitations where available?
- Did the conclusion tell a product or content team what to do?
- Did the artifact avoid full-text storage?
- Did the evidence actually match the claim's population, intervention, comparator, outcome, and timeframe?
- Did the review avoid turning plausible mechanisms into clinical certainty?
- Did the review avoid consumer wellness language?
- Did the evidence gap, effect magnitude, durability, safety signals, and citation-fidelity signals agree with the final direction label?

## Versioning Rules

Patch-level changes can clarify wording, add examples, or tighten prompts without changing the schema.

Minor-version changes can add criteria, fields, filters, or direction logic. They should include updated sample artifacts.

Major-version changes should be reserved for breaking schema changes or a substantially different review philosophy.

When changing the framework, update:

- `docs/mhcif-codex-review-protocol.md`
- `docs/mhcif-framework-guide.md`
- `docs/app-progress-for-agents.md` if the product workflow, local storage, filters, or canvas behavior changes
- `server/evidence-topic.schema.json` if fields change
- `src/types/evidence.ts` if fields change
- `templates/evidence-topic-template.json` if fields change
- at least one sample topic artifact

## Current Weaknesses

MHCIF is intentionally conservative but still immature.

Known weaknesses:

- It depends on reviewer/model judgment for label boundaries.
- It does not yet have formal inter-rater reliability testing.
- It does not yet use validated numerical effect-size thresholds or inter-rater-tested durability thresholds.
- It may miss sources if search terms are too narrow.
- It can understate emerging areas where direct evidence is sparse but clinically relevant.
- It can overfocus on intervention evidence and underweight implementation quality.
- It does not yet distinguish regulatory risk by jurisdiction.

The right response is not to make the framework more confident. The right response is to make uncertainty more visible.
