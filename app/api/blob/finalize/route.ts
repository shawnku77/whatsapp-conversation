import { isAdmin, sameOrigin } from '@/lib/auth';
import { finalizeCloudArchive } from '@/lib/archive';
import { uploadIdentity } from '@/lib/upload-policy';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function POST(request: Request) {
  if (!await isAdmin()) return Response.json({ error: 'Please sign in.' }, { status: 401 });
  if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const body = await request.json(); const identity = uploadIdentity(body.pathname, JSON.stringify({ filename: body.filename }));
    return Response.json(await finalizeCloudArchive(identity.id, identity.filename), { status: 201 });
  } catch { return Response.json({ error: 'The ZIP was uploaded but could not be opened. Check it is a valid WhatsApp export, then retry processing.' }, { status: 400 }); }
}
