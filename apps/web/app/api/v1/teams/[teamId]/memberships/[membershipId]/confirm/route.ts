import { badRequest, notFound, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { confirmMembershipSchema } from '@/lib/validation/api';
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
    const membershipId = await getRouteParam(context, 'membershipId');
    const payload = confirmMembershipSchema.parse(await request.json());

    const membership = await services.teamService.confirmMembership(teamId, membershipId, payload);

    if (!membership) {
      return notFound('Membership not found');
    }

    await logAction({
      actor,
      action: 'team.membership.confirm',
      entityType: 'membership',
      entityId: membership.id,
      payload: { status: payload.status },
    });

    return ok({ membership });
  } catch {
    return badRequest('Invalid membership confirmation payload');
  }
}
