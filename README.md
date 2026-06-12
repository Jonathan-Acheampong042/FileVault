# FileVault

FileVault is a lightweight, installable web app for sharing and managing files (e.g. lecture slides, notes, and course materials) with a group of students or users. It's built with plain HTML/JS, Tailwind CSS, and Supabase for storage, the database, and auth.

## Pages

- **`index.html`** — the user-facing vault. Browse folders, search/filter files, preview and download, request missing files, and enable push notifications for new uploads.
- **`manager.html`** — the admin dashboard. Upload single or multiple files, organize folders, schedule uploads, post announcements, review and fulfil file requests, run analytics, and check for broken links.
- **`login.html`** — manager authentication, backed by Supabase Auth.
- **`upload-request.html`** — a simple form users can submit to request a file that isn't in the vault yet.

## How it works

- **Storage & database**: files live in a Supabase Storage bucket (`vault-files`), with metadata (name, folder, description, size, download URL) tracked in the `files_list` table.
- **Live updates**: `index.html` subscribes to Supabase Realtime so new uploads and announcements appear automatically without a manual refresh, with a polling fallback if Realtime is unavailable. Refreshes are deferred while a user is actively searching, selecting files, or has a preview open.
- **Push notifications**: a small Express server (`server.js`) handles Web Push subscriptions and sends notifications when new files are uploaded or when a user's file request is approved.
- **Offline & install support**: `Sw.js` (service worker) and `Manifest.json` make FileVault installable as a PWA, caching static assets while always fetching fresh HTML.
- **File requests**: users submit requests via `upload-request.html`; managers review them in `manager.html`, upload the matching file(s), and the requester is notified once approved.

## Tech stack

- HTML, vanilla JavaScript, Tailwind CSS
- [Supabase](https://supabase.com/) (Postgres, Storage, Auth, Realtime)
- Node.js + Express for the push-notification backend, deployed on Render
- Web Push (VAPID) for browser notifications

## Running the backend locally

```bash
npm install
npm start
```

Set the following environment variables (in a `.env` file):

```
GROQ_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
PUSH_SECRET=...
```

VAPID keys can be generated with:

```bash
npx web-push generate-vapid-keys
```

---

Built by Jonathan Acheampong