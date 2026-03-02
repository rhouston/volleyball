import { badRequest, created, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { createCourtSchema } from '@/lib/validation/api';
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
  const courts = await services.infrastructureService.listCourts(seasonId);
  return ok({ courts });
}

export async function POST(request: Request, context: RouteContext) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'grade_admin');

  if (forbidden) {
    return forbidden;
  }

  try {
    const seasonId = await getRouteParam(context, 'seasonId');
    const payload = createCourtSchema.parse(await request.json());
    const court = await services.infrastructureService.createCourt(seasonId, payload);

    await logAction({
      actor,
      action: 'court.create',
      entityType: 'court',
      entityId: court.id,
      payload: {
        seasonId,
      },
    });

    return created({ court });
  } catch {
    return badRequest('Invalid court payload');
  }
}
