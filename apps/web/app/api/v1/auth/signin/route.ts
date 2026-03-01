import { z } from 'zod';
import { badRequest, ok, parseJsonBody } from '@/lib/api/http';
import { services } from '@/lib/services/service_registry';

const schema = z.object({ provider: z.enum(['google', 'apple', 'email']) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await parseJsonBody<{ provider: 'google' | 'apple' | 'email' }>(request));
    const result = await services.authService.signIn(input.provider);
    return ok(result);
  } catch {
    return badRequest('Invalid sign-in payload');
  }
}
