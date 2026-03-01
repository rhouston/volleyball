import { PgBoss } from 'pg-boss';
import { getEnv } from '@/lib/config/env';

let bossInstance: PgBoss | null = null;
let started = false;

export async function getPgBoss(): Promise<PgBoss | null> {
  const env = getEnv();
  const connectionString = env.PG_BOSS_DATABASE_URL ?? env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  if (!bossInstance) {
    bossInstance = new PgBoss({ connectionString });
  }

  if (!started) {
    await bossInstance.start();
    started = true;
  }

  return bossInstance;
}

export async function enqueueNotificationDispatchJob(): Promise<boolean> {
  const boss = await getPgBoss();

  if (!boss) {
    return false;
  }

  await boss.send('notifications.dispatch', { requestedAt: new Date().toISOString() });
  return true;
}
