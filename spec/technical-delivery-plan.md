# Technical Delivery Plan

Date: 2026-03-01
Source: `spec/1stdraftspec.md`
Target: End-to-end MVP build for community volleyball season operations

## Planning Assumptions
- Team size: 1 product owner + 1-2 full-stack engineers.
- Cadence: 2-week iterations.
- Hosting: Vercel Hobby for web runtime, managed PostgreSQL for data.
- Quality gate for merge: `./scripts/dev/done_gate.sh`.

## Milestone Outline
- M1: Foundation and Auth
- M2: Season Setup, Draws, Duties
- M3: Match Night Ops, Ladder, Voting
- M4: Finals, Notifications, Calendar, Comms
- M5: Hardening, Migration, Release

## Epic 1: Platform Foundation and Access Control
### Story 1.1: Project and environment setup
Tasks:
- Finalize environment config (`DATABASE_URL`, OAuth keys, base URLs).
- Establish Prisma schema/migrations workflow.
- Configure local seed strategy for dev fixtures.

### Story 1.2: Authentication and identity
Tasks:
- Implement Google and Apple OAuth.
- Persist user identity mapping (`provider`, `provider_user_id`).
- Build session guard middleware for API routes.

### Story 1.3: RBAC baseline
Tasks:
- Define roles: Platform Admin, Grade Admin, Team Manager, Player.
- Implement role checks for admin-only operations.
- Add audit log hooks for privileged actions.

Deliverables:
- Auth flow working in app.
- Role-restricted API skeleton converted to live checks.
- Audit table writes for protected endpoints.

## Epic 2: Team, Player, and Membership Management
### Story 2.1: Team registration
Tasks:
- Team create/edit endpoints and UI.
- Team uniqueness checks per season+grade.
- Team manager transfer flow.

### Story 2.2: Membership lifecycle
Tasks:
- Invite link/code issuance.
- Join/accept flow with pending state.
- Manager approval/rejection actions.

### Story 2.3: Player profile baseline
Tasks:
- Player identity and season participation mapping.
- Profile page with core details and team memberships.

Deliverables:
- Teams and rosters manageable without spreadsheet.

## Epic 3: Season Configuration and Governance
### Story 3.1: Season settings
Tasks:
- CRUD for seasons, grades, nights, courts, timeslots.
- Excluded date management (holidays/venue closures).
- Ladder rule configuration with defaults.

### Story 3.2: Season publication controls
Tasks:
- Draft/published/locked season states.
- Validation gate before publish.
- Change logs for published-season edits.

Deliverables:
- Admin can configure complete season structure.

## Epic 4: Fixture Generation Engine
### Story 4.1: Round-robin generation
Tasks:
- Circle-method implementation with BYE support.
- Repeat-cycle generation for long seasons.
- Deterministic output based on stable inputs.

### Story 4.2: Date/court/slot allocation
Tasks:
- Map rounds to valid dates by grade night rules.
- Court and timeslot assignment with fairness scoring.
- Produce draft schedule and conflict report.

### Story 4.3: Admin adjustment workflow
Tasks:
- Manual override UI and API.
- Conflict marker and override reason capture.

Deliverables:
- Fixture generation run artifacts and publishable schedule.

## Epic 5: Duty Assignment Engine
### Story 5.1: Duty rule modeling
Tasks:
- Encode hard constraints (grade compatibility, BYE exclusions).
- Encode soft constraints (fair distribution, rotation).

### Story 5.2: Duty assignment algorithm
Tasks:
- Candidate selection and cost scoring.
- Assignment solver with fallback/backtracking.
- Conflict report generation for unresolved assignments.

### Story 5.3: Duty visibility and exports
Tasks:
- Team duty timeline view.
- Admin duty ledger view with fairness metrics.

Deliverables:
- Duties generated and visible per team and round.

## Epic 6: Match Night Operations (Results, Voting, Ladder)
### Story 6.1: Result submission
Tasks:
- Umpire/scorekeeper authorization checks.
- Match result entry (win/draw/loss/forfeit/no-game).
- Edit lock window + admin override path.

### Story 6.2: Best-and-fairest voting
Tasks:
- Per-match voting form (one vote per side).
- Validation and duplicate vote prevention.
- Grade-level aggregate and player history views.

### Story 6.3: Ladder engine
Tasks:
- Implement scoring and deductions.
- Tie-break calculation and ranking output.
- Round-by-round ladder snapshots.

Deliverables:
- Match-night flow complete from result to updated ladder.

## Epic 7: Finals, Notifications, Calendar, Communications
### Story 7.1: Finals generation
Tasks:
- Top-4 selection by ladder lock.
- Finals bracket generation.
- Finals duty assignment.

### Story 7.2: Notifications
Tasks:
- Event triggers (upcoming game, duty reminder, changes).
- In-app notifications feed.
- Email notification worker and templates.

### Story 7.3: Calendar integration
Tasks:
- Team schedule `.ics` feed and event export.
- Stable UID generation and update behavior.

### Story 7.4: Communications
Tasks:
- Admin announcements by season/grade/team.
- Team message threads and unread tracking.

Deliverables:
- Finals and operational communication capabilities live.

## Epic 8: Migration, Hardening, and Release
### Story 8.1: Spreadsheet import
Tasks:
- CSV import templates for teams/fixtures/duties/results/votes.
- Dry-run validation and conflict report.
- Admin-confirmed import commit.

### Story 8.2: Observability and safety
Tasks:
- Structured logging for generation runs.
- Error dashboards and alert thresholds.
- Backup and rollback playbook.

### Story 8.3: Pre-release certification
Tasks:
- Execute full E2E pack.
- Accessibility audit pass for critical flows.
- Production readiness checklist sign-off.

Deliverables:
- First production release candidate.

## Cross-Epic Task Streams
- Testing: unit + integration + E2E for each epic.
- Security: RBAC regression tests and audit log coverage.
- Documentation: API contracts, operator runbook, support guide.

## Story Readiness Checklist
A story is ready when:
- Acceptance criteria are explicit and testable.
- Data model impact identified.
- API contract drafted.
- E2E assertion identified.

## Story Done Checklist
A story is done when:
- Feature acceptance criteria pass.
- `./scripts/dev/done_gate.sh` passes.
- Audit and error handling are implemented.
- Docs updated (spec + changelog notes).

## Suggested Build Sequence (Pragmatic)
1. Epic 1 + core of Epic 2
2. Epic 3
3. Epic 4
4. Epic 5
5. Epic 6
6. Epic 7
7. Epic 8
