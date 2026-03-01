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

type JsonCase = {
  routeName: string;
  response: Response;
  method: string;
  endpoint: string;
};

async function assertJsonCase(testCase: JsonCase) {
  const body = await testCase.response.json();

  expect(testCase.response.status).toBe(501);
  expect(body.status).toBe('not_implemented');
  expect(body.method).toBe(testCase.method);
  expect(body.endpoint).toBe(testCase.endpoint);
}

describe('api v1 skeleton routes', () => {
  it('returns 501 JSON payloads for business endpoints', async () => {
    const cases: JsonCase[] = [
      {
        routeName: 'auth/signin',
        response: authSignIn(),
        method: 'POST',
        endpoint: '/api/v1/auth/signin',
      },
      {
        routeName: 'auth/signout',
        response: authSignOut(),
        method: 'POST',
        endpoint: '/api/v1/auth/signout',
      },
      {
        routeName: 'users/me',
        response: usersMe(),
        method: 'GET',
        endpoint: '/api/v1/users/me',
      },
      {
        routeName: 'teams',
        response: teamsCreate(),
        method: 'POST',
        endpoint: '/api/v1/teams',
      },
      {
        routeName: 'teams/:teamId',
        response: teamsGet(),
        method: 'GET',
        endpoint: '/api/v1/teams/:teamId',
      },
      {
        routeName: 'teams/:teamId/invites',
        response: teamsInvites(),
        method: 'POST',
        endpoint: '/api/v1/teams/:teamId/invites',
      },
      {
        routeName: 'teams/:teamId/memberships/:membershipId/confirm',
        response: teamsMembershipConfirm(),
        method: 'POST',
        endpoint: '/api/v1/teams/:teamId/memberships/:membershipId/confirm',
      },
      {
        routeName: 'seasons',
        response: seasonsCreate(),
        method: 'POST',
        endpoint: '/api/v1/seasons',
      },
      {
        routeName: 'seasons/:seasonId/settings',
        response: seasonsSettings(),
        method: 'PATCH',
        endpoint: '/api/v1/seasons/:seasonId/settings',
      },
      {
        routeName: 'seasons/:seasonId/publish',
        response: seasonsPublish(),
        method: 'POST',
        endpoint: '/api/v1/seasons/:seasonId/publish',
      },
      {
        routeName: 'seasons/:seasonId/generate-fixtures',
        response: seasonsGenerateFixtures(),
        method: 'POST',
        endpoint: '/api/v1/seasons/:seasonId/generate-fixtures',
      },
      {
        routeName: 'seasons/:seasonId/generate-duties',
        response: seasonsGenerateDuties(),
        method: 'POST',
        endpoint: '/api/v1/seasons/:seasonId/generate-duties',
      },
      {
        routeName: 'seasons/:seasonId/ladders',
        response: seasonsLadders(),
        method: 'GET',
        endpoint: '/api/v1/seasons/:seasonId/ladders',
      },
      {
        routeName: 'seasons/:seasonId/finals/generate',
        response: seasonsFinalsGenerate(),
        method: 'POST',
        endpoint: '/api/v1/seasons/:seasonId/finals/generate',
      },
      {
        routeName: 'matches/:matchId/result',
        response: matchesResult(),
        method: 'POST',
        endpoint: '/api/v1/matches/:matchId/result',
      },
      {
        routeName: 'matches/:matchId/votes',
        response: matchesVotes(),
        method: 'POST',
        endpoint: '/api/v1/matches/:matchId/votes',
      },
      {
        routeName: 'notifications',
        response: notificationsGet(),
        method: 'GET',
        endpoint: '/api/v1/notifications',
      },
      {
        routeName: 'messages/threads',
        response: messagesThreadsCreate(),
        method: 'POST',
        endpoint: '/api/v1/messages/threads',
      },
      {
        routeName: 'messages/threads/:threadId/messages',
        response: messagesThreadMessagesCreate(),
        method: 'POST',
        endpoint: '/api/v1/messages/threads/:threadId/messages',
      },
    ];

    for (const testCase of cases) {
      await assertJsonCase(testCase);
    }
  });

  it('captures query params for fixture list endpoint', async () => {
    const response = seasonsFixtures(
      new Request('http://127.0.0.1:3000/api/v1/seasons/season-1/fixtures?gradeId=grade-1&round=4'),
    );
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.endpoint).toBe('/api/v1/seasons/:seasonId/fixtures');
    expect(body.notes).toEqual({ gradeId: 'grade-1', round: '4' });
  });

  it('returns calendar placeholders for ICS endpoints', async () => {
    const teamCalendarResponse = teamsCalendar();
    const matchCalendarResponse = matchesCalendar();

    const teamCalendar = await teamCalendarResponse.text();
    const matchCalendar = await matchCalendarResponse.text();

    expect(teamCalendarResponse.status).toBe(501);
    expect(teamCalendarResponse.headers.get('content-type')).toContain('text/calendar');
    expect(teamCalendar).toContain('/api/v1/teams/:teamId/calendar.ics');

    expect(matchCalendarResponse.status).toBe(501);
    expect(matchCalendarResponse.headers.get('content-type')).toContain('text/calendar');
    expect(matchCalendar).toContain('/api/v1/matches/:matchId/calendar.ics');
  });
});
