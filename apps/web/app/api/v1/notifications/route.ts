import { badRequest, ok } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/rbac';
import { resolveActor } from '@/lib/auth/session';
import { services } from '@/lib/services/service_registry';
import { createNotificationSchema } from '@/lib/validation/api';
import { logAction } from '@/lib/audit/log_action';
import { queueNotificationDispatch } from '@/server/jobs/notification_dispatch';

export async function GET(request: Request) {
  const actor = resolveActor(request);

  if (!actor.userId) {
    return badRequest('x-user-id header is required');
  }

  const notifications = await services.notificationService.listForUser(actor.userId);
  return ok({ notifications });
}

export async function POST(request: Request) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'grade_admin');

  if (forbidden) {
    return forbidden;
  }

  try {
    const payload = createNotificationSchema.parse(await request.json());
    await services.notificationService.enqueue(payload.recipientUserId, payload.message);
    const queueResult = await queueNotificationDispatch();

    await logAction({
      actor,
      action: 'notification.enqueue',
      entityType: 'notification',
      entityId: payload.recipientUserId,
      payload: {
        queuedDispatch: queueResult.queued,
      },
    });

    return ok({
      queued: true,
      dispatchJobQueued: queueResult.queued,
    });
  } catch {
    return badRequest('Invalid notification payload');
  }
}
