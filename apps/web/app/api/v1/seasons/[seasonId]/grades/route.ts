import { badRequest, created, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { createGradeSchema } from '@/lib/validation/api';
import { requireRole } from '@/lib/auth/rbac';
import { resolveActor } from '@/lib/auth/session';
import { services } from '@/lib/services/service_registry';
import { logAction } from '@/lib/audit/log_action';

export async function GET(request: Request, context: RouteContext) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'grade_admin');

  if (forbidden) {
    return forbidden;
  }

  const seasonId = await getRouteParam(context, 'seasonId');
  const grades = await services.infrastructureService.listGrades(seasonId);
  return ok({ grades });
}

export async function POST(request: Request, context: RouteContext) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'grade_admin');

  if (forbidden) {
    return forbidden;
  }

  try {
    const seasonId = await getRouteParam(context, 'seasonId');
    const payload = createGradeSchema.parse(await request.json());
    const grade = await services.infrastructureService.createGrade(seasonId, payload);

    await logAction({
      actor,
      action: 'grade.create',
      entityType: 'grade',
      entityId: grade.id,
      payload: {
        seasonId,
      },
    });

    return created({ grade });
  } catch {
    return badRequest('Invalid grade payload');
  }
}
