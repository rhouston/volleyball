import { badRequest, notFound, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { updateCourtSchema } from '@/lib/validation/api';
import { requireRole } from '@/lib/auth/rbac';
import { resolveActor } from '@/lib/auth/session';
import { services } from '@/lib/services/service_registry';
import { logAction } from '@/lib/audit/log_action';

export async function PATCH(request: Request, context: RouteContext) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'grade_admin');

  if (forbidden) {
    return forbidden;
  }

  try {
    const courtId = await getRouteParam(context, 'courtId');
    const payload = updateCourtSchema.parse(await request.json());
    const court = await services.infrastructureService.updateCourt(courtId, payload);

    if (!court) {
      return notFound('Court not found');
    }

    await logAction({
      actor,
      action: 'court.update',
      entityType: 'court',
      entityId: court.id,
      payload,
    });

    return ok({ court });
  } catch {
    return badRequest('Invalid court payload');
  }
}
