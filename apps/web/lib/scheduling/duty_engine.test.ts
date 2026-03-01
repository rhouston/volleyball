import { describe, expect, it } from 'vitest';
import { generateDutyDraft } from './duty_engine';
import type { GradeRecord, MatchRecord, TeamRecord } from '@/lib/services/interfaces';

function makeGrade(input: Partial<GradeRecord> & Pick<GradeRecord, 'id' | 'name' | 'category'>): GradeRecord {
  return {
    seasonId: 'season-1',
    rankOrder: 1,
    isActive: true,
    ...input,
  };
}

function makeTeam(input: Partial<TeamRecord> & Pick<TeamRecord, 'id' | 'seasonId' | 'gradeId' | 'name'>): TeamRecord {
  return {
    shortCode: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...input,
  };
}

function makeMatch(input: Partial<MatchRecord> & Pick<MatchRecord, 'id' | 'seasonId' | 'gradeId' | 'homeTeamId' | 'awayTeamId'>): MatchRecord {
  return {
    matchDate: '2026-06-10',
    roundNumber: 1,
    court: 'Court 1',
    timeslot: '18:30',
    stageLabel: 'REGULAR',
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
    ...input,
  };
}

describe('generateDutyDraft', () => {
  it('returns no duties when there are no eligible duty teams', () => {
    const grade = makeGrade({ id: 'grade-a', name: 'Mixed A', category: 'MIXED' });
    const teams: TeamRecord[] = [
      makeTeam({ id: 'team-1', seasonId: 'season-1', gradeId: 'grade-a', name: 'One' }),
      makeTeam({ id: 'team-2', seasonId: 'season-1', gradeId: 'grade-a', name: 'Two' }),
    ];

    const matches: MatchRecord[] = [
      makeMatch({
        id: 'match-1',
        seasonId: 'season-1',
        gradeId: 'grade-a',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      }),
    ];

    const duties = generateDutyDraft({
      seasonId: 'season-1',
      grades: [grade],
      teams,
      matches,
    });

    expect(duties).toEqual([]);
  });

  it('skips matches for unknown grade ids', () => {
    const grade = makeGrade({ id: 'grade-a', name: 'Mixed A', category: 'MIXED' });
    const matches: MatchRecord[] = [
      makeMatch({
        id: 'match-1',
        seasonId: 'season-1',
        gradeId: 'grade-missing',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      }),
    ];

    const duties = generateDutyDraft({
      seasonId: 'season-1',
      grades: [grade],
      teams: [],
      matches,
    });

    expect(duties).toEqual([]);
  });

  it('ignores teams whose grade metadata is missing and assigns valid teams', () => {
    const grade = makeGrade({ id: 'grade-a', name: 'Mixed A', category: 'MIXED' });
    const teams: TeamRecord[] = [
      makeTeam({ id: 'team-1', seasonId: 'season-1', gradeId: 'grade-a', name: 'One' }),
      makeTeam({ id: 'team-2', seasonId: 'season-1', gradeId: 'grade-a', name: 'Two' }),
      makeTeam({ id: 'team-3', seasonId: 'season-1', gradeId: 'grade-a', name: 'Three' }),
      makeTeam({ id: 'team-x', seasonId: 'season-1', gradeId: 'grade-x', name: 'Missing Grade Team' }),
    ];

    const matches: MatchRecord[] = [
      makeMatch({
        id: 'match-1',
        seasonId: 'season-1',
        gradeId: 'grade-a',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
      }),
      makeMatch({
        id: 'match-2',
        seasonId: 'season-1',
        gradeId: 'grade-a',
        homeTeamId: 'team-2',
        awayTeamId: 'team-3',
        court: 'Court 1',
        timeslot: '19:15',
      }),
    ];

    const duties = generateDutyDraft({
      seasonId: 'season-1',
      grades: [grade],
      teams,
      matches,
    });

    expect(duties.some((duty) => duty.dutyType === 'UMPIRE')).toBe(true);
    expect(duties.some((duty) => duty.teamId === 'team-x')).toBe(false);
    expect(duties.some((duty) => duty.dutyType === 'SETUP')).toBe(true);
    expect(duties.some((duty) => duty.dutyType === 'PACKUP')).toBe(true);
  });
});
