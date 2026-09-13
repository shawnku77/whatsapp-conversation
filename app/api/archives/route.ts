import { isAdmin, sameOrigin } from '@/lib/auth';
import { MAX_UPLOAD, saveArchive } from '@/lib/archive';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!await isAdmin()) return Response.json({ error: 'Please sign in.' }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  if (Number(request.headers.get('content-length')) > MAX_UPLOAD + 1024 * 1024) return Response.json({ error: 'Maximum ZIP size is 250 MB.' }, { status: 413 });
  try {
    // Bound the body even for chunked requests that omit Content-Length.
    const reader = request.body?.getReader(); if (!reader) throw new Error('Select a ZIP file.');
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) { const next = await reader.read(); if (next.done) break; bytes += next.value.length; if (bytes > MAX_UPLOAD + 1024 * 1024) { await reader.cancel(); return Response.json({ error: 'Maximum ZIP size is 250 MB.' }, { status: 413 }); } chunks.push(next.value); }
    const form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers.get('content-type') || '' } }).formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.zip')) throw new Error('Select a WhatsApp ZIP export.');
    if (file.size > MAX_UPLOAD) return Response.json({ error: 'Maximum ZIP size is 250 MB.' }, { status: 413 });
    const info = await saveArchive(Buffer.from(await file.arrayBuffer()), file.name); return Response.json(info, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error && /Archive exceeds|No supported|Select a/.test(error.message) ? error.message : 'Unable to read this ZIP. Check that the export is valid and try again.' }, { status: 400 }); }
}
