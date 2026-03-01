import { badRequest, created, notFound } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { createInviteSchema } from '@/lib/validation/api';
import { requireRole } from '@/lib/auth/rbac';
import { resolveActor } from '@/lib/auth/session';
import { services } from '@/lib/services/service_registry';
import { logAction } from '@/lib/audit/log_action';

export async function POST(request: Request, context: RouteContext) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'team_manager');

  if (forbidden) {
    return forbidden;
  }

  try {
    const teamId = await getRouteParam(context, 'teamId');
    const payload = createInviteSchema.parse(await request.json());
    const membership = await services.teamService.createInvite(teamId, payload);

    if (!membership) {
      return notFound('Team not found');
    }

    await logAction({
      actor,
      action: 'team.invite.create',
      entityType: 'membership',
      entityId: membership.id,
      payload: { teamId, inviteeEmail: payload.inviteeEmail },
    });

    return created({ membership });
  } catch {
    return badRequest('Invalid invite payload');
  }
}
