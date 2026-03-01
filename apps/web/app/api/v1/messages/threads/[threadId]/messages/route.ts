import { badRequest, notFound, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { resolveActor } from '@/lib/auth/session';
import { requireRole } from '@/lib/auth/rbac';
import { services } from '@/lib/services/service_registry';
import { createMessageSchema } from '@/lib/validation/api';

export async function POST(request: Request, context: RouteContext) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'player');

  if (forbidden) {
    return forbidden;
  }
  const actorUserId = actor.userId as string;

  try {
    const threadId = await getRouteParam(context, 'threadId');
    const payload = createMessageSchema.parse(await request.json());
    const message = await services.messagingService.createMessage(actorUserId, threadId, payload);

    if (!message) {
      return notFound('Thread not found');
    }

    return ok({ message });
  } catch {
    return badRequest('Invalid message payload');
  }
}
