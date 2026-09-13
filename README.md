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

## Storage and deployment

Run on a Node.js server with a **persistent writable disk**. Set `DATA_DIR` to the disk's absolute path, `ADMIN_PASSWORD`, `SESSION_SECRET`, `COOKIE_SECURE=true` for HTTPS, and `APP_ORIGIN` to the exact public origin if the reverse proxy changes the internal request origin. Never expose `data` as static files. Back up the entire data directory. Do not deploy this filesystem-only implementation to an ephemeral serverless filesystem or as a static export.

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
