import { loadArchive } from '@/lib/archive';
export const runtime = 'nodejs';
const types: Record<string,string> = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif', mp4:'video/mp4', mov:'video/quicktime', opus:'audio/ogg', ogg:'audio/ogg', mp3:'audio/mpeg', m4a:'audio/mp4', aac:'audio/aac', wav:'audio/wav', pdf:'application/pdf' };
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; const name = new URL(request.url).searchParams.get('file') || '';
    const archive = await loadArchive(id);
    // Only expose attachments referenced by this conversation, never arbitrary ZIP entries.
    if (!archive.messages.some(m => m.attachment === name)) return new Response('Not found', { status: 404 });
    const entry = archive.zip.getEntry(name); if (!entry || entry.isDirectory) return new Response('Not found', { status: 404 });
    const buffer = entry.getData(); const ext = name.split('.').pop()!.toLowerCase();
    const headers = new Headers({ 'Content-Type': types[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Accept-Ranges': 'bytes', 'Content-Disposition': `${types[ext] && (ext !== 'pdf' || new URL(request.url).searchParams.get('view') === '1') ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(name.split('/').pop()!)}` });
    const range = request.headers.get('range');
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range); const start = match?.[1] ? Number(match[1]) : Math.max(0, buffer.length - Number(match?.[2])); const end = match?.[1] ? (match[2] ? Number(match[2]) : buffer.length - 1) : buffer.length - 1;
      if (!match || (!match[1] && !match[2]) || start > end || start >= buffer.length || end >= buffer.length) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${buffer.length}` } });
      headers.set('Content-Range', `bytes ${start}-${end}/${buffer.length}`); headers.set('Content-Length', String(end-start+1)); return new Response(new Uint8Array(buffer.subarray(start,end+1)), { status: 206, headers });
    }
    headers.set('Content-Length', String(buffer.length)); return new Response(new Uint8Array(buffer), { headers });
  } catch { return new Response('Not found', { status: 404 }); }
}
