export type ActorRole = 'platform_admin' | 'grade_admin' | 'team_manager' | 'player' | 'anonymous';

export type RequestActor = {
  userId: string | null;
  email: string | null;
  role: ActorRole;
};

function normalizeRole(role: string | null): ActorRole {
  switch (role) {
    case 'platform_admin':
    case 'grade_admin':
    case 'team_manager':
    case 'player':
      return role;
    default:
      return 'anonymous';
  }
}

export function resolveActor(request: Request): RequestActor {
  const headerUserId = request.headers.get('x-user-id');
  const headerUserEmail = request.headers.get('x-user-email');
  const headerRole = request.headers.get('x-user-role');

  if (!headerUserId) {
    return { userId: null, email: null, role: 'anonymous' };
  }

  return {
    userId: headerUserId,
    email: headerUserEmail,
    role: normalizeRole(headerRole),
  };
}
