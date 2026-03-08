import { Resend } from 'resend';
import type { PrismaClient } from '@prisma/client';
import { createRequire } from 'node:module';
import { getEnv, type AppEnv } from '@/lib/config/env';
import { buildNotificationEmail } from './notification_templates';

const require = createRequire(import.meta.url);

export type NotificationDispatchSummary = {
  processed: number;
  emailed: number;
  failed: number;
};

export type NotificationDispatchRequestResult = {
  mode: 'inline';
  queued: true;
  summary: NotificationDispatchSummary;
  dispatchError?: string;
};

type PendingNotification = {
  id: string;
  channel: 'IN_APP' | 'EMAIL';
  payload: unknown;
  attemptCount: number;
  recipientUser: {
    email: string;
  };
};

type NotificationPrismaLike = {
  notification: {
    findMany(args: unknown): Promise<PendingNotification[]>;
    update(args: unknown): Promise<unknown>;
  };
};

type DispatchDependencies = {
  prisma?: NotificationPrismaLike;
  env?: AppEnv;
  sendEmail?: (input: { to: string; subject: string; html: string; text: string }) => Promise<void>;
};

function payloadMessage(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    return String((payload as { message: unknown }).message ?? '');
  }

  return '';
}

function getPrismaClient(): PrismaClient {
  const prismaModule = require('../../lib/db/prisma') as { prisma: PrismaClient };
  return prismaModule.prisma;
}

export async function runNotificationDispatchCycle(limit = 25): Promise<NotificationDispatchSummary> {
  return runNotificationDispatchCycleWithDependencies(limit);
}

export async function runNotificationDispatchCycleWithDependencies(
  limit = 25,
  dependencies?: DispatchDependencies,
): Promise<NotificationDispatchSummary> {
  const prisma = dependencies?.prisma ?? getPrismaClient();
  const env = dependencies?.env ?? getEnv();
  const pending = await prisma.notification.findMany({
    where: {
      status: 'QUEUED',
      attemptCount: {
        lt: 3,
      },
      OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: {
      recipientUser: {
        select: {
          email: true,
        },
      },
    },
  });

  if (pending.length === 0) {
    return { processed: 0, emailed: 0, failed: 0 };
  }

  const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  const sendEmail =
    dependencies?.sendEmail ??
    (async (input: { to: string; subject: string; html: string; text: string }) => {
      if (!resend || !env.EMAIL_FROM) {
        throw new Error('Email provider is not configured');
      }

      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
    });

  let emailed = 0;
  let failed = 0;

  for (const notification of pending) {
    try {
      if (notification.channel === 'EMAIL') {
        const message = payloadMessage(notification.payload) || 'You have a new competition update.';
        const email = buildNotificationEmail({ message });
        await sendEmail({
          to: notification.recipientUser.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
      }

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          attemptCount: {
            increment: 1,
          },
          lastError: null,
        },
      });

      emailed += 1;
    } catch (error) {
      const nextAttempt = notification.attemptCount + 1;
      const isFinalFailure = nextAttempt >= 3;

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: isFinalFailure ? 'FAILED' : 'QUEUED',
          attemptCount: nextAttempt,
          lastError: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      if (isFinalFailure) {
        failed += 1;
      }
    }
  }

  return {
    processed: pending.length,
    emailed,
    failed,
  };
}

export async function queueNotificationDispatch(limit = 25): Promise<NotificationDispatchRequestResult> {
  try {
    const summary = await runNotificationDispatchCycle(limit);

    return {
      mode: 'inline',
      queued: true,
      summary,
    };
  } catch (error) {
    return {
      mode: 'inline',
      queued: true,
      summary: { processed: 0, emailed: 0, failed: 0 },
      dispatchError: error instanceof Error ? error.message : 'Unknown dispatch error',
    };
  }
}
