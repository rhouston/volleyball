import { describe, expect, it } from 'vitest';
import { notImplementedCalendar, notImplementedJson } from './skeleton_response';

describe('skeleton response helpers', () => {
  it('builds json not implemented payloads', async () => {
    const response = notImplementedJson('POST', '/api/v1/test', { sample: 'true' });
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body).toEqual({
      status: 'not_implemented',
      method: 'POST',
      endpoint: '/api/v1/test',
      message: 'API skeleton route is present but business logic is not implemented yet.',
      notes: { sample: 'true' },
    });
  });

  it('defaults notes to an empty object when omitted', async () => {
    const response = notImplementedJson('GET', '/api/v1/test');
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.notes).toEqual({});
  });

  it('builds calendar not implemented payloads', async () => {
    const response = notImplementedCalendar('/api/v1/teams/:teamId/calendar.ics');
    const body = await response.text();

    expect(response.status).toBe(501);
    expect(response.headers.get('content-type')).toContain('text/calendar');
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('Not implemented endpoint /api/v1/teams/:teamId/calendar.ics');
  });
});
