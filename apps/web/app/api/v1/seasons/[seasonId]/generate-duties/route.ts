import { internalError, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { requireRole } from '@/lib/auth/rbac';
import { resolveActor } from '@/lib/auth/session';
import { services } from '@/lib/services/service_registry';
import { logAction } from '@/lib/audit/log_action';

export async function POST(request: Request, context: RouteContext) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'grade_admin');

  if (forbidden) {
    return forbidden;
  }

  try {
    const seasonId = await getRouteParam(context, 'seasonId');
    const duties = await services.dutyService.generateDuties(seasonId);

    await logAction({
      actor,
      action: 'duties.generate',
      entityType: 'season',
      entityId: seasonId,
      payload: { dutyCount: duties.length },
    });

    return ok({ duties });
  } catch {
    return internalError('Failed to generate duties');
  }
}
