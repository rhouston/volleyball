import { notFound } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { services } from '@/lib/services/service_registry';

function toIcsDate(date: string, time: string): string {
  const [hours, minutes] = time.split(':');
  return `${date.replaceAll('-', '')}T${hours}${minutes}00Z`;
}

export async function GET(_request: Request, context: RouteContext) {
  const teamId = await getRouteParam(context, 'teamId');
  const team = await services.teamService.getTeam(teamId);

  if (!team) {
    return notFound('Team not found');
  }

  const fixtures = (await services.fixtureService.listFixtures(team.seasonId)).filter(
    (match) => match.homeTeamId === teamId || match.awayTeamId === teamId,
  );

  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Volleyball//Season Manager//EN',
    `X-WR-CALNAME:${team.name} Fixtures`,
    ...fixtures.flatMap((match) => {
      const dtStart = toIcsDate(match.matchDate, match.timeslot);
      const dtEnd = toIcsDate(match.matchDate, '21:00');

      return [
        'BEGIN:VEVENT',
        `UID:team-${teamId}-match-${match.id}@volleyball.local`,
        `SUMMARY:${team.name} vs ${match.homeTeamId === teamId ? match.awayTeamId : match.homeTeamId}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `LOCATION:${match.court}`,
        'END:VEVENT',
      ];
    }),
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
