import AdmZip from 'adm-zip';
import { mkdir, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseChat } from './parser';
import { cloudStorage, readStored, storedIds, writeMetadata } from './storage';
export const MAX_UPLOAD = 250 * 1024 * 1024;
const root = () => path.resolve(process.env.DATA_DIR || './data');
export const validId = (id: string) => /^[a-f0-9]{48}$/.test(id);
export type ArchiveInfo = { id: string; name: string; uploadedAt: string; bytes: number; messages: number; participants: string[] };
export function inspect(buffer: Buffer) {
  const zip = new AdmZip(buffer); const entries = zip.getEntries();
  if (entries.length > 15000 || entries.reduce((n, e) => n + e.header.size, 0) > 1024 * 1024 * 1024) throw new Error('Archive exceeds the 1 GB expanded size or 15,000 file limit.');
  const candidates = entries.filter(e => !e.isDirectory && /\.txt$/i.test(e.entryName) && !e.entryName.includes('__MACOSX')).sort((a,b) => Number(/_chat\.txt$/i.test(b.entryName)) - Number(/_chat\.txt$/i.test(a.entryName)));
  for (const entry of candidates) {
    if (entry.header.size > 20 * 1024 * 1024) continue;
    const conversation = parseChat(entry.getData().toString('utf8'), entries.filter(e => !e.isDirectory).map(e => e.entryName));
    if (conversation.messages.length) return { zip, ...conversation };
  }
  throw new Error('No supported WhatsApp chat text was found. Export a chat with media as a ZIP file.');
}
export async function saveArchive(buffer: Buffer, filename: string) {
  if (cloudStorage()) throw new Error('Use direct Blob upload on Vercel.');
  const parsed = inspect(buffer); const id = randomBytes(24).toString('hex');
  const info: ArchiveInfo = { id, name: path.basename(filename).replace(/\.zip$/i, '').replace(/^WhatsApp Chat\s*[-–]\s*/i, ''), uploadedAt: new Date().toISOString(), bytes: buffer.length, messages: parsed.messages.length, participants: parsed.participants };
  await mkdir(root(), { recursive: true });
  await writeFile(path.join(root(), id + '.zip'), buffer, { flag: 'wx' });
  try { await writeFile(path.join(root(), id + '.json.tmp'), JSON.stringify(info), { flag: 'wx' }); await rename(path.join(root(), id + '.json.tmp'), path.join(root(), id + '.json')); }
  catch (error) { await unlink(path.join(root(), id + '.zip')).catch(() => {}); throw error; }
  return info;
}
export async function getInfo(id: string): Promise<ArchiveInfo> {
  if (!validId(id)) throw new Error('Not found');
  return JSON.parse((await readStored(id, 'json', 1024 * 1024)).toString('utf8'));
}
export async function listArchives(): Promise<ArchiveInfo[]> {
  const ids = await storedIds(); const values: ArchiveInfo[] = [];
  for (let offset = 0; offset < ids.length; offset += 10) values.push(...await Promise.all(ids.slice(offset, offset + 10).map(getInfo)));
  return values.sort((a,b) => b.uploadedAt.localeCompare(a.uploadedAt));
}
export async function loadArchive(id: string) {
  const info = await getInfo(id); const parsed = inspect(await readStored(id, 'zip', MAX_UPLOAD));
  return { info, ...parsed };
}

export async function finalizeCloudArchive(id: string, filename: string) {
  if (!cloudStorage() || !validId(id)) throw new Error('Invalid archive');
  const buffer = await readStored(id, 'zip', MAX_UPLOAD); const parsed = inspect(buffer);
  const info: ArchiveInfo = { id, name: path.basename(filename).replace(/\.zip$/i, '').replace(/^WhatsApp Chat\s*[-–]\s*/i, ''), uploadedAt: new Date().toISOString(), bytes: buffer.length, messages: parsed.messages.length, participants: parsed.participants };
  await writeMetadata(id, info); return info;
}
