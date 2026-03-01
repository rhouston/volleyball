import type { MatchRecord, TeamRecord } from '@/lib/services/interfaces';

type Pair = { homeTeamId: string; awayTeamId: string };

const BYE = '__BYE__';

function roundRobinRounds(teamIds: string[]): Pair[][] {
  const unique = [...new Set(teamIds)].filter(Boolean);

  if (unique.length < 2) {
    return [];
  }

  const teams = unique.length % 2 === 0 ? [...unique] : [...unique, BYE];
  const rounds: Pair[][] = [];
  const totalRounds = teams.length - 1;

  for (let round = 0; round < totalRounds; round += 1) {
    const pairs: Pair[] = [];
    const half = teams.length / 2;

    for (let i = 0; i < half; i += 1) {
      const home = teams[i];
      const away = teams[teams.length - 1 - i];
      pairs.push({ homeTeamId: home, awayTeamId: away });
    }

    rounds.push(pairs);

    const fixed = teams[0];
    const rest = teams.slice(1);
    rest.unshift(rest.pop() as string);
    teams.splice(0, teams.length, fixed, ...rest);
  }

  return rounds;
}

export type FixtureDraft = Omit<MatchRecord, 'id' | 'status' | 'homeScore' | 'awayScore'>;

export function generateFixtureDraft(params: {
  seasonId: string;
  gradeId: string;
  teams: TeamRecord[];
  dates: string[];
  courts: string[];
  timeslots: string[];
  stageLabel?: string;
}): FixtureDraft[] {
  const rounds = roundRobinRounds(params.teams.map((team) => team.id));

  if (rounds.length === 0 || params.dates.length === 0) {
    return [];
  }

  const drafts: FixtureDraft[] = [];

  for (let roundIndex = 0; roundIndex < params.dates.length; roundIndex += 1) {
    const date = params.dates[roundIndex];
    const pairs = rounds[roundIndex % rounds.length].filter(
      (pair) => pair.homeTeamId !== BYE && pair.awayTeamId !== BYE,
    );

    for (let matchIndex = 0; matchIndex < pairs.length; matchIndex += 1) {
      const pair = pairs[matchIndex];
      const slotIndex = (roundIndex + matchIndex) % params.timeslots.length;
      const courtIndex = matchIndex % params.courts.length;

      drafts.push({
        seasonId: params.seasonId,
        gradeId: params.gradeId,
        homeTeamId: pair.homeTeamId,
        awayTeamId: pair.awayTeamId,
        roundNumber: roundIndex + 1,
        matchDate: date,
        court: params.courts[courtIndex],
        timeslot: params.timeslots[slotIndex],
        stageLabel: params.stageLabel ?? 'REGULAR',
      });
    }
  }

  return drafts;
}
