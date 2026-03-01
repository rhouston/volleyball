import { badRequest, ok } from '@/lib/api/http';
import { requireRole } from '@/lib/auth/rbac';
import { resolveActor } from '@/lib/auth/session';
import { services } from '@/lib/services/service_registry';

export async function POST(request: Request) {
  const actor = resolveActor(request);
  const forbidden = requireRole(actor, 'grade_admin');

  if (forbidden) {
    return forbidden;
  }

  try {
    const payload = (await request.json()) as { type: string; rows: unknown[] };
    const result = await services.importService.commitCsv(payload);
    return ok({ result });
  } catch {
    return badRequest('Invalid import payload');
  }
}
