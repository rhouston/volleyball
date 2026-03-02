import { describe, expect, it } from 'vitest';
import { buildGenerationDiagnostics } from './generation_report';

describe('buildGenerationDiagnostics', () => {
  it('detects court/timeslot collisions and night mismatches', () => {
    const report = buildGenerationDiagnostics({
      mixedNight: 3,
      ladiesMensNight: 5,
      grades: [
        { id: 'grade-mixed', category: 'MIXED' },
        { id: 'grade-ladies', category: 'LADIES' },
      ],
      teams: [
        { id: 'team-a', name: 'A', gradeId: 'grade-mixed' },
        { id: 'team-b', name: 'B', gradeId: 'grade-mixed' },
        { id: 'team-c', name: 'C', gradeId: 'grade-ladies' },
      ],
      fixtures: [
        {
          id: 'match-1',
          gradeId: 'grade-mixed',
          homeTeamId: 'team-a',
          awayTeamId: 'team-b',
          matchDate: '2026-05-06',
          court: 'Court 1',
          timeslot: '18:30',
        },
        {
          id: 'match-2',
          gradeId: 'grade-mixed',
          homeTeamId: 'team-b',
          awayTeamId: 'team-a',
          matchDate: '2026-05-06',
          court: 'Court 1',
          timeslot: '18:30',
        },
        {
          id: 'match-3',
          gradeId: 'grade-ladies',
          homeTeamId: 'team-c',
          awayTeamId: 'team-c',
          matchDate: '2026-05-06',
          court: 'Court 2',
          timeslot: '19:15',
        },
      ],
      duties: [{ teamId: 'team-a' }, { teamId: 'team-a' }, { teamId: 'team-b' }],
      timeslots: ['18:30', '19:15'],
      lastRunAt: '2026-05-01T00:00:00.000Z',
      lastRunId: 'run-1',
    });

    expect(report.hardConflicts.count).toBeGreaterThanOrEqual(3);
    expect(report.hardConflicts.rows.some((row) => row.type === 'COURT_TIMESLOT_COLLISION')).toBe(true);
    expect(report.hardConflicts.rows.some((row) => row.type === 'INVALID_GRADE_NIGHT_ASSIGNMENT')).toBe(true);
  });

  it('calculates fairness distributions per team', () => {
    const report = buildGenerationDiagnostics({
      mixedNight: 3,
      ladiesMensNight: 5,
      grades: [{ id: 'grade-mixed', category: 'MIXED' }],
      teams: [
        { id: 'team-a', name: 'A Team', gradeId: 'grade-mixed' },
        { id: 'team-b', name: 'B Team', gradeId: 'grade-mixed' },
      ],
      fixtures: [
        {
          id: 'match-1',
          gradeId: 'grade-mixed',
          homeTeamId: 'team-a',
          awayTeamId: 'team-b',
          matchDate: '2026-06-03',
          court: 'Court 1',
          timeslot: '18:30',
        },
        {
          id: 'match-2',
          gradeId: 'grade-mixed',
          homeTeamId: 'team-a',
          awayTeamId: 'team-b',
          matchDate: '2026-06-10',
          court: 'Court 1',
          timeslot: '19:15',
        },
      ],
      duties: [{ teamId: 'team-a' }],
      timeslots: ['18:30', '19:15', '20:00'],
      lastRunAt: null,
      lastRunId: null,
    });

    const teamA = report.fairness.timeslotDistributionByTeam.find((row) => row.teamId === 'team-a');
    const dutyA = report.fairness.dutyDistributionByTeam.find((row) => row.teamId === 'team-a');
    const dutyB = report.fairness.dutyDistributionByTeam.find((row) => row.teamId === 'team-b');

    expect(teamA?.slots['18:30']).toBe(1);
    expect(teamA?.slots['19:15']).toBe(1);
    expect(teamA?.slots['20:00']).toBe(0);
    expect(dutyA?.duties).toBe(1);
    expect(dutyB?.duties).toBe(0);
  });
});
