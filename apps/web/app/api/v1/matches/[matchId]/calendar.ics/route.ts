import { notImplementedCalendar } from '@/lib/api/skeleton_response';

export function GET() {
  return notImplementedCalendar('/api/v1/matches/:matchId/calendar.ics');
}
