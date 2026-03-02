import { badRequest, notFound, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { updateTimeslotSchema } from '@/lib/validation/api';
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
    const timeslotId = await getRouteParam(context, 'timeslotId');
    const payload = updateTimeslotSchema.parse(await request.json());
    const timeslot = await services.infrastructureService.updateTimeslot(timeslotId, payload);

    if (!timeslot) {
      return notFound('Timeslot not found');
    }

    await logAction({
      actor,
      action: 'timeslot.update',
      entityType: 'timeslot',
      entityId: timeslot.id,
      payload,
    });

    return ok({ timeslot });
  } catch {
    return badRequest('Invalid timeslot payload');
  }
}
