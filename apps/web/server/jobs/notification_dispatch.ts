import { Resend } from 'resend';
import type { PrismaClient } from '@prisma/client';
import { createRequire } from 'node:module';
import { getEnv } from '@/lib/config/env';
import { buildNotificationEmail } from './notification_templates';
import { enqueueNotificationDispatchJob } from './pg_boss';

const require = createRequire(import.meta.url);

export type NotificationDispatchSummary = {
  processed: number;
  emailed: number;
  failed: number;
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
  const prisma = getPrismaClient();
  const env = getEnv();
  const pending = await prisma.notification.findMany({
    where: { status: 'QUEUED' },
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
  let emailed = 0;
  let failed = 0;

  for (const notification of pending) {
    try {
      if (notification.channel === 'EMAIL' && resend && env.EMAIL_FROM) {
        const message = payloadMessage(notification.payload) || 'You have a new competition update.';
        const email = buildNotificationEmail({ message });

        await resend.emails.send({
          from: env.EMAIL_FROM,
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
        },
      });

      emailed += 1;
    } catch {
      failed += 1;

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
        },
      });
    }
  }

  return {
    processed: pending.length,
    emailed,
    failed,
  };
}

export async function queueNotificationDispatch(): Promise<{ queued: boolean }> {
  const queued = await enqueueNotificationDispatchJob();
  return { queued };
}
