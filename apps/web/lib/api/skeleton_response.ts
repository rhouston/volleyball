import { NextResponse } from 'next/server';

type SkeletonNotes = Record<string, string | null | undefined>;

export function notImplementedJson(
  method: string,
  endpoint: string,
  notes?: SkeletonNotes,
): NextResponse {
  return NextResponse.json(
    {
      status: 'not_implemented',
      method,
      endpoint,
      message: 'API skeleton route is present but business logic is not implemented yet.',
      notes: notes ?? {},
    },
    { status: 501 },
  );
}

export function notImplementedCalendar(endpoint: string): Response {
  const payload = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Volleyball//Season Manager//EN',
    'X-WR-CALNAME:Volleyball Season (Skeleton)',
    `X-WR-CALDESC:Not implemented endpoint ${endpoint}`,
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(payload, {
    status: 501,
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
