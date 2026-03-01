import { describe, expect, it } from 'vitest';
import { parseJsonBody } from './http';

describe('parseJsonBody', () => {
  it('parses JSON requests', async () => {
    const request = new Request('http://127.0.0.1:3000/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    });

    const body = await parseJsonBody<{ ok: boolean }>(request);
    expect(body).toEqual({ ok: true });
  });

  it('rejects non-json content-type', async () => {
    const request = new Request('http://127.0.0.1:3000/test', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello',
    });

    await expect(parseJsonBody(request)).rejects.toThrow('Expected content-type application/json');
  });

  it('rejects missing content-type headers', async () => {
    const request = new Request('http://127.0.0.1:3000/test', {
      method: 'POST',
      body: JSON.stringify({ ok: false }),
    });

    await expect(parseJsonBody(request)).rejects.toThrow('Expected content-type application/json');
  });
});
