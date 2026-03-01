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
    const finals = await services.finalsService.generateFinals(seasonId);

    await logAction({
      actor,
      action: 'finals.generate',
      entityType: 'season',
      entityId: seasonId,
      payload: { finalsCount: finals.length },
    });

    return ok({ finals });
  } catch {
    return internalError('Failed to generate finals');
  }
}
