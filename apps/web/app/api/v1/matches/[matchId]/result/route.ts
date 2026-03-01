import { badRequest, notFound, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { submitResultSchema } from '@/lib/validation/api';
import { requireRole } from '@/lib/auth/rbac';
import { resolveActor } from '@/lib/auth/session';
import { services } from '@/lib/services/service_registry';
import { logAction } from '@/lib/audit/log_action';

export async function POST(request: Request, context: RouteContext) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'player');

  if (forbidden) {
    return forbidden;
  }

  try {
    const matchId = await getRouteParam(context, 'matchId');
    const payload = submitResultSchema.parse(await request.json());
    const match = await services.resultsService.submitResult(matchId, payload);

    if (!match) {
      return notFound('Match not found');
    }

    await logAction({
      actor,
      action: 'match.result.submit',
      entityType: 'match',
      entityId: match.id,
      payload,
    });

    return ok({ match });
  } catch {
    return badRequest('Invalid result payload');
  }
}
