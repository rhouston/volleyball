import { badRequest, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { services } from '@/lib/services/service_registry';

export async function GET(request: Request, context: RouteContext) {
  const seasonId = await getRouteParam(context, 'seasonId');
  const url = new URL(request.url);
  const roundParam = url.searchParams.get('round');

  if (roundParam && Number.isNaN(Number(roundParam))) {
    return badRequest('round must be a number');
  }

  const fixtures = await services.fixtureService.listFixtures(seasonId, {
    gradeId: url.searchParams.get('gradeId') ?? undefined,
    round: roundParam ? Number(roundParam) : undefined,
  });

  return ok({ fixtures });
}
