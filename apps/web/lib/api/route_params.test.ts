import { describe, expect, it } from 'vitest';
import { getRouteParam, getRouteParams } from './route_params';

describe('route param helpers', () => {
  it('reads params from synchronous context', async () => {
    const params = await getRouteParams({ params: { seasonId: 'season-1' } });

    expect(params).toEqual({ seasonId: 'season-1' });
    await expect(getRouteParam({ params: { seasonId: 'season-1' } }, 'seasonId')).resolves.toBe('season-1');
  });

  it('reads params from async context', async () => {
    const params = await getRouteParams({ params: Promise.resolve({ teamId: 'team-1' }) });

    expect(params).toEqual({ teamId: 'team-1' });
    await expect(getRouteParam({ params: Promise.resolve({ teamId: 'team-1' }) }, 'teamId')).resolves.toBe('team-1');
  });

  it('throws when a required route param is missing', async () => {
    await expect(getRouteParam({ params: { seasonId: 'season-1' } }, 'teamId')).rejects.toThrow(
      'Missing route param: teamId',
    );
  });
});
