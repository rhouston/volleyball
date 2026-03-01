import { notImplementedJson } from '@/lib/api/skeleton_response';

export function GET(request: Request) {
  const url = new URL(request.url);

  return notImplementedJson('GET', '/api/v1/seasons/:seasonId/fixtures', {
    gradeId: url.searchParams.get('gradeId'),
    round: url.searchParams.get('round'),
  });
}
