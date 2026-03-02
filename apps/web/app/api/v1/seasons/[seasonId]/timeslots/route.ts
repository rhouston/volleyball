import { badRequest, created, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { createTimeslotSchema } from '@/lib/validation/api';
import { requireRole } from '@/lib/auth/rbac';
import { resolveActor } from '@/lib/auth/session';
import { services } from '@/lib/services/service_registry';
import { logAction } from '@/lib/audit/log_action';

export async function GET(request: Request, context: RouteContext) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'grade_admin');

  if (forbidden) {
    return forbidden;
  }

  const seasonId = await getRouteParam(context, 'seasonId');
  const timeslots = await services.infrastructureService.listTimeslots(seasonId);
  return ok({ timeslots });
}

export async function POST(request: Request, context: RouteContext) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'grade_admin');

  if (forbidden) {
    return forbidden;
  }

  try {
    const seasonId = await getRouteParam(context, 'seasonId');
    const payload = createTimeslotSchema.parse(await request.json());
    const timeslot = await services.infrastructureService.createTimeslot(seasonId, payload);

    await logAction({
      actor,
      action: 'timeslot.create',
      entityType: 'timeslot',
      entityId: timeslot.id,
      payload: {
        seasonId,
      },
    });

    return created({ timeslot });
  } catch {
    return badRequest('Invalid timeslot payload');
  }
}
