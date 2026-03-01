import { describe, expect, it } from 'vitest';
import { POST as authSignIn } from './auth/signin/route';
import { POST as authSignOut } from './auth/signout/route';
import { GET as usersMe } from './users/me/route';
import { POST as teamsCreate } from './teams/route';
import { GET as teamsGet } from './teams/[teamId]/route';
import { POST as teamsInvites } from './teams/[teamId]/invites/route';
import { POST as teamsMembershipConfirm } from './teams/[teamId]/memberships/[membershipId]/confirm/route';
import { GET as teamsCalendar } from './teams/[teamId]/calendar.ics/route';
import { POST as seasonsCreate } from './seasons/route';
import { PATCH as seasonsSettings } from './seasons/[seasonId]/settings/route';
import { POST as seasonsPublish } from './seasons/[seasonId]/publish/route';
import { POST as seasonsGenerateFixtures } from './seasons/[seasonId]/generate-fixtures/route';
import { GET as seasonsFixtures } from './seasons/[seasonId]/fixtures/route';
import { POST as seasonsGenerateDuties } from './seasons/[seasonId]/generate-duties/route';
import { GET as seasonsLadders } from './seasons/[seasonId]/ladders/route';
import { POST as seasonsFinalsGenerate } from './seasons/[seasonId]/finals/generate/route';
import { POST as matchesResult } from './matches/[matchId]/result/route';
import { POST as matchesVotes } from './matches/[matchId]/votes/route';
import { GET as matchesCalendar } from './matches/[matchId]/calendar.ics/route';
import { GET as notificationsGet } from './notifications/route';
import { POST as messagesThreadsCreate } from './messages/threads/route';
import { POST as messagesThreadMessagesCreate } from './messages/threads/[threadId]/messages/route';
import { POST as importDryRun } from './import/dry-run/route';
import { POST as importCommit } from './import/commit/route';
import { services } from '@/lib/services/service_registry';

function asContext(params: Record<string, string>) {
  return { params };
}

function headers(role: string, userId = 'user-1') {
  return {
    'content-type': 'application/json',
    'x-user-id': userId,
    'x-user-email': `${userId}@local.test`,
    'x-user-role': role,
  };
}

describe('api v1 route contracts', () => {
  it('returns expected codes for invalid and unauthorized requests', async () => {
    const invalidSignIn = await authSignIn(
      new Request('http://127.0.0.1:3000/api/v1/auth/signin', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: 'invalid' }),
      }),
    );
    expect(invalidSignIn.status).toBe(400);

    const signOut = await authSignOut();
    expect(signOut.status).toBe(200);

    const me = await usersMe(new Request('http://127.0.0.1:3000/api/v1/users/me'));
    expect(me.status).toBe(200);
    expect((await me.json()).authenticated).toBe(false);

    const createTeamForbidden = await teamsCreate(
      new Request('http://127.0.0.1:3000/api/v1/teams', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seasonId: 'season-x', gradeId: 'grade-x', name: 'Unauthorized Team' }),
      }),
    );
    expect(createTeamForbidden.status).toBe(403);

    const teamNotFound = await teamsGet(
      new Request('http://127.0.0.1:3000/api/v1/teams/team-missing'),
      asContext({ teamId: 'team-missing' }),
    );
    expect(teamNotFound.status).toBe(404);

    const inviteForbidden = await teamsInvites(
      new Request('http://127.0.0.1:3000/api/v1/teams/team-missing/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inviteeEmail: 'player@example.com' }),
      }),
      asContext({ teamId: 'team-missing' }),
    );
    expect(inviteForbidden.status).toBe(403);

    const confirmForbidden = await teamsMembershipConfirm(
      new Request('http://127.0.0.1:3000/api/v1/teams/team-missing/memberships/membership-missing/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      }),
      asContext({ teamId: 'team-missing', membershipId: 'membership-missing' }),
    );
    expect(confirmForbidden.status).toBe(403);

    const teamCalendarNotFound = await teamsCalendar(
      new Request('http://127.0.0.1:3000/api/v1/teams/team-missing/calendar.ics'),
      asContext({ teamId: 'team-missing' }),
    );
    expect(teamCalendarNotFound.status).toBe(404);

    const seasonCreateForbidden = await seasonsCreate(
      new Request('http://127.0.0.1:3000/api/v1/seasons', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          organizationId: 'org-1',
          name: 'Unauthorized Season',
          year: 2026,
          startDate: '2026-04-01',
          endDate: '2026-06-30',
          mixedNight: 3,
          ladiesMensNight: 5,
        }),
      }),
    );
    expect(seasonCreateForbidden.status).toBe(403);

    const seasonSettingsForbidden = await seasonsSettings(
      new Request('http://127.0.0.1:3000/api/v1/seasons/season-missing/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ finalsFormat: 'simple_top4' }),
      }),
      asContext({ seasonId: 'season-missing' }),
    );
    expect(seasonSettingsForbidden.status).toBe(403);

    const seasonPublishForbidden = await seasonsPublish(
      new Request('http://127.0.0.1:3000/api/v1/seasons/season-missing/publish', { method: 'POST' }),
      asContext({ seasonId: 'season-missing' }),
    );
    expect(seasonPublishForbidden.status).toBe(403);

    const fixtureGenerateForbidden = await seasonsGenerateFixtures(
      new Request('http://127.0.0.1:3000/api/v1/seasons/season-missing/generate-fixtures', { method: 'POST' }),
      asContext({ seasonId: 'season-missing' }),
    );
    expect(fixtureGenerateForbidden.status).toBe(403);

    const fixturesBadRequest = await seasonsFixtures(
      new Request('http://127.0.0.1:3000/api/v1/seasons/season-missing/fixtures?round=oops'),
      asContext({ seasonId: 'season-missing' }),
    );
    expect(fixturesBadRequest.status).toBe(400);

    const dutyGenerateForbidden = await seasonsGenerateDuties(
      new Request('http://127.0.0.1:3000/api/v1/seasons/season-missing/generate-duties', { method: 'POST' }),
      asContext({ seasonId: 'season-missing' }),
    );
    expect(dutyGenerateForbidden.status).toBe(403);

    const ladders = await seasonsLadders(
      new Request('http://127.0.0.1:3000/api/v1/seasons/season-missing/ladders'),
      asContext({ seasonId: 'season-missing' }),
    );
    expect(ladders.status).toBe(200);

    const finalsForbidden = await seasonsFinalsGenerate(
      new Request('http://127.0.0.1:3000/api/v1/seasons/season-missing/finals/generate', { method: 'POST' }),
      asContext({ seasonId: 'season-missing' }),
    );
    expect(finalsForbidden.status).toBe(403);

    const resultForbidden = await matchesResult(
      new Request('http://127.0.0.1:3000/api/v1/matches/match-missing/result', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ homeScore: 3, awayScore: 2 }),
      }),
      asContext({ matchId: 'match-missing' }),
    );
    expect(resultForbidden.status).toBe(403);

    const voteForbidden = await matchesVotes(
      new Request('http://127.0.0.1:3000/api/v1/matches/match-missing/votes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ selectedTeamId: 'team-x', selectedPlayerName: 'Player X' }),
      }),
      asContext({ matchId: 'match-missing' }),
    );
    expect(voteForbidden.status).toBe(403);

    const matchCalendarNotFound = await matchesCalendar(
      new Request('http://127.0.0.1:3000/api/v1/matches/match-missing/calendar.ics'),
      asContext({ matchId: 'match-missing' }),
    );
    expect(matchCalendarNotFound.status).toBe(404);

    const notificationsBadRequest = await notificationsGet(new Request('http://127.0.0.1:3000/api/v1/notifications'));
    expect(notificationsBadRequest.status).toBe(400);

    const threadForbidden = await messagesThreadsCreate(
      new Request('http://127.0.0.1:3000/api/v1/messages/threads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seasonId: 'season-x', title: 'No Access' }),
      }),
    );
    expect(threadForbidden.status).toBe(403);

    const threadMessageForbidden = await messagesThreadMessagesCreate(
      new Request('http://127.0.0.1:3000/api/v1/messages/threads/thread-missing/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: 'No Access' }),
      }),
      asContext({ threadId: 'thread-missing' }),
    );
    expect(threadMessageForbidden.status).toBe(403);

    const dryRunForbidden = await importDryRun(
      new Request('http://127.0.0.1:3000/api/v1/import/dry-run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'teams', rows: [] }),
      }),
    );
    expect(dryRunForbidden.status).toBe(403);

    const commitForbidden = await importCommit(
      new Request('http://127.0.0.1:3000/api/v1/import/commit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'teams', rows: [] }),
      }),
    );
    expect(commitForbidden.status).toBe(403);
  });

  it('returns ICS payloads for existing team and match', async () => {
    const seasonResponse = await seasonsCreate(
      new Request('http://127.0.0.1:3000/api/v1/seasons', {
        method: 'POST',
        headers: headers('platform_admin', 'admin-ics'),
        body: JSON.stringify({
          organizationId: 'org-1',
          name: 'ICS Season',
          year: 2026,
          startDate: '2026-07-01',
          endDate: '2026-09-30',
          mixedNight: 3,
          ladiesMensNight: 5,
        }),
      }),
    );
    expect(seasonResponse.status).toBe(201);

    const seasonId = ((await seasonResponse.json()) as { season: { id: string } }).season.id;
    const grades = await services.seasonService.getGrades(seasonId);
    const gradeId = grades[0]?.id;
    expect(gradeId).toBeTruthy();

    const teamOneResponse = await teamsCreate(
      new Request('http://127.0.0.1:3000/api/v1/teams', {
        method: 'POST',
        headers: headers('team_manager', 'manager-ics-1'),
        body: JSON.stringify({ seasonId, gradeId, name: 'ICS Team One' }),
      }),
    );
    expect(teamOneResponse.status).toBe(201);
    const teamOneId = ((await teamOneResponse.json()) as { team: { id: string } }).team.id;

    const teamTwoResponse = await teamsCreate(
      new Request('http://127.0.0.1:3000/api/v1/teams', {
        method: 'POST',
        headers: headers('team_manager', 'manager-ics-2'),
        body: JSON.stringify({ seasonId, gradeId, name: 'ICS Team Two' }),
      }),
    );
    expect(teamTwoResponse.status).toBe(201);

    const fixturesResponse = await seasonsGenerateFixtures(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/generate-fixtures`, {
        method: 'POST',
        headers: headers('grade_admin', 'grade-admin-ics'),
      }),
      asContext({ seasonId }),
    );
    expect(fixturesResponse.status).toBe(200);

    const fixtureListResponse = await seasonsFixtures(
      new Request(`http://127.0.0.1:3000/api/v1/seasons/${seasonId}/fixtures`),
      asContext({ seasonId }),
    );
    expect(fixtureListResponse.status).toBe(200);

    const fixtures = ((await fixtureListResponse.json()) as { fixtures: Array<{ id: string }> }).fixtures;
    expect(fixtures.length).toBeGreaterThan(0);
    const matchId = fixtures[0].id;

    const teamCalendarResponse = await teamsCalendar(
      new Request(`http://127.0.0.1:3000/api/v1/teams/${teamOneId}/calendar.ics`),
      asContext({ teamId: teamOneId }),
    );
    expect(teamCalendarResponse.status).toBe(200);
    const teamCalendarText = await teamCalendarResponse.text();
    expect(teamCalendarText).toContain('BEGIN:VCALENDAR');
    expect(teamCalendarText).toContain('UID:team-');

    const matchCalendarResponse = await matchesCalendar(
      new Request(`http://127.0.0.1:3000/api/v1/matches/${matchId}/calendar.ics`),
      asContext({ matchId }),
    );
    expect(matchCalendarResponse.status).toBe(200);
    const matchCalendarText = await matchCalendarResponse.text();
    expect(matchCalendarText).toContain('BEGIN:VCALENDAR');
    expect(matchCalendarText).toContain('UID:match-');
  });
});
