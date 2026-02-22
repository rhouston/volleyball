export type MatchOutcome = 'win' | 'draw' | 'loss' | 'forfeit' | 'bye';

export type TeamResult = {
  teamId: string;
  outcome: MatchOutcome;
  pointsFor: number;
  pointsAgainst: number;
  missedDuty?: boolean;
};

export type TeamStanding = {
  teamId: string;
  played: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
};

function outcomePoints(outcome: MatchOutcome): number {
  switch (outcome) {
    case 'win':
      return 3;
    case 'draw':
      return 2;
    case 'loss':
      return 1;
    case 'bye':
      return 3;
    case 'forfeit':
      return 0;
    default:
      return 0;
  }
}

export function buildStandings(results: TeamResult[]): TeamStanding[] {
  const table = new Map<string, TeamStanding>();

  for (const result of results) {
    const existing =
      table.get(result.teamId) ??
      ({
        teamId: result.teamId,
        played: 0,
        points: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      } as TeamStanding);

    existing.played += 1;
    existing.points += outcomePoints(result.outcome);
    existing.pointsFor += result.pointsFor;
    existing.pointsAgainst += result.pointsAgainst;

    if (result.missedDuty) {
      existing.points -= 2;
    }

    table.set(result.teamId, existing);
  }

  return [...table.values()].sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }

    const bDiff = b.pointsFor - b.pointsAgainst;
    const aDiff = a.pointsFor - a.pointsAgainst;

    if (bDiff !== aDiff) {
      return bDiff - aDiff;
    }

    return a.teamId.localeCompare(b.teamId);
  });
}
