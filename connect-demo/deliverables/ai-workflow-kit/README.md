# Practical AI Workflow Kit

A reusable framework for getting more consistent work from a general-purpose AI assistant.

## 1. Define the job
Use:

**Goal:** What finished outcome do I need?
**Inputs:** What information/files are available?
**Constraints:** What must or must not happen?
**Evidence:** What should be verified rather than assumed?
**Output:** What exact artifact or answer should be returned?

## 2. Research prompt
"Research [topic] for [goal]. Separate verified facts, assumptions, and open questions. Prefer primary sources where available. Return the findings, source trail, and the next decision the evidence supports."

## 3. Build prompt
"Produce [artifact] using the supplied requirements. Preserve these constraints: [constraints]. Before finalizing, check completeness, contradictions, unsupported claims, and whether the output is actually usable."

## 4. Critique prompt
"Audit this work as a skeptical reviewer. Identify factual gaps, brittle assumptions, missing edge cases, and anything that could mislead the user. Do not rewrite until the problems are listed."

## 5. Improve prompt
"Revise the artifact using the audit. Keep correct material intact, fix evidenced problems, and report what materially changed."

## 6. Decision record
For consequential work, capture:
- decision
- evidence used
- assumptions
- rejected alternatives
- unresolved risks
- next review trigger

## 7. Repeatable loop
DEFINE → RESEARCH → BUILD → CRITIQUE → VERIFY → SHIP → MEASURE → IMPROVE

AI outputs can be wrong. Verify consequential claims and decisions independently.
