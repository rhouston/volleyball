import { describe, expect, it } from 'vitest';
import { buildStandings } from './calculate_standings';

describe('buildStandings', () => {
  it('calculates points from outcomes and penalties', () => {
    const table = buildStandings([
      { teamId: 'A', outcome: 'win', pointsFor: 50, pointsAgainst: 42 },
      { teamId: 'A', outcome: 'loss', pointsFor: 39, pointsAgainst: 50, missedDuty: true },
      { teamId: 'B', outcome: 'draw', pointsFor: 45, pointsAgainst: 45 },
      { teamId: 'B', outcome: 'bye', pointsFor: 0, pointsAgainst: 0 },
      { teamId: 'C', outcome: 'forfeit', pointsFor: 0, pointsAgainst: 25 },
    ]);

    expect(table).toEqual([
      { teamId: 'B', played: 2, points: 5, pointsFor: 45, pointsAgainst: 45 },
      { teamId: 'A', played: 2, points: 2, pointsFor: 89, pointsAgainst: 92 },
      { teamId: 'C', played: 1, points: 0, pointsFor: 0, pointsAgainst: 25 },
    ]);
  });

  it('sorts by points then differential then team name', () => {
    const table = buildStandings([
      { teamId: 'B', outcome: 'win', pointsFor: 20, pointsAgainst: 10 },
      { teamId: 'A', outcome: 'win', pointsFor: 22, pointsAgainst: 11 },
      { teamId: 'C', outcome: 'win', pointsFor: 25, pointsAgainst: 13 },
    ]);

    expect(table.map((row) => row.teamId)).toEqual(['C', 'A', 'B']);
  });
});
