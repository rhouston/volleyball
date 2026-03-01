import { notFound, ok } from '@/lib/api/http';
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

  const seasonId = await getRouteParam(context, 'seasonId');
  const season = await services.seasonService.publish(seasonId);

  if (!season) {
    return notFound('Season not found');
  }

  await logAction({
    actor,
    action: 'season.publish',
    entityType: 'season',
    entityId: season.id,
  });

  return ok({ season });
}
