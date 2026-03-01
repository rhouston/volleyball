import { badRequest, created } from '@/lib/api/http';
import { createSeasonSchema } from '@/lib/validation/api';
import { requireRole } from '@/lib/auth/rbac';
import { resolveActor } from '@/lib/auth/session';
import { services } from '@/lib/services/service_registry';
import { logAction } from '@/lib/audit/log_action';

export async function POST(request: Request) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'platform_admin');

  if (forbidden) {
    return forbidden;
  }

  try {
    const payload = createSeasonSchema.parse(await request.json());
    const season = await services.seasonService.createSeason(payload);

    await logAction({
      actor,
      action: 'season.create',
      entityType: 'season',
      entityId: season.id,
      payload,
    });

    return created({ season });
  } catch {
    return badRequest('Invalid season payload');
  }
}
