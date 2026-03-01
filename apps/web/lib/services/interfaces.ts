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

export type SeasonStatus = 'DRAFT' | 'PUBLISHED' | 'LOCKED' | 'COMPLETED';
export type GradeCategory = 'MIXED' | 'LADIES' | 'MENS';
export type DutyType = 'SETUP' | 'UMPIRE' | 'PACKUP';

export type SeasonRecord = {
  id: string;
  organizationId: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  mixedNight: number;
  ladiesMensNight: number;
  status: SeasonStatus;
  finalsFormat: 'simple_top4' | 'major_minor';
  excludedDates: string[];
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  pointsForfeit: number;
  pointsBye: number;
  penaltyMissedDuty: number;
  tieBreakOrder: string;
  createdAt: string;
  updatedAt: string;
};

export type GradeRecord = {
  id: string;
  seasonId: string;
  name: string;
  category: GradeCategory;
  rankOrder: number;
  isActive: boolean;
};

export type TeamRecord = {
  id: string;
  seasonId: string;
  gradeId: string;
  name: string;
  shortCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MembershipRecord = {
  id: string;
  teamId: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  inviteeEmail: string;
};

export type MatchRecord = {
  id: string;
  seasonId: string;
  gradeId: string;
  homeTeamId: string;
  awayTeamId: string;
  matchDate: string;
  roundNumber: number;
  court: string;
  timeslot: string;
  stageLabel: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'FORFEIT' | 'NO_GAME';
  homeScore: number | null;
  awayScore: number | null;
};

export type DutyRecord = {
  id: string;
  seasonId: string;
  gradeId: string;
  matchId: string | null;
  dutyDate: string;
  dutyType: DutyType;
  court: string | null;
  timeslot: string | null;
  teamId: string;
};

export type VoteRecord = {
  id: string;
  matchId: string;
  votingUserId: string;
  selectedTeamId: string;
  selectedPlayerName: string;
  createdAt: string;
};

export type LadderRow = {
  teamId: string;
  played: number;
  points: number;
  pointsFor: number;
  pointsAgainst: number;
};

export type ThreadRecord = {
  id: string;
  seasonId: string;
  gradeId: string | null;
  teamId: string | null;
  title: string;
  createdByUserId: string;
  createdAt: string;
};

export type MessageRecord = {
  id: string;
  threadId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
};

export interface AuthService {
  signIn(provider: string): Promise<{ provider: string; message: string }>;
  signOut(): Promise<{ success: true }>;
}

export interface SeasonService {
  createSeason(input: CreateSeasonRequest): Promise<SeasonRecord>;
  updateSettings(seasonId: string, input: UpdateSeasonSettingsRequest): Promise<SeasonRecord | null>;
  publish(seasonId: string): Promise<SeasonRecord | null>;
  getSeason(seasonId: string): Promise<SeasonRecord | null>;
  getGrades(seasonId: string): Promise<GradeRecord[]>;
}

export interface TeamService {
  createTeam(input: CreateTeamRequest): Promise<TeamRecord>;
  getTeam(teamId: string): Promise<TeamRecord | null>;
  createInvite(teamId: string, input: CreateInviteRequest): Promise<MembershipRecord | null>;
  confirmMembership(teamId: string, membershipId: string, input: ConfirmMembershipRequest): Promise<MembershipRecord | null>;
  listTeamsByGrade(gradeId: string): Promise<TeamRecord[]>;
}

export interface FixtureService {
  generateFixtures(seasonId: string): Promise<MatchRecord[]>;
  listFixtures(seasonId: string, filters?: { gradeId?: string; round?: number }): Promise<MatchRecord[]>;
  getMatch(matchId: string): Promise<MatchRecord | null>;
}

export interface DutyService {
  generateDuties(seasonId: string): Promise<DutyRecord[]>;
  listDuties(seasonId: string): Promise<DutyRecord[]>;
}

export interface ResultsService {
  submitResult(matchId: string, input: SubmitResultRequest): Promise<MatchRecord | null>;
}

export interface VotingService {
  submitVote(actorUserId: string, matchId: string, input: SubmitVoteRequest): Promise<VoteRecord>;
}

export interface LadderService {
  getLadders(seasonId: string): Promise<Record<string, LadderRow[]>>;
}

export interface FinalsService {
  generateFinals(seasonId: string): Promise<MatchRecord[]>;
}

export interface NotificationService {
  listForUser(userId: string): Promise<Array<{ id: string; message: string; createdAt: string }>>;
  enqueue(userId: string, message: string): Promise<void>;
}

export interface MessagingService {
  createThread(actorUserId: string, input: CreateThreadRequest): Promise<ThreadRecord>;
  createMessage(actorUserId: string, threadId: string, input: CreateMessageRequest): Promise<MessageRecord | null>;
  listMessages(threadId: string): Promise<MessageRecord[]>;
}

export interface ImportService {
  dryRunCsv(payload: { type: string; rows: unknown[] }): Promise<{ accepted: number; rejected: number; errors: string[] }>;
  commitCsv(payload: { type: string; rows: unknown[] }): Promise<{ imported: number }>;
}

export interface AuditService {
  log(input: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
  }): Promise<void>;
}

export type ServiceRegistry = {
  authService: AuthService;
  seasonService: SeasonService;
  teamService: TeamService;
  fixtureService: FixtureService;
  dutyService: DutyService;
  resultsService: ResultsService;
  votingService: VotingService;
  ladderService: LadderService;
  finalsService: FinalsService;
  notificationService: NotificationService;
  messagingService: MessagingService;
  importService: ImportService;
  auditService: AuditService;
};
