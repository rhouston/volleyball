import { created, badRequest } from '@/lib/api/http';
import { createTeamSchema } from '@/lib/validation/api';
import { resolveActor } from '@/lib/auth/session';
import { requireRole } from '@/lib/auth/rbac';
import { services } from '@/lib/services/service_registry';
import { logAction } from '@/lib/audit/log_action';

export async function POST(request: Request) {
  try {
    const actor = resolveActor(request);
    const forbidden = requireRole(actor, 'team_manager');

    if (forbidden) {
      return forbidden;
    }

    const payload = createTeamSchema.parse(await request.json());
    const team = await services.teamService.createTeam(payload);

    await logAction({
      actor,
      action: 'team.create',
      entityType: 'team',
      entityId: team.id,
      payload: { seasonId: payload.seasonId, gradeId: payload.gradeId },
    });

    return created({ team });
  } catch {
    return badRequest('Invalid team payload');
  }
}
