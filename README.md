# PropertyLab Conversation Archive

A Next.js App Router application for privately uploading WhatsApp ZIP exports and sharing read-only conversations. No database: each archive is kept as its original ZIP with a small JSON metadata sidecar. Every conversation request parses the original ZIP again; metadata is used only for the admin library. Attachments are read in memory and never extracted to disk.

## Local use

```powershell
cd C:\Users\zhish\work\whatsapp-conversation
npm install
npm run dev
```

Open http://localhost:3000. The requested administrator password is configured in `.env.local`, which is excluded from Git. Keep `SESSION_SECRET` private. Use `.env.example` when configuring another machine; generate a random secret of at least 32 characters. There is one administrator password, no user database. Sessions last 12 hours; changing the password invalidates existing sessions. Failed logins are limited per server process.

Export a WhatsApp chat **with media**, then upload the ZIP. The library supports searching, reopening, and copying each conversation's permanent random link. Shared readers need no password: everyone who receives the link can view its messages and download attachments. Treat that link as private. This version does not implement per-person permissions or expiring links. To revoke one archive, stop the server and remove its matching `data/<id>.json` and `data/<id>.zip` pair after backing up if needed.

## Vercel deployment (Private Blob, no database)

1. In the `whatsapp-conversation` project's **Storage** section, create or connect a **Blob** store. Select **Private** access. Name it `whatsapp-archives` and connect it to **Production** (and Preview only if you want previews to access the same conversations).
2. Confirm Vercel added `BLOB_READ_WRITE_TOKEN` to the project's environment variables. Keep this server-only token private; do not paste it into chat or commit it.
3. Keep `ADMIN_PASSWORD`, a random `SESSION_SECRET` of at least 32 characters, and `COOKIE_SECURE=true`. **Remove `DATA_DIR` on Vercel.** `APP_ORIGIN` is optional; set it to the exact origin only if you want to restrict login/upload requests to one hostname.
4. Redeploy after connecting storage or changing environment variables. Log in and upload the original ZIP again. Local `data` files are not uploaded to GitHub or automatically migrated.

When running on Vercel, the app never writes archives to the local filesystem. If the Blob token is missing, administrators see setup instructions instead of the previous archive error. Browser multipart uploads go directly to Blob, avoiding the Function request-body size limit. Only authenticated administrators can obtain upload tokens, scoped to one ZIP path. The ZIP is validated server-side before its metadata is published. A signed upload-completion callback and an authenticated completion request support ingestion; the browser offers **Retry processing uploaded ZIP** if completion fails.

Original ZIPs live under `archives/<id>.zip`; small index files live under `metadata/<id>.json`. Both are private. Conversations are regenerated from ZIPs on every open. Media responses are streamed and support byte ranges, including inline PDF previews and explicit downloads. A one-minute, single-ZIP cache on each warm server instance reduces repeated downloads for attachments; cold instances still fetch the full ZIP. Reading large archives frequently consumes storage transfer and Function resources.

The implementation uses a 300-second maximum Function duration. Verify the linked Private Blob store with a real upload, page reload, anonymous share link, and large media download after deployment; local tests cannot validate your account's store permissions or Vercel network delivery. Check the latest [Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) and [Hobby usage eligibility](https://vercel.com/docs/plans/hobby); free usage is limited, and Hobby is for personal non-commercial use.

To revoke a cloud archive, remove its metadata file and ZIP from the Blob store. In-progress/cached responses can persist briefly. Invalid ZIPs or interrupted uploads without metadata can be removed from `archives/` in the Blob dashboard. Back up files before deleting anything you need.

## Local or persistent-server deployment

Without Vercel or a Blob token, the app retains its local filesystem mode. Run on a Node.js server with a **persistent writable disk**. Set `DATA_DIR` to the disk's absolute path, `ADMIN_PASSWORD`, `SESSION_SECRET`, `COOKIE_SECURE=true` for HTTPS, and optionally `APP_ORIGIN` to the exact public origin. Never expose `data` as static files. Back up the entire data directory. Do not deploy as a static export.

```powershell
npm run build
npm start
```

Configure your reverse proxy to allow uploads over 250 MB including multipart overhead, use HTTPS, and allow enough upload time. A single Node.js instance is intended; budget memory for compressed ZIPs and attachment decompression. Uploads are limited to 250 MB, 15,000 entries and 1 GB total uncompressed size. For larger workloads use a queued ingestion service and object storage instead.

Share addresses use the site's current origin. A localhost link works only on the same computer. Use a reachable server hostname/domain before sharing with colleagues. No production deployment is included.

## Supported exports and limits

- iPhone bracketed timestamps and Android date/time exports, multiline text, group senders, and system events.
- Dates and times are displayed as exported, because the export has no timezone and numeric date order can be ambiguous.
- Pictures, browser-supported audio/video, and document downloads. MOV/OPUS support depends on the browser/codec; download the original if playback is unavailable.
- Text-only exports still work. Omitted attachments cannot be reconstructed. Only attachments referenced in the conversation are served.
- Search and selectable sender perspective; first 300 matching messages initially rendered with a load-more option.
- Metadata and uploaded conversations are private local data and excluded from Git.

## Verification

```powershell
npm test
npm run typecheck
npm run build
```

Implementation follows Next.js [Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route).
