# Practical AI Workflow Kit

A reusable operating framework for getting useful work from a general-purpose AI assistant without treating every prompt as a fresh conversation.

## The core brief
Before asking the model to work, define:

```
GOAL:
What finished outcome do I need?

INPUTS:
What facts/files/data may it use?

CONSTRAINTS:
Budget, time, format, tools, rules, exclusions.

EVIDENCE:
What must be verified? What sources count?

OUTPUT:
What artifact or decision should exist when finished?

DONE WHEN:
Observable acceptance criteria.
```

## Research prompt
```
Research [question].
Separate verified facts, reasonable inferences, and unknowns.
Prefer primary/current sources where freshness matters.
For each important conclusion, explain what evidence supports it.
End with unresolved questions that could materially change the decision.
```

## Build prompt
```
Using the supplied brief and verified evidence, build [artifact].
Do not invent missing facts.
Preserve these constraints: [constraints].
Acceptance criteria: [criteria].
Before finishing, check the result against every criterion and identify anything not completed.
```

## Critique prompt
```
Act as a critical reviewer of this output.
Find factual assumptions, missing edge cases, unclear claims, unnecessary complexity, failure modes, and places where the result does not satisfy the brief.
Do not rewrite yet. Return the highest-impact corrections first.
```

## Improve prompt
```
Revise the artifact using the critique.
Keep correct material.
Fix only supported problems.
After revision, provide a short acceptance check against the original DONE WHEN criteria.
```

## Verification gate
For consequential work, independently verify:
- numbers and calculations;
- current prices/terms/rules;
- legal/medical/financial claims with appropriate qualified sources;
- citations and quotations;
- code behavior with tests;
- claims about files/systems actually being changed;
- claims that an external action succeeded.

AI confidence is not evidence.

## Decision record

```
Decision:
Date:
Goal:
Evidence used:
Alternatives considered:
Chosen approach:
Why:
Known uncertainty:
Reversal/rollback path:
What would change this decision:
Next measurement:
```

## Repeatable loop
DEFINE → RESEARCH → BUILD → CRITIQUE → VERIFY → SHIP → MEASURE → IMPROVE

### DEFINE
Turn vague intent into observable acceptance criteria.

### RESEARCH
Resolve unknowns that can change the build.

### BUILD
Create the smallest complete version that satisfies the brief.

### CRITIQUE
Attack the work before customers or reality do.

### VERIFY
Test consequential claims/actions independently.

### SHIP
Publish only what passed the gate.

### MEASURE
Observe outcomes, not activity.

### IMPROVE
Feed evidence back into the next cycle.

## Three operating patterns

### Fast task
Brief → Build → Acceptance check.

### Research-heavy task
Brief → Research → Evidence review → Build → Verify.

### Production task
Brief → Build → Critique → Tests → Publish → Telemetry → Improve.

## Anti-patterns
Avoid:
- asking for “the best” without criteria;
- allowing the model to silently choose business facts;
- treating generated code as tested code;
- confusing a prepared action with a completed external action;
- repeatedly prompting instead of maintaining a decision record;
- adding automation before the manual workflow is understood.

The kit improves workflow discipline; it does not make AI outputs automatically correct. Verify consequential outputs independently.
