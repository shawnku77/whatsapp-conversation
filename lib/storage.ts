import { get, list, put } from '@vercel/blob';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const cloudStorage = () => Boolean(process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN);
export const storageReady = () => !cloudStorage() || Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const root = () => path.resolve(process.env.DATA_DIR || './data');
// Only our own fixed paths are accepted, never a client-supplied URL.
export function storageKey(id: string, extension: 'zip' | 'json') {
  if (!/^[a-f0-9]{48}$/.test(id)) throw new Error('Invalid archive identifier');
  return `${extension === 'zip' ? 'archives' : 'metadata'}/${id}.${extension}`;
}
// A short-lived, single-ZIP cache coalesces attachment requests on a warm instance.
// It is not durable storage; conversation text is still parsed on every open.
let zipCache: { id: string; expires: number; value: Promise<Buffer> } | undefined;
export async function readStored(id: string, extension: 'zip' | 'json', limit: number): Promise<Buffer> {
  storageKey(id, extension);
  if (!cloudStorage() || extension !== 'zip') return readUncached(id, extension, limit);
  if (zipCache?.id === id && zipCache.expires > Date.now()) return zipCache.value;
  const value = readUncached(id, extension, limit);
  zipCache = { id, expires: Date.now() + 60000, value };
  try { return await value; } catch (error) { if (zipCache?.value === value) zipCache = undefined; throw error; }
}
async function readUncached(id: string, extension: 'zip' | 'json', limit: number) {
  const key = storageKey(id, extension);
  if (!cloudStorage()) return readFile(path.join(root(), `${id}.${extension}`));
  const result = await get(key, { access: 'private', useCache: false, token: process.env.BLOB_READ_WRITE_TOKEN });
  if (!result || result.statusCode !== 200) throw new Error('Archive not found');
  const reader = result.stream.getReader();
  if (result.blob.size > limit) { await reader.cancel(); throw new Error('Stored file exceeds size limit'); }
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > limit) throw new Error('Stored file exceeds size limit'); chunks.push(next.value); }
  } catch (error) { await reader.cancel(); throw error; }
  return Buffer.concat(chunks);
}
export async function writeMetadata(id: string, value: unknown) {
  const key = storageKey(id, 'json'); const body = JSON.stringify(value);
  if (cloudStorage()) { await put(key, body, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', token: process.env.BLOB_READ_WRITE_TOKEN }); return; }
  await mkdir(root(), { recursive: true });
  await writeFile(path.join(root(), id + '.json'), body);
}
export async function storedIds() {
  if (!cloudStorage()) { await mkdir(root(), { recursive: true }); return (await readdir(root())).filter(n => /^[a-f0-9]{48}\.json$/.test(n)).map(n => n.slice(0,-5)); }
  const ids: string[] = []; let cursor: string | undefined;
  do {
    const page = await list({ prefix: 'metadata/', cursor, limit: 1000, token: process.env.BLOB_READ_WRITE_TOKEN });
    for (const blob of page.blobs) { const match = /^metadata\/([a-f0-9]{48})\.json$/.exec(blob.pathname); if (match) ids.push(match[1]); }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return ids;
}
