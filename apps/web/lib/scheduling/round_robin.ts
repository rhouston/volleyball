export type Pairing = {
  homeTeamId: string;
  awayTeamId: string;
};

export function createRoundRobinPairs(teamIds: string[]): Pairing[] {
  const unique = [...new Set(teamIds)].filter(Boolean);

  if (unique.length < 2) {
    return [];
  }

  const pairs: Pairing[] = [];

  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      pairs.push({ homeTeamId: unique[i], awayTeamId: unique[j] });
    }
  }

  return pairs;
}
