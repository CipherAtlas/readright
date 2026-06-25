# RRIF Calibration Examples

Version: `rrif-0.3`

Use these examples to keep direction labels, certainty, and new structured fields consistent across reviews. They are calibration anchors, not universal rules.

## Supports Narrower

Claim: "Breathwork reduces anxiety."

Better normalized claim: "A specific structured breathing practice may reduce short-term self-reported anxiety symptoms in a studied population."

Use `supports_narrower` when the evidence shows a plausible effect but the original wording is too broad.

Typical structured fields:

- `evidenceCertainty`: `low` or `moderate`
- `effectMagnitude`: `small` or `moderate`
- `durability`: `immediate`, `short_term`, or `unclear`
- `evidenceGap.impact`: `medium`
- `citationFidelitySignals.durationOverreach`: `possible` if short-term findings are used for broad benefit claims

Why not `supports`: the original claim does not specify population, intervention, comparator, outcome, or timeframe.

## Mixed

Claim: "Slow breathing regulates anxiety through the autonomic nervous system."

Use `mixed` when mechanism evidence and symptom evidence point in a plausible direction, but the pathway-to-clinical-outcome link is not settled.

Typical structured fields:

- `evidenceCertainty`: `very_low` or `low`
- `effectMagnitude`: `unclear`
- `durability`: `immediate` or `unclear`
- `evidenceGap.missingEvidence`: includes `outcome_mismatch` or `effect_size_unclear`
- `citationFidelitySignals.mechanismToTreatmentLeap`: `possible` or `present`

Why not `supports`: mechanism plausibility is not clinical efficacy.

## Misleading

Claim: "Breathwork is clinically proven to treat anxiety disorders."

Use `misleading` when the wording implies clinical certainty, durable treatment effects, or broad applicability that the evidence does not support.

Typical structured fields:

- `evidenceCertainty`: `insufficient`
- `effectMagnitude`: `unclear`
- `durability`: `unclear`
- `evidenceGap.impact`: `high`
- `citationFidelitySignals.wrongPopulation`: `possible` or `present`
- `citationFidelitySignals.durationOverreach`: `present`
- `safetySignals.replacementOfCareRisk`: `risk_flagged` when the claim could displace evidence-based care

Why not `insufficient`: the problem is not only missing evidence; the wording actively implies a level of proof that is not there.

## Marketing Overreach

Claim: "This program resets your nervous system."

Use `marketing_overreach` when persuasive, commercial, or mechanism-heavy language cannot be tied to a measurable evidence-backed outcome.

Typical structured fields:

- `evidenceCertainty`: `very_low` or `insufficient`
- `effectMagnitude`: `unclear`
- `durability`: `unclear`
- `evidenceGap.missingEvidence`: includes `outcome_mismatch` and `effect_size_unclear`
- `citationFidelitySignals.mechanismToTreatmentLeap`: `present`
- `citationFidelitySignals.limitationOmitted`: `possible` or `present`

Why not `misleading`: use `marketing_overreach` when the core problem is vague persuasive framing rather than a concrete false clinical implication.

## Against

Claim: "Breathing exercises are safe for anyone with anxiety."

Use `against` when the evidence or plausible clinical context directly undermines the absolute wording.

Typical structured fields:

- `evidenceCertainty`: `low` or higher if direct harm data exists
- `effectMagnitude`: `none` or `unclear`
- `durability`: `unclear`
- `safetySignals.symptomWorsening`: `risk_flagged`
- `safetySignals.contraindications`: `partly_addressed`, `missing`, or `risk_flagged`
- `safetySignals.crisisEscalation`: `missing` or `risk_flagged`

Why not `mixed`: the absolute "safe for anyone" wording is contradicted by the need for caveats.

## Insufficient

Claim: "A new app reduces PTSD symptoms after one week."

Use `insufficient` when there is not enough direct evidence to evaluate the claim, but the wording does not clearly overstate known evidence or rely on persuasive mechanism language.

Typical structured fields:

- `evidenceCertainty`: `insufficient`
- `effectMagnitude`: `unclear`
- `durability`: `unclear`
- `evidenceGap.missingEvidence`: includes `no_direct_trials`, `replication_missing`, or `implementation_gap`
- `citationFidelitySignals`: usually `not_applicable` unless specific cited evidence is being misused

Why not `misleading`: absence of evidence alone is not enough; reserve `misleading` for wording or citation use that implies unsupported certainty.
