import { ok } from '@/lib/api/http';
import { services } from '@/lib/services/service_registry';

export async function POST() {
  const result = await services.authService.signOut();
  return ok(result);
}
