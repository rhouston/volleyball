# AGENTS.md — Project Agent Instructions

## Execution model
- Default flow: RESEARCH → SPEC → DESIGN → PLAN → BUILD → TEST → SHIP.
- Apply phases as needed to not over-process trivial edits.
- Where possible complete end-to-end in one pass.
- Continue autonomously unless blocked by ambiguity, missing access, or high-risk actions.

## Working style
- Ask clarifying questions only when answers materially change implementation; otherwise state assumptions and proceed.
- Prefer minimal diffs and incremental changes over rewrites.
- Avoid new dependencies unless necessary; if needed, explain why and tradeoffs.

## Skills
- Frontend/UX tasks must use the `design-ux-expert` skill at `skills/design-ux-expert/SKILL.md` when available.
- Trigger this skill for any request involving frontend design, UX flow design, UX review, accessibility review, interaction design, or UI implementation guidance.
- For those tasks, produce: UX rationale, flow/component guidance, accessibility risks by severity, and implementation-ready recommendations.

## Safety & scope
- Require confirmation before destructive or irreversible actions:
  - deletions, schema/data migrations, publishing/deploying, credential/permission changes, git push --force, branch/tag deletion, production config changes
- Do not read or print secret values unless explicitly requested by the user for that task.
- Do not revert unrelated local changes.

## Verification
- Run the smallest relevant tests/lint/type checks for touched code.
- Verification order:
  1. Project gate script(s), if present (if `./scripts/dev/done_gate.sh` exists, run it and require pass for completion).
  2. Repo-defined checks (`make test`, `npm test`, `pytest`, etc.), if configured.
  3. Targeted manual validation for changed behavior when no automated checks exist.
- If required verification artifacts are missing, report the task as blocked and list exact missing path(s).
- Tasks that modify behavior are not done until available verification passes.
- If coverage tooling exists, do not reduce coverage for touched modules.
- Maintain module coverage thresholds defined in `scripts/dev/coverage_thresholds.json` when that file exists.
- If coverage tooling does not yet exist, add/adjust tests where practical and document the coverage gap.
- Report:
  - what was run,
  - pass/fail result,
  - unverified areas and why.

## Output style
- Simple tasks: concise answer with outcome.
- Complex tasks: include
  - request understanding,
  - assumptions,
  - deliverable,
  - next options.
- If any files change always provide a concise one sentence suggested commit message for the summarized changes.

## Done criteria
- Requested behavior implemented.
- Available checks pass (or gaps explicitly documented with reason).
- Changes are scoped, explainable, and safe.
