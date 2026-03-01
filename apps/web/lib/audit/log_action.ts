import type { RequestActor } from '@/lib/auth/session';
import { services } from '@/lib/services/service_registry';

export async function logAction(params: {
  actor: RequestActor;
  action: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  if (!params.actor.userId) {
    return;
  }

  await services.auditService.log({
    userId: params.actor.userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    payload: params.payload,
  });
}
