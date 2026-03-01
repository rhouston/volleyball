import { ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { services } from '@/lib/services/service_registry';

export async function GET(_request: Request, context: RouteContext) {
  const seasonId = await getRouteParam(context, 'seasonId');
  const ladders = await services.ladderService.getLadders(seasonId);

  return ok({ ladders });
}
