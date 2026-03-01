import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/jobs/notification_dispatch', () => ({
  runNotificationDispatchCycle: vi.fn(async () => ({ processed: 2, emailed: 2, failed: 0 })),
}));

import { GET } from './route';

const originalCronSecret = process.env.CRON_SECRET;

afterEach(() => {
  if (originalCronSecret === undefined) {
    delete process.env.CRON_SECRET;
    return;
  }

  process.env.CRON_SECRET = originalCronSecret;
});

describe('cron notifications route', () => {
  it('returns 500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(new Request('http://127.0.0.1:3000/api/cron/notifications'));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.status).toBe('misconfigured');
  });

  it('returns 401 on invalid authorization token', async () => {
    process.env.CRON_SECRET = 'secret-value';

    const response = await GET(
      new Request('http://127.0.0.1:3000/api/cron/notifications', {
        headers: {
          authorization: 'Bearer wrong-value',
        },
      }),
    );

    expect(response.status).toBe(401);
  });

  it('runs dispatch cycle for authorized cron requests', async () => {
    process.env.CRON_SECRET = 'secret-value';

    const response = await GET(
      new Request('http://127.0.0.1:3000/api/cron/notifications', {
        headers: {
          authorization: 'Bearer secret-value',
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.summary).toEqual({ processed: 2, emailed: 2, failed: 0 });
  });
});
