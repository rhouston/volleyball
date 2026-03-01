import { badRequest, notFound, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { updateSeasonSettingsSchema } from '@/lib/validation/api';
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
    const seasonId = await getRouteParam(context, 'seasonId');
    const payload = updateSeasonSettingsSchema.parse(await request.json());
    const season = await services.seasonService.updateSettings(seasonId, payload);

    if (!season) {
      return notFound('Season not found');
    }

    await logAction({
      actor,
      action: 'season.settings.update',
      entityType: 'season',
      entityId: season.id,
      payload,
    });

    return ok({ season });
  } catch {
    return badRequest('Invalid season settings payload');
  }
}
