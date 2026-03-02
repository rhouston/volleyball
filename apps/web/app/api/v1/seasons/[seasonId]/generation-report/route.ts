import { badRequest, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { requireRole } from '@/lib/auth/rbac';
import { resolveActor } from '@/lib/auth/session';
import { services } from '@/lib/services/service_registry';

export async function GET(request: Request, context: RouteContext) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'grade_admin');

  if (forbidden) {
    return forbidden;
  }

  try {
    const seasonId = await getRouteParam(context, 'seasonId');
    const diagnostics = await services.infrastructureService.getGenerationDiagnostics(seasonId);
    return ok({ diagnostics });
  } catch {
    return badRequest('Unable to build generation diagnostics');
  }
}
