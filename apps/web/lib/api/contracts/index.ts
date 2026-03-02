export type CreateSeasonRequest = {
  organizationId: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  mixedNight: number;
  ladiesMensNight: number;
};

export type UpdateSeasonSettingsRequest = {
  pointsWin?: number;
  pointsDraw?: number;
  pointsLoss?: number;
  pointsForfeit?: number;
  pointsBye?: number;
  penaltyMissedDuty?: number;
  tieBreakOrder?: string;
  finalsFormat?: 'simple_top4' | 'major_minor';
  excludedDates?: string[];
};

export type CreateTeamRequest = {
  seasonId: string;
  gradeId: string;
  name: string;
  shortCode?: string;
};

export type CreateGradeRequest = {
  name: string;
  category: 'MIXED' | 'LADIES' | 'MENS';
  rankOrder: number;
  isActive?: boolean;
};

export type UpdateGradeRequest = {
  name?: string;
  category?: 'MIXED' | 'LADIES' | 'MENS';
  rankOrder?: number;
  isActive?: boolean;
};

export type CreateCourtRequest = {
  name: string;
  sortOrder: number;
};

export type UpdateCourtRequest = {
  name?: string;
  sortOrder?: number;
};

export type CreateTimeslotRequest = {
  label: string;
  startsAt: string;
  sortOrder: number;
};

export type UpdateTimeslotRequest = {
  label?: string;
  startsAt?: string;
  sortOrder?: number;
};

export type CreateInviteRequest = {
  inviteeEmail: string;
};

export type ConfirmMembershipRequest = {
  status: 'ACTIVE' | 'REJECTED';
};

export type SubmitResultRequest = {
  homeScore: number;
  awayScore: number;
  status?: 'COMPLETED' | 'FORFEIT' | 'NO_GAME';
};

export type SubmitVoteRequest = {
  selectedTeamId: string;
  selectedPlayerName: string;
};

export type CreateThreadRequest = {
  seasonId: string;
  gradeId?: string;
  teamId?: string;
  title: string;
};

export type CreateMessageRequest = {
  body: string;
};

export type CreateNotificationRequest = {
  recipientUserId: string;
  message: string;
};

export type GenerationDiagnosticsResponse = GeneratedGenerationDiagnosticsResponse;
import type { GenerationDiagnosticsResponse as GeneratedGenerationDiagnosticsResponse } from '@/lib/diagnostics/generation_report';
