
Please build a detailed specification for a volleyball season management web application. This web application will be built on Next.js using Vercel Hobby. For front-end make sure to use the design skill.

 V1 features:
 1. Ability to create/register teams and add members
   - will need authentication via something like google / apple accounts to we can identify who created a team etc
   - individual players should be able to sign in and register / confirm they are part of a team
 2. Ability to create a fixture draw for multiple grades: Mixed A,B,C - Ladies - Mens
    - There are 3 courts available
    - There are 3 time slots
    - Mixed games are on one night
    - Ladies + Mens are on another night
    - Fixtures should have a mixture of timeslots for teams e.g. team a should not be playing in timeslot 1 every week, they should have a mixture of timeslots across the season
    - Each team should play each other team in their grade at least once across the season; if there more nights than teams in a grade, then teams will play each other more than once across the season by repeating the fixture draw after all teams have played each other once
    - May need byes in the fixture draw if there are an odd number of teams in a grade
    - Will need specified date range + ability to remove weeks in that range for holidays etc
 3. Ability to assign duties to teams that are coherent with their play time ie you dont want to be playing in timeslot 1 and have duties for timeslot 3. Duties include: 
   - setup (before the 1st game on each court each night, a team needs to setup the court for play)
   - packup (after the last game on each court each night, a team needs to pack up the court)
   - umpiring + scorekeeping (during each game, a team that is not playing needs to umpire and keep score for the opposing teams)
   - fair distribution of duties between teams in each grade
   - teams should have a mixture of duties across the season e.g. team a should not be doing setup every week, they should have a mixture of duties across the season
   - For all grades:
       - if a team has a bye, they will not be assigned to umpire and scorekeep for the games on that night
       - if there are 3 mixed grades, they will only perform duties for their own grade
       - if there are only 2 mixed grades, B cannot umpire for A, but A can umpire for B
       - ladies only perform duties for ladies games, mens only perform duties for mens games
 4. A best and fairest voting system at the end of each game where umpires choose a best and fairest from each team. The votes will be tallied and awards will be given for the best and fairest players in each grade at the end of the season.
 5. A dashboard for administrators to view and manage teams, fixtures, duties, and voting
 6. A leaderboard to show standings for each grade based on wins, losses, and points scored
    - wins = 3 points
    - draw = 2 points
    - loss = 1 point
    - forfeit = 0 points
    - bye = 3 points
    - missed duty = -2 point
 7. A player profile page where players can view their stats, awards, and voting history
 8. Feature to grade teams at the start of the season via a grading match or based on previous season performance to ensure competitive balance in the grades
   - ability to create a grading draw for new teams that have not played in the league before against a solid A,B,C team to help with grading them for the season across 3 courts
 9. A notification system to alert teams of upcoming games, duties
 10. A mobile-friendly design for easy access on the go
 11. Integration with a calendar system to allow teams to easily add game schedules and duties to their personal calendars
 12. A communication system for teams to communicate with each other and with administrators regarding game schedules, duties, and other important information
 13. Generate a finals schedule with the top 4 teams in each grade at the end of the season, with a knockout format leading to a grand final; where 1 plays 4 and 2 plays 3 in the semi-finals, and the winners of those games play in the grand final. The finals schedule should also include duties for the teams involved in the finals.
 14. Use a relational schema from day one: `seasons`, `grades`, `teams`, `players`, `matches`, `sets`, `events` and more as required.

Please suggest any additional features that will add value to this web app as well.

The references/ folder has two excel files that were previously used to manage seasons, examine them to identify any logic that may assign with feature design.


## Delivery Baseline Decision (2026-02-22)
- Frontend framework: Next.js.
- Hosting target: Vercel Hobby (non-commercial community use).
- Quality gates are mandatory for feature completion: lint + typecheck + unit coverage + E2E.

## Definition of Done (Next.js + Vercel Hobby)
A feature is only complete when all of the following are true:
1. Behavior is implemented and documented in the relevant spec/update notes.
2. `./scripts/dev/frontend_gate.sh` passes.
3. `./scripts/dev/e2e_gate.sh` passes.
4. `./scripts/dev/done_gate.sh` passes end-to-end.
5. Coverage is at or above thresholds defined in `scripts/dev/coverage_thresholds.json`.
6. Any uncovered risk is explicitly documented with mitigation or a follow-up task.

## Required package scripts (web app)
The Next.js web app `package.json` must define at least these scripts:
- `lint`
- `typecheck`
- `test:coverage` (must emit `coverage/coverage-summary.json`)
- `test:e2e` (Playwright)

## Gate scripts
- `scripts/dev/frontend_gate.sh`
  - runs lint, typecheck, unit tests with coverage,
  - enforces coverage thresholds via `scripts/dev/check_coverage_thresholds.mjs`.
- `scripts/dev/e2e_gate.sh`
  - runs Playwright E2E suite via `npm run test:e2e`.
- `scripts/dev/done_gate.sh`
  - orchestrates `frontend_gate` then `e2e_gate`.

## Coverage policy
- Global minimums:
  - Lines: 80%
  - Statements: 80%
  - Functions: 80%
  - Branches: 70%
- Critical modules (scheduling, standings, API paths) are held to stricter thresholds in `scripts/dev/coverage_thresholds.json`.
- If coverage artifacts are missing, the gate fails with a blocked status and exact missing path.

## E2E baseline scenarios (must exist before first production release)
1. User sign-in and team registration flow.
2. Admin creates a round and publishes fixtures.
3. Team view shows upcoming fixture, duty assignment, and standings snapshot.
4. Umpire submits best-and-fairest votes and values persist to leaderboard/profile views.
5. Mobile viewport smoke test for fixture + duty pages.

## CI / local parity
- Local command for completion: `./scripts/dev/done_gate.sh`.
- CI should run the same command to avoid local-vs-CI drift.
