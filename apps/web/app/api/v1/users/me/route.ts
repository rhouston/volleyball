import { notImplementedJson } from '@/lib/api/skeleton_response';

export function GET() {
  return notImplementedJson('GET', '/api/v1/users/me');
}
