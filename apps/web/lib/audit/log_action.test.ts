import { describe, expect, it, vi } from 'vitest';
import { logAction } from './log_action';
import { services } from '@/lib/services/service_registry';

describe('logAction', () => {
  it('does not log when actor is anonymous', async () => {
    const spy = vi.spyOn(services.auditService, 'log');

    await logAction({
      actor: { userId: null, email: null, role: 'anonymous' },
      action: 'season.create',
      entityType: 'season',
      entityId: 'season-1',
    });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('logs audit event for authenticated actor', async () => {
    const spy = vi.spyOn(services.auditService, 'log').mockResolvedValue(undefined);

    await logAction({
      actor: { userId: 'user-1', email: 'user-1@example.com', role: 'grade_admin' },
      action: 'season.publish',
      entityType: 'season',
      entityId: 'season-1',
      payload: { status: 'PUBLISHED' },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({
      userId: 'user-1',
      action: 'season.publish',
      entityType: 'season',
      entityId: 'season-1',
      payload: { status: 'PUBLISHED' },
    });

    spy.mockRestore();
  });
});
