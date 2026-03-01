import { ok } from '@/lib/api/http';
import { runNotificationDispatchCycle } from '@/server/jobs/notification_dispatch';

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;

  if (!configuredSecret) {
    return Response.json(
      {
        status: 'misconfigured',
        message: 'CRON_SECRET is not configured',
      },
      { status: 500 },
    );
  }

  const authorization = request.headers.get('authorization');

  if (authorization !== `Bearer ${configuredSecret}`) {
    return Response.json(
      {
        status: 'unauthorized',
        message: 'Invalid cron authorization token',
      },
      { status: 401 },
    );
  }

  const summary = await runNotificationDispatchCycle();
  return ok({ status: 'ok', summary });
}
