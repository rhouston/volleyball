import { badRequest, ok } from '@/lib/api/http';
import { resolveActor } from '@/lib/auth/session';
import { services } from '@/lib/services/service_registry';

export async function GET(request: Request) {
  const actor = resolveActor(request);

  if (!actor.userId) {
    return badRequest('x-user-id header is required');
  }

  const notifications = await services.notificationService.listForUser(actor.userId);
  return ok({ notifications });
}
