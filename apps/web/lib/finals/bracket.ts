import type { LadderRow, MatchRecord } from '@/lib/services/interfaces';

export function buildFinalsBracket(params: {
  seasonId: string;
  gradeId: string;
  ladders: LadderRow[];
  finalsFormat: 'simple_top4' | 'major_minor';
  startDate: string;
}): Array<Omit<MatchRecord, 'id' | 'status' | 'homeScore' | 'awayScore'>> {
  const top4 = [...params.ladders].slice(0, 4);

  if (top4.length < 4) {
    return [];
  }

  const date = new Date(`${params.startDate}T00:00:00.000Z`);
  const nextDate = (offset: number): string => {
    const value = new Date(date);
    value.setUTCDate(value.getUTCDate() + offset);
    return value.toISOString().slice(0, 10);
  };

  if (params.finalsFormat === 'major_minor') {
    return [
      {
        seasonId: params.seasonId,
        gradeId: params.gradeId,
        homeTeamId: top4[0].teamId,
        awayTeamId: top4[1].teamId,
        roundNumber: 1,
        matchDate: nextDate(0),
        court: 'Court 1',
        timeslot: '18:30',
        stageLabel: 'MAJOR_SEMI',
      },
      {
        seasonId: params.seasonId,
        gradeId: params.gradeId,
        homeTeamId: top4[2].teamId,
        awayTeamId: top4[3].teamId,
        roundNumber: 1,
        matchDate: nextDate(0),
        court: 'Court 2',
        timeslot: '18:30',
        stageLabel: 'MINOR_SEMI',
      },
      {
        seasonId: params.seasonId,
        gradeId: params.gradeId,
        homeTeamId: top4[0].teamId,
        awayTeamId: top4[2].teamId,
        roundNumber: 2,
        matchDate: nextDate(7),
        court: 'Court 1',
        timeslot: '18:30',
        stageLabel: 'PRELIM_FINAL',
      },
      {
        seasonId: params.seasonId,
        gradeId: params.gradeId,
        homeTeamId: top4[0].teamId,
        awayTeamId: top4[1].teamId,
        roundNumber: 3,
        matchDate: nextDate(14),
        court: 'Court 1',
        timeslot: '18:30',
        stageLabel: 'GRAND_FINAL',
      },
    ];
  }

  return [
    {
      seasonId: params.seasonId,
      gradeId: params.gradeId,
      homeTeamId: top4[0].teamId,
      awayTeamId: top4[3].teamId,
      roundNumber: 1,
      matchDate: nextDate(0),
      court: 'Court 1',
      timeslot: '18:30',
      stageLabel: 'SEMI_FINAL_1',
    },
    {
      seasonId: params.seasonId,
      gradeId: params.gradeId,
      homeTeamId: top4[1].teamId,
      awayTeamId: top4[2].teamId,
      roundNumber: 1,
      matchDate: nextDate(0),
      court: 'Court 2',
      timeslot: '18:30',
      stageLabel: 'SEMI_FINAL_2',
    },
    {
      seasonId: params.seasonId,
      gradeId: params.gradeId,
      homeTeamId: top4[0].teamId,
      awayTeamId: top4[1].teamId,
      roundNumber: 2,
      matchDate: nextDate(7),
      court: 'Court 1',
      timeslot: '18:30',
      stageLabel: 'GRAND_FINAL',
    },
  ];
}
