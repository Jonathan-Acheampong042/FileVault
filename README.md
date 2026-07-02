<div align="center">

<img src="https://filevault.works/filevault%20logo.png" alt="FileVault Logo" width="80"/>

# FileVault

**A student-built file library for university course materials.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-filevault.works-blue?style=flat-square)](https://www.filevault.works)
[![Built with Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Auth%20%7C%20Realtime-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=flat-square)](https://www.filevault.works)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=flat-square&logo=node.js)](https://nodejs.org)

</div>

---

## The Problem

At the University of Ghana, getting lecture slides has always been a hustle. Students wait for lecturers who may never upload them on time, chase seniors or course representatives on WhatsApp, or dig through someone's Google Drive hoping the file they need is actually there. Materials get scattered, lost, or hoarded and the cycle repeats every semester.

FileVault was built to fix that. One central place where course materials are organised by folder, searchable, previewable, and downloadable and where students can request what's missing.

It started as a solution for the CS department (DCIT courses, CBAS, MATH) within the constraints of a free-tier stack. The architecture is designed to scale further.

---

## What It Looks Like

### The Vault — browse, search, and download

![FileVault — signed in vault view showing course folders](FileVault/USER%20PAGE%20(WEB%20SIGNED)%20DESKTOP.png)

Students land on a personalised vault showing recently viewed files, AI-powered suggestions based on browsing history, and organised course folders. Files can be bulk-selected and downloaded as a ZIP.

### The AI Assistant

![FileVault — AI chat widget open in the vault](FileVault/CHATBOT%20(WEB%20SIGNED)%20DESKTOP.png)

An embedded AI assistant (powered by Groq/GPT-OSS 20B) helps students find files, filter by folder, and navigate the vault without ever leaving the page.

### File Requests

![FileVault — file request form for signed-in student](FileVault/REQUEST%20PAGE%20(WEB%20SIGNED)%20DESKTOP.png)

If a file isn't in the vault yet, students can submit a request. The manager reviews it, uploads the matching file, and the student gets a push notification when it's ready.

### Authentication

![FileVault — sign-in page](FileVault/LOGIN%20PAGE%20(WEB)%20DESKTOP.png)

Multiple sign-in options: email/password, magic link, one-time password (OTP), and social login via Google, Discord, or GitHub. hCaptcha protects all forms. Optional two-factor authentication (TOTP) is available post-login.

### Profile & Settings

![FileVault — student profile page](FileVault/PROFILE%20PAGE%20(WEB)%20DESKTOP.png)

Students manage display names, student info, notification preferences, connected accounts, and data privacy including a full account deletion flow handled server-side.

---

## Features

**For students**
- Browse and search files across all course folders
- Preview PDFs and documents in-browser
- Bulk download selected files as a ZIP
- Request missing materials directly from the vault
- Personalised suggestions based on browsing history
- Push notifications for new uploads and fulfilled requests
- Bookmarks, collections, and pinned offline files
- Installable as a PWA (works offline, add to home screen)

**For managers**
- Upload single or multiple files; auto-generate descriptions with AI
- Organise folders, schedule future uploads, set file expiry
- Post announcements with optional countdowns
- Review and fulfil student file requests
- Run analytics; check for broken links
- Send push notifications to all subscribers

> A separate password-protected manager dashboard handles all of the above. It is not publicly accessible.

**Auth & security**
- Email/password, magic link, OTP, Google/Discord/GitHub OAuth
- hCaptcha on all auth forms
- Optional TOTP two-factor authentication
- Row Level Security on all Supabase tables
- Server-side account deletion (service role, not anon key)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | HTML, vanilla JavaScript, Tailwind CSS |
| Database & Storage | Supabase (Postgres, Storage, Realtime, Auth) |
| Backend | Node.js + Express (deployed on Render) |
| AI | Groq — GPT-OSS 20B |
| Push Notifications | Web Push (VAPID) |
| Offline / PWA | Service Worker + Web App Manifest |
| Bulk Downloads | JSZip (client-side) |

---

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Student vault — browse, search, preview, download, request files, AI chat |
| `manager.html` | Admin dashboard — upload, organise, schedule, analytics, push notifications |
| `login.html` | Authentication — email, magic link, OTP, social login, 2FA |
| `upload-request.html` | File request form with push opt-in and request tracking |
| `profile.html` | Student profile, notification preferences, account deletion |
| `privacy.html` | Privacy Policy (required for Google OAuth) |
| `terms.html` | Terms of Service |

---

## Scripts

- **`chat-widget.js`** — AI assistant widget for `index.html` and `manager.html`. Routes requests through the Express backend to keep the Groq API key server-side. Serves different system prompts per page (student vs. manager context).
- **`upload-request.js`** — Scoped IIFE handling form submission, push opt-in, request token display, status polling, and rate limiting.
- **`Sw.js`** — Service worker. Cache-first for static assets, network-first for HTML and chat widget. Handles push notifications, background sync for queued chat messages, and periodic cache pre-warming.

---

## Supabase Tables

| Table | Purpose |
|---|---|
| `files_list` | File metadata (name, folder, description, size, URL, expiry, scheduled release) |
| `announcements` | Manager-posted announcements with optional expiry and event countdown |
| `upload_requests` | Student file requests (status, manager note, push subscription) |
| `push_subscriptions` | Web Push endpoints (service role only) |
| `file_ratings` | Per-user 👍 likes on files |
| `file_reactions` | Per-user emoji reactions on files |
| `file_views` | Distinct student view counts per file |
| `user_profiles` | User role (`student` / `admin` / `manager`) |

---

## Backend API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/chat` | AI chat (Groq) |
| `POST` | `/api/summarise` | Auto-generate file description (Groq) |
| `GET` | `/api/push/vapid-public-key` | Returns VAPID public key |
| `POST` | `/api/push/subscribe` | Save push subscription |
| `POST` | `/api/push/unsubscribe` | Remove push subscription |
| `POST` | `/api/push/notify` | Notify all subscribers (requires secret) |
| `POST` | `/api/push/notify-one` | Notify a single subscriber by endpoint |
| `POST` | `/api/push/notify-manager` | Notify manager of a new file request |
| `GET` | `/api/push/cleanup` | Prune stale push subscriptions (cron) |
| `GET` | `/api/announcements` | Fetch latest active announcement |
| `POST` | `/api/announcements` | Create announcement (requires secret) |
| `DELETE` | `/api/announcements/:id` | Delete announcement (requires secret) |
| `GET` | `/api/file-requests` | List all file requests (requires secret) |
| `PATCH` | `/api/file-requests/:id` | Update request status/note (requires secret) |
| `GET` | `/api/cron/expiry-check` | Push expiry warnings; prune expired files (cron) |
| `GET` | `/api/cron/announcement-cleanup` | Delete expired announcements (cron) |
| `POST` | `/api/delete-account` | Permanently delete a user account (validates JWT) |

---

## Running Locally

```bash
npm install
npm start        # node server.js
npm run dev      # node --watch server.js (auto-restart on changes)
```

Create a `.env` file with the following variables:

```env
PORT=3000
GROQ_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
PUSH_SECRET=...
```

Generate VAPID keys with:

```bash
npx web-push generate-vapid-keys
```

> `PUSH_SECRET` protects the `/api/push/notify`, `/api/push/cleanup`, `/api/cron/*`, `/api/announcements` (write), and `/api/file-requests` endpoints. Always set it in production.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → OAuth consent screen**
2. Set the app name to **FileVault** and add the logo
3. Under **App domain**, set:
   - Homepage URL: `https://filevault.works`
   - Privacy Policy URL: `https://filevault.works/privacy.html`
   - Terms of Service URL: `https://filevault.works/terms.html`
4. Add `filevault.works` as an **Authorized domain**
5. Under **Credentials**, add the redirect URI:
   ```
   https://<your-supabase-project-id>.supabase.co/auth/v1/callback
   ```
6. **Publish** the app (move out of Testing mode)

---

## How It Works

- **Storage & database** — files live in a Supabase Storage bucket (`vault-files`), with metadata tracked in the `files_list` table.
- **Live updates** — `index.html` subscribes to Supabase Realtime so new uploads and announcements appear automatically. Falls back to polling if Realtime is unavailable. Refreshes are deferred while a user is actively searching or has a preview open.
- **Push notifications** — the Express backend handles Web Push subscriptions and sends notifications when new files are uploaded, when a student's file request is approved, or when files are about to expire.
- **AI assistant** — the chat widget posts to `/api/chat`, which calls the Groq API (GPT-OSS 20B). The manager dashboard also uses `/api/summarise` to auto-generate file descriptions on upload.
- **Offline & install support** — `Sw.js` and `Manifest.json` make FileVault installable as a PWA, caching static assets while always fetching fresh HTML.
- **File requests** — students submit via `upload-request.html`; managers review and fulfil in `manager.html`; the student is notified via push on approval.
- **Account deletion** — `profile.html` calls `POST /api/delete-account`. The server validates the JWT, cleans up all associated rows, and calls `supabase.auth.admin.deleteUser()` — the anon key in the browser cannot do this.

---

## Development Approach

FileVault was designed and directed by the author. The core problem, system architecture, database schema, user flows, and product decisions were all defined before a line of code was written. AI tools were used to generate and iterate on the implementation.

The work that went into this project:

- **Problem definition** — identifying the real friction point (scattered, inaccessible course materials) and scoping a solution that students would actually use
- **System architecture** — designing the data model, RLS policies, backend API surface, PWA strategy, and real-time update approach
- **Product decisions** — file requests, AI assistant, push notifications, TOTP, bulk ZIP, study mode, personalised suggestions
- **Prompt engineering** — decomposing the application into logical components and writing precise instructions to guide code generation
- **Integration** — configuring Google OAuth, VAPID keys, Supabase Realtime, hCaptcha, and the PWA service worker into a cohesive deployed product

---

<div align="center">

Built by **Jonathan Acheampong** · University of Ghana · [filevault.works](https://www.filevault.works)

</div>