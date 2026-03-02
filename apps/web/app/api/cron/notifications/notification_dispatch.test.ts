import { describe, expect, it } from 'vitest';
import { runNotificationDispatchCycleWithDependencies } from '@/server/jobs/notification_dispatch';

type PendingNotification = {
  id: string;
  channel: 'IN_APP' | 'EMAIL';
  payload: unknown;
  attemptCount: number;
  recipientUser: {
    email: string;
  };
};

function fakeDependencies(pending: PendingNotification[]) {
  const updates: Array<{ where: { id: string }; data: Record<string, unknown> }> = [];

  const prisma = {
    notification: {
      findMany: async () => pending,
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        updates.push(args);
        return args;
      },
    },
  };

  return { prisma, updates };
}

describe('notification dispatch retry semantics', () => {
  it('marks queued notifications as sent after successful email send', async () => {
    const pending: PendingNotification[] = [
      {
        id: 'notification-1',
        channel: 'EMAIL',
        payload: { message: 'Fixture update ready' },
        attemptCount: 0,
        recipientUser: {
          email: 'player-1@example.com',
        },
      },
    ];
    const { prisma, updates } = fakeDependencies(pending);

    const summary = await runNotificationDispatchCycleWithDependencies(25, {
      prisma,
      env: {
        NODE_ENV: 'test',
        APP_BASE_URL: 'http://127.0.0.1:3000',
      },
      sendEmail: async () => undefined,
    });

    expect(summary).toEqual({ processed: 1, emailed: 1, failed: 0 });
    expect(updates).toHaveLength(1);
    expect(updates[0]?.data.status).toBe('SENT');
    expect(updates[0]?.data.lastError).toBeNull();
  });

  it('requeues notification while attempts are below retry cap', async () => {
    const pending: PendingNotification[] = [
      {
        id: 'notification-2',
        channel: 'EMAIL',
        payload: { message: 'Schedule changed' },
        attemptCount: 1,
        recipientUser: {
          email: 'player-2@example.com',
        },
      },
    ];
    const { prisma, updates } = fakeDependencies(pending);

    const summary = await runNotificationDispatchCycleWithDependencies(25, {
      prisma,
      env: {
        NODE_ENV: 'test',
        APP_BASE_URL: 'http://127.0.0.1:3000',
      },
      sendEmail: async () => {
        throw new Error('SMTP timeout');
      },
    });

    expect(summary).toEqual({ processed: 1, emailed: 0, failed: 0 });
    expect(updates).toHaveLength(1);
    expect(updates[0]?.data.status).toBe('QUEUED');
    expect(updates[0]?.data.attemptCount).toBe(2);
    expect(updates[0]?.data.lastError).toBe('SMTP timeout');
  });

  it('marks notification failed after max retry attempts', async () => {
    const pending: PendingNotification[] = [
      {
        id: 'notification-3',
        channel: 'EMAIL',
        payload: { message: 'Team message' },
        attemptCount: 2,
        recipientUser: {
          email: 'player-3@example.com',
        },
      },
    ];
    const { prisma, updates } = fakeDependencies(pending);

    const summary = await runNotificationDispatchCycleWithDependencies(25, {
      prisma,
      env: {
        NODE_ENV: 'test',
        APP_BASE_URL: 'http://127.0.0.1:3000',
      },
      sendEmail: async () => {
        throw new Error('Provider outage');
      },
    });

    expect(summary).toEqual({ processed: 1, emailed: 0, failed: 1 });
    expect(updates).toHaveLength(1);
    expect(updates[0]?.data.status).toBe('FAILED');
    expect(updates[0]?.data.attemptCount).toBe(3);
    expect(updates[0]?.data.lastError).toBe('Provider outage');
  });
});
