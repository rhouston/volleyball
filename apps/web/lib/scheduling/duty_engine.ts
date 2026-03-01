import type { DutyRecord, GradeRecord, MatchRecord, TeamRecord } from '@/lib/services/interfaces';
import { isDutyCompatible } from './duty_rules';

export type DutyDraft = Omit<DutyRecord, 'id'>;

function pickTeam(teamIds: string[], dutyCounts: Map<string, number>): string | null {
  if (teamIds.length === 0) {
    return null;
  }

  return [...teamIds].sort((a, b) => {
    const aCount = dutyCounts.get(a) ?? 0;
    const bCount = dutyCounts.get(b) ?? 0;

    if (aCount !== bCount) {
      return aCount - bCount;
    }

    return a.localeCompare(b);
  })[0];
}

export function generateDutyDraft(params: {
  seasonId: string;
  grades: GradeRecord[];
  teams: TeamRecord[];
  matches: MatchRecord[];
}): DutyDraft[] {
  const drafts: DutyDraft[] = [];
  const dutyCounts = new Map<string, number>();
  const gradeById = new Map(params.grades.map((grade) => [grade.id, grade]));
  const teamsByGrade = new Map<string, TeamRecord[]>();

  for (const team of params.teams) {
    const bucket = teamsByGrade.get(team.gradeId) ?? [];
    bucket.push(team);
    teamsByGrade.set(team.gradeId, bucket);
  }

  const mixedGradeNames = params.grades
    .filter((grade) => grade.category === 'MIXED')
    .map((grade) => grade.name);

  const grouped = new Map<string, MatchRecord[]>();

  for (const match of params.matches) {
    const key = `${match.matchDate}:${match.gradeId}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(match);
    grouped.set(key, bucket);
  }

  for (const [, gradeMatches] of grouped.entries()) {
    const grade = gradeById.get(gradeMatches[0].gradeId);

    if (!grade) {
      continue;
    }

    const gradeTeams = teamsByGrade.get(grade.id) ?? [];

    for (const match of gradeMatches) {
      const playing = new Set([match.homeTeamId, match.awayTeamId]);
      const candidates = gradeTeams
        .filter((team) => !playing.has(team.id))
        .filter((team) => {
          const candidateGrade = gradeById.get(team.gradeId);

          if (!candidateGrade) {
            return false;
          }

          return isDutyCompatible({
            candidateGradeCategory: candidateGrade.category,
            matchGradeCategory: grade.category,
            mixedGradeNames,
            candidateGradeName: candidateGrade.name,
            matchGradeName: grade.name,
          });
        })
        .map((team) => team.id);

      const umpireTeamId = pickTeam(candidates, dutyCounts);

      if (umpireTeamId) {
        dutyCounts.set(umpireTeamId, (dutyCounts.get(umpireTeamId) ?? 0) + 1);
        drafts.push({
          seasonId: params.seasonId,
          gradeId: grade.id,
          matchId: match.id,
          dutyDate: match.matchDate,
          dutyType: 'UMPIRE',
          court: match.court,
          timeslot: match.timeslot,
          teamId: umpireTeamId,
        });
      }
    }

    const byCourt = new Map<string, MatchRecord[]>();

    for (const match of gradeMatches) {
      const courtMatches = byCourt.get(match.court) ?? [];
      courtMatches.push(match);
      byCourt.set(match.court, courtMatches);
    }

    for (const [court, courtMatches] of byCourt.entries()) {
      const sorted = [...courtMatches].sort((a, b) => a.timeslot.localeCompare(b.timeslot));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];

      const setupCandidates = gradeTeams
        .filter((team) => team.id !== first.homeTeamId && team.id !== first.awayTeamId)
        .map((team) => team.id);
      const packupCandidates = gradeTeams
        .filter((team) => team.id !== last.homeTeamId && team.id !== last.awayTeamId)
        .map((team) => team.id);

      const setupTeamId = pickTeam(setupCandidates, dutyCounts);
      const packupTeamId = pickTeam(packupCandidates, dutyCounts);

      if (setupTeamId) {
        dutyCounts.set(setupTeamId, (dutyCounts.get(setupTeamId) ?? 0) + 1);
        drafts.push({
          seasonId: params.seasonId,
          gradeId: grade.id,
          matchId: first.id,
          dutyDate: first.matchDate,
          dutyType: 'SETUP',
          court,
          timeslot: first.timeslot,
          teamId: setupTeamId,
        });
      }

      if (packupTeamId) {
        dutyCounts.set(packupTeamId, (dutyCounts.get(packupTeamId) ?? 0) + 1);
        drafts.push({
          seasonId: params.seasonId,
          gradeId: grade.id,
          matchId: last.id,
          dutyDate: last.matchDate,
          dutyType: 'PACKUP',
          court,
          timeslot: last.timeslot,
          teamId: packupTeamId,
        });
      }
    }
  }

  return drafts;
}
