# FileVault — React Port (Vault page)

A Vite + React + TypeScript scaffold porting **index.html** (the student Vault)
from the original vanilla-JS FileVault app. Built from scratch to match the
original's dark glassmorphism design and Supabase data model.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

Put `filevault-logo.png` in `/public` (used by the sidebar/header).

## What's included (working)

- **Auth** — `AuthContext` wraps Supabase session state, exposes `profile` (name/avatar/verified).
- **Settings** — `SettingsContext` ports the original `fvTheme` / `fvHighContrast` /
  `fvFontSize` / `fvAccent` / `fvCompactView` localStorage keys 1:1, so switching
  themes here still round-trips through the same keys the old HTML pages used
  (handy if you migrate page-by-page and run both side by side for a while).
- **Data layer** — `useFiles` fetches `files_list` from Supabase, matches the
  original's session cache (`fvFilesCache`, 60s TTL) and scheduled-file filtering,
  and subscribes to Realtime `postgres_changes` for live updates.
- **Filtering/sorting** — `useFilteredFiles` / `useFolders` reproduce the search,
  folder, type-filter (`pdf`/`pptx`/`docx`/`xlsx`/`img`), and sort logic from
  `getFilteredFiles()` in the original.
- **UI** — `FileCard`, `FileGrid`, `FolderGrid`, `TypeFilterPills`, `SearchBar`,
  `FileControls` (view/sort/select-all), `BulkBar`, `PreviewModal`, `Header`,
  `Sidebar`, `MobileNav`, `SettingsPanel`.

### Phase 2 — Engagement features (done)

- **Ratings (👍 likes)** — `useRatings` batch-loads counts for visible file
  cards; `RatingBadge` on each card toggles the current anonymous/user key's like.
- **Emoji reactions** — `useReactions` (per-file, used in the preview modal) +
  `ReactionBar` with the same grouped emoji picker as the original.
- **Comments** — `useComments` (load/post/edit/delete, scoped to the current
  `fvUserKey` or signed-in `user_id`) + `CommentThread` in the preview modal.
- **View counts** — `useViewCounts` batch-loads distinct-viewer counts for
  cards; `trackView()` records a view (once per user key) when the preview opens.

These all read/write directly to Supabase — no backend route needed. **Run
this SQL once** in your Supabase SQL editor if these tables don't already
exist (they're the same ones the original vanilla-JS app used):

```sql
create table if not exists file_ratings (
  file_id text not null,
  user_key text not null,
  created_at timestamptz default now(),
  primary key (file_id, user_key)
);

create table if not exists file_reactions (
  file_id text not null,
  user_key text not null,
  emoji text not null,
  created_at timestamptz default now(),
  primary key (file_id, user_key, emoji)
);

create table if not exists file_views (
  file_id text not null,
  user_key text not null,
  last_viewed timestamptz default now(),
  primary key (file_id, user_key)
);

create table if not exists file_comments (
  id uuid primary key default gen_random_uuid(),
  file_id text not null,
  file_name text,
  user_key text not null,
  user_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz
);

alter table file_ratings enable row level security;
alter table file_reactions enable row level security;
alter table file_views enable row level security;
alter table file_comments enable row level security;

-- Public read/write for all four — mirrors the original app's anon-key model.
-- Tighten these later if you want per-user delete/update restrictions.
create policy "public read/write" on file_ratings for all using (true) with check (true);
create policy "public read/write" on file_reactions for all using (true) with check (true);
create policy "public read/write" on file_views for all using (true) with check (true);
create policy "public read/write" on file_comments for all using (true) with check (true);
```

## What's intentionally stubbed / not yet ported

The original `index.html` has ~80 features crammed into one file. Porting all
of them at once would produce something too large to review. These are marked
with comments at the relevant spot and are natural next PRs:

- **ZIP bulk download** — `BulkBar.tsx` has a `handleZip` stub; wire up `jszip`
  (`npm i jszip`) the same way the original does.
- **Download counter RPC** — `FileCard.tsx` has the `increment_download_count`
  call commented out; uncomment once your Supabase RPC is confirmed.
- **Bookmarks / collections / offline pin (IndexedDB)** — all localStorage or
  IndexedDB-backed; good candidates for a `useBookmarks` / `useOfflinePins` hook.
- **Push notifications + service worker** — needs a `Sw.js` equivalent and the
  VAPID subscribe/unsubscribe flow from `server.js`'s `/api/push/*` routes.
- **Notifications drawer / AI chat widget** — bigger standalone features;
  build as their own components once the core vault is solid.
- **Study Mode, quiz, keyboard shortcuts modal, drag-select** — nice-to-haves,
  lowest priority.

## Project structure

```
src/
  context/       Auth, Settings (theme), Toast
  hooks/         useFiles (data fetch + realtime), useFilteredFiles (derived state)
  components/
    layout/      Header, Sidebar, MobileNav, SettingsPanel
    vault/       FileCard, FileGrid, FolderGrid, TypeFilterPills,
                 SearchBar, FileControls, BulkBar, PreviewModal
  pages/
    VaultPage.tsx   assembles everything — this is the React equivalent of index.html
  types/         VaultFile, ViewType, SortType, TypeFilter, UserProfile, ThemeSettings
  utils/         fileDisplay.ts — icon/color/size/date helpers
  lib/
    supabase.ts  Supabase client (reads from import.meta.env)
```

## Next page to port

Once the Vault feels solid, Login (`login.html`) is the natural next target —
`AuthContext` here is already set up to receive it; you'd just need sign-in/up
forms that call `supabase.auth.signInWithPassword` / `signUp` / OAuth methods.
