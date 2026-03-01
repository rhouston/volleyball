import { z } from 'zod';

export const createSeasonSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(3).max(120),
  year: z.number().int().min(2020).max(2100),
  startDate: z.string().date(),
  endDate: z.string().date(),
  mixedNight: z.number().int().min(0).max(6),
  ladiesMensNight: z.number().int().min(0).max(6),
});

export const updateSeasonSettingsSchema = z.object({
  pointsWin: z.number().int().optional(),
  pointsDraw: z.number().int().optional(),
  pointsLoss: z.number().int().optional(),
  pointsForfeit: z.number().int().optional(),
  pointsBye: z.number().int().optional(),
  penaltyMissedDuty: z.number().int().optional(),
  tieBreakOrder: z.string().optional(),
  finalsFormat: z.enum(['simple_top4', 'major_minor']).optional(),
  excludedDates: z.array(z.string().date()).optional(),
});

export const createTeamSchema = z.object({
  seasonId: z.string().min(1),
  gradeId: z.string().min(1),
  name: z.string().min(2).max(100),
  shortCode: z.string().max(12).optional(),
});

export const createInviteSchema = z.object({
  inviteeEmail: z.string().email(),
});

export const confirmMembershipSchema = z.object({
  status: z.enum(['ACTIVE', 'REJECTED']),
});

export const submitResultSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  status: z.enum(['COMPLETED', 'FORFEIT', 'NO_GAME']).optional(),
});

export const submitVoteSchema = z.object({
  selectedTeamId: z.string().min(1),
  selectedPlayerName: z.string().min(2).max(120),
});

export const createThreadSchema = z.object({
  seasonId: z.string().min(1),
  gradeId: z.string().optional(),
  teamId: z.string().optional(),
  title: z.string().min(2).max(160),
});

export const createMessageSchema = z.object({
  body: z.string().min(1).max(3000),
});

export const createNotificationSchema = z.object({
  recipientUserId: z.string().min(1),
  message: z.string().min(2).max(500),
});
