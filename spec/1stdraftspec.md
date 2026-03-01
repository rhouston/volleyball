# Volleyball Season Management Web Application

Version: 1.0 (draft for review)
Date: 2026-03-01
Status: Ready for implementation planning

## 1. Purpose
Build a web application to run a community volleyball competition end-to-end: team registration, scheduling, duty assignment, game results, best-and-fairest voting, ladders, finals, notifications, and player/administrator tools.

This specification is intended to be detailed enough for an implementation team to start building immediately.

## 2. Product Decisions and Constraints
- Frontend framework: Next.js (App Router, TypeScript).
- Hosting target: Vercel Hobby (non-commercial community project).
- Quality gates: `./scripts/dev/done_gate.sh` must pass (lint, typecheck, coverage thresholds, E2E).
- Mobile-first usage is required (players and volunteers will primarily use phones).
- Relational schema is required from day one.

## 3. What We Learned from Existing Spreadsheets
The current spreadsheets (`references/Season 1 Draw.xlsx`, `references/Season 2 Draw.xlsm`) indicate practical league rules and outputs that must be preserved:
- Multiple grade formats are already used (`A Grade`, `B Grade`, `C Grade`, `Ladies`, `Mens`).
- Existing schedule format is court/time/round centric with duty columns (`Court Set up`, `Umpiring`, `Pack Up`).
- Typical timeslot pattern exists (`6:30pm`, `7:15pm`, `8:00pm`) with alternate patterns in some sheets (`6:00pm`, `6:45pm`, `7:30pm`, `7:00pm`, `7:45pm`).
- Ladder and Best-and-Fairest are maintained as first-class outputs.
- Grading and finals are explicit stages (`Grading 1`, `Grading 2`, `Finals`, `Minor/Major/Semi/Grand` variants).
- Holidays are explicitly marked and excluded from rounds (`School Holidays`).

## 4. Scope

### 4.1 In Scope (V1)
1. Team creation/registration and membership confirmation.
2. Authentication via Google/Apple OAuth.
3. Fixture generation for Mixed A/B/C, Ladies, Mens.
4. Court/time-slot aware duty assignment (setup, umpire/score, packup).
5. Best-and-fairest voting per match by authorized umpire.
6. Administrator dashboard for season operations.
7. Ladder/leaderboard with rules-based points and penalties.
8. Player profiles with stats, votes, awards.
9. Team grading workflow for season placement.
10. Notifications for upcoming games and duties.
11. Calendar export/integration.
12. Team/admin communication features.
13. Finals schedule generation for top 4 teams.
14. Auditable relational data model.

### 4.2 Out of Scope (V1)
- Online payment processing.
- Public marketing website/CMS.
- Live video streaming.
- Native iOS/Android apps.
- AI-driven officiating or stat extraction from video.

## 5. Users and Roles
- `Platform Admin`: manages global settings, seasons, grading, draws, finals, rules.
- `Grade Admin` (optional): manages one or more grades.
- `Team Manager`: registers team, invites players, confirms roster, receives notifications.
- `Player`: joins team, views schedule/duties, receives notifications, views profile.
- `Umpire/Scorekeeper` (role assignment per fixture): submits match result and votes.
- `Public Viewer` (optional): views published fixtures/ladders without login.

## 6. UX Rationale and UI Specification
Note: `design-ux-expert` skill file is not available in this environment, so this section provides implementation-ready UX guidance directly.

### 6.1 UX Rationale
- Competition-night workflows must be executable in under 30 seconds on mobile.
- Admin workflows prioritize correctness and conflict visibility over visual minimalism.
- Public views optimize scanability (round, court, time, duty, ladder position).

### 6.2 Primary User Flows
1. Onboarding and team registration:
- Sign in with Google/Apple.
- Create team or join via invite code.
- Confirm player membership.

2. Season setup (admin):
- Create season with date range and excluded dates.
- Configure grades, nights, courts, timeslots.
- Register teams into grades.
- Run grading (optional), then confirm grade placement.
- Generate fixtures + duties.
- Resolve conflicts and publish.

3. Match-night operations:
- Team opens "Tonight" view.
- See court/time/opponent and assigned duty.
- Umpire submits result and best-and-fairest votes.

4. Finals:
- Lock regular season ladder.
- Generate top-4 finals bracket.
- Assign finals duties with fairness checks.

### 6.3 Core Screens and Components
- `Home Dashboard`: season status, next fixtures, duty alerts.
- `Admin Season Wizard`: settings, team allocations, generation previews.
- `Fixture Grid`: round x court x timeslot matrix.
- `Duty Ledger`: per-team counts (setup/umpire/packup/net duties).
- `Ladder View`: points, for/against, percentage, deductions.
- `Best-and-Fairest Board`: per-grade vote totals and tie-break metadata.
- `Player Profile`: season summary, votes, awards, attendance.
- `Communications`: announcements + per-team message threads.

### 6.4 Accessibility Risks and Controls
High severity:
- Touch targets too small for quick match-night actions.
- Color-only ladder indicators and duty statuses.

Controls:
- 44x44 minimum interactive controls.
- Never rely on color alone; use text/icon/ARIA labels.

Medium severity:
- Complex schedule tables on mobile causing loss of context.

Controls:
- Responsive card fallback for mobile.
- Sticky round/time headers in table mode.

Low severity:
- Dense admin forms with limited keyboard flow.

Controls:
- Logical tab order, explicit labels, form-level error summary.

## 7. Functional Requirements

### 7.1 Authentication and Accounts
- OAuth providers: Google and Apple.
- Persist immutable user identity (`auth_provider`, `provider_user_id`).
- Enforce verified email for manager/admin privileges.
- A user can belong to multiple teams/seasons.

Acceptance criteria:
- User can sign in and create a team in under 2 minutes.
- Team owner can invite players by link/code.
- Invite acceptance creates pending membership until manager approval (configurable).

### 7.2 Team and Membership Management
- Team entity includes name, grade assignment, manager(s), roster status.
- Player profiles can be linked across seasons.
- Prevent duplicate active team names within the same grade and season.

Acceptance criteria:
- Admin can reassign team grade before schedule publish.
- Team manager can set active/inactive roster members.

### 7.3 Season Configuration
Season config must include:
- Name, year, start/end dates.
- Play nights per category (`mixed_night`, `ladies_mens_night`).
- Number of courts (default 3).
- Timeslots per night (default 3).
- Excluded dates (holidays, venue closures).
- Ladder points rules (defaults below, admin-editable).

Default ladder rules:
- Win: 3
- Draw: 2
- Loss: 1
- Forfeit: 0
- Bye: 3
- Missed duty penalty: -2

### 7.4 Fixture Generation
Fixture generator must:
- Generate round-robin pairings for each grade.
- Add BYE pseudo-team when team count is odd.
- Ensure each team plays each other at least once before repeats.
- If rounds exceed single cycle, repeat pairings with balancing.
- Distribute timeslots fairly (no repeated earliest/latest bias where avoidable).
- Respect excluded dates and night/grade mapping.

Mixed-grade duty rule support:
- If 3 mixed grades: duties stay inside grade.
- If 2 mixed grades: B cannot umpire A; A may umpire B.

Output:
- Draft schedule with per-match: date, timeslot, court, teams.
- Conflict report and fairness metrics.

### 7.5 Duty Assignment
Duty types:
- Setup (before first match on each court/night).
- Umpire/scorekeeping (during matches).
- Packup (after last match on each court/night).

Hard constraints:
- Team on BYE cannot umpire/score that night.
- Ladies duties only for ladies games.
- Mens duties only for mens games.
- Duty should be coherent with play time (avoid timeslot 1 play + timeslot 3 duty unless no feasible alternative).

Soft constraints (optimize):
- Equalize duty counts across teams.
- Rotate duty types across season (avoid repetitive setup/packup assignments).
- Minimize back-to-back burdens.

### 7.6 Results and Voting
- Authorized umpire/scorekeeper submits match result.
- Result supports normal result, draw, forfeit, no-game.
- Best-and-fairest vote: one selected player per team per match (2 total votes per match).
- Votes become immutable after lock window unless admin override with audit log.

### 7.7 Ladder / Leaderboard
- Auto-calculate points using season rule set.
- Track for/against and percentage tie-breaker.
- Apply missed-duty deductions.
- Provide grade-specific ladders and season summary view.

Tie-break order (default):
1. Ladder points
2. Percentage (for/against)
3. For points
4. Head-to-head (if available)
5. Admin decision flag

### 7.8 Grading Matches
- Pre-season grading rounds for new teams.
- Admin can create grading fixtures vs reference teams in A/B/C.
- Grading outcome recommendations generated from results + admin adjustment.
- Grade assignment must be locked before season draw publish.

### 7.9 Notifications
Channels:
- In-app notifications (required).
- Email (required for V1).
- Push/SMS optional (future).

Trigger events:
- Upcoming match reminders (48h and 3h default).
- Duty reminders.
- Schedule changes.
- Result/vote submission overdue.

### 7.10 Calendar Integration
- Export team schedule and duties as iCal feed and single-event `.ics`.
- Provide “Add to Google Calendar” and “Download ICS” actions.
- If fixture changes, iCal UID must stay stable for updates.

### 7.11 Communication
- Admin announcements to all or selected grades.
- Team-level message thread.
- Optional @mentions and read/unread status.
- Moderation controls for admins.

### 7.12 Finals Generation
- Top 4 teams per grade qualify by ladder.
- Default finals format:
  - Semi 1: 1 vs 4
  - Semi 2: 2 vs 3
  - Grand Final: winner(Semi 1) vs winner(Semi 2)
- Alternative format support flag (major/minor/prelim) for leagues that need it.
- Finals duties generated with same duty constraints.

## 8. Scheduling and Duty Engine Design

### 8.1 Fixture Generation Algorithm (Deterministic)
For each grade:
1. Build team list sorted by stable key (`team_id`).
2. If odd count, append `BYE`.
3. Use circle method to produce one full round-robin cycle.
4. Expand to required rounds by repeating cycle with home/away swap.
5. Map rounds to valid dates by night template excluding holidays.
6. Assign courts/timeslots using fairness-scored placement.

Fairness score (minimize):
- `timeslot_bias_penalty` (difference from team average slot).
- `repeat_slot_penalty` (same slot in consecutive rounds).
- `court_repeat_penalty`.
- `duty_conflict_penalty` (from projected duties).

### 8.2 Duty Assignment Algorithm
For each match-night/grade:
1. Build candidate duty teams excluding playing teams and BYE teams.
2. Apply hard constraints by grade compatibility.
3. Compute cost per candidate:
- current duty totals imbalance
- same duty-type repetition
- temporal distance from own match
4. Solve using greedy with backtracking if no feasible assignment.
5. Emit unresolved conflicts for admin intervention.

### 8.3 Engine Outputs
- `fixture_generation_run` record with input snapshot.
- `generated_matches` and `generated_duties` as draft.
- `fairness_report` JSON with per-team distribution metrics.
- `conflict_report` JSON with hard/soft violations.

## 9. Data Model (Relational)

### 9.1 Core Tables
- `organizations`
- `users`
- `user_identities`
- `seasons`
- `season_settings`
- `grade_types` (Mixed A/B/C, Ladies, Mens)
- `grades` (grade instance per season)
- `teams`
- `team_memberships`
- `players`
- `venues`
- `courts`
- `timeslots`
- `season_dates` (playable + excluded)
- `matches`
- `match_sets` (optional detailed scoring)
- `match_events` (forfeit, no game, score submit)
- `duties`
- `duty_assignments`
- `votes_best_fairest`
- `ladder_snapshots`
- `grading_matches`
- `grading_recommendations`
- `notifications`
- `message_threads`
- `messages`
- `audit_log`

### 9.2 Key Relationships
- One `season` has many `grades`, `teams`, `matches`.
- One `match` belongs to one `grade`, one `court`, one `timeslot`, and has two participating teams.
- `duty_assignments` link one duty slot to one team.
- `votes_best_fairest` link match + voting umpire + selected player.
- `ladder_snapshots` generated after each round and at season lock.

### 9.3 Critical Constraints
- Unique team name within season + grade.
- No team assigned to both play and umpire same timeslot.
- No duplicate vote for same match/team.
- Match must reference valid season date and configured night type.

## 10. API Contract (Next.js Route Handlers)
Prefix: `/api/v1`

Auth and users:
- `POST /auth/signin`
- `POST /auth/signout`
- `GET /users/me`

Teams and memberships:
- `POST /teams`
- `GET /teams/:teamId`
- `POST /teams/:teamId/invites`
- `POST /teams/:teamId/memberships/:membershipId/confirm`

Season/admin:
- `POST /seasons`
- `PATCH /seasons/:seasonId/settings`
- `POST /seasons/:seasonId/publish`

Scheduling:
- `POST /seasons/:seasonId/generate-fixtures`
- `GET /seasons/:seasonId/fixtures?gradeId=&round=`
- `POST /seasons/:seasonId/generate-duties`

Results and votes:
- `POST /matches/:matchId/result`
- `POST /matches/:matchId/votes`

Ladders and finals:
- `GET /seasons/:seasonId/ladders`
- `POST /seasons/:seasonId/finals/generate`

Notifications and comms:
- `GET /notifications`
- `POST /messages/threads`
- `POST /messages/threads/:threadId/messages`

Calendar:
- `GET /teams/:teamId/calendar.ics`
- `GET /matches/:matchId/calendar.ics`

All write endpoints require authenticated role checks and audit entries.

## 11. Security, Permissions, and Audit
- Role-based access control at route + service layer.
- CSRF/session hardening per Next.js/Auth provider defaults.
- Rate limiting on auth, invites, message posting, vote submission.
- Immutable audit entries for:
  - schedule publish
  - manual fixture/duty overrides
  - result overrides
  - vote overrides

## 12. Non-Functional Requirements
- Availability target: best-effort for community app; graceful degradation for non-critical features.
- P95 response target:
  - reads under 500ms
  - writes under 800ms
- Mobile performance target: LCP < 2.5s on mid-range mobile for primary pages.
- Data integrity over speed for generation workflows.

## 13. Hosting and Runtime Architecture
- Next.js app hosted on Vercel Hobby.
- Server actions/route handlers for APIs.
- PostgreSQL for relational persistence (provider selectable; Neon/Supabase acceptable).
- Object storage optional for future media assets.
- Scheduled jobs (Vercel cron or external scheduler) for reminders and ladder snapshots.

## 14. Build Plan (Implementation Phases)

### Phase 1: Foundation
- Auth (Google/Apple), user model, team management.
- Season config and grade setup.
- Basic admin dashboard shell.

### Phase 2: Core Competition Ops
- Fixture generation (round-robin + date mapping).
- Duty assignment engine.
- Fixture publication and team views.

### Phase 3: Match Night + Ladder
- Result submission, vote submission.
- Ladder calculations with deductions.
- Player profile metrics.

### Phase 4: Finals + Notifications + Calendar + Comms
- Finals generation and management.
- Notifications system.
- Calendar exports.
- Messaging/announcements.

### Phase 5: Hardening
- Data migration/import tooling from spreadsheets.
- Audit trail completeness.
- Performance and accessibility remediation.

## 15. Testing and Definition of Done

### 15.1 Required automated checks
- `./scripts/dev/frontend_gate.sh`
- `./scripts/dev/e2e_gate.sh`
- `./scripts/dev/done_gate.sh`

### 15.2 Coverage policy
- Thresholds defined in `scripts/dev/coverage_thresholds.json`.
- Must not regress coverage for touched modules.

### 15.3 Minimum E2E scenarios before production
1. Sign-in and team registration.
2. Admin season setup + fixture generation + publish.
3. Team fixture and duty visibility on mobile.
4. Umpire result + vote submission.
5. Ladder update and finals generation.

### 15.4 Done criteria for each feature
- Acceptance criteria met.
- Automated gates pass.
- Accessibility checks for touched UI pass (axe/manual smoke).
- Documentation updated (spec + changelog entry).

## 16. Acceptance Criteria by Capability
- Team management: invite/confirm flow works with role enforcement.
- Draw generation: all teams in grade play all others at least once before repeats.
- Duty generation: hard constraints never violated.
- Ladder: points/deductions exactly match configured rules.
- Voting: exactly one vote per side per match from authorized umpire.
- Finals: top 4 correctly selected and bracket generated.

## 17. Data Migration from Existing Excel Process
V1 import requirements:
- Import teams, grades, player names, historical rounds (optional), and ladder outcomes.
- Preserve original round/date labels where possible.
- Support CSV import format derived from current workbook structure.

Migration approach:
1. Build mapping templates for `teams`, `fixtures`, `duties`, `results`, `votes`.
2. Dry-run validation with conflict report.
3. Admin confirmation before commit.
4. Post-import audit summary.

## 18. Risks and Mitigations
- Risk: schedule generation edge cases for unusual team counts.
  - Mitigation: deterministic engine + conflict report + manual override UI.
- Risk: Vercel Hobby limitations for background-heavy jobs.
  - Mitigation: queue lightweight jobs and batch reminders.
- Risk: inconsistent historical data from spreadsheets.
  - Mitigation: import validation + explicit error surfacing.

## 19. Additional High-Value Features (Post V1)
- Availability/absence tracking per round with smart rescheduler.
- Referee competency tracking and assignment preferences.
- Automated award packs (PDF certificates + season summaries).
- Public stat cards and social-share graphics.
- Multi-organization tenancy for neighboring leagues.

## 20. Open Decisions to Confirm Before Build Start
1. Exact ladder tie-break order (percentage vs head-to-head precedence).
2. Finals format per grade (simple semis vs major/minor/prelim variants).
3. Whether communication should include direct messages in V1.
4. Whether grading outcomes are advisory or enforced.
5. Database provider choice for first production deployment.

## 21. Build-Ready Checklist
- [ ] Confirm open decisions in section 20.
- [ ] Approve V1 scope and out-of-scope boundaries.
- [ ] Finalize relational schema migration scripts.
- [ ] Confirm OAuth provider credentials and callback URLs.
- [ ] Confirm notification sender settings and domain.
- [ ] Approve first release acceptance criteria.

