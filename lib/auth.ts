import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
export const COOKIE = 'propertylab_session';
const secret = () => { if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('Configure SESSION_SECRET with at least 32 characters'); return process.env.SESSION_SECRET; };
export function equal(a: string, b: string) { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
const sign = (value: string) => createHmac('sha256', secret()).update(value + ':' + process.env.ADMIN_PASSWORD).digest('hex');
export function createSession() { const expires = String(Date.now() + 12 * 60 * 60 * 1000); return expires + '.' + sign(expires); }
export async function isAdmin() { const token = (await cookies()).get(COOKIE)?.value; if (!token) return false; const [expires, signature] = token.split('.'); return Number(expires) > Date.now() && equal(signature || '', sign(expires)); }
export function sameOrigin(request: Request) { const origin = request.headers.get('origin'); if (!origin) return true; if (process.env.APP_ORIGIN) return origin === process.env.APP_ORIGIN; try { return new URL(origin).host === request.headers.get('host') && ['http:', 'https:'].includes(new URL(origin).protocol); } catch { return false; } }
