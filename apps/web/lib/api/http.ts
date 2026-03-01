import { NextResponse } from 'next/server';

export function ok<T>(payload: T, status = 200): NextResponse {
  return NextResponse.json(payload, { status });
}

export function created<T>(payload: T): NextResponse {
  return ok(payload, 201);
}

export function badRequest(message: string, details?: unknown): NextResponse {
  return NextResponse.json({ status: 'bad_request', message, details }, { status: 400 });
}

export function notFound(message: string): NextResponse {
  return NextResponse.json({ status: 'not_found', message }, { status: 404 });
}

export function conflict(message: string): NextResponse {
  return NextResponse.json({ status: 'conflict', message }, { status: 409 });
}

export function internalError(message: string): NextResponse {
  return NextResponse.json({ status: 'error', message }, { status: 500 });
}

export async function parseJsonBody<T>(request: Request): Promise<T> {
  const contentType = request.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    throw new Error('Expected content-type application/json');
  }

  return (await request.json()) as T;
}
