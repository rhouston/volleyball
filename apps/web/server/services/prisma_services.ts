import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { buildFinalsBracket } from '@/lib/finals/bracket';
import { buildGenerationDiagnostics } from '@/lib/diagnostics/generation_report';
import { generateDutyDraft } from '@/lib/scheduling/duty_engine';
import { generateFixtureDraft } from '@/lib/scheduling/fixture_engine';
import { buildStandings, type MatchOutcome, type TeamResult } from '@/lib/standings/calculate_standings';
import type {
  AuditService,
  AuthService,
  CourtRecord,
  DutyRecord,
  DutyService,
  FinalsService,
  FixtureService,
  GradeRecord,
  InfrastructureService,
  ImportService,
  LadderRow,
  LadderService,
  MatchRecord,
  MembershipRecord,
  MessagingService,
  MessageRecord,
  NotificationService,
  ResultsService,
  SeasonRecord,
  SeasonService,
  ServiceRegistry,
  TeamRecord,
  TeamService,
  TimeslotRecord,
  ThreadRecord,
  VoteRecord,
  VotingService,
} from '@/lib/services/interfaces';
import type {
  ConfirmMembershipRequest,
  CreateCourtRequest,
  CreateGradeRequest,
  CreateInviteRequest,
  CreateMessageRequest,
  CreateTimeslotRequest,
  CreateSeasonRequest,
  CreateTeamRequest,
  CreateThreadRequest,
  SubmitResultRequest,
  SubmitVoteRequest,
  UpdateCourtRequest,
  UpdateGradeRequest,
  UpdateSeasonSettingsRequest,
  UpdateTimeslotRequest,
} from '@/lib/api/contracts';

function toDayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toIso(value: Date): string {
  return value.toISOString();
}

function toDateFromDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function resolveExcludedDates(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function toInputJson(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  if (!value) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function mapSeasonRecord(season: {
  id: string;
  organizationId: string;
  name: string;
  year: number;
  startDate: Date;
  endDate: Date;
  mixedNight: number;
  ladiesMensNight: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  settings:
    | {
        pointsWin: number;
        pointsDraw: number;
        pointsLoss: number;
        pointsForfeit: number;
        pointsBye: number;
        penaltyMissedDuty: number;
        tieBreakOrder: string;
        finalsFormat: string;
        excludedDatesJson: Prisma.JsonValue;
      }
    | null;
}): SeasonRecord {
  const settings = season.settings;

  return {
    id: season.id,
    organizationId: season.organizationId,
    name: season.name,
    year: season.year,
    startDate: toDayString(season.startDate),
    endDate: toDayString(season.endDate),
    mixedNight: season.mixedNight,
    ladiesMensNight: season.ladiesMensNight,
    status: season.status as SeasonRecord['status'],
    finalsFormat: (settings?.finalsFormat as SeasonRecord['finalsFormat'] | undefined) ?? 'simple_top4',
    excludedDates: resolveExcludedDates(settings?.excludedDatesJson),
    pointsWin: settings?.pointsWin ?? 3,
    pointsDraw: settings?.pointsDraw ?? 2,
    pointsLoss: settings?.pointsLoss ?? 1,
    pointsForfeit: settings?.pointsForfeit ?? 0,
    pointsBye: settings?.pointsBye ?? 3,
    penaltyMissedDuty: settings?.penaltyMissedDuty ?? -2,
    tieBreakOrder: settings?.tieBreakOrder ?? 'points,percentage,for,head_to_head,admin_decision',
    createdAt: toIso(season.createdAt),
    updatedAt: toIso(season.updatedAt),
  };
}

function mapGradeRecord(grade: {
  id: string;
  seasonId: string;
  name: string;
  category: string;
  rankOrder: number;
  isActive: boolean;
}): GradeRecord {
  return {
    id: grade.id,
    seasonId: grade.seasonId,
    name: grade.name,
    category: grade.category as GradeRecord['category'],
    rankOrder: grade.rankOrder,
    isActive: grade.isActive,
  };
}

function mapTeamRecord(team: {
  id: string;
  seasonId: string;
  gradeId: string;
  name: string;
  shortCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TeamRecord {
  return {
    id: team.id,
    seasonId: team.seasonId,
    gradeId: team.gradeId,
    name: team.name,
    shortCode: team.shortCode,
    createdAt: toIso(team.createdAt),
    updatedAt: toIso(team.updatedAt),
  };
}

function mapCourtRecord(court: { id: string; name: string; sortOrder: number }, seasonId: string): CourtRecord {
  return {
    id: court.id,
    seasonId,
    name: court.name,
    sortOrder: court.sortOrder,
  };
}

function mapTimeslotRecord(timeslot: { id: string; seasonId: string; label: string; startsAt: string; sortOrder: number }): TimeslotRecord {
  return {
    id: timeslot.id,
    seasonId: timeslot.seasonId,
    label: timeslot.label,
    startsAt: timeslot.startsAt,
    sortOrder: timeslot.sortOrder,
  };
}

function mapMatchRecord(match: {
  id: string;
  seasonId: string;
  gradeId: string;
  homeTeamId: string;
  awayTeamId: string;
  matchDate: Date;
  roundNumber: number;
  stageLabel: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  court: { name: string };
  timeslot: { startsAt: string };
}): MatchRecord {
  return {
    id: match.id,
    seasonId: match.seasonId,
    gradeId: match.gradeId,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    matchDate: toDayString(match.matchDate),
    roundNumber: match.roundNumber,
    court: match.court.name,
    timeslot: match.timeslot.startsAt,
    stageLabel: match.stageLabel,
    status: match.status as MatchRecord['status'],
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  };
}

function mapDutyRecord(duty: {
  id: string;
  seasonId: string;
  gradeId: string;
  matchId: string | null;
  dutyDate: Date;
  dutyType: string;
  assignments: Array<{ teamId: string }>;
  courtName: string | null;
  timeslotValue: string | null;
}): DutyRecord {
  return {
    id: duty.id,
    seasonId: duty.seasonId,
    gradeId: duty.gradeId,
    matchId: duty.matchId,
    dutyDate: toDayString(duty.dutyDate),
    dutyType: duty.dutyType as DutyRecord['dutyType'],
    court: duty.courtName,
    timeslot: duty.timeslotValue,
    teamId: duty.assignments[0]?.teamId ?? '',
  };
}

function matchOutcomes(match: MatchRecord): TeamResult[] {
  if (match.status === 'NO_GAME') {
    return [];
  }

  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;

  const resolveOutcome = (isHome: boolean): MatchOutcome => {
    if (match.status === 'FORFEIT') {
      if (homeScore === awayScore) {
        return 'forfeit';
      }

      if (isHome) {
        return homeScore > awayScore ? 'win' : 'forfeit';
      }

      return awayScore > homeScore ? 'win' : 'forfeit';
    }

    if (homeScore === awayScore) {
      return 'draw';
    }

    if (isHome) {
      return homeScore > awayScore ? 'win' : 'loss';
    }

    return awayScore > homeScore ? 'win' : 'loss';
  };

  return [
    {
      teamId: match.homeTeamId,
      outcome: resolveOutcome(true),
      pointsFor: homeScore,
      pointsAgainst: awayScore,
    },
    {
      teamId: match.awayTeamId,
      outcome: resolveOutcome(false),
      pointsFor: awayScore,
      pointsAgainst: homeScore,
    },
  ];
}

async function ensureOrganization(organizationId: string): Promise<void> {
  await prisma.organization.upsert({
    where: { id: organizationId },
    update: {},
    create: {
      id: organizationId,
      name: `Organization ${organizationId}`,
      slug: `org-${organizationId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    },
  });
}

async function resolveOrganizationId(preferred?: string): Promise<string> {
  if (preferred) {
    await ensureOrganization(preferred);
    return preferred;
  }

  const existing = await prisma.organization.findFirst({ select: { id: true } });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.organization.create({
    data: {
      name: 'Default Organization',
      slug: 'default-organization',
    },
    select: { id: true },
  });

  return created.id;
}

async function ensureUser(userId: string, organizationId?: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

  if (existing) {
    return;
  }

  const orgId = await resolveOrganizationId(organizationId);

  await prisma.user.create({
    data: {
      id: userId,
      organizationId: orgId,
      email: `${userId}@volleyball.local`,
      displayName: userId,
    },
  });
}

async function ensureSeasonDefaults(seasonId: string, organizationId: string): Promise<void> {
  const timeslotCount = await prisma.timeslot.count({ where: { seasonId } });

  if (timeslotCount === 0) {
    await prisma.timeslot.createMany({
      data: [
        { seasonId, label: 'Timeslot 1', startsAt: '18:30', sortOrder: 1 },
        { seasonId, label: 'Timeslot 2', startsAt: '19:15', sortOrder: 2 },
        { seasonId, label: 'Timeslot 3', startsAt: '20:00', sortOrder: 3 },
      ],
    });
  }

  const existingCourt = await prisma.court.findFirst({
    where: {
      venue: {
        organizationId,
      },
    },
    select: { id: true },
  });

  if (existingCourt) {
    return;
  }

  const venue = await prisma.venue.create({
    data: {
      organizationId,
      name: 'Main Stadium',
      courts: {
        create: [
          { name: 'Court 1', sortOrder: 1 },
          { name: 'Court 2', sortOrder: 2 },
          { name: 'Court 3', sortOrder: 3 },
        ],
      },
    },
    select: { id: true },
  });

  if (!venue.id) {
    throw new Error('Unable to create default venue');
  }
}

function buildSeasonDates(params: {
  startDate: string;
  endDate: string;
  dayOfWeek: number;
  excludedDates: string[];
}): string[] {
  const start = new Date(`${params.startDate}T00:00:00.000Z`);
  const end = new Date(`${params.endDate}T00:00:00.000Z`);
  const excluded = new Set(params.excludedDates);
  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor.getUTCDay() !== params.dayOfWeek && cursor.getTime() <= end.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  while (cursor.getTime() <= end.getTime()) {
    const key = toDayString(cursor);

    if (!excluded.has(key)) {
      dates.push(key);
    }

    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return dates;
}

class PrismaAuthService implements AuthService {
  async signIn(provider: string) {
    return {
      provider,
      message: `Sign-in flow for provider '${provider}' is wired for Auth.js integration.`,
    };
  }

  async signOut() {
    return { success: true as const };
  }
}

class PrismaSeasonService implements SeasonService {
  async createSeason(input: CreateSeasonRequest): Promise<SeasonRecord> {
    await ensureOrganization(input.organizationId);

    const season = await prisma.season.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        year: input.year,
        startDate: toDateFromDay(input.startDate),
        endDate: toDateFromDay(input.endDate),
        mixedNight: input.mixedNight,
        ladiesMensNight: input.ladiesMensNight,
        settings: {
          create: {
            pointsWin: 3,
            pointsDraw: 2,
            pointsLoss: 1,
            pointsForfeit: 0,
            pointsBye: 3,
            penaltyMissedDuty: -2,
            tieBreakOrder: 'points,percentage,for,head_to_head,admin_decision',
            finalsFormat: 'simple_top4',
            excludedDatesJson: [],
          },
        },
        grades: {
          create: [
            { name: 'Mixed A', category: 'MIXED', rankOrder: 1 },
            { name: 'Mixed B', category: 'MIXED', rankOrder: 2 },
            { name: 'Mixed C', category: 'MIXED', rankOrder: 3 },
            { name: 'Ladies', category: 'LADIES', rankOrder: 4 },
            { name: 'Mens', category: 'MENS', rankOrder: 5 },
          ],
        },
      },
      include: {
        settings: true,
      },
    });

    await ensureSeasonDefaults(season.id, season.organizationId);
    return mapSeasonRecord(season);
  }

  async updateSettings(seasonId: string, input: UpdateSeasonSettingsRequest): Promise<SeasonRecord | null> {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: { settings: true },
    });

    if (!season) {
      return null;
    }

    await prisma.seasonSettings.upsert({
      where: { seasonId },
      update: {
        pointsWin: input.pointsWin,
        pointsDraw: input.pointsDraw,
        pointsLoss: input.pointsLoss,
        pointsForfeit: input.pointsForfeit,
        pointsBye: input.pointsBye,
        penaltyMissedDuty: input.penaltyMissedDuty,
        tieBreakOrder: input.tieBreakOrder,
        finalsFormat: input.finalsFormat,
        excludedDatesJson: input.excludedDates,
      },
      create: {
        seasonId,
        pointsWin: input.pointsWin ?? 3,
        pointsDraw: input.pointsDraw ?? 2,
        pointsLoss: input.pointsLoss ?? 1,
        pointsForfeit: input.pointsForfeit ?? 0,
        pointsBye: input.pointsBye ?? 3,
        penaltyMissedDuty: input.penaltyMissedDuty ?? -2,
        tieBreakOrder: input.tieBreakOrder ?? 'points,percentage,for,head_to_head,admin_decision',
        finalsFormat: input.finalsFormat ?? 'simple_top4',
        excludedDatesJson: input.excludedDates ?? [],
      },
    });

    const updated = await prisma.season.findUnique({
      where: { id: seasonId },
      include: { settings: true },
    });

    return updated ? mapSeasonRecord(updated) : null;
  }

  async publish(seasonId: string): Promise<SeasonRecord | null> {
    try {
      const updated = await prisma.season.update({
        where: { id: seasonId },
        data: { status: 'PUBLISHED' },
        include: { settings: true },
      });

      return mapSeasonRecord(updated);
    } catch {
      return null;
    }
  }

  async getSeason(seasonId: string): Promise<SeasonRecord | null> {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: { settings: true },
    });

    return season ? mapSeasonRecord(season) : null;
  }

  async getGrades(seasonId: string): Promise<GradeRecord[]> {
    const grades = await prisma.grade.findMany({
      where: { seasonId, isActive: true },
      orderBy: { rankOrder: 'asc' },
    });

    return grades.map(mapGradeRecord);
  }
}

class PrismaTeamService implements TeamService {
  async createTeam(input: CreateTeamRequest): Promise<TeamRecord> {
    try {
      const team = await prisma.team.create({
        data: {
          seasonId: input.seasonId,
          gradeId: input.gradeId,
          name: input.name,
          shortCode: input.shortCode ?? null,
        },
      });

      return mapTeamRecord(team);
    } catch {
      throw new Error('A team with this name already exists in the selected grade');
    }
  }

  async getTeam(teamId: string): Promise<TeamRecord | null> {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    return team ? mapTeamRecord(team) : null;
  }

  async createInvite(teamId: string, input: CreateInviteRequest): Promise<MembershipRecord | null> {
    const team = await prisma.team.findUnique({ where: { id: teamId } });

    if (!team) {
      return null;
    }

    const player = await prisma.player.create({
      data: {
        displayName: input.inviteeEmail.split('@')[0] || input.inviteeEmail,
        email: input.inviteeEmail,
      },
    });

    const membership = await prisma.teamMembership.create({
      data: {
        teamId,
        playerId: player.id,
        role: 'PLAYER',
        status: 'PENDING',
      },
      include: {
        player: {
          select: { email: true },
        },
      },
    });

    return {
      id: membership.id,
      teamId: membership.teamId,
      status: membership.status as MembershipRecord['status'],
      inviteeEmail: membership.player.email ?? input.inviteeEmail,
    };
  }

  async confirmMembership(teamId: string, membershipId: string, input: ConfirmMembershipRequest): Promise<MembershipRecord | null> {
    const membership = await prisma.teamMembership.findUnique({
      where: { id: membershipId },
      include: { player: { select: { email: true } } },
    });

    if (!membership || membership.teamId !== teamId) {
      return null;
    }

    const updated = await prisma.teamMembership.update({
      where: { id: membershipId },
      data: { status: input.status },
      include: {
        player: {
          select: { email: true },
        },
      },
    });

    return {
      id: updated.id,
      teamId: updated.teamId,
      status: updated.status as MembershipRecord['status'],
      inviteeEmail: updated.player.email ?? '',
    };
  }

  async listTeamsByGrade(gradeId: string): Promise<TeamRecord[]> {
    const teams = await prisma.team.findMany({ where: { gradeId }, orderBy: { name: 'asc' } });
    return teams.map(mapTeamRecord);
  }
}

class PrismaInfrastructureService implements InfrastructureService {
  async listGrades(seasonId: string): Promise<GradeRecord[]> {
    const grades = await prisma.grade.findMany({
      where: { seasonId },
      orderBy: { rankOrder: 'asc' },
    });

    return grades.map(mapGradeRecord);
  }

  async createGrade(seasonId: string, input: CreateGradeRequest): Promise<GradeRecord> {
    const grade = await prisma.grade.create({
      data: {
        seasonId,
        name: input.name,
        category: input.category,
        rankOrder: input.rankOrder,
        isActive: input.isActive ?? true,
      },
    });

    return mapGradeRecord(grade);
  }

  async updateGrade(gradeId: string, input: UpdateGradeRequest): Promise<GradeRecord | null> {
    try {
      const grade = await prisma.grade.update({
        where: { id: gradeId },
        data: {
          name: input.name,
          category: input.category,
          rankOrder: input.rankOrder,
          isActive: input.isActive,
        },
      });

      return mapGradeRecord(grade);
    } catch {
      return null;
    }
  }

  async listCourts(seasonId: string): Promise<CourtRecord[]> {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { organizationId: true },
    });

    if (!season) {
      return [];
    }

    const courts = await prisma.court.findMany({
      where: {
        venue: {
          organizationId: season.organizationId,
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, sortOrder: true },
    });

    return courts.map((court) => mapCourtRecord(court, seasonId));
  }

  async createCourt(seasonId: string, input: CreateCourtRequest): Promise<CourtRecord> {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { organizationId: true },
    });

    if (!season) {
      throw new Error('Season not found');
    }

    const venue =
      (await prisma.venue.findFirst({
        where: { organizationId: season.organizationId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })) ??
      (await prisma.venue.create({
        data: {
          organizationId: season.organizationId,
          name: 'Main Stadium',
        },
        select: { id: true },
      }));

    const court = await prisma.court.create({
      data: {
        venueId: venue.id,
        name: input.name,
        sortOrder: input.sortOrder,
      },
      select: { id: true, name: true, sortOrder: true },
    });

    return mapCourtRecord(court, seasonId);
  }

  async updateCourt(courtId: string, input: UpdateCourtRequest): Promise<CourtRecord | null> {
    try {
      const court = await prisma.court.update({
        where: { id: courtId },
        data: {
          name: input.name,
          sortOrder: input.sortOrder,
        },
        include: {
          venue: {
            select: {
              organizationId: true,
            },
          },
        },
      });

      const season = await prisma.season.findFirst({
        where: { organizationId: court.venue.organizationId },
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
        select: { id: true },
      });

      return mapCourtRecord(
        {
          id: court.id,
          name: court.name,
          sortOrder: court.sortOrder,
        },
        season?.id ?? '',
      );
    } catch {
      return null;
    }
  }

  async listTimeslots(seasonId: string): Promise<TimeslotRecord[]> {
    const timeslots = await prisma.timeslot.findMany({
      where: { seasonId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, seasonId: true, label: true, startsAt: true, sortOrder: true },
    });

    return timeslots.map(mapTimeslotRecord);
  }

  async createTimeslot(seasonId: string, input: CreateTimeslotRequest): Promise<TimeslotRecord> {
    const timeslot = await prisma.timeslot.create({
      data: {
        seasonId,
        label: input.label,
        startsAt: input.startsAt,
        sortOrder: input.sortOrder,
      },
      select: { id: true, seasonId: true, label: true, startsAt: true, sortOrder: true },
    });

    return mapTimeslotRecord(timeslot);
  }

  async updateTimeslot(timeslotId: string, input: UpdateTimeslotRequest): Promise<TimeslotRecord | null> {
    try {
      const timeslot = await prisma.timeslot.update({
        where: { id: timeslotId },
        data: {
          label: input.label,
          startsAt: input.startsAt,
          sortOrder: input.sortOrder,
        },
        select: { id: true, seasonId: true, label: true, startsAt: true, sortOrder: true },
      });

      return mapTimeslotRecord(timeslot);
    } catch {
      return null;
    }
  }

  async getGenerationDiagnostics(seasonId: string) {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: {
        id: true,
        mixedNight: true,
        ladiesMensNight: true,
      },
    });

    if (!season) {
      throw new Error('Season not found');
    }

    const [grades, teams, matches, duties, timeslots, lastRun] = await Promise.all([
      prisma.grade.findMany({
        where: { seasonId },
        select: { id: true, category: true },
      }),
      prisma.team.findMany({
        where: { seasonId },
        select: { id: true, name: true, gradeId: true },
      }),
      prisma.match.findMany({
        where: { seasonId },
        include: {
          court: { select: { name: true } },
          timeslot: { select: { startsAt: true } },
        },
      }),
      prisma.duty.findMany({
        where: { seasonId },
        include: { assignments: { select: { teamId: true }, take: 1 } },
      }),
      prisma.timeslot.findMany({
        where: { seasonId },
        orderBy: { sortOrder: 'asc' },
        select: { startsAt: true },
      }),
      prisma.fixtureGenerationRun.findFirst({
        where: { seasonId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true },
      }),
    ]);

    return buildGenerationDiagnostics({
      mixedNight: season.mixedNight,
      ladiesMensNight: season.ladiesMensNight,
      grades: grades.map((grade) => ({
        id: grade.id,
        category: grade.category,
      })),
      teams,
      fixtures: matches.map((match) => ({
        id: match.id,
        gradeId: match.gradeId,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        matchDate: toDayString(match.matchDate),
        court: match.court.name,
        timeslot: match.timeslot.startsAt,
      })),
      duties: duties.map((duty) => ({ teamId: duty.assignments[0]?.teamId ?? '' })),
      timeslots: timeslots.map((timeslot) => timeslot.startsAt),
      lastRunAt: lastRun ? toIso(lastRun.createdAt) : null,
      lastRunId: lastRun?.id ?? null,
    });
  }
}

class PrismaFixtureService implements FixtureService {
  async generateFixtures(seasonId: string): Promise<MatchRecord[]> {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        settings: true,
        grades: {
          where: { isActive: true },
          orderBy: { rankOrder: 'asc' },
          include: {
            teams: {
              where: { isActive: true },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    });

    if (!season) {
      throw new Error('Season not found');
    }

    await ensureSeasonDefaults(season.id, season.organizationId);

    await prisma.match.deleteMany({ where: { seasonId, stageLabel: 'REGULAR' } });

    const courts = await prisma.court.findMany({
      where: { venue: { organizationId: season.organizationId } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const timeslots = await prisma.timeslot.findMany({
      where: { seasonId },
      orderBy: { sortOrder: 'asc' },
    });

    const courtByName = new Map(courts.map((court) => [court.name, court]));
    const timeslotByStart = new Map(timeslots.map((timeslot) => [timeslot.startsAt, timeslot]));
    const excludedDates = resolveExcludedDates(season.settings?.excludedDatesJson);

    for (const grade of season.grades) {
      if (grade.teams.length < 2) {
        continue;
      }

      const dayOfWeek = grade.category === 'MIXED' ? season.mixedNight : season.ladiesMensNight;
      const dates = buildSeasonDates({
        startDate: toDayString(season.startDate),
        endDate: toDayString(season.endDate),
        dayOfWeek,
        excludedDates,
      });

      const drafts = generateFixtureDraft({
        seasonId,
        gradeId: grade.id,
        teams: grade.teams.map((team) => ({
          id: team.id,
          seasonId: team.seasonId,
          gradeId: team.gradeId,
          name: team.name,
          shortCode: team.shortCode,
          createdAt: toIso(team.createdAt),
          updatedAt: toIso(team.updatedAt),
        })),
        dates,
        courts: courts.map((court) => court.name),
        timeslots: timeslots.map((timeslot) => timeslot.startsAt),
      });

      for (const draft of drafts) {
        const court = courtByName.get(draft.court);
        const timeslot = timeslotByStart.get(draft.timeslot);

        if (!court || !timeslot) {
          continue;
        }

        await prisma.match.create({
          data: {
            seasonId,
            gradeId: grade.id,
            homeTeamId: draft.homeTeamId,
            awayTeamId: draft.awayTeamId,
            courtId: court.id,
            timeslotId: timeslot.id,
            matchDate: toDateFromDay(draft.matchDate),
            roundNumber: draft.roundNumber,
            stageLabel: draft.stageLabel,
            status: 'SCHEDULED',
          },
        });
      }
    }

    await prisma.fixtureGenerationRun.create({
      data: {
        seasonId,
        runType: 'fixtures',
        inputSnapshot: {
          gradeCount: season.grades.length,
          courtCount: courts.length,
          timeslotCount: timeslots.length,
        },
      },
    });

    return this.listFixtures(seasonId);
  }

  async listFixtures(seasonId: string, filters?: { gradeId?: string; round?: number }): Promise<MatchRecord[]> {
    const matches = await prisma.match.findMany({
      where: {
        seasonId,
        gradeId: filters?.gradeId,
        roundNumber: filters?.round,
      },
      include: {
        court: { select: { name: true } },
        timeslot: { select: { startsAt: true } },
      },
      orderBy: [{ matchDate: 'asc' }, { timeslot: { sortOrder: 'asc' } }],
    });

    return matches.map(mapMatchRecord);
  }

  async getMatch(matchId: string): Promise<MatchRecord | null> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        court: { select: { name: true } },
        timeslot: { select: { startsAt: true } },
      },
    });

    return match ? mapMatchRecord(match) : null;
  }
}

class PrismaDutyService implements DutyService {
  async generateDuties(seasonId: string): Promise<DutyRecord[]> {
    await prisma.duty.deleteMany({ where: { seasonId } });

    const [grades, teams, matches, season] = await Promise.all([
      prisma.grade.findMany({ where: { seasonId }, orderBy: { rankOrder: 'asc' } }),
      prisma.team.findMany({ where: { seasonId, isActive: true } }),
      prisma.match.findMany({
        where: { seasonId, stageLabel: 'REGULAR' },
        include: {
          court: { select: { name: true } },
          timeslot: { select: { startsAt: true } },
        },
      }),
      prisma.season.findUnique({ where: { id: seasonId }, select: { organizationId: true } }),
    ]);

    if (!season) {
      return [];
    }

    const draft = generateDutyDraft({
      seasonId,
      grades: grades.map(mapGradeRecord),
      teams: teams.map(mapTeamRecord),
      matches: matches.map(mapMatchRecord),
    });

    const courts = await prisma.court.findMany({
      where: {
        venue: {
          organizationId: season.organizationId,
        },
      },
      select: { id: true, name: true },
    });

    const timeslots = await prisma.timeslot.findMany({
      where: { seasonId },
      select: { id: true, startsAt: true },
    });

    const courtByName = new Map(courts.map((court) => [court.name, court.id]));
    const timeslotByStart = new Map(timeslots.map((timeslot) => [timeslot.startsAt, timeslot.id]));

    for (const item of draft) {
      const duty = await prisma.duty.create({
        data: {
          seasonId,
          gradeId: item.gradeId,
          matchId: item.matchId,
          dutyDate: toDateFromDay(item.dutyDate),
          dutyType: item.dutyType,
          courtId: item.court ? (courtByName.get(item.court) ?? null) : null,
          timeslotId: item.timeslot ? (timeslotByStart.get(item.timeslot) ?? null) : null,
          assignments: {
            create: {
              teamId: item.teamId,
            },
          },
        },
      });

      if (!duty.id) {
        throw new Error('Failed to create duty');
      }
    }

    await prisma.fixtureGenerationRun.create({
      data: {
        seasonId,
        runType: 'duties',
        inputSnapshot: {
          gradeCount: grades.length,
          teamCount: teams.length,
          fixtureCount: matches.length,
        },
      },
    });

    return this.listDuties(seasonId);
  }

  async listDuties(seasonId: string): Promise<DutyRecord[]> {
    const duties = await prisma.duty.findMany({
      where: { seasonId },
      include: {
        assignments: { select: { teamId: true }, take: 1 },
      },
      orderBy: [{ dutyDate: 'asc' }, { createdAt: 'asc' }],
    });

    const courtIds = [...new Set(duties.map((duty) => duty.courtId).filter((courtId): courtId is string => Boolean(courtId)))];
    const timeslotIds = [
      ...new Set(duties.map((duty) => duty.timeslotId).filter((timeslotId): timeslotId is string => Boolean(timeslotId))),
    ];

    const [courts, timeslots] = await Promise.all([
      courtIds.length > 0
        ? prisma.court.findMany({ where: { id: { in: courtIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      timeslotIds.length > 0
        ? prisma.timeslot.findMany({ where: { id: { in: timeslotIds } }, select: { id: true, startsAt: true } })
        : Promise.resolve([]),
    ]);

    const courtNameById = new Map(courts.map((court) => [court.id, court.name]));
    const timeslotValueById = new Map(timeslots.map((timeslot) => [timeslot.id, timeslot.startsAt]));

    return duties.map((duty) =>
      mapDutyRecord({
        ...duty,
        dutyType: duty.dutyType,
        courtName: duty.courtId ? (courtNameById.get(duty.courtId) ?? null) : null,
        timeslotValue: duty.timeslotId ? (timeslotValueById.get(duty.timeslotId) ?? null) : null,
      }),
    );
  }
}

class PrismaResultsService implements ResultsService {
  async submitResult(matchId: string, input: SubmitResultRequest): Promise<MatchRecord | null> {
    try {
      const updated = await prisma.match.update({
        where: { id: matchId },
        data: {
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          status: input.status ?? 'COMPLETED',
        },
        include: {
          court: { select: { name: true } },
          timeslot: { select: { startsAt: true } },
        },
      });

      return mapMatchRecord(updated);
    } catch {
      return null;
    }
  }
}

class PrismaVotingService implements VotingService {
  async submitVote(actorUserId: string, matchId: string, input: SubmitVoteRequest): Promise<VoteRecord> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        season: {
          select: { organizationId: true },
        },
      },
    });

    if (!match) {
      throw new Error('Match not found');
    }

    await ensureUser(actorUserId, match.season.organizationId);

    const player =
      (await prisma.player.findFirst({ where: { displayName: input.selectedPlayerName } })) ??
      (await prisma.player.create({
        data: {
          displayName: input.selectedPlayerName,
        },
      }));

    try {
      const vote = await prisma.voteBestFairest.create({
        data: {
          matchId,
          votingUserId: actorUserId,
          selectedTeamId: input.selectedTeamId,
          selectedPlayerId: player.id,
        },
      });

      return {
        id: vote.id,
        matchId: vote.matchId,
        votingUserId: vote.votingUserId,
        selectedTeamId: vote.selectedTeamId,
        selectedPlayerName: input.selectedPlayerName,
        createdAt: toIso(vote.createdAt),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('Duplicate vote detected for this match and team');
      }

      throw error;
    }
  }
}

class PrismaLadderService implements LadderService {
  async getLadders(seasonId: string): Promise<Record<string, LadderRow[]>> {
    const [grades, matches] = await Promise.all([
      prisma.grade.findMany({ where: { seasonId, isActive: true }, orderBy: { rankOrder: 'asc' } }),
      prisma.match.findMany({
        where: {
          seasonId,
          status: {
            in: ['COMPLETED', 'FORFEIT', 'NO_GAME'],
          },
        },
        include: {
          court: { select: { name: true } },
          timeslot: { select: { startsAt: true } },
        },
      }),
    ]);

    const ladders: Record<string, LadderRow[]> = {};

    for (const grade of grades) {
      const gradeMatches = matches.filter((match) => match.gradeId === grade.id).map(mapMatchRecord);
      const outcomes = gradeMatches.flatMap((match) => matchOutcomes(match));
      ladders[grade.id] = buildStandings(outcomes);
    }

    return ladders;
  }
}

class PrismaFinalsService implements FinalsService {
  private ladderService = new PrismaLadderService();

  async generateFinals(seasonId: string): Promise<MatchRecord[]> {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        settings: true,
        grades: {
          where: { isActive: true },
          orderBy: { rankOrder: 'asc' },
        },
      },
    });

    if (!season) {
      throw new Error('Season not found');
    }

    await ensureSeasonDefaults(seasonId, season.organizationId);

    await prisma.match.deleteMany({ where: { seasonId, NOT: { stageLabel: 'REGULAR' } } });

    const ladders = await this.ladderService.getLadders(seasonId);
    const courts = await prisma.court.findMany({
      where: {
        venue: {
          organizationId: season.organizationId,
        },
      },
      select: { id: true, name: true },
    });
    const timeslots = await prisma.timeslot.findMany({
      where: { seasonId },
      select: { id: true, startsAt: true },
      orderBy: { sortOrder: 'asc' },
    });

    const courtByName = new Map(courts.map((court) => [court.name, court.id]));
    const defaultTimeslot = timeslots[0]?.id ?? null;
    const timeslotByStart = new Map(timeslots.map((timeslot) => [timeslot.startsAt, timeslot.id]));

    for (const grade of season.grades) {
      const drafts = buildFinalsBracket({
        seasonId,
        gradeId: grade.id,
        ladders: ladders[grade.id] ?? [],
        finalsFormat: (season.settings?.finalsFormat as SeasonRecord['finalsFormat'] | undefined) ?? 'simple_top4',
        startDate: toDayString(season.endDate),
      });

      for (const draft of drafts) {
        const courtId = courtByName.get(draft.court) ?? courts[0]?.id;
        const timeslotId = timeslotByStart.get(draft.timeslot) ?? defaultTimeslot;

        if (!courtId || !timeslotId) {
          continue;
        }

        await prisma.match.create({
          data: {
            seasonId,
            gradeId: grade.id,
            homeTeamId: draft.homeTeamId,
            awayTeamId: draft.awayTeamId,
            courtId,
            timeslotId,
            matchDate: toDateFromDay(draft.matchDate),
            roundNumber: draft.roundNumber,
            stageLabel: draft.stageLabel,
            status: 'SCHEDULED',
          },
        });
      }
    }

    return prismaFixtureService.listFixtures(seasonId);
  }
}

class PrismaNotificationService implements NotificationService {
  async listForUser(userId: string): Promise<Array<{ id: string; message: string; createdAt: string }>> {
    const notifications = await prisma.notification.findMany({
      where: { recipientUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((item) => ({
      id: item.id,
      message:
        typeof item.payload === 'object' && item.payload !== null && 'message' in item.payload
          ? String((item.payload as { message: unknown }).message)
          : item.templateKey,
      createdAt: toIso(item.createdAt),
    }));
  }

  async enqueue(userId: string, message: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, organizationId: true } });

    if (!user) {
      await ensureUser(userId);
    }

    await prisma.notification.create({
      data: {
        recipientUserId: userId,
        channel: 'EMAIL',
        templateKey: 'general_notice',
        payload: { message },
        status: 'QUEUED',
      },
    });
  }
}

class PrismaMessagingService implements MessagingService {
  async createThread(actorUserId: string, input: CreateThreadRequest): Promise<ThreadRecord> {
    const season = await prisma.season.findUnique({
      where: { id: input.seasonId },
      select: { organizationId: true },
    });

    await ensureUser(actorUserId, season?.organizationId);

    const thread = await prisma.messageThread.create({
      data: {
        seasonId: input.seasonId,
        gradeId: input.gradeId ?? null,
        teamId: input.teamId ?? null,
        title: input.title,
        createdByUserId: actorUserId,
      },
    });

    return {
      id: thread.id,
      seasonId: thread.seasonId,
      gradeId: thread.gradeId,
      teamId: thread.teamId,
      title: thread.title,
      createdByUserId: thread.createdByUserId,
      createdAt: toIso(thread.createdAt),
    };
  }

  async createMessage(actorUserId: string, threadId: string, input: CreateMessageRequest): Promise<MessageRecord | null> {
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: { season: { select: { organizationId: true } } },
    });

    if (!thread) {
      return null;
    }

    await ensureUser(actorUserId, thread.season.organizationId);

    const message = await prisma.message.create({
      data: {
        threadId,
        authorUserId: actorUserId,
        body: input.body,
      },
    });

    return {
      id: message.id,
      threadId: message.threadId,
      authorUserId: message.authorUserId,
      body: message.body,
      createdAt: toIso(message.createdAt),
    };
  }

  async listMessages(threadId: string): Promise<MessageRecord[]> {
    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((message) => ({
      id: message.id,
      threadId: message.threadId,
      authorUserId: message.authorUserId,
      body: message.body,
      createdAt: toIso(message.createdAt),
    }));
  }
}

class PrismaImportService implements ImportService {
  async dryRunCsv(payload: { type: string; rows: unknown[] }): Promise<{ accepted: number; rejected: number; errors: string[] }> {
    if (!Array.isArray(payload.rows)) {
      return { accepted: 0, rejected: 1, errors: ['Rows payload must be an array'] };
    }

    return { accepted: payload.rows.length, rejected: 0, errors: [] };
  }

  async commitCsv(payload: { type: string; rows: unknown[] }): Promise<{ imported: number }> {
    return { imported: payload.rows.length };
  }
}

class PrismaAuditService implements AuditService {
  async log(input: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const existingUser = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true } });

    if (!existingUser) {
      await ensureUser(input.userId);
    }

    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: toInputJson(input.payload),
      },
    });
  }
}

const prismaFixtureService = new PrismaFixtureService();

export function createPrismaServices(): ServiceRegistry {
  return {
    authService: new PrismaAuthService(),
    seasonService: new PrismaSeasonService(),
    teamService: new PrismaTeamService(),
    infrastructureService: new PrismaInfrastructureService(),
    fixtureService: prismaFixtureService,
    dutyService: new PrismaDutyService(),
    resultsService: new PrismaResultsService(),
    votingService: new PrismaVotingService(),
    ladderService: new PrismaLadderService(),
    finalsService: new PrismaFinalsService(),
    notificationService: new PrismaNotificationService(),
    messagingService: new PrismaMessagingService(),
    importService: new PrismaImportService(),
    auditService: new PrismaAuditService(),
  };
}
