import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { isAdmin, sameOrigin } from '@/lib/auth';
import { MAX_UPLOAD, finalizeCloudArchive } from '@/lib/archive';
import { storageReady, cloudStorage } from '@/lib/storage';
import { uploadIdentity } from '@/lib/upload-policy';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function POST(request: Request) {
  if (!cloudStorage() || !storageReady()) return Response.json({ error: 'Connect a Private Blob store first.' }, { status: 503 });
  try {
    const body = await request.json() as HandleUploadBody;
    if (body.type === 'blob.generate-client-token' && (!await isAdmin() || !sameOrigin(request))) return Response.json({ error: 'Please sign in.' }, { status: 401 });
    const result = await handleUpload({ request, body, token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, payload) => {
        if (!await isAdmin() || !sameOrigin(request)) throw new Error('Unauthorized');
        const identity = uploadIdentity(pathname, payload);
        return { allowedContentTypes: ['application/zip'], maximumSizeInBytes: MAX_UPLOAD, addRandomSuffix: false, allowOverwrite: false, validUntil: Date.now() + 3600000, tokenPayload: JSON.stringify(identity) };
      },
      // SDK verifies the callback signature; this request has no browser session.
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const identity = uploadIdentity(blob.pathname, tokenPayload || null);
        await finalizeCloudArchive(identity.id, identity.filename);
      },
    });
    return Response.json(result);
  } catch { return Response.json({ error: 'Unable to process upload. Check the ZIP and Private Blob connection.' }, { status: 400 }); }
}
