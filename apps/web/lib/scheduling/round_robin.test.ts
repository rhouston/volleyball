import { describe, expect, it } from 'vitest';
import { createRoundRobinPairs } from './round_robin';

describe('createRoundRobinPairs', () => {
  it('creates unique pairings for all teams', () => {
    const pairs = createRoundRobinPairs(['A', 'B', 'C']);

    expect(pairs).toEqual([
      { homeTeamId: 'A', awayTeamId: 'B' },
      { homeTeamId: 'A', awayTeamId: 'C' },
      { homeTeamId: 'B', awayTeamId: 'C' },
    ]);
  });

  it('removes duplicates and ignores empty values', () => {
    const pairs = createRoundRobinPairs(['A', '', 'A', 'B']);

    expect(pairs).toEqual([{ homeTeamId: 'A', awayTeamId: 'B' }]);
  });

  it('returns empty array when fewer than 2 teams exist', () => {
    expect(createRoundRobinPairs([])).toEqual([]);
    expect(createRoundRobinPairs(['A'])).toEqual([]);
  });
});
