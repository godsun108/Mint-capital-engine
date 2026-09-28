# Executor Contract

An agent definition is not an executor. Executors are adapters that let an approved agent perform bounded work with specific tools.

Every executor must:
- receive a work order and scoped context;
- expose only capabilities needed for that role;
- record evidence, outputs and costs;
- route consequential actions through GOVERNOR approval;
- return deterministic status transitions;
- never silently reinterpret WAITING_FOR_HUMAN_APPROVAL as success;
- never treat generated text as external evidence;
- identify simulation/synthetic evidence explicitly.

## Planned executor classes
1. Model executor — bounded analysis/drafting.
2. Public research executor — source retrieval with provenance.
3. Code executor — sandbox branch/worktree only.
4. Data executor — transforms approved datasets.
5. Product executor — prepares catalog/fulfillment artifacts.
6. Messaging executor — draft by default; sending requires explicit authorization.
7. Deployment executor — preview by default; production requires explicit authorization.
8. Finance adapter — read/reconcile by default; money movement remains human-gated.

Executor credentials live outside repositories and prompts. Capability grants are configuration, not model decisions.
