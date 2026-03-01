import { notFound } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { services } from '@/lib/services/service_registry';

function toIcsDate(date: string, time: string): string {
  const [hours, minutes] = time.split(':');
  return `${date.replaceAll('-', '')}T${hours}${minutes}00Z`;
}

export async function GET(_request: Request, context: RouteContext) {
  const matchId = await getRouteParam(context, 'matchId');
  const match = await services.fixtureService.getMatch(matchId);

  if (!match) {
    return notFound('Match not found');
  }

  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Volleyball//Season Manager//EN',
    'BEGIN:VEVENT',
    `UID:match-${match.id}@volleyball.local`,
    `SUMMARY:${match.homeTeamId} vs ${match.awayTeamId}`,
    `DTSTART:${toIcsDate(match.matchDate, match.timeslot)}`,
    `DTEND:${toIcsDate(match.matchDate, '21:00')}`,
    `LOCATION:${match.court}`,
    'END:VEVENT',
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
