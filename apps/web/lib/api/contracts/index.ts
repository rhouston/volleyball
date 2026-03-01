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
