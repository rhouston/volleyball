import { NextResponse } from 'next/server';
import type { ActorRole, RequestActor } from './session';

const roleRank: Record<ActorRole, number> = {
  anonymous: 0,
  player: 1,
  team_manager: 2,
  grade_admin: 3,
  platform_admin: 4,
};

export function canAccess(actor: RequestActor, minimumRole: ActorRole): boolean {
  return roleRank[actor.role] >= roleRank[minimumRole];
}

export function requireRole(actor: RequestActor, minimumRole: ActorRole): NextResponse | null {
  if (canAccess(actor, minimumRole)) {
    return null;
  }

  return NextResponse.json(
    {
      status: 'forbidden',
      message: `Requires role ${minimumRole}`,
    },
    { status: 403 },
  );
}
