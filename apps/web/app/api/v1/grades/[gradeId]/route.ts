import { badRequest, notFound, ok } from '@/lib/api/http';
import { getRouteParam, type RouteContext } from '@/lib/api/route_params';
import { updateGradeSchema } from '@/lib/validation/api';
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
    const gradeId = await getRouteParam(context, 'gradeId');
    const payload = updateGradeSchema.parse(await request.json());
    const grade = await services.infrastructureService.updateGrade(gradeId, payload);

    if (!grade) {
      return notFound('Grade not found');
    }

    await logAction({
      actor,
      action: 'grade.update',
      entityType: 'grade',
      entityId: grade.id,
      payload,
    });

    return ok({ grade });
  } catch {
    return badRequest('Invalid grade payload');
  }
}
