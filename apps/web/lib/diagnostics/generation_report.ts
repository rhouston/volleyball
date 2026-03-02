export type DiagnosticsFixture = {
  id: string;
  gradeId: string;
  homeTeamId: string;
  awayTeamId: string;
  matchDate: string;
  court: string;
  timeslot: string;
};

export type DiagnosticsDuty = {
  teamId: string;
};

export type DiagnosticsTeam = {
  id: string;
  name: string;
  gradeId: string;
};

export type DiagnosticsGrade = {
  id: string;
  category: 'MIXED' | 'LADIES' | 'MENS';
};

export type GenerationReportInput = {
  mixedNight: number;
  ladiesMensNight: number;
  grades: DiagnosticsGrade[];
  teams: DiagnosticsTeam[];
  fixtures: DiagnosticsFixture[];
  duties: DiagnosticsDuty[];
  timeslots: string[];
  lastRunAt: string | null;
  lastRunId: string | null;
};

export type GenerationDiagnosticsResponse = {
  hardConflicts: {
    count: number;
    rows: Array<{
      type: 'COURT_TIMESLOT_COLLISION' | 'INVALID_GRADE_NIGHT_ASSIGNMENT';
      matchId: string;
      matchDate: string;
      court: string;
      timeslot: string;
      details: string;
    }>;
  };
  fairness: {
    timeslotDistributionByTeam: Array<{
      teamId: string;
      teamName: string;
      slots: Record<string, number>;
      maxSkew: number;
    }>;
    dutyDistributionByTeam: Array<{
      teamId: string;
      teamName: string;
      duties: number;
    }>;
  };
  generation: {
    lastRunAt: string | null;
    runId: string | null;
  };
};

function dayOfWeekFromDate(day: string): number {
  return new Date(`${day}T00:00:00.000Z`).getUTCDay();
}

function pushCollisionRows(fixtures: DiagnosticsFixture[]) {
  const keyMap = new Map<string, DiagnosticsFixture[]>();

  for (const fixture of fixtures) {
    const key = `${fixture.matchDate}|${fixture.court}|${fixture.timeslot}`;
    const existing = keyMap.get(key) ?? [];
    existing.push(fixture);
    keyMap.set(key, existing);
  }

  const rows: GenerationDiagnosticsResponse['hardConflicts']['rows'] = [];

  for (const group of keyMap.values()) {
    if (group.length < 2) {
      continue;
    }

    for (const fixture of group) {
      rows.push({
        type: 'COURT_TIMESLOT_COLLISION',
        matchId: fixture.id,
        matchDate: fixture.matchDate,
        court: fixture.court,
        timeslot: fixture.timeslot,
        details: `Collision with ${group.length - 1} other fixture(s)`,
      });
    }
  }

  return rows;
}

function pushNightMismatchRows(input: GenerationReportInput) {
  const gradeById = new Map(input.grades.map((grade) => [grade.id, grade]));
  const rows: GenerationDiagnosticsResponse['hardConflicts']['rows'] = [];

  for (const fixture of input.fixtures) {
    const grade = gradeById.get(fixture.gradeId);

    if (!grade) {
      continue;
    }

    const expectedNight = grade.category === 'MIXED' ? input.mixedNight : input.ladiesMensNight;
    const fixtureNight = dayOfWeekFromDate(fixture.matchDate);

    if (fixtureNight !== expectedNight) {
      rows.push({
        type: 'INVALID_GRADE_NIGHT_ASSIGNMENT',
        matchId: fixture.id,
        matchDate: fixture.matchDate,
        court: fixture.court,
        timeslot: fixture.timeslot,
        details: `Expected day ${expectedNight} for ${grade.category} but found ${fixtureNight}`,
      });
    }
  }

  return rows;
}

export function buildGenerationDiagnostics(input: GenerationReportInput): GenerationDiagnosticsResponse {
  const teamById = new Map(input.teams.map((team) => [team.id, team]));

  const collisionRows = pushCollisionRows(input.fixtures);
  const mismatchRows = pushNightMismatchRows(input);
  const hardRows = [...collisionRows, ...mismatchRows];

  const timeslotCountsByTeam = new Map<string, Map<string, number>>();
  for (const fixture of input.fixtures) {
    for (const teamId of [fixture.homeTeamId, fixture.awayTeamId]) {
      const slotCounts = timeslotCountsByTeam.get(teamId) ?? new Map<string, number>();
      slotCounts.set(fixture.timeslot, (slotCounts.get(fixture.timeslot) ?? 0) + 1);
      timeslotCountsByTeam.set(teamId, slotCounts);
    }
  }

  const dutyCountsByTeam = new Map<string, number>();
  for (const duty of input.duties) {
    dutyCountsByTeam.set(duty.teamId, (dutyCountsByTeam.get(duty.teamId) ?? 0) + 1);
  }

  const allTimeslots = [...new Set(input.timeslots)];
  const teamIds = [...new Set([...input.teams.map((team) => team.id), ...timeslotCountsByTeam.keys(), ...dutyCountsByTeam.keys()])];

  const timeslotDistributionByTeam = teamIds
    .map((teamId) => {
      const team = teamById.get(teamId);
      const counts = timeslotCountsByTeam.get(teamId) ?? new Map<string, number>();
      const slots: Record<string, number> = {};

      for (const slot of allTimeslots) {
        slots[slot] = counts.get(slot) ?? 0;
      }

      const values = allTimeslots.map((slot) => slots[slot] ?? 0);
      const maxSkew = values.length === 0 ? 0 : Math.max(...values) - Math.min(...values);

      return {
        teamId,
        teamName: team?.name ?? teamId,
        slots,
        maxSkew,
      };
    })
    .sort((a, b) => a.teamName.localeCompare(b.teamName));

  const dutyDistributionByTeam = teamIds
    .map((teamId) => {
      const team = teamById.get(teamId);
      return {
        teamId,
        teamName: team?.name ?? teamId,
        duties: dutyCountsByTeam.get(teamId) ?? 0,
      };
    })
    .sort((a, b) => a.teamName.localeCompare(b.teamName));

  return {
    hardConflicts: {
      count: hardRows.length,
      rows: hardRows,
    },
    fairness: {
      timeslotDistributionByTeam,
      dutyDistributionByTeam,
    },
    generation: {
      lastRunAt: input.lastRunAt,
      runId: input.lastRunId,
    },
  };
}
