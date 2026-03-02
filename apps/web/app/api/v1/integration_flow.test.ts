import { describe, expect, it } from 'vitest';
import { POST as authSignIn } from './auth/signin/route';
import { POST as authSignOut } from './auth/signout/route';
import { GET as usersMe } from './users/me/route';
import { POST as seasonsCreate } from './seasons/route';
import { PATCH as seasonsSettings } from './seasons/[seasonId]/settings/route';
import { POST as seasonsPublish } from './seasons/[seasonId]/publish/route';
import { GET as seasonsGradesGet, POST as seasonsGradesCreate } from './seasons/[seasonId]/grades/route';
import { PATCH as gradesPatch } from './grades/[gradeId]/route';
import { GET as seasonsCourtsGet, POST as seasonsCourtsCreate } from './seasons/[seasonId]/courts/route';
import { PATCH as courtsPatch } from './courts/[courtId]/route';
import { GET as seasonsTimeslotsGet, POST as seasonsTimeslotsCreate } from './seasons/[seasonId]/timeslots/route';
import { PATCH as timeslotsPatch } from './timeslots/[timeslotId]/route';
import { GET as generationReportGet } from './seasons/[seasonId]/generation-report/route';
import { POST as teamsCreate } from './teams/route';
import { GET as teamGet } from './teams/[teamId]/route';
import { POST as teamsInvite } from './teams/[teamId]/invites/route';
import { POST as teamsMembershipConfirm } from './teams/[teamId]/memberships/[membershipId]/confirm/route';
import { POST as generateFixtures } from './seasons/[seasonId]/generate-fixtures/route';
import { GET as listFixtures } from './seasons/[seasonId]/fixtures/route';
import { POST as generateDuties } from './seasons/[seasonId]/generate-duties/route';
import { POST as submitResult } from './matches/[matchId]/result/route';
import { POST as submitVote } from './matches/[matchId]/votes/route';
import { GET as laddersGet } from './seasons/[seasonId]/ladders/route';
import { POST as finalsGenerate } from './seasons/[seasonId]/finals/generate/route';
import { POST as threadCreate } from './messages/threads/route';
import { POST as messageCreate } from './messages/threads/[threadId]/messages/route';
import { GET as teamCalendar } from './teams/[teamId]/calendar.ics/route';
import { GET as matchCalendar } from './matches/[matchId]/calendar.ics/route';
import { GET as notificationsGet } from './notifications/route';
import { POST as notificationsCreate } from './notifications/route';
import { POST as importDryRun } from './import/dry-run/route';
import { POST as importCommit } from './import/commit/route';
import { services } from '@/lib/services/service_registry';

function asContext(params: Record<string, string>) {
  return { params };
}

function jsonHeaders(role: string, userId = 'user-admin') {
  return {
    'content-type': 'application/json',
    'x-user-id': userId,
    'x-user-email': `${userId}@local.test`,
    'x-user-role': role,
  };
}

describe('api v1 integration flow', () => {
  it('supports core competition flow end-to-end', async () => {
    const signInResponse = await authSignIn(
      new Request('http://127.0.0.1:3000/api/v1/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'google' }),
      }),
    );
    expect(signInResponse.status).toBe(200);

    const createSeasonResponse = await seasonsCreate(
      new Request('http://127.0.0.1:3000/api/v1/seasons', {
        method: 'POST',
        headers: jsonHeaders('platform_admin'),
        body: JSON.stringify({
          organizationId: 'org-1',
          name: '2026 Season One',
          year: 2026,
          startDate: '2026-04-01',
          endDate: '2026-06-30',
          mixedNight: 3,
          ladiesMensNight: 5,
        }),
      }),
    );
    expect(createSeasonResponse.status).toBe(201);

    const seasonBody = await createSeasonResponse.json();
    const seasonId = seasonBody.season.id as string;

    const grades = await services.seasonService.getGrades(seasonId);
    const mixedAGrade = grades.find((grade) => grade.name === 'Mixed A');
    expect(mixedAGrade).toBeTruthy();

    const gradesListResponse = await seasonsGradesGet(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/grades`, {
        headers: jsonHeaders('grade_admin'),
      }),
      asContext({ seasonId }),
    );
    expect(gradesListResponse.status).toBe(200);

    const createGradeResponse = await seasonsGradesCreate(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/grades`, {
        method: 'POST',
        headers: jsonHeaders('grade_admin'),
        body: JSON.stringify({ name: 'Mixed D', category: 'MIXED', rankOrder: 6 }),
      }),
      asContext({ seasonId }),
    );
    expect(createGradeResponse.status).toBe(201);
    const newGradeId = ((await createGradeResponse.json()) as { grade: { id: string } }).grade.id;

    const patchGradeResponse = await gradesPatch(
      new Request(`http://127.0.0.1:3000/api/v1/grades/${newGradeId}`, {
        method: 'PATCH',
        headers: jsonHeaders('grade_admin'),
        body: JSON.stringify({ isActive: false }),
      }),
      asContext({ gradeId: newGradeId }),
    );
    expect(patchGradeResponse.status).toBe(200);

    const createCourtResponse = await seasonsCourtsCreate(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/courts`, {
        method: 'POST',
        headers: jsonHeaders('grade_admin'),
        body: JSON.stringify({ name: 'Court 4', sortOrder: 4 }),
      }),
      asContext({ seasonId }),
    );
    expect(createCourtResponse.status).toBe(201);
    const courtId = ((await createCourtResponse.json()) as { court: { id: string } }).court.id;

    const listCourtsResponse = await seasonsCourtsGet(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/courts`, {
        headers: jsonHeaders('grade_admin'),
      }),
      asContext({ seasonId }),
    );
    expect(listCourtsResponse.status).toBe(200);

    const patchCourtResponse = await courtsPatch(
      new Request(`http://127.0.0.1:3000/api/v1/courts/${courtId}`, {
        method: 'PATCH',
        headers: jsonHeaders('grade_admin'),
        body: JSON.stringify({ name: 'Court 4A' }),
      }),
      asContext({ courtId }),
    );
    expect(patchCourtResponse.status).toBe(200);

    const createTimeslotResponse = await seasonsTimeslotsCreate(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/timeslots`, {
        method: 'POST',
        headers: jsonHeaders('grade_admin'),
        body: JSON.stringify({ label: 'Late Slot', startsAt: '20:45', sortOrder: 4 }),
      }),
      asContext({ seasonId }),
    );
    expect(createTimeslotResponse.status).toBe(201);
    const timeslotId = ((await createTimeslotResponse.json()) as { timeslot: { id: string } }).timeslot.id;

    const listTimeslotsResponse = await seasonsTimeslotsGet(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/timeslots`, {
        headers: jsonHeaders('grade_admin'),
      }),
      asContext({ seasonId }),
    );
    expect(listTimeslotsResponse.status).toBe(200);

    const patchTimeslotResponse = await timeslotsPatch(
      new Request(`http://127.0.0.1:3000/api/v1/timeslots/${timeslotId}`, {
        method: 'PATCH',
        headers: jsonHeaders('grade_admin'),
        body: JSON.stringify({ label: 'Late Slot Updated' }),
      }),
      asContext({ timeslotId }),
    );
    expect(patchTimeslotResponse.status).toBe(200);

    const createTeam = async (name: string) => {
      const response = await teamsCreate(
        new Request('http://127.0.0.1:3000/api/v1/teams', {
          method: 'POST',
          headers: jsonHeaders('team_manager'),
          body: JSON.stringify({
            seasonId,
            gradeId: mixedAGrade?.id,
            name,
          }),
        }),
      );

      expect(response.status).toBe(201);
      return (await response.json()).team.id as string;
    };

    const teamIds = await Promise.all([
      createTeam('Ball Slappers'),
      createTeam('Net Ninjas'),
      createTeam('Sky Spikers'),
      createTeam('Court Crushers'),
    ]);

    const teamFetchResponse = await teamGet(
      new Request(`http://127.0.0.1:3000/api/v1/teams/${teamIds[0]}`, { method: 'GET' }),
      asContext({ teamId: teamIds[0] }),
    );
    expect(teamFetchResponse.status).toBe(200);

    const inviteResponse = await teamsInvite(
      new Request(`http://127.0.0.1:3000/api/v1/teams/${teamIds[0]}/invites`, {
        method: 'POST',
        headers: jsonHeaders('team_manager'),
        body: JSON.stringify({ inviteeEmail: 'newplayer@example.com' }),
      }),
      asContext({ teamId: teamIds[0] }),
    );
    expect(inviteResponse.status).toBe(201);

    const membershipId = (await inviteResponse.json()).membership.id as string;

    const confirmResponse = await teamsMembershipConfirm(
      new Request(
        `http://127.0.0.1:3000/api/v1/teams/${teamIds[0]}/memberships/${membershipId}/confirm`,
        {
          method: 'POST',
          headers: jsonHeaders('team_manager'),
          body: JSON.stringify({ status: 'ACTIVE' }),
        },
      ),
      asContext({ teamId: teamIds[0], membershipId }),
    );
    expect(confirmResponse.status).toBe(200);

    const seasonSettingsResponse = await seasonsSettings(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/settings`, {
        method: 'PATCH',
        headers: jsonHeaders('grade_admin'),
        body: JSON.stringify({ finalsFormat: 'major_minor', excludedDates: ['2026-05-13'] }),
      }),
      asContext({ seasonId }),
    );
    expect(seasonSettingsResponse.status).toBe(200);

    const publishResponse = await seasonsPublish(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/publish`, {
        method: 'POST',
        headers: jsonHeaders('grade_admin'),
      }),
      asContext({ seasonId }),
    );
    expect(publishResponse.status).toBe(200);

    const fixturesResponse = await generateFixtures(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/generate-fixtures`, {
        method: 'POST',
        headers: jsonHeaders('grade_admin'),
      }),
      asContext({ seasonId }),
    );
    expect(fixturesResponse.status).toBe(200);

    const fixtureListResponse = await listFixtures(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/fixtures?gradeId=${mixedAGrade?.id}&round=1`),
      asContext({ seasonId }),
    );
    expect(fixtureListResponse.status).toBe(200);

    const fixtureListBody = await fixtureListResponse.json();
    const fixtures = fixtureListBody.fixtures as Array<{ id: string }>;
    expect(fixtures.length).toBeGreaterThan(0);

    const dutiesResponse = await generateDuties(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/generate-duties`, {
        method: 'POST',
        headers: jsonHeaders('grade_admin'),
      }),
      asContext({ seasonId }),
    );
    expect(dutiesResponse.status).toBe(200);
    expect((await dutiesResponse.json()).duties.length).toBeGreaterThan(0);

    const diagnosticsResponse = await generationReportGet(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/generation-report`, {
        headers: jsonHeaders('grade_admin'),
      }),
      asContext({ seasonId }),
    );
    expect(diagnosticsResponse.status).toBe(200);
    const diagnosticsBody = (await diagnosticsResponse.json()) as {
      diagnostics: {
        hardConflicts: { count: number };
        fairness: { timeslotDistributionByTeam: unknown[]; dutyDistributionByTeam: unknown[] };
        generation: { runId: string | null };
      };
    };
    expect(typeof diagnosticsBody.diagnostics.hardConflicts.count).toBe('number');
    expect(Array.isArray(diagnosticsBody.diagnostics.fairness.timeslotDistributionByTeam)).toBe(true);
    expect(Array.isArray(diagnosticsBody.diagnostics.fairness.dutyDistributionByTeam)).toBe(true);

    const firstFixtureId = fixtures[0].id;

    const resultResponse = await submitResult(
      new Request(`http://127.0.0.1:3000/api/v1/matches/${firstFixtureId}/result`, {
        method: 'POST',
        headers: jsonHeaders('player', 'umpire-1'),
        body: JSON.stringify({ homeScore: 25, awayScore: 20 }),
      }),
      asContext({ matchId: firstFixtureId }),
    );
    expect(resultResponse.status).toBe(200);

    const secondFixtureId = fixtures[Math.min(1, fixtures.length - 1)].id;
    if (secondFixtureId !== firstFixtureId) {
      await submitResult(
        new Request(`http://127.0.0.1:3000/api/v1/matches/${secondFixtureId}/result`, {
          method: 'POST',
          headers: jsonHeaders('player', 'umpire-2'),
          body: JSON.stringify({ homeScore: 21, awayScore: 25 }),
        }),
        asContext({ matchId: secondFixtureId }),
      );
    }

    const voteResponse = await submitVote(
      new Request(`http://127.0.0.1:3000/api/v1/matches/${firstFixtureId}/votes`, {
        method: 'POST',
        headers: jsonHeaders('player', 'umpire-1'),
        body: JSON.stringify({ selectedTeamId: teamIds[0], selectedPlayerName: 'Player One' }),
      }),
      asContext({ matchId: firstFixtureId }),
    );
    expect(voteResponse.status).toBe(200);

    const laddersResponse = await laddersGet(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/ladders`),
      asContext({ seasonId }),
    );
    expect(laddersResponse.status).toBe(200);
    const ladderPayload = await laddersResponse.json();
    expect(Array.isArray(ladderPayload.ladders[mixedAGrade?.id as string])).toBe(true);

    const finalsResponse = await finalsGenerate(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/finals/generate`, {
        method: 'POST',
        headers: jsonHeaders('grade_admin'),
      }),
      asContext({ seasonId }),
    );
    expect(finalsResponse.status).toBe(200);

    const threadResponse = await threadCreate(
      new Request('http://127.0.0.1:3000/api/v1/messages/threads', {
        method: 'POST',
        headers: jsonHeaders('team_manager', 'manager-1'),
        body: JSON.stringify({ seasonId, teamId: teamIds[0], title: 'Team Updates' }),
      }),
    );
    expect(threadResponse.status).toBe(201);
    const threadId = (await threadResponse.json()).thread.id as string;

    const messageResponse = await messageCreate(
      new Request(`http://127.0.0.1:3000/api/v1/messages/threads/${threadId}/messages`, {
        method: 'POST',
        headers: jsonHeaders('player', 'player-22'),
        body: JSON.stringify({ body: 'Ready for tonight!' }),
      }),
      asContext({ threadId }),
    );
    expect(messageResponse.status).toBe(200);

    const teamCalendarResponse = await teamCalendar(
      new Request(`http://127.0.0.1:3000/api/v1/teams/${teamIds[0]}/calendar.ics`),
      asContext({ teamId: teamIds[0] }),
    );
    expect(teamCalendarResponse.status).toBe(200);
    expect(await teamCalendarResponse.text()).toContain('BEGIN:VCALENDAR');

    const matchCalendarResponse = await matchCalendar(
      new Request(`http://127.0.0.1:3000/api/v1/matches/${firstFixtureId}/calendar.ics`),
      asContext({ matchId: firstFixtureId }),
    );
    expect(matchCalendarResponse.status).toBe(200);

    const notificationsResponse = await notificationsGet(
      new Request('http://127.0.0.1:3000/api/v1/notifications', {
        headers: jsonHeaders('player', 'player-22'),
      }),
    );
    expect(notificationsResponse.status).toBe(200);

    const notificationsCreateResponse = await notificationsCreate(
      new Request('http://127.0.0.1:3000/api/v1/notifications', {
        method: 'POST',
        headers: jsonHeaders('grade_admin', 'grade-admin-1'),
        body: JSON.stringify({
          recipientUserId: 'player-22',
          message: 'Fixture update available',
        }),
      }),
    );
    expect(notificationsCreateResponse.status).toBe(200);

    const dryRunResponse = await importDryRun(
      new Request('http://127.0.0.1:3000/api/v1/import/dry-run', {
        method: 'POST',
        headers: jsonHeaders('grade_admin'),
        body: JSON.stringify({ type: 'teams', rows: [{ name: 'Example Team' }] }),
      }),
    );
    expect(dryRunResponse.status).toBe(200);

    const importCommitResponse = await importCommit(
      new Request('http://127.0.0.1:3000/api/v1/import/commit', {
        method: 'POST',
        headers: jsonHeaders('grade_admin'),
        body: JSON.stringify({ type: 'teams', rows: [{ name: 'Example Team' }] }),
      }),
    );
    expect(importCommitResponse.status).toBe(200);

    const meResponse = await usersMe(
      new Request('http://127.0.0.1:3000/api/v1/users/me', {
        headers: jsonHeaders('player', 'player-22'),
      }),
    );
    expect(meResponse.status).toBe(200);

    const signOutResponse = await authSignOut();
    expect(signOutResponse.status).toBe(200);
  });
});
