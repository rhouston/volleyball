import { badRequest, created } from '@/lib/api/http';
import { resolveActor } from '@/lib/auth/session';
import { requireRole } from '@/lib/auth/rbac';
import { services } from '@/lib/services/service_registry';
import { createThreadSchema } from '@/lib/validation/api';

export async function POST(request: Request) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'team_manager');

  if (forbidden) {
    return forbidden;
  }
  const actorUserId = actor.userId as string;

  try {
    const payload = createThreadSchema.parse(await request.json());
    const thread = await services.messagingService.createThread(actorUserId, payload);
    return created({ thread });
  } catch {
    return badRequest('Invalid thread payload');
  }
}
