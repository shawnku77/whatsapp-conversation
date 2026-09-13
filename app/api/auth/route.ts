import { NextResponse } from 'next/server';
import { COOKIE, createSession, equal, sameOrigin } from '@/lib/auth';
const attempts = new Map<string, { count: number; until: number }>();
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  // A process-wide bucket also prevents spoofed proxy headers bypassing limits.
  const key = 'login'; const now = Date.now(); const bucket = attempts.get(key);
  if (bucket && bucket.until > now && bucket.count >= 15) return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
  const { password } = await request.json().catch(() => ({}));
  if (!process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'Admin password is not configured.' }, { status: 503 });
  if (typeof password !== 'string' || !equal(password, process.env.ADMIN_PASSWORD)) {
    attempts.set(key, { count: bucket && bucket.until > now ? bucket.count + 1 : 1, until: bucket && bucket.until > now ? bucket.until : now + 900000 });
    return NextResponse.json({ error: 'Incorrect password. Please try again.' }, { status: 401 });
  }
  attempts.delete(key); const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, createSession(), { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: 43200 }); return response;
}
export async function DELETE(request: Request) { if (!sameOrigin(request)) return new Response(null, { status: 403 }); const response = NextResponse.json({ ok: true }); response.cookies.set(COOKIE, '', { maxAge: 0, path: '/' }); return response; }
