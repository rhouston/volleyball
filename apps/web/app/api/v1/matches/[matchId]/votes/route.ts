import { badRequest, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { submitVoteSchema } from '@/lib/validation/api';
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
  const actorUserId = actor.userId as string;

  try {
    const matchId = await getRouteParam(context, 'matchId');
    const payload = submitVoteSchema.parse(await request.json());
    const vote = await services.votingService.submitVote(actorUserId, matchId, payload);

    await logAction({
      actor,
      action: 'match.vote.submit',
      entityType: 'vote',
      entityId: vote.id,
      payload: { matchId, selectedTeamId: payload.selectedTeamId },
    });

    return ok({ vote });
  } catch {
    return badRequest('Invalid vote payload');
  }
}
