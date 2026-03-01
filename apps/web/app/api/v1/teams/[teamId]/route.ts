import { notFound, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { services } from '@/lib/services/service_registry';

export async function GET(_request: Request, context: RouteContext) {
  const teamId = await getRouteParam(context, 'teamId');
  const team = await services.teamService.getTeam(teamId);

  if (!team) {
    return notFound('Team not found');
  }

  return ok({ team });
}
