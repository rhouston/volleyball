import { buildFinalsBracket } from '@/lib/finals/bracket';
import { generateDutyDraft } from '@/lib/scheduling/duty_engine';
import { generateFixtureDraft } from '@/lib/scheduling/fixture_engine';
import { buildStandings, type MatchOutcome, type TeamResult } from '@/lib/standings/calculate_standings';
import type {
  AuditService,
  AuthService,
  DutyRecord,
  DutyService,
  FinalsService,
  FixtureService,
  GradeRecord,
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
  TeamRecord,
  TeamService,
  ThreadRecord,
  VoteRecord,
  VotingService,
} from '@/lib/services/interfaces';
import type {
  ConfirmMembershipRequest,
  CreateInviteRequest,
  CreateMessageRequest,
  CreateSeasonRequest,
  CreateTeamRequest,
  CreateThreadRequest,
  SubmitResultRequest,
  SubmitVoteRequest,
  UpdateSeasonSettingsRequest,
} from '@/lib/api/contracts';

function nowIso(): string {
  return new Date().toISOString();
}

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

type Store = {
  seasons: Map<string, SeasonRecord>;
  grades: Map<string, GradeRecord>;
  teams: Map<string, TeamRecord>;
  memberships: Map<string, MembershipRecord>;
  matches: Map<string, MatchRecord>;
  duties: Map<string, DutyRecord>;
  votes: Map<string, VoteRecord>;
  threads: Map<string, ThreadRecord>;
  messages: Map<string, MessageRecord>;
  notifications: Array<{ id: string; userId: string; message: string; createdAt: string }>;
  auditLogs: Array<{
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
    createdAt: string;
  }>;
};

const globalStore = globalThis as unknown as { volleyballStore?: Store };

function getStore(): Store {
  if (!globalStore.volleyballStore) {
    globalStore.volleyballStore = {
      seasons: new Map(),
      grades: new Map(),
      teams: new Map(),
      memberships: new Map(),
      matches: new Map(),
      duties: new Map(),
      votes: new Map(),
      threads: new Map(),
      messages: new Map(),
      notifications: [],
      auditLogs: [],
    };
  }

  return globalStore.volleyballStore;
}

function createDefaultGrades(seasonId: string): GradeRecord[] {
  const defaults: Array<{ name: string; category: GradeRecord['category']; rank: number }> = [
    { name: 'Mixed A', category: 'MIXED', rank: 1 },
    { name: 'Mixed B', category: 'MIXED', rank: 2 },
    { name: 'Mixed C', category: 'MIXED', rank: 3 },
    { name: 'Ladies', category: 'LADIES', rank: 4 },
    { name: 'Mens', category: 'MENS', rank: 5 },
  ];

  return defaults.map((entry) => ({
    id: genId('grade'),
    seasonId,
    name: entry.name,
    category: entry.category,
    rankOrder: entry.rank,
    isActive: true,
  }));
}

function dateInRange(day: Date, start: Date, end: Date): boolean {
  return day.getTime() >= start.getTime() && day.getTime() <= end.getTime();
}

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
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
  const result: string[] = [];

  const cursor = new Date(start);
  while (cursor.getUTCDay() !== params.dayOfWeek && dateInRange(cursor, start, end)) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  while (dateInRange(cursor, start, end)) {
    const key = toDateKey(cursor);

    if (!excluded.has(key)) {
      result.push(key);
    }

    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return result;
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

class InMemoryAuthService implements AuthService {
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

class InMemorySeasonService implements SeasonService {
  private store = getStore();

  async createSeason(input: CreateSeasonRequest): Promise<SeasonRecord> {
    const season: SeasonRecord = {
      id: genId('season'),
      organizationId: input.organizationId,
      name: input.name,
      year: input.year,
      startDate: input.startDate,
      endDate: input.endDate,
      mixedNight: input.mixedNight,
      ladiesMensNight: input.ladiesMensNight,
      status: 'DRAFT',
      finalsFormat: 'simple_top4',
      excludedDates: [],
      pointsWin: 3,
      pointsDraw: 2,
      pointsLoss: 1,
      pointsForfeit: 0,
      pointsBye: 3,
      penaltyMissedDuty: -2,
      tieBreakOrder: 'points,percentage,for,head_to_head,admin_decision',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    this.store.seasons.set(season.id, season);

    for (const grade of createDefaultGrades(season.id)) {
      this.store.grades.set(grade.id, grade);
    }

    return season;
  }

  async updateSettings(seasonId: string, input: UpdateSeasonSettingsRequest): Promise<SeasonRecord | null> {
    const season = this.store.seasons.get(seasonId);

    if (!season) {
      return null;
    }

    const updated: SeasonRecord = {
      ...season,
      pointsWin: input.pointsWin ?? season.pointsWin,
      pointsDraw: input.pointsDraw ?? season.pointsDraw,
      pointsLoss: input.pointsLoss ?? season.pointsLoss,
      pointsForfeit: input.pointsForfeit ?? season.pointsForfeit,
      pointsBye: input.pointsBye ?? season.pointsBye,
      penaltyMissedDuty: input.penaltyMissedDuty ?? season.penaltyMissedDuty,
      tieBreakOrder: input.tieBreakOrder ?? season.tieBreakOrder,
      finalsFormat: input.finalsFormat ?? season.finalsFormat,
      excludedDates: input.excludedDates ?? season.excludedDates,
      updatedAt: nowIso(),
    };

    this.store.seasons.set(seasonId, updated);
    return updated;
  }

  async publish(seasonId: string): Promise<SeasonRecord | null> {
    const season = this.store.seasons.get(seasonId);

    if (!season) {
      return null;
    }

    const updated: SeasonRecord = {
      ...season,
      status: 'PUBLISHED',
      updatedAt: nowIso(),
    };

    this.store.seasons.set(seasonId, updated);
    return updated;
  }

  async getSeason(seasonId: string): Promise<SeasonRecord | null> {
    return this.store.seasons.get(seasonId) ?? null;
  }

  async getGrades(seasonId: string): Promise<GradeRecord[]> {
    return [...this.store.grades.values()].filter((grade) => grade.seasonId === seasonId);
  }
}

class InMemoryTeamService implements TeamService {
  private store = getStore();

  async createTeam(input: CreateTeamRequest): Promise<TeamRecord> {
    const existing = [...this.store.teams.values()].find(
      (team) => team.seasonId === input.seasonId && team.gradeId === input.gradeId && team.name.toLowerCase() === input.name.toLowerCase(),
    );

    if (existing) {
      throw new Error('A team with this name already exists in the selected grade');
    }

    const team: TeamRecord = {
      id: genId('team'),
      seasonId: input.seasonId,
      gradeId: input.gradeId,
      name: input.name,
      shortCode: input.shortCode ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    this.store.teams.set(team.id, team);
    return team;
  }

  async getTeam(teamId: string): Promise<TeamRecord | null> {
    return this.store.teams.get(teamId) ?? null;
  }

  async createInvite(teamId: string, input: CreateInviteRequest): Promise<MembershipRecord | null> {
    if (!this.store.teams.has(teamId)) {
      return null;
    }

    const membership: MembershipRecord = {
      id: genId('membership'),
      teamId,
      status: 'PENDING',
      inviteeEmail: input.inviteeEmail,
    };

    this.store.memberships.set(membership.id, membership);
    return membership;
  }

  async confirmMembership(teamId: string, membershipId: string, input: ConfirmMembershipRequest): Promise<MembershipRecord | null> {
    const membership = this.store.memberships.get(membershipId);

    if (!membership || membership.teamId !== teamId) {
      return null;
    }

    const updated: MembershipRecord = {
      ...membership,
      status: input.status,
    };

    this.store.memberships.set(membership.id, updated);
    return updated;
  }

  async listTeamsByGrade(gradeId: string): Promise<TeamRecord[]> {
    return [...this.store.teams.values()].filter((team) => team.gradeId === gradeId);
  }
}

class InMemoryFixtureService implements FixtureService {
  private store = getStore();

  async generateFixtures(seasonId: string): Promise<MatchRecord[]> {
    const season = this.store.seasons.get(seasonId);

    if (!season) {
      throw new Error('Season not found');
    }

    for (const [id, match] of this.store.matches.entries()) {
      if (match.seasonId === seasonId && match.stageLabel === 'REGULAR') {
        this.store.matches.delete(id);
      }
    }

    const grades = [...this.store.grades.values()].filter((grade) => grade.seasonId === seasonId);
    const createdMatches: MatchRecord[] = [];
    const courts = ['Court 1', 'Court 2', 'Court 3'];
    const timeslots = ['18:30', '19:15', '20:00'];

    for (const grade of grades) {
      const teams = [...this.store.teams.values()].filter((team) => team.gradeId === grade.id);

      if (teams.length < 2) {
        continue;
      }

      const dayOfWeek = grade.category === 'MIXED' ? season.mixedNight : season.ladiesMensNight;
      const dates = buildSeasonDates({
        startDate: season.startDate,
        endDate: season.endDate,
        dayOfWeek,
        excludedDates: season.excludedDates,
      });

      const drafts = generateFixtureDraft({
        seasonId,
        gradeId: grade.id,
        teams,
        dates,
        courts,
        timeslots,
      });

      for (const draft of drafts) {
        const match: MatchRecord = {
          id: genId('match'),
          ...draft,
          status: 'SCHEDULED',
          homeScore: null,
          awayScore: null,
        };

        this.store.matches.set(match.id, match);
        createdMatches.push(match);
      }
    }

    return createdMatches;
  }

  async listFixtures(seasonId: string, filters?: { gradeId?: string; round?: number }): Promise<MatchRecord[]> {
    return [...this.store.matches.values()]
      .filter((match) => match.seasonId === seasonId)
      .filter((match) => (filters?.gradeId ? match.gradeId === filters.gradeId : true))
      .filter((match) => (filters?.round ? match.roundNumber === filters.round : true))
      .sort((a, b) => {
        if (a.matchDate !== b.matchDate) {
          return a.matchDate.localeCompare(b.matchDate);
        }

        return a.timeslot.localeCompare(b.timeslot);
      });
  }

  async getMatch(matchId: string): Promise<MatchRecord | null> {
    return this.store.matches.get(matchId) ?? null;
  }
}

class InMemoryDutyService implements DutyService {
  private store = getStore();

  async generateDuties(seasonId: string): Promise<DutyRecord[]> {
    for (const [id, duty] of this.store.duties.entries()) {
      if (duty.seasonId === seasonId) {
        this.store.duties.delete(id);
      }
    }

    const grades = [...this.store.grades.values()].filter((grade) => grade.seasonId === seasonId);
    const teams = [...this.store.teams.values()].filter((team) => team.seasonId === seasonId);
    const matches = [...this.store.matches.values()].filter((match) => match.seasonId === seasonId && match.stageLabel === 'REGULAR');

    const drafts = generateDutyDraft({
      seasonId,
      grades,
      teams,
      matches,
    });

    const created: DutyRecord[] = drafts.map((draft) => {
      const duty: DutyRecord = {
        id: genId('duty'),
        ...draft,
      };

      this.store.duties.set(duty.id, duty);
      return duty;
    });

    return created;
  }

  async listDuties(seasonId: string): Promise<DutyRecord[]> {
    return [...this.store.duties.values()].filter((duty) => duty.seasonId === seasonId);
  }
}

class InMemoryResultsService implements ResultsService {
  private store = getStore();

  async submitResult(matchId: string, input: SubmitResultRequest): Promise<MatchRecord | null> {
    const match = this.store.matches.get(matchId);

    if (!match) {
      return null;
    }

    const updated: MatchRecord = {
      ...match,
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      status: input.status ?? 'COMPLETED',
    };

    this.store.matches.set(match.id, updated);
    return updated;
  }
}

class InMemoryVotingService implements VotingService {
  private store = getStore();

  async submitVote(actorUserId: string, matchId: string, input: SubmitVoteRequest): Promise<VoteRecord> {
    const duplicate = [...this.store.votes.values()].find(
      (vote) => vote.matchId === matchId && vote.votingUserId === actorUserId && vote.selectedTeamId === input.selectedTeamId,
    );

    if (duplicate) {
      throw new Error('Duplicate vote detected for this match and team');
    }

    const vote: VoteRecord = {
      id: genId('vote'),
      matchId,
      votingUserId: actorUserId,
      selectedTeamId: input.selectedTeamId,
      selectedPlayerName: input.selectedPlayerName,
      createdAt: nowIso(),
    };

    this.store.votes.set(vote.id, vote);
    return vote;
  }
}

class InMemoryLadderService implements LadderService {
  private store = getStore();

  async getLadders(seasonId: string): Promise<Record<string, LadderRow[]>> {
    const grades = [...this.store.grades.values()].filter((grade) => grade.seasonId === seasonId);
    const ladders: Record<string, LadderRow[]> = {};

    for (const grade of grades) {
      const matches = [...this.store.matches.values()].filter(
        (match) =>
          match.seasonId === seasonId &&
          match.gradeId === grade.id &&
          (match.status === 'COMPLETED' || match.status === 'FORFEIT' || match.status === 'NO_GAME'),
      );

      const results: TeamResult[] = matches.flatMap((match) => matchOutcomes(match));
      const table = buildStandings(results);

      ladders[grade.id] = table;
    }

    return ladders;
  }
}

class InMemoryFinalsService implements FinalsService {
  private store = getStore();
  private ladderService = new InMemoryLadderService();

  async generateFinals(seasonId: string): Promise<MatchRecord[]> {
    const season = this.store.seasons.get(seasonId);

    if (!season) {
      throw new Error('Season not found');
    }

    for (const [id, match] of this.store.matches.entries()) {
      if (match.seasonId === seasonId && match.stageLabel !== 'REGULAR') {
        this.store.matches.delete(id);
      }
    }

    const grades = [...this.store.grades.values()].filter((grade) => grade.seasonId === seasonId);
    const ladders = await this.ladderService.getLadders(seasonId);
    const created: MatchRecord[] = [];

    for (const grade of grades) {
      const ladder = ladders[grade.id] ?? [];
      const drafts = buildFinalsBracket({
        seasonId,
        gradeId: grade.id,
        ladders: ladder,
        finalsFormat: season.finalsFormat,
        startDate: season.endDate,
      });

      for (const draft of drafts) {
        const match: MatchRecord = {
          id: genId('match'),
          ...draft,
          status: 'SCHEDULED',
          homeScore: null,
          awayScore: null,
        };

        this.store.matches.set(match.id, match);
        created.push(match);
      }
    }

    return created;
  }
}

class InMemoryNotificationService implements NotificationService {
  private store = getStore();

  async listForUser(userId: string): Promise<Array<{ id: string; message: string; createdAt: string }>> {
    return this.store.notifications.filter((notification) => notification.userId === userId);
  }

  async enqueue(userId: string, message: string): Promise<void> {
    this.store.notifications.push({
      id: genId('notification'),
      userId,
      message,
      createdAt: nowIso(),
    });
  }
}

class InMemoryMessagingService implements MessagingService {
  private store = getStore();

  async createThread(actorUserId: string, input: CreateThreadRequest): Promise<ThreadRecord> {
    const thread: ThreadRecord = {
      id: genId('thread'),
      seasonId: input.seasonId,
      gradeId: input.gradeId ?? null,
      teamId: input.teamId ?? null,
      title: input.title,
      createdByUserId: actorUserId,
      createdAt: nowIso(),
    };

    this.store.threads.set(thread.id, thread);
    return thread;
  }

  async createMessage(actorUserId: string, threadId: string, input: CreateMessageRequest): Promise<MessageRecord | null> {
    if (!this.store.threads.has(threadId)) {
      return null;
    }

    const message: MessageRecord = {
      id: genId('message'),
      threadId,
      authorUserId: actorUserId,
      body: input.body,
      createdAt: nowIso(),
    };

    this.store.messages.set(message.id, message);
    return message;
  }

  async listMessages(threadId: string): Promise<MessageRecord[]> {
    return [...this.store.messages.values()]
      .filter((message) => message.threadId === threadId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

class InMemoryImportService implements ImportService {
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

class InMemoryAuditService implements AuditService {
  private store = getStore();

  async log(input: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    this.store.auditLogs.push({
      id: genId('audit'),
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload,
      createdAt: nowIso(),
    });
  }
}

export function createInMemoryServices() {
  return {
    authService: new InMemoryAuthService(),
    seasonService: new InMemorySeasonService(),
    teamService: new InMemoryTeamService(),
    fixtureService: new InMemoryFixtureService(),
    dutyService: new InMemoryDutyService(),
    resultsService: new InMemoryResultsService(),
    votingService: new InMemoryVotingService(),
    ladderService: new InMemoryLadderService(),
    finalsService: new InMemoryFinalsService(),
    notificationService: new InMemoryNotificationService(),
    messagingService: new InMemoryMessagingService(),
    importService: new InMemoryImportService(),
    auditService: new InMemoryAuditService(),
  };
}
