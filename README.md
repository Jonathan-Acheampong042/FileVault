# FileVault

FileVault is a lightweight, installable web app for sharing and managing files (e.g. lecture slides, notes, and course materials) with a group of students or users. It's built with plain HTML/JS, Tailwind CSS, and Supabase for storage, the database, and auth.

## Pages

- **`index.html`** — the user-facing vault. Browse folders, search/filter files, preview and download, request missing files, enable push notifications for new uploads, react to files with emoji, and view personalised suggestions based on browsing history.
- **`manager.html`** — the admin dashboard. Upload single or multiple files, organise folders, schedule uploads, post announcements, review and fulfil file requests, run analytics, check for broken links, and send push notifications to all subscribers.
- **`login.html`** — manager authentication, backed by Supabase Auth (Google OAuth).
- **`upload-request.html`** — a form users can submit to request a file that isn't in the vault yet. Includes push opt-in so the requester is notified on approval and a QR code linking back to the vault.
- **`profile.html`** — user profile page. Students can view their account details, manage notification preferences, and permanently delete their account.
- **`privacy.html`** — Privacy Policy page, required for Google OAuth consent screen approval.
- **`terms.html`** — Terms of Service page.

## Scripts

- **`chat-widget.js`** — AI assistant widget embedded in `index.html` and `manager.html`. Serves different system prompts per page (user vs. manager context). Routes requests through the Express backend to keep the Groq API key server-side.
- **`upload-request.js`** — scoped IIFE handling form submission, push opt-in, request token display and copy, status polling, and rate limiting for `upload-request.html`.
- **`Sw.js`** — service worker. Cache-first for static assets, network-first for HTML and `chat-widget.js`, push notification handling, background sync for queued chat messages, and periodic cache pre-warming.

## How it works

- **Storage & database**: files live in a Supabase Storage bucket (`vault-files`), with metadata (name, folder, description, size, download URL) tracked in the `files_list` table.
- **Live updates**: `index.html` subscribes to Supabase Realtime so new uploads and announcements appear automatically without a manual refresh, with a polling fallback if Realtime is unavailable. Refreshes are deferred while a user is actively searching, selecting files, or has a preview open.
- **Push notifications**: the Express backend (`server.js`) handles Web Push subscriptions stored in Supabase and sends notifications when new files are uploaded, when a user's file request is approved, or when files are about to expire.
- **AI assistant**: the chat widget sends messages to `/api/chat` on the Express backend, which calls the Groq API (Llama 3.1). The manager dashboard also uses `/api/summarise` to auto-generate file descriptions on upload.
- **Offline & install support**: `Sw.js` and `Manifest.json` make FileVault installable as a PWA, caching static assets while always fetching fresh HTML.
- **File requests**: users submit requests via `upload-request.html`; managers review them in `manager.html`, upload the matching file(s), and the requester is notified via push once approved.
- **Account deletion**: `profile.html` calls `POST /api/delete-account` on the backend. The server validates the user's access token, cleans up associated rows, and calls `supabase.auth.admin.deleteUser()` — the anon key held by the browser cannot do this.

## Tech stack

- HTML, vanilla JavaScript, Tailwind CSS
- [Supabase](https://supabase.com/) (Postgres, Storage, Auth, Realtime)
- Node.js + Express for the backend (AI chat, push notifications, cron jobs), deployed on Render
- [Groq](https://groq.com/) (Llama 3.1 8B Instant) for AI chat and file summarisation
- Web Push (VAPID) for browser notifications
- JSZip for client-side bulk ZIP downloads

## Supabase tables

| Table | Purpose |
|---|---|
| `files_list` | File metadata (name, folder, description, size, URL, expiry, scheduled release) |
| `announcements` | Manager-posted announcements with optional expiry and event countdown |
| `upload_requests` | Student file requests (status, manager note, push subscription) |
| `push_subscriptions` | Web Push endpoints (server-side, service role only) |
| `file_ratings` | Per-user 👍 likes on files |
| `file_reactions` | Per-user emoji reactions on files |
| `file_views` | Distinct student view counts per file |
| `user_profiles` | User role (`student` / `admin` / `manager`) |

## Backend API routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/chat` | AI chat (Groq) |
| `POST` | `/api/summarise` | Auto-generate file description (Groq) |
| `GET` | `/api/push/vapid-public-key` | Returns VAPID public key |
| `POST` | `/api/push/subscribe` | Save push subscription |
| `POST` | `/api/push/unsubscribe` | Remove push subscription |
| `POST` | `/api/push/notify` | Notify all subscribers (manager, requires secret) |
| `POST` | `/api/push/notify-one` | Notify a single subscriber by endpoint |
| `POST` | `/api/push/notify-manager` | Notify all subscribers of a new file request |
| `GET` | `/api/push/cleanup` | Prune stale push subscriptions (cron) |
| `GET` | `/api/announcements` | Fetch latest active announcement |
| `POST` | `/api/announcements` | Create announcement (requires secret) |
| `DELETE` | `/api/announcements/:id` | Delete announcement (requires secret) |
| `GET` | `/api/file-requests` | List all file requests (requires secret) |
| `PATCH` | `/api/file-requests/:id` | Update request status/note (requires secret) |
| `GET` | `/api/cron/expiry-check` | Push expiry warnings and prune expired files (cron) |
| `GET` | `/api/cron/announcement-cleanup` | Delete expired announcements (cron) |
| `POST` | `/api/delete-account` | Permanently delete a user's account (validates JWT) |

## Google OAuth Setup

FileVault uses Google Sign-In via Supabase Auth. To configure it:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → OAuth consent screen**
2. Set the app name to **FileVault** and add the logo
3. Under **App domain**, set:
   - Homepage URL: `https://filevault.works`
   - Privacy Policy URL: `https://filevault.works/privacy.html`
   - Terms of Service URL: `https://filevault.works/terms.html`
4. Add `filevault.works` as an **Authorized domain**
5. Under **Credentials**, ensure the redirect URI includes:
   ```
   https://<your-supabase-project-id>.supabase.co/auth/v1/callback
   ```
6. **Publish** the app (move out of Testing mode) so the consent screen shows "FileVault" instead of the raw Supabase URL

## Running the backend locally

```bash
npm install
npm start        # node server.js
npm run dev      # node --watch server.js (auto-restart on changes)
```

Set the following environment variables (in a `.env` file):

```
PORT=3000
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

`PUSH_SECRET` is used to protect the `/api/push/notify`, `/api/push/cleanup`, `/api/cron/*`, `/api/announcements` (write), and `/api/file-requests` endpoints. Without it those routes are unprotected — always set it in production.

---

Built by Jonathan Acheampong