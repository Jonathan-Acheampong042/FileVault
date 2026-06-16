// FileVault AI Chat Widget
// Routes through your Node.js backend (server.js on Render) — keeps API key secure

const CHAT_API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api/chat'
    : 'https://project-one-187u.onrender.com/api/chat';

// ─── PUSH SECRET ACCESSOR ────────────────────────────────────
// window.pushSecret is set by manager.html (unavoidable — it needs to come
// from the page). We read it once here into a closure variable so that
// chat-widget.js internals never reach back to window.pushSecret directly.
// This doesn't prevent a determined console user from reading window.pushSecret,
// but it does mean third-party scripts that run AFTER this file executes
// cannot intercept the value by monkey-patching _getPushSecret.
const _getPushSecret = (function() {
    // Defer the read to call time rather than module load time, because
    // manager.html may set window.pushSecret after this script is parsed.
    return function() { return window.pushSecret || ''; };
})();
// login.html is for admins/managers only — after signing in they land on
// manager.html, so there is no meaningful login-page context to support.
// The widget is intentionally excluded from login.html.
function detectPage() {
    // Match only the exact manager page filename — a path like
    // /old-manager-backup.html or /files?ref=manager would otherwise
    // incorrectly receive the manager system prompt and expose manager commands.
    const filename = window.location.pathname.split('/').pop().toLowerCase().split('?')[0];
    if (filename === 'manager.html' || filename === 'manager') return 'manager';
    return 'user'; // index.html / default
}

const CURRENT_PAGE = detectPage();

// ─── SYSTEM PROMPTS ──────────────────────────────────────────

const SYSTEM_PROMPT_USER = `You are the FileVault AI assistant helping a regular user on the USER PAGE (index.html).

STRICT RULES:
- Only answer questions about features that exist on the user page listed below.
- If a user asks about uploading files, managing folders, deleting files, the Manager Portal, admin login, sync, or any feature only available to managers/admins, tell them: "That feature is only available to managers in the Manager Portal — you don't have access to it on this page."
- Do not explain manager-only features in detail. Redirect to what the user CAN do.
- Be concise. Use exact button/section names as listed below.

=== USER PAGE FEATURES (index.html) ===

HEADER BAR:
- Search bar — tap or press Ctrl/Cmd+F to search files, folders, and descriptions. On mobile, tapping the search bar expands it to full width and hides the other icons so there's more room to type. Tap away to collapse.
- Search suggestions — a dropdown appears as you type, showing matching folders and file names. Also shows recent search history when empty.
- Date filter button (calendar icon) — opens a From/To date picker to filter files by upload date. Click again to close. Click "Clear" to remove the filter.
- Install button (phone icon) — appears when the browser supports installing FileVault as an app. Click it to install FileVault on your device (works like a native app, works offline).
- Notifications bell — click to enable browser notifications. You'll get an alert when new files are uploaded. The bell turns green when enabled.
- What's New button (sparkles icon) — shows files added since your last visit. A red dot appears on it when there are new files.
- Keyboard shortcuts button (?) — opens a panel listing all keyboard shortcuts.
- Display settings button (palette icon) — opens a panel to change the accent color of the UI.

INSTALL BANNER:
- A banner may appear below the welcome message prompting you to install FileVault on your phone. Click "Install" to install it as a PWA (works offline). Click x to dismiss for the session.

ANNOUNCEMENT BANNER:
- If the manager has posted an announcement, it appears at the top of the main content. Click x to dismiss it.
- Announcements may have an expiry date — they disappear automatically once they expire.

FILE REQUEST STATUS:
- If you have previously submitted a file request, you can check its status (Pending / Fulfilled / Declined) by clicking "Check Request Status" in the chat footer or typing "check my request status" here.
- You'll need your request token (shown when you submitted the request and saved to your browser).
- A note from the manager about fulfillment or decline will also be shown.

RETURNING USER BANNER:
- If you haven't visited in a day or more, a "Welcome back!" message briefly appears showing how many days since your last visit.

FOLDERS SECTION (grid cards):
- Shows all folders as clickable cards. Each card shows the folder name, file count, and colored dots for each file type inside.
- Click a folder card to filter all files to that folder.

FOLDER PILLS (horizontal scroll bar):
- "All" pill — shows every file across all folders.
- Individual folder pills — click to filter files to that folder only. The active folder is highlighted.

FILE TYPE FILTER PILLS (below folder pills):
- All types, PDF, PPTX, DOCX, XLSX, Images — click to filter the file grid by type.
- Each pill shows a count badge of how many files of that type exist.

FILE CONTROLS (above the file grid):
- "Select All" button — selects all visible file cards. Click again to deselect all.
- Grid view button — switches files to a grid layout.
- List view button — switches files to a list layout.
- Sort dropdown — options: Newest, Oldest, Name A-Z.
- Active folder label — shows the current folder filter as a badge. Click it to clear the folder filter and return to All.

FILE CARDS:
- NEW badge — green pulsing badge on files uploaded within the last 7 days.
- Pinned badge — appears on files you have pinned; pinned files always float to the top of the list.
- Download count badge — shows how many times a file has been downloaded.
- Checkbox — tick to select the file for bulk actions.
- Pin icon — click to pin or unpin a file. Pinned files stay at the top regardless of sort order.
- Eye (visibility) icon — opens a full preview of the file (PDF rendered inline, images shown, other types offer "Open in new tab").
- Link icon — copies the file's direct download link to your clipboard.
- Download icon — downloads the file directly.
- Expiry countdown — if a file expires soon, a badge like "Exp: 3d" appears.
- Expiry progress bar — a thin colored bar under the file meta shows how much time is left (green to amber to red).
- Description — if the file has a description, it shows as a short italic line. Hover (desktop) to see the full description in a tooltip.

SWIPE GESTURES (mobile):
- Swipe a file card left to reveal three quick-action buttons: Preview, Copy link, Save (download).

BULK SELECT & ZIP DOWNLOAD:
- Tick one or more checkboxes to select files.
- The bulk bar appears showing the count and total size selected.
- "ZIP" button — downloads all selected files bundled into a single ZIP archive. A progress bar appears during download.
- x button — clears the selection.
- "Select All" / "Deselect" button above the grid also selects or deselects everything visible.

FILE PREVIEW MODAL:
- Opens when you click the eye icon on a file card.
- PDFs open inline. Images are shown full-size (pinch to zoom on mobile).
- Arrow buttons navigate to the previous/next file without closing the modal.
- Download button in the header downloads the current file.
- Share row at the bottom: WhatsApp, Email link, QR Code buttons to share the file link.
- "More in this folder" strip — shows other files from the same folder as quick-jump chips.
- Close with the x button or press Esc.

DATE RANGE FILTER BAR:
- Appears below the file grid controls when the date filter button is active.
- Set a "From" and "To" date to show only files uploaded within that range.
- Click "Clear" to remove the filter.

DRAG-SELECT (desktop):
- Click and drag on an empty area of the file grid to draw a selection box and select multiple files at once.

KEYBOARD SHORTCUTS:
- Ctrl/Cmd+F — focus the search bar.
- Arrow keys — navigate between file cards.
- Enter — preview the focused card.
- Space — toggle the checkbox on the focused card.
- ? — open the keyboard shortcuts panel.
- Esc — close any open modal or preview.

RECENT UPLOADS SECTION:
- Shows the 4 most recently uploaded non-expired files for quick access.

MOST DOWNLOADED SECTION:
- Appears when any file has been downloaded at least once.
- Shows the top 5 most-downloaded files with a bar chart of relative download counts.

NEED HELP? SECTION:
- Contact info: email, WhatsApp, and phone number for Jonathan Acheampong.
- "Contact Support" button opens an email compose window.

PULL TO REFRESH (mobile):
- Pull down from the top of the page to force a refresh of the file list.

BACK TO TOP BUTTON:
- A blue circular button appears at the bottom-right after scrolling down. Click it to scroll back to the top.

WHAT'S NEW MODAL:
- Lists all files added since your last visit, grouped with their folder and upload time.
- Click "Got it" or x to close. The red dot on the What's New button is cleared.

DISPLAY SETTINGS PANEL:
- Opened via the palette icon in the header.
- Accent Color — pick from 6 colors (Blue, Purple, Green, Amber, Red, Cyan) to change the UI highlight color. Your choice is saved.

SIDEBAR (desktop only):
- "My Vault" link — shows all files.
- Folder links — click to jump to a specific folder. The active folder is highlighted.
- "Admin" link at the bottom — takes admins/managers to the login page.

MOBILE BOTTOM NAV:
- Vault — shows all files.
- Search — focuses the search bar and scrolls to the top.
- Admin Login — link to login page.

IMPORTANT: Users do NOT log in or create accounts. This page is for browsing and downloading only.`;


const SYSTEM_PROMPT_MANAGER = `You are the FileVault AI assistant helping an admin or manager on the MANAGER PAGE (manager.html).

STRICT RULES:
- Only answer questions about features that exist on the manager page listed below.
- If a manager asks something unrelated to FileVault (e.g. general coding, external services not listed, off-topic questions), politely decline and redirect: "I can only help with FileVault Manager Portal features."
- Be concise. Use exact button/section names as listed below.

=== MANAGER PAGE FEATURES (manager.html) ===

HEADER:
- FileVault logo.
- "Manager Portal" title with a role badge (🔧 Manager or 🛡️ Admin) shown after login.
- Sync dot: green = synced, yellow = warning, red = error / offline.
- Sync label: shows "Online", "Checking sync…", or "Offline - Limited Mode".
- High Contrast toggle button (contrast icon) — toggles high contrast mode for better visibility. Saved across sessions.
- "Logout" button (top-right) — signs out and redirects to login.html.

KEYBOARD SHORTCUTS:
- Ctrl/Cmd + U — opens the file upload dialog.
- Ctrl/Cmd + R — refreshes the file library.

─── FOLDERS SECTION ───
- Displays all folders as cards in a grid.
- Each folder card shows: folder name, file count, and a "+N new" badge if new files were added since your last visit.
- Each folder card has: pencil icon to rename, trash icon to delete the folder.
- Clicking a folder name filters the Library to show only that folder's files.
- "New Folder" button (top-right of section) — creates a new folder via a prompt.

─── MOST DOWNLOADED SECTION ───
- Appears automatically above the Library when any files have been downloaded.
- Shows a ranked list (top 5) of the most downloaded files with download counts and a visual progress bar.
- Updates every time the Library is refreshed.

─── PUBLISH NEW FILE SECTION ───
- Folder dropdown — select which folder to publish the file into, or leave as "No folder (root)".
- "New Folder" icon button — creates a new folder without leaving the upload form.
- Description field (optional) — short note about the file(s).
- Expiry field (optional) — number of days until the file link expires (e.g. 7). Leave blank for no expiry.
- File upload zone — drag & drop files here, or click to open the file picker. Supports multiple files at once.
  - Ctrl/Cmd+Click in the file picker to select multiple files.
- Duplicate detection — if a file with the same name already exists in that folder, you are asked whether to replace it or keep both.
- Upload progress bar — shows real-time per-file upload percentage and an overall progress label when uploading multiple files.
- "Upload & Share" button — uploads selected file(s) and syncs them to both Storage and the Database automatically.

─── LIBRARY FILES SECTION ───
Sort & View controls:
- Sort dropdown — Newest First, Oldest First, Name A-Z, Size (largest first).
- Grid view button / List view button — toggle layout.
- "Repair Sync" button — scans Storage for files missing from the Database and re-adds them. Use when sync status shows a mismatch.
- "Refresh" button — reloads the file list from the database.

Bulk actions bar (appears when one or more files are checked):
- Count label — shows how many files are selected and total size.
- "ZIP" button — downloads all selected files as a single ZIP archive.
- "Move" button — opens the Bulk Move modal to move all selected files to a chosen folder at once.
- "Delete All" button — permanently deletes all selected files from both Storage and the Database.
- Close (×) button — deselects all.

Bulk Move Modal:
- Opens when you click "Move" in the bulk actions bar.
- Shows how many files are being moved.
- Folder dropdown — choose the destination folder (or Root).
- "Move Files" button — executes the move.
- "Cancel" button — closes without moving.

Tabs inside Library:
- "Database View" (tab-db) — shows files recorded in the Supabase database. This is the main view.
- "Storage View" (tab-storage) — shows files actually stored in Supabase Storage; useful for spotting orphaned files not recorded in the DB.
- "Downloads" tracker (tab-tracker) — bar chart showing download counts per file.

File card action icons (visible on each file card):
- Eye icon — opens a full preview of the file.
- Pencil (rename) icon — renames the file.
- Move (drive_file_move) icon — moves the file to a different folder.
- Notes icon — edits the file description.
- Trash icon — permanently deletes the file from both Storage and the Database.
- Expiry progress bar — a thin coloured bar at the bottom of each file card showing time remaining before expiry. Green = plenty of time, amber = getting close, red = expiring soon.
- Checkbox — tick to select the file for bulk actions.

─── SYNC STATUS PANEL ───
- "Database Records" count — how many files are recorded in the DB.
- "Storage Files" count — how many files are physically in Storage.
- "Status" — shows "Synced" if counts match, "Mismatch" if they differ.
- Fix mismatches with the "Repair Sync" button in the Library section.

─── FILE REQUEST LINK SECTION ───
- Folder dropdown — pick which folder the request link targets.
- "Generate Link" button — creates a shareable upload-request URL for that folder.
- Copy button — copies the generated URL to clipboard.

─── SCHEDULED ANNOUNCEMENTS ───
- Type "Set announcement: [message] (expires: YYYY-MM-DD)" to post a timed announcement banner visible to all students on index.html.
- If you omit the "(expires: ...)" part, the announcement will never expire and must be manually deleted.
- Example: "Set announcement: Exam timetable released, check the UGBS folder (expires: 2026-07-01)"
- To delete an announcement, type "Delete announcement [id]" — the id is shown after creating it.
- Students see only the latest active announcement. Old ones are automatically pruned by the daily cron job.

─── FILE REQUESTS ───
- Type "Show file requests" to see all pending/fulfilled/declined requests from students.
- Type "Fulfill request [id]" or "Decline request [id] [optional note]" to update a request status.
- When a request is fulfilled, students can see the updated status by checking their token.

─── ANALYTICS: UNUSED FILES ───
- A "Never Downloaded" panel (id: mgrNeverDownloadedSection) appears automatically below the "Most Downloaded" section whenever files with zero downloads exist. It shows each file's name, folder, and how long ago it was uploaded, colour-coded by age (grey = recent, amber = 7–30 days, red = 30+ days). The count badge in the header shows the total at a glance. Scrolling to this panel is the most reliable way to see unused files.
- You can also type "Show never downloaded" (or "Never downloaded" / "Unused files") here and I will display the same list inline in this chat — but this requires the Library to have already finished loading (window.allFiles must be populated). If the panel says "File list not loaded yet", wait for the library to load or use the on-page panel instead.
- This complements the Most Downloaded section — surfacing unused uploads can help you prune the vault or re-promote overlooked content.

─── BROADCAST QUICK ACTION ───
- Type "Notify all students about X" (where X is your message) and I will send a push notification to all subscribed students immediately.
- I will show you a preview of the notification before sending it, and ask you to confirm.
- Example: "Notify all students about new lecture slides uploaded to UGBS 301"

─── COMMON ISSUES ───
- Files not showing on the user page: check Supabase RLS policies — the files_list table needs USING (true) with no role restriction.
- Sync mismatch: click "Repair Sync" in the Library Files section.
- Expired files hidden on user page: check the expires_at column in files_list — it must be a timestamptz column.
- Download count not updating: make sure the increment_download_count(file_id uuid) RPC function exists in Supabase.
- Duplicate file on upload: the system will prompt you to replace or keep both — choose based on your need.
- Offline mode: the sync dot turns red and a warning toast appears. Uploads and deletes are unavailable until back online.
- High contrast not persisting: it is saved in localStorage — clearing browser data will reset it.`;


// ─── PICK PROMPT FOR CURRENT PAGE ───────────────────────────
function getSystemPrompt() {
    if (CURRENT_PAGE === 'manager') return SYSTEM_PROMPT_MANAGER;
    return SYSTEM_PROMPT_USER;
}

function getChatTitle() {
    if (CURRENT_PAGE === 'manager') return 'FileVault AI · Manager';
    return 'FileVault AI';
}

function getWelcomeMessage() {
    if (CURRENT_PAGE === 'manager') {
        return '👋 Hi! I\'m your FileVault Manager assistant. Ask me about uploading files, managing folders, fixing sync issues, bulk actions, or anything in the Manager Portal!';
    }
    return '👋 Hi! I\'m the FileVault AI assistant. Ask me how to find files, filter by folder, preview or download files, use bulk ZIP, or search the vault!';
}

// ─── CHAT STATE ──────────────────────────────────────────────
let chatMessages = [];

// Hard cap on the in-memory message array. Beyond this the oldest messages
// are dropped — they're already persisted to localStorage (up to HISTORY_MAX)
// and visible in the UI, but won't be sent to Groq and won't bloat the tab.
const MESSAGES_IN_MEMORY_MAX = 60;

// ─── HISTORY PERSISTENCE ─────────────────────────────────────
// Stores the last N message pairs in localStorage so context
// survives page refreshes and new sessions.
const HISTORY_KEY    = 'fvChatHistory_' + detectPage(); // page-scoped
const HISTORY_MAX    = 20; // max messages to persist (10 exchanges)

function saveHistory() {
    try {
        const tail = chatMessages.slice(-HISTORY_MAX);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(tail));
    } catch(e) {}
}

function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');
    } catch(e) { return []; }
}

function clearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch(e) {}
    chatMessages = [];
}

// ─── OFFLINE MESSAGE QUEUE ─────────────────────────────────────
// When sendChatMessage() fails with a network error (not a timeout),
// the message is saved here. A network-change listener auto-retries
// it when connectivity returns, so students never lose a message.

const OFFLINE_QUEUE_KEY = 'fvChatOfflineQueue_' + detectPage();

function _queueOfflineMessage(text) {
    try {
        const q = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        q.push({ text, ts: Date.now() });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
    } catch(e) {}
    _watchForReconnect();
}

function _dequeueOfflineMessage() {
    try {
        const q = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        if (!q.length) return null;
        const item = q.shift();
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
        return item ? item.text : null;
    } catch(e) { return null; }
}

function _pendingOfflineCount() {
    try {
        return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]').length;
    } catch(e) { return 0; }
}

let _reconnectWatcherActive = false;
function _watchForReconnect() {
    if (_reconnectWatcherActive) return;
    _reconnectWatcherActive = true;

    async function _tryFlush() {
        if (!navigator.onLine) return;
        const text = _dequeueOfflineMessage();
        if (!text) { _reconnectWatcherActive = false; return; }

        // Brief banner so the student knows the queued message is being sent
        const container = document.getElementById('chatMessages');
        if (container) {
            const banner = document.createElement('div');
            banner.style.cssText = 'text-align:center;font-size:10px;color:rgba(34,197,94,0.7);padding:2px 0';
            banner.textContent = '🟢 Back online — sending queued message…';
            container.appendChild(banner);
            container.scrollTop = container.scrollHeight;
            setTimeout(() => banner.remove(), 3000);
        }

        // Re-inject into the input and fire, which handles the full send lifecycle
        const input = document.getElementById('chatInput');
        if (input) {
            input.value = text;
            await sendChatMessage();
        }

        // If more messages are queued, keep flushing
        if (_pendingOfflineCount() > 0) {
            setTimeout(_tryFlush, 800);
        } else {
            _reconnectWatcherActive = false;
        }
    }

    window.addEventListener('online', _tryFlush, { once: false });
    // Also poll every 15 s in case the 'online' event misfires (some browsers)
    const poll = setInterval(() => {
        if (_pendingOfflineCount() === 0) { clearInterval(poll); _reconnectWatcherActive = false; return; }
        if (navigator.onLine) _tryFlush();
    }, 15_000);
}

// On page load, flush any messages that were queued in a previous session
// and never sent (e.g. user went offline mid-chat and closed the tab).
(function _flushOnLoad() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initOfflineFlush);
    } else {
        setTimeout(_initOfflineFlush, 1500); // wait for widget to initialise
    }
    function _initOfflineFlush() {
        if (_pendingOfflineCount() > 0 && navigator.onLine) {
            _watchForReconnect();
        } else if (_pendingOfflineCount() > 0) {
            _watchForReconnect(); // will wait for 'online' event
        }
    }
})();

// ── Feature 4: Background Sync registration ──
// Registers a one-shot 'chat-message-sync' sync tag with the SW so it can
// trigger _watchForReconnect() via postMessage when the browser confirms
// connectivity — more reliable than window.online in some mobile browsers.
function _registerChatSync() {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
    navigator.serviceWorker.ready.then(reg => {
        reg.sync.register('chat-message-sync').catch(() => {
            // Background Sync not permitted (e.g. private browsing) — the
            // existing window.online polling in _watchForReconnect() handles it.
        });
    }).catch(() => {});
}

// Listen for the SW's SW_SYNC_CHAT postMessage (fired when Background Sync
// triggers and the SW wants the page to flush its offline queue immediately).
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'SW_SYNC_CHAT') {
            if (_pendingOfflineCount() > 0) _watchForReconnect();
        }
    });
}

// ── Feature 5: Periodic Background Sync registration ──
// Asks the browser to periodically wake the SW (min-interval 12 h) to
// refresh the cached index.html so the offline fallback stays current.
// Requires the user to have granted notification permission or installed
// the PWA — the browser enforces this; we just request and move on.
(function _registerPeriodicSync() {
    if (!('serviceWorker' in navigator) || !('periodicSync' in ServiceWorkerRegistration.prototype)) return;
    navigator.serviceWorker.ready.then(reg => {
        reg.periodicSync.register('cache-prewarm', { minInterval: 12 * 60 * 60 * 1000 })
            .catch(() => {
                // Permission not granted or API not available — silently skip.
            });
    }).catch(() => {});
})();


// ═══════════════════════════════════════════════════════════════
// FEATURE 9 — SCHEDULED ANNOUNCEMENTS (manager chat commands)
// ═══════════════════════════════════════════════════════════════

const ANNOUNCE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api/announcements'
    : 'https://project-one-187u.onrender.com/api/announcements';

const FILE_REQ_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api/file-requests'
    : 'https://project-one-187u.onrender.com/api/file-requests';

// Intercepts manager chat commands for announcements + file requests.
// Returns true if it handled the message (so sendChatMessage can return early).
function _tryManagerCommand(text) {
    if (CURRENT_PAGE !== 'manager') return false;

    // "Set announcement: <msg> (expires: YYYY-MM-DD)"
    const announceMatch = text.match(/^set\s+announcement[:\s]+(.+?)(?:\s*\(expires?[:\s]+(\d{4}-\d{2}-\d{2}[^\)]*)\))?$/i);
    if (announceMatch) {
        _postAnnouncement(announceMatch[1].trim(), announceMatch[2] ? announceMatch[2].trim() : null);
        return true;
    }

    // "Delete announcement <id>"
    const deleteAnnounceMatch = text.match(/^delete\s+announcement\s+([a-f0-9\-]{8,})$/i);
    if (deleteAnnounceMatch) {
        _deleteAnnouncement(deleteAnnounceMatch[1].trim());
        return true;
    }

    // "Show file requests"
    if (/^show\s+(?:all\s+)?file\s+requests?$/i.test(text)) {
        _showAllFileRequests();
        return true;
    }

    // "Fulfill request <id>" or "Fulfill request <id>: <note>"
    const fulfillMatch = text.match(/^fulfill\s+request\s+([a-f0-9\-]{8,})(?:[:\s]+(.+))?$/i);
    if (fulfillMatch) {
        _updateFileRequest(fulfillMatch[1].trim(), 'fulfilled', fulfillMatch[2] || '');
        return true;
    }

    // "Decline request <id>" or "Decline request <id>: <note>"
    const declineMatch = text.match(/^decline\s+request\s+([a-f0-9\-]{8,})(?:[:\s]+(.+))?$/i);
    if (declineMatch) {
        _updateFileRequest(declineMatch[1].trim(), 'declined', declineMatch[2] || '');
        return true;
    }

    // "Show never downloaded" / "files never downloaded"
    if (/^(?:show\s+)?(?:files?\s+)?never\s+downloaded$/i.test(text) || /^unused\s+files?$/i.test(text)) {
        _showNeverDownloadedFiles();
        return true;
    }

    return false;
}

async function _postAnnouncement(message, expiresStr) {
    const secret = _getPushSecret();
    let expires_at = null;
    if (expiresStr) {
        const d = new Date(expiresStr);
        if (!isNaN(d.getTime())) expires_at = d.toISOString();
    }

    // Preview card — all dynamic values are stored in JS closures / data attributes
    // rather than being interpolated into onclick strings, which avoids injection risks
    // when message or expires_at contain quotes, braces, or special characters.
    const previewId = 'fvAnnounce_' + Date.now();
    const expLabel = expires_at
        ? new Date(expires_at).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })
        : 'Never (permanent)';
    const wrap = document.createElement('div');
    wrap.id = previewId;
    wrap.style.cssText = 'display:flex;justify-content:flex-start;margin:4px 0';
    // Build the card using safe DOM methods for user-supplied text
    const card = document.createElement('div');
    card.style.cssText = 'background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:14px;padding:14px 16px;max-width:92%;font-size:13px;color:#e2e8f0;line-height:1.6';

    const heading = document.createElement('p');
    heading.style.cssText = 'font-weight:700;color:#a5b4fc;margin:0 0 6px';
    heading.textContent = '📢 Announcement preview';
    card.appendChild(heading);

    const msgEl = document.createElement('p');
    msgEl.style.cssText = 'margin:0 0 6px;color:#cbd5e1';
    msgEl.textContent = '\u201C' + message + '\u201D';
    card.appendChild(msgEl);

    const expEl = document.createElement('p');
    expEl.style.cssText = 'font-size:11px;color:#64748b;margin:0 0 12px';
    expEl.textContent = 'Expires: ' + expLabel;
    card.appendChild(expEl);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px';

    const postBtn = document.createElement('button');
    postBtn.style.cssText = 'padding:7px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:10px;color:white;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit';
    postBtn.textContent = 'Post announcement';
    // Use an event listener closure — no string interpolation of user data
    postBtn.addEventListener('click', function() {
        _confirmAnnouncement(previewId, message, expires_at, secret);
    });
    btnRow.appendChild(postBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.style.cssText = 'padding:7px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#94a3b8;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', function() {
        const el = document.getElementById(previewId);
        if (el) el.remove();
    });
    btnRow.appendChild(cancelBtn);

    card.appendChild(btnRow);
    wrap.appendChild(card);

    const container = document.getElementById('chatMessages');
    if (container) { container.appendChild(wrap); container.scrollTop = container.scrollHeight; }
}

async function _confirmAnnouncement(previewId, message, expires_at, secret) {
    const card = document.getElementById(previewId);
    const btnRow = card && card.querySelector('div[style*="display:flex"]');
    if (btnRow) btnRow.innerHTML = '<span style="font-size:12px;color:#94a3b8">Posting…</span>';

    try {
        const res = await fetch(ANNOUNCE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, expires_at, secret })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error');
        const id = data.announcement?.id || '—';
        if (card) card.innerHTML = `<div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);border-radius:14px;padding:12px 16px;font-size:13px">
            <p style="color:#4ade80;font-weight:700;margin:0 0 4px">✅ Announcement posted</p>
            <p style="color:#94a3b8;font-size:12px;margin:0 0 2px">Students will see it on the vault immediately.</p>
            <p style="color:#475569;font-size:10px;margin:0">ID: ${escapeHtml(id)}</p>
        </div>`;
    } catch(err) {
        if (card) card.innerHTML = `<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:14px;padding:12px 16px;font-size:13px">
            <p style="color:#fca5a5;font-weight:700;margin:0 0 4px">❌ Failed to post</p>
            <p style="color:#94a3b8;font-size:12px;margin:0">${escapeHtml(err.message)}</p>
        </div>`;
    }
    const msgs = document.getElementById('chatMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

async function _deleteAnnouncement(id) {
    const secret = _getPushSecret();
    const bubble = appendBubble('assistant', `🗑 Deleting announcement <code style="font-size:11px;opacity:0.6">${escapeHtml(id)}</code>…`);
    try {
        const res = await fetch(ANNOUNCE_URL + '/' + encodeURIComponent(id), {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error');
        if (bubble) bubble.innerHTML = '✅ <strong>Announcement deleted.</strong> Students will no longer see it.';
    } catch(err) {
        if (bubble) bubble.innerHTML = `❌ <strong>Delete failed:</strong> ${escapeHtml(err.message)}`;
    }
    const msgs = document.getElementById('chatMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 15 — "FILES NEVER DOWNLOADED" ANALYTICS (manager)
// Surfaces uploaded files with zero downloads so managers can
// prune unused content from the vault.
// ═══════════════════════════════════════════════════════════════

async function _showNeverDownloadedFiles() {
    const bubble = appendBubble('assistant', '📊 Loading unused file analytics…');
    const msgs = document.getElementById('chatMessages');

    // Pull file list from the manager page's in-memory allFiles array.
    // There is no server-side /api/files proxy — this feature requires the
    // manager page to have already loaded its file list into window.allFiles.
    let files = [];

    if (typeof window.allFiles !== 'undefined' && Array.isArray(window.allFiles)) {
        files = window.allFiles;
    } else {
        // allFiles is not in scope — the panel on manager.html is the reliable
        // entry point (mgrNeverDownloadedSection). Prompt the manager to use it
        // or to wait for the library to finish loading.
        if (bubble) bubble.innerHTML = '⚠️ <strong>File list not loaded yet.</strong><br>'
            + '<span style="font-size:12px;color:#94a3b8">Scroll down to the <strong>Never Downloaded</strong> panel on the Manager Portal, '
            + 'or wait for the Library to finish loading and try again.</span>';
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
        return;
    }

    if (!files.length) {
        if (bubble) bubble.innerHTML = '⚠️ <strong>Could not load file list.</strong><br><span style="font-size:12px;color:#94a3b8">Refresh the manager page so files are loaded, then try again.</span>';
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
        return;
    }

    // Filter to files with no downloads (download_count === 0 or missing)
    const unused = files.filter(f => !f.download_count || f.download_count === 0);

    if (!unused.length) {
        if (bubble) bubble.innerHTML = '✅ <strong>Every file has been downloaded at least once.</strong><br><span style="font-size:12px;color:#94a3b8">No unused files found — great engagement!</span>';
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
        return;
    }

    // Sort: most recently uploaded first (might be legit new), then oldest first (prime candidates to prune)
    const sorted = [...unused].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

    const rows = sorted.map(f => {
        const name   = escapeHtml(f.name || f.file_name || 'Unnamed');
        const folder = f.folder ? `<span style="font-size:10px;color:#475569"> · ${escapeHtml(f.folder)}</span>` : '';
        const d      = f.created_at ? new Date(f.created_at).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' }) : '—';
        const expiry = f.expires_at ? `<span style="color:#f87171;font-size:10px"> · Exp ${new Date(f.expires_at).toLocaleDateString(undefined,{day:'numeric',month:'short'})}</span>` : '';
        return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
            <span style="font-size:16px;flex-shrink:0">📄</span>
            <div style="flex:1;min-width:0">
                <p style="font-size:12px;font-weight:700;color:#e2e8f0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</p>
                <p style="font-size:10px;color:#64748b;margin:2px 0 0">Uploaded ${d}${folder}${expiry}</p>
            </div>
            <span style="font-size:10px;font-weight:700;color:#f87171;flex-shrink:0;white-space:nowrap">0 downloads</span>
        </div>`;
    }).join('');

    if (bubble) bubble.innerHTML = `
        <p style="font-weight:700;color:white;margin:0 0 6px">📊 Never Downloaded (${unused.length}/${files.length} files)</p>
        <p style="font-size:11px;color:#64748b;margin:0 0 10px">These files have 0 downloads — consider pruning or re-promoting them.</p>
        <div style="max-height:260px;overflow-y:auto;scrollbar-width:thin">${rows}</div>`;
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

async function _showAllFileRequests() {
    const secret = _getPushSecret();
    const bubble = appendBubble('assistant', '📋 Loading file requests…');
    try {
        // Pass secret in X-Manager-Secret header — not as a query param, which
        // would appear in server access logs. Mirrors the server.js fix.
        const res = await fetch(FILE_REQ_URL, {
            headers: { 'X-Manager-Secret': secret }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error');
        const reqs = data.requests || [];
        if (!reqs.length) {
            if (bubble) bubble.innerHTML = '📋 <strong>No file requests yet.</strong>';
            return;
        }
        const rows = reqs.map(r => {
            const statusColor = r.status === 'fulfilled' ? '#4ade80' : r.status === 'declined' ? '#f87171' : '#fbbf24';
            const statusIcon  = r.status === 'fulfilled' ? '✅' : r.status === 'declined' ? '❌' : '⏳';
            const d = new Date(r.created_at).toLocaleDateString(undefined, { day:'numeric', month:'short' });
            const note = r.note ? `<br><span style="font-size:10px;color:#64748b">Note: ${escapeHtml(r.note)}</span>` : '';
            return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
                <div style="display:flex;align-items:flex-start;gap:8px">
                    <span style="font-size:14px;flex-shrink:0">${statusIcon}</span>
                    <div style="flex:1;min-width:0">
                        <p style="font-size:12px;font-weight:700;color:white;margin:0">${escapeHtml(r.description)}</p>
                        <p style="font-size:10px;color:#64748b;margin:2px 0 0">${d}${r.folder ? ' · ' + escapeHtml(r.folder) : ''}${r.requester_name ? ' · ' + escapeHtml(r.requester_name) : ''}</p>
                        ${note}
                    </div>
                    <span style="font-size:10px;font-weight:700;color:${statusColor};flex-shrink:0">${r.status}</span>
                </div>
                ${r.status === 'pending' ? `<div style="display:flex;gap:6px;margin-top:6px;padding-left:22px">
                    <button onclick="_updateFileRequest('${r.id}','fulfilled','')" style="padding:4px 10px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);border-radius:8px;color:#4ade80;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit">Fulfill</button>
                    <button onclick="_updateFileRequest('${r.id}','declined','')" style="padding:4px 10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;color:#fca5a5;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit">Decline</button>
                </div>` : ''}
            </div>`;
        }).join('');
        if (bubble) bubble.innerHTML = `<p style="font-weight:700;color:white;margin:0 0 8px">📋 File Requests (${reqs.length})</p><div style="max-height:260px;overflow-y:auto;scrollbar-width:thin">${rows}</div>`;
    } catch(err) {
        if (bubble) bubble.innerHTML = `❌ <strong>Failed to load requests:</strong> ${escapeHtml(err.message)}`;
    }
    const msgs = document.getElementById('chatMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

async function _updateFileRequest(id, status, note) {
    const secret = _getPushSecret();
    const bubble = appendBubble('assistant', `⏳ Updating request…`);
    try {
        const res = await fetch(FILE_REQ_URL + '/' + encodeURIComponent(id), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, note, secret })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error');
        const icon = status === 'fulfilled' ? '✅' : '❌';
        if (bubble) bubble.innerHTML = `${icon} Request marked as <strong>${status}</strong>.`;
    } catch(err) {
        if (bubble) bubble.innerHTML = `❌ <strong>Update failed:</strong> ${escapeHtml(err.message)}`;
    }
    const msgs = document.getElementById('chatMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 10 — COPY AS MARKDOWN
// Adds a small "⎘ MD" button to every assistant bubble.
// ═══════════════════════════════════════════════════════════════

// Strip the HTML formatting we applied and return clean markdown
function _htmlToMarkdown(html) {
    return html
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
        .replace(/<[^>]+>/g, '')          // strip remaining tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .trim();
}

function _addCopyMarkdownBtn(bubble) {
    if (!bubble) return;
    const btnId = 'fvMdCopy_' + Date.now();
    const btn = document.createElement('button');
    btn.id = btnId;
    btn.title = 'Copy as Markdown';
    btn.style.cssText = 'display:block;margin-top:6px;padding:2px 7px;background:none;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:rgba(255,255,255,0.3);font-size:9px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:0.03em;transition:color 0.15s,border-color 0.15s';
    btn.textContent = '⎘ MD';
    btn.onmouseover = () => { btn.style.color = 'rgba(255,255,255,0.7)'; btn.style.borderColor = 'rgba(255,255,255,0.3)'; };
    btn.onmouseout  = () => { btn.style.color = 'rgba(255,255,255,0.3)'; btn.style.borderColor = 'rgba(255,255,255,0.1)'; };
    btn.onclick = async () => {
        const md = _htmlToMarkdown(bubble.innerHTML);
        try {
            await navigator.clipboard.writeText(md);
            btn.textContent = '✓ Copied!';
            btn.style.color = '#4ade80';
            setTimeout(() => { btn.textContent = '⎘ MD'; btn.style.color = 'rgba(255,255,255,0.3)'; }, 1800);
        } catch(e) {
            btn.textContent = '✗ Failed';
            setTimeout(() => { btn.textContent = '⎘ MD'; }, 1800);
        }
    };
    bubble.appendChild(btn);
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 11 — LIGHT / DARK THEME TOGGLE
// Self-contained: injects CSS vars onto :root, persists to
// localStorage under 'fvTheme'. Works alongside existing
// accent-color and high-contrast preferences.
// ═══════════════════════════════════════════════════════════════

const FV_THEME_KEY = 'fvTheme'; // 'dark' | 'light'

const FV_THEMES = {
    dark: {
        '--fv-bg':          '#020617',
        '--fv-surface':     '#0f172a',
        '--fv-surface2':    '#1e293b',
        '--fv-border':      'rgba(255,255,255,0.09)',
        '--fv-text':        '#e2e8f0',
        '--fv-text-muted':  '#94a3b8',
        '--fv-chat-bg':     'rgba(10,15,30,0.95)',
        '--fv-bubble-ai':   'rgba(255,255,255,0.05)',
        '--fv-bubble-ai-border': 'rgba(255,255,255,0.09)',
        '--fv-bubble-user': 'rgba(59,130,246,0.22)',
        '--fv-input-bg':    'rgba(255,255,255,0.06)',
        '--fv-footer-bg':   'rgba(0,0,0,0.25)',
    },
    light: {
        '--fv-bg':          '#f1f5f9',
        '--fv-surface':     '#ffffff',
        '--fv-surface2':    '#e2e8f0',
        '--fv-border':      'rgba(0,0,0,0.1)',
        '--fv-text':        '#0f172a',
        '--fv-text-muted':  '#475569',
        '--fv-chat-bg':     'rgba(248,250,252,0.98)',
        '--fv-bubble-ai':   'rgba(0,0,0,0.04)',
        '--fv-bubble-ai-border': 'rgba(0,0,0,0.08)',
        '--fv-bubble-user': 'rgba(59,130,246,0.14)',
        '--fv-input-bg':    'rgba(0,0,0,0.04)',
        '--fv-footer-bg':   'rgba(241,245,249,0.9)',
    }
};

function _applyTheme(theme) {
    const vars = FV_THEMES[theme] || FV_THEMES.dark;
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);

    // Apply to the chat widget directly (it uses inline styles, not CSS vars)
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow) {
        chatWindow.style.background = vars['--fv-chat-bg'];
        chatWindow.style.borderColor = vars['--fv-border'];
        chatWindow.style.color = vars['--fv-text'];
    }

    // Re-style all existing bubbles
    document.querySelectorAll('#chatMessages > div > div').forEach(bubble => {
        const isUser = bubble.style.borderRadius && bubble.style.borderRadius.includes('4px 14px');
        if (isUser) {
            bubble.style.background = vars['--fv-bubble-user'];
            bubble.style.color = vars['--fv-text'];
        } else {
            bubble.style.background = vars['--fv-bubble-ai'];
            bubble.style.borderColor = vars['--fv-bubble-ai-border'];
            bubble.style.color = vars['--fv-text'];
        }
    });

    // Input area
    const inputArea = document.querySelector('#chatWindow > div:last-child');
    if (inputArea) inputArea.style.background = vars['--fv-footer-bg'];
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.style.background = vars['--fv-input-bg'];
        chatInput.style.color = vars['--fv-text'];
    }

    // Theme toggle button icon
    const btn = document.getElementById('fvThemeToggleBtn');
    if (btn) btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

    // Notify the main page (index/manager) so it can react if needed
    document.documentElement.setAttribute('data-fv-theme', theme);
    window.dispatchEvent(new CustomEvent('fvThemeChange', { detail: { theme } }));
}

function _toggleTheme() {
    const current = localStorage.getItem(FV_THEME_KEY) || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(FV_THEME_KEY, next); } catch(e) {}
    _applyTheme(next);
    const btn = document.getElementById('fvThemeToggleBtn');
    if (btn) {
        btn.textContent = next === 'dark' ? '☀️' : '🌙';
        btn.title = next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
}

function _initTheme() {
    const saved = localStorage.getItem(FV_THEME_KEY) || 'dark';
    _applyTheme(saved);
    // Update icon after DOM is ready (button may not exist yet at call time)
    setTimeout(() => {
        const btn = document.getElementById('fvThemeToggleBtn');
        if (btn) {
            btn.textContent = saved === 'dark' ? '☀️' : '🌙';
            btn.title = saved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        }
    }, 0);
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 12 — FILE REQUEST STATUS TRACKER (student side)
// Students look up their pending/fulfilled request by token.
// Token is saved to localStorage at submission time by upload-request.html.
// ═══════════════════════════════════════════════════════════════

const FV_REQUEST_TOKEN_KEY = 'fvFileRequestToken';

function checkMyRequestStatus() {
    // Get token from localStorage (upload-request.html should save it there)
    const token = localStorage.getItem(FV_REQUEST_TOKEN_KEY) || '';
    _showRequestStatusModal(token);
}

function _showRequestStatusModal(prefillToken) {
    let modal = document.getElementById('fvReqStatusModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fvReqStatusModal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
    <div style="background:rgba(15,23,42,0.98);border:1px solid rgba(255,255,255,0.1);border-radius:20px;width:100%;max-width:440px;padding:24px;box-shadow:0 32px 80px rgba(0,0,0,.7);font-family:inherit;color:#e2e8f0;position:relative">
        <button onclick="document.getElementById('fvReqStatusModal').style.display='none'" style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;width:30px;height:30px;cursor:pointer;color:#94a3b8;font-size:16px">×</button>
        <p style="font-weight:800;font-size:15px;color:white;margin:0 0 4px">📋 My File Request</p>
        <p style="font-size:11px;color:#64748b;margin:0 0 16px">Enter your request token to check status</p>
        <input id="fvReqToken" type="text" placeholder="Paste your request token…" value="${escapeHtml(prefillToken || '')}"
            style="width:100%;box-sizing:border-box;padding:9px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:10px;color:white;font-size:13px;font-family:inherit;outline:none;margin-bottom:10px" />
        <div style="display:flex;gap:8px">
            <button onclick="_lookupRequestStatus()" style="flex:1;padding:10px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;border-radius:10px;color:white;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">Check Status</button>
        </div>
        <div id="fvReqResult" style="margin-top:14px"></div>
    </div>`;
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('fvReqToken')?.focus(), 80);
}

async function _lookupRequestStatus() {
    const token = (document.getElementById('fvReqToken')?.value || '').trim();
    const result = document.getElementById('fvReqResult');
    if (!token) { if (result) result.innerHTML = '<p style="color:#fca5a5;font-size:12px">Please enter your token.</p>'; return; }
    if (result) result.innerHTML = '<p style="color:#64748b;font-size:12px">Looking up…</p>';

    try {
        const res = await fetch(FILE_REQ_URL + '?token=' + encodeURIComponent(token));
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Not found');

        const req = data.request;
        const statusColor = req.status === 'fulfilled' ? '#4ade80' : req.status === 'declined' ? '#f87171' : '#fbbf24';
        const statusIcon  = req.status === 'fulfilled' ? '✅' : req.status === 'declined' ? '❌' : '⏳';
        const d = new Date(req.created_at).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' });
        const updated = req.updated_at !== req.created_at
            ? `<p style="font-size:10px;color:#475569;margin:2px 0 0">Updated: ${new Date(req.updated_at).toLocaleDateString(undefined, { day:'numeric', month:'short' })}</p>` : '';
        const note = req.note
            ? `<div style="margin-top:10px;padding:10px;background:rgba(255,255,255,0.04);border-radius:10px;border:1px solid rgba(255,255,255,0.08)"><p style="font-size:11px;color:#94a3b8;margin:0 0 2px;font-weight:700">Manager note</p><p style="font-size:12px;color:#cbd5e1;margin:0">${escapeHtml(req.note)}</p></div>` : '';

        if (result) result.innerHTML = `
            <div style="padding:12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                    <span style="font-size:20px">${statusIcon}</span>
                    <div>
                        <p style="font-size:13px;font-weight:800;color:${statusColor};margin:0">${req.status.charAt(0).toUpperCase() + req.status.slice(1)}</p>
                        <p style="font-size:10px;color:#64748b;margin:0">Submitted ${d}</p>
                        ${updated}
                    </div>
                </div>
                <p style="font-size:12px;color:#94a3b8;margin:0"><strong style="color:#cbd5e1">Request:</strong> ${escapeHtml(req.description)}</p>
                ${req.folder ? `<p style="font-size:11px;color:#475569;margin:4px 0 0">Folder: ${escapeHtml(req.folder)}</p>` : ''}
                ${note}
            </div>`;

        // Save token for next time
        try { localStorage.setItem(FV_REQUEST_TOKEN_KEY, token); } catch(e) {}
    } catch(err) {
        if (result) result.innerHTML = `<p style="color:#fca5a5;font-size:12px">❌ ${escapeHtml(err.message)}</p>`;
    }
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 13 — CHAT HISTORY SEARCH
// Opens a modal that lets the user search/filter past Q&A pairs
// stored in chatMessages (in-memory) or the persisted history.
// ═══════════════════════════════════════════════════════════════

function openChatSearch() {
    // Build source from in-memory messages (covers current + restored session)
    const source = chatMessages.length ? chatMessages : loadHistory();
    if (!source.length) {
        // Nothing to search — show a brief inline note instead of a blank modal
        const container = document.getElementById('chatMessages');
        if (container) {
            const flash = document.createElement('div');
            flash.style.cssText = 'text-align:center;font-size:11px;color:rgba(148,163,184,0.7);padding:4px 0';
            flash.textContent = 'No chat history to search yet.';
            container.appendChild(flash);
            container.scrollTop = container.scrollHeight;
            setTimeout(() => flash.remove(), 2500);
        }
        return;
    }

    // Pair up messages: user Q + next assistant A
    const pairs = [];
    for (let i = 0; i < source.length; i++) {
        if (source[i].role === 'user') {
            pairs.push({
                q: source[i].content,
                a: (source[i + 1] && source[i + 1].role === 'assistant') ? source[i + 1].content : ''
            });
            if (source[i + 1] && source[i + 1].role === 'assistant') i++; // skip the paired assistant msg
        }
    }

    let modal = document.getElementById('fvChatSearchModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fvChatSearchModal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-label', 'Search chat history');
        modal.setAttribute('aria-modal', 'true');
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
    <div style="background:rgba(15,23,42,0.98);border:1px solid rgba(255,255,255,0.1);border-radius:20px;width:100%;max-width:480px;padding:24px;box-shadow:0 32px 80px rgba(0,0,0,.7);font-family:inherit;color:#e2e8f0;position:relative">
        <button onclick="document.getElementById('fvChatSearchModal').style.display='none'" aria-label="Close search"
            style="position:absolute;top:12px;right:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;width:30px;height:30px;cursor:pointer;color:#94a3b8;font-size:16px">×</button>
        <p style="font-weight:800;font-size:15px;color:white;margin:0 0 4px">🔍 Search Chat History</p>
        <p style="font-size:11px;color:#64748b;margin:0 0 14px">${pairs.length} exchange${pairs.length !== 1 ? 's' : ''} in memory</p>
        <input id="fvChatSearchInput" type="search" placeholder="Search questions & answers…" aria-label="Search query"
            style="width:100%;box-sizing:border-box;padding:9px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:10px;color:white;font-size:13px;font-family:inherit;outline:none;margin-bottom:12px"
            oninput="_filterChatHistory(this.value)" />
        <div id="fvChatSearchResults" style="max-height:320px;overflow-y:auto;scrollbar-width:thin;display:flex;flex-direction:column;gap:8px"></div>
    </div>`;

    modal.style.display = 'flex';

    // Store pairs for the filter function
    window._fvChatSearchPairs = pairs;
    _filterChatHistory(''); // render all on open

    setTimeout(() => document.getElementById('fvChatSearchInput')?.focus(), 80);

    // Close on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
    }, { once: false });
}

function _filterChatHistory(query) {
    const results = document.getElementById('fvChatSearchResults');
    if (!results) return;
    const pairs = window._fvChatSearchPairs || [];
    const q = query.trim().toLowerCase();

    const matched = q
        ? pairs.filter(p => p.q.toLowerCase().includes(q) || p.a.toLowerCase().includes(q))
        : pairs;

    if (!matched.length) {
        results.innerHTML = '<p style="color:#64748b;font-size:12px;text-align:center;padding:24px 0">No matches found.</p>';
        return;
    }

    function _highlight(text, term) {
        if (!term) return escapeHtml(text);
        const escaped = escapeHtml(text);
        const rx = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return escaped.replace(rx, '<mark style="background:rgba(99,102,241,0.35);color:white;border-radius:3px;padding:0 1px">$1</mark>');
    }

    results.innerHTML = matched.map(p => {
        const qHtml = _highlight(p.q.length > 120 ? p.q.slice(0, 117) + '…' : p.q, q);
        const aSnippet = p.a.length > 160 ? p.a.slice(0, 157) + '…' : p.a;
        const aHtml = p.a ? _highlight(aSnippet, q) : '<span style="color:#475569;font-style:italic">No reply stored</span>';
        return `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 14px">
            <p style="font-size:12px;font-weight:700;color:#93c5fd;margin:0 0 5px">Q: ${qHtml}</p>
            <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.5">${aHtml}</p>
        </div>`;
    }).join('');
}

// ─── INIT ────────────────────────────────────────────────────
function initChatWidget() {
    const html = `
    <div id="aiChatWidget" style="position:fixed;bottom:100px;right:16px;z-index:9999;font-family:'Plus Jakarta Sans',sans-serif;">
        <!-- Chat Window -->
        <div id="chatWindow" role="dialog" aria-label="FileVault AI chat" aria-modal="true" style="display:none;margin-bottom:16px;width:340px;height:480px;background:rgba(10,15,30,0.95);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.1);border-radius:20px;overflow:hidden;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.6)">
            <!-- Header -->
            <div id="chatHeader" style="padding:13px 16px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
                <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:34px;height:34px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0" aria-hidden="true">
                        <span class="material-symbols-outlined" style="color:white;font-size:18px">smart_toy</span>
                    </div>
                    <div>
                        <p style="color:white;font-weight:700;font-size:13px;margin:0;line-height:1.2">${getChatTitle()}</p>
                        <div style="display:flex;align-items:center;gap:5px;margin-top:2px">
                            <span id="statusDot" aria-hidden="true" style="width:6px;height:6px;background:#22c55e;border-radius:50%;display:inline-block"></span>
                            <p id="statusLabel" style="color:rgba(255,255,255,0.7);font-size:10px;margin:0">Online</p>
                        </div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:4px">
                    <button id="fvThemeToggleBtn" onclick="_toggleTheme()" title="Switch to light mode" aria-label="Switch to light mode"
                        style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.6);display:flex;align-items:center;padding:4px;border-radius:6px;font-size:14px"
                        onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='none'">☀️</button>
                    <button onclick="toggleChat()" aria-label="Close chat" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.7);display:flex;align-items:center;padding:4px;border-radius:6px" onmouseover="this.style.color='white';this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.color='rgba(255,255,255,0.7)';this.style.background='none'">
                        <span class="material-symbols-outlined" aria-hidden="true" style="font-size:20px">close</span>
                    </button>
                </div>
            </div>

            <!-- Messages -->
            <div id="chatMessages" role="log" aria-live="polite" aria-label="Chat messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent">
                <div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);border-radius:14px;padding:12px 14px">
                    <p style="color:rgba(255,255,255,0.85);font-size:13px;line-height:1.6;margin:0">${getWelcomeMessage()}</p>
                </div>
            </div>

            <!-- Input -->
            <div style="padding:10px 12px 12px;border-top:1px solid rgba(255,255,255,0.07);flex-shrink:0;background:rgba(0,0,0,0.25)">
                <div style="display:flex;gap:8px;align-items:flex-end">
                    <textarea id="chatInput" placeholder="Ask something…" rows="1" aria-label="Type your message"
                        style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:9px 12px;color:white;font-size:13px;outline:none;resize:none;font-family:inherit;line-height:1.45;max-height:96px;overflow-y:auto;transition:border-color 0.2s"
                        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatMessage()}"
                        oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,96)+'px'"
                        onfocus="this.style.borderColor='rgba(59,130,246,0.55)'"
                        onblur="this.style.borderColor='rgba(255,255,255,0.1)'"></textarea>
                    <button onclick="sendChatMessage()" id="chatSendBtn" aria-label="Send message"
                        style="width:38px;height:38px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.2s,transform 0.1s"
                        onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <span class="material-symbols-outlined" aria-hidden="true" style="color:white;font-size:16px">send</span>
                    </button>
                </div>
                <p style="color:rgba(255,255,255,0.18);font-size:9px;text-align:center;margin:6px 0 0;line-height:1">${CURRENT_PAGE === 'manager'
    ? 'Shift+Enter for new line · <button onclick="_sendTestNotification()" style=\'background:none;border:none;cursor:pointer;color:rgba(99,102,241,0.7);font-size:9px;font-family:inherit;padding:0;text-decoration:underline\' title=\'Send a test push notification to yourself\'>🔔 Test notify</button>'
    : 'Shift+Enter for new line · <button onclick=\'openQuiz()\' style=\'background:none;border:none;cursor:pointer;color:rgba(59,130,246,0.6);font-size:9px;font-family:inherit;padding:0;text-decoration:underline\' title=\'Generate a quiz from your vault files\'>🎯 Quiz me</button> · <button onclick=\'openQuizHistory()\' style=\'background:none;border:none;cursor:pointer;color:rgba(100,116,139,0.7);font-size:9px;font-family:inherit;padding:0;text-decoration:underline\' title=\'View past quiz scores\'>📋 History</button> · <button onclick=\'checkMyRequestStatus()\' style=\'background:none;border:none;cursor:pointer;color:rgba(100,116,139,0.55);font-size:9px;font-family:inherit;padding:0;text-decoration:underline\' title=\'Check your file request status\'>📥 My request</button>'}</p>
            </div>
        </div>

        <!-- Floating Button -->
        <button onclick="toggleChat()" id="chatToggleBtn"
            aria-label="Open FileVault AI chat" aria-expanded="false" aria-controls="chatWindow"
            style="width:56px;height:56px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(59,130,246,0.45);transition:transform 0.2s,box-shadow 0.2s"
            onmouseover="this.style.transform='scale(1.1)';this.style.boxShadow='0 12px 36px rgba(59,130,246,0.55)'"
            onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 8px 28px rgba(59,130,246,0.45)'">
            <span class="material-symbols-outlined" id="chatBtnIcon" aria-hidden="true" style="color:white;font-size:24px">smart_toy</span>
        </button>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // ── Set widget position directly so CSS/inline conflicts can never win ──
    (function() {
        var w = document.getElementById('aiChatWidget');
        if (!w) return;
        function hasCustomPos() {
            try { return !!JSON.parse(localStorage.getItem('fvChatPos') || 'null'); } catch(e) { return false; }
        }
        function setPos() {
            if (hasCustomPos()) return; // user dragged the widget — leave it where they put it
            w.classList.remove('fv-dragged');
            w.style.removeProperty('left');
            w.style.removeProperty('top');
            var isMobile = window.innerWidth < 1024;
            if (!isMobile) {
                w.style.setProperty('bottom', '24px', 'important');
                w.style.setProperty('right', '24px', 'important');
                return;
            }
            // Measure the actual rendered height of the mobile bottom nav
            // (icons + labels + safe-area padding) rather than relying on a
            // fixed constant, so the chat button always clears it.
            var nav = document.getElementById('mobileBottomNav');
            var navH = nav ? Math.ceil(nav.getBoundingClientRect().height) : 72;
            // Keep --mobile-nav-height in sync for backToTop / share button too
            document.documentElement.style.setProperty('--mobile-nav-height', navH + 'px');
            w.style.setProperty('bottom', (navH + 12) + 'px', 'important');
            w.style.setProperty('right',  '16px', 'important');
        }
        setPos();
        window.addEventListener('resize', setPos);
        window.addEventListener('orientationchange', function(){ setTimeout(setPos, 150); });
    })();

    // ── Draggable widget: drag the floating button anywhere on screen ──
    (function() {
        var w = document.getElementById('aiChatWidget');
        var handle = document.getElementById('chatToggleBtn');
        if (!w || !handle) return;
        var DRAG_KEY = 'fvChatPos'; // localStorage — persists across tabs/sessions,
                                    // consistent with high-contrast and chat history
        var dragging = false, moved = false, startX, startY, startLeft, startTop;

        function clampPos(left, top) {
            var rect = w.getBoundingClientRect();
            var maxLeft = Math.max(4, window.innerWidth - rect.width - 4);
            var maxTop  = Math.max(4, window.innerHeight - rect.height - 4);
            return { left: Math.min(Math.max(4, left), maxLeft), top: Math.min(Math.max(4, top), maxTop) };
        }
        function applyPosition(left, top) {
            var p = clampPos(left, top);
            w.style.setProperty('--fv-drag-left', p.left + 'px');
            w.style.setProperty('--fv-drag-top', p.top + 'px');
            w.style.setProperty('left', p.left + 'px', 'important');
            w.style.setProperty('top', p.top + 'px', 'important');
            w.style.setProperty('right', 'auto', 'important');
            w.style.setProperty('bottom', 'auto', 'important');
            w.classList.add('fv-dragged');
            return p;
        }
        function savePosition(p) {
            try { localStorage.setItem(DRAG_KEY, JSON.stringify(p)); } catch(e) {}
        }

        // Restore a previously dragged position
        try {
            var saved = JSON.parse(localStorage.getItem(DRAG_KEY) || 'null');
            if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
                applyPosition(saved.left, saved.top);
            }
        } catch(e) {}

        handle.style.cursor = 'grab';
        handle.style.touchAction = 'none';

        handle.addEventListener('pointerdown', function(e) {
            dragging = true; moved = false;
            var rect = w.getBoundingClientRect();
            startX = e.clientX; startY = e.clientY;
            startLeft = rect.left; startTop = rect.top;
            try { handle.setPointerCapture(e.pointerId); } catch(err) {}
        });
        handle.addEventListener('pointermove', function(e) {
            if (!dragging) return;
            var dx = e.clientX - startX, dy = e.clientY - startY;
            if (!moved && Math.hypot(dx, dy) < 6) return;
            moved = true;
            handle.style.cursor = 'grabbing';
            applyPosition(startLeft + dx, startTop + dy);
        });
        function endDrag() {
            if (!dragging) return;
            dragging = false;
            handle.style.cursor = 'grab';
            if (moved) {
                var rect = w.getBoundingClientRect();
                var p = clampPos(rect.left, rect.top);
                applyPosition(p.left, p.top);
                savePosition(p);
            }
        }
        handle.addEventListener('pointerup', endDrag);
        handle.addEventListener('pointercancel', endDrag);

        // A drag-release shouldn't also fire the toggleChat() click handler
        handle.addEventListener('click', function(e) {
            if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
        }, true);

        // ── Double-tap/click to reset to default corner position ──
        // Handy when the widget has been dragged off-screen or over content.
        var _lastTap = 0;
        handle.addEventListener('click', function() {
            if (moved) return; // was a drag-release, ignore
            var now = Date.now();
            if (now - _lastTap < 400) {
                // Second tap within 400 ms — snap back to default
                try { localStorage.removeItem(DRAG_KEY); } catch(err) {}
                w.classList.remove('fv-dragged');
                ['left','top','right','bottom'].forEach(function(p) { w.style.removeProperty(p); });
                window.dispatchEvent(new Event('resize')); // re-run default placement
                // Brief "Position reset" toast anchored to the widget
                var flash = document.createElement('div');
                flash.style.cssText = 'position:absolute;bottom:62px;right:0;background:rgba(59,130,246,0.9);color:white;font-size:10px;font-weight:700;padding:4px 8px;border-radius:8px;white-space:nowrap;pointer-events:none;transition:opacity 0.4s';
                flash.textContent = 'Position reset';
                w.style.position = w.style.position || 'fixed'; // ensure flash is contained
                w.appendChild(flash);
                setTimeout(function() { flash.style.opacity = '0'; setTimeout(function(){ flash.remove(); }, 400); }, 1200);
                _lastTap = 0;
            } else {
                _lastTap = now;
            }
        });

        // Keep a dragged widget on-screen after rotation/resize
        window.addEventListener('resize', function() {
            try {
                var saved = JSON.parse(localStorage.getItem(DRAG_KEY) || 'null');
                if (saved && typeof saved.left === 'number') {
                    var p = clampPos(saved.left, saved.top);
                    applyPosition(p.left, p.top);
                    savePosition(p);
                }
            } catch(e) {}
        });
    })();

    // Restore chat open state after page load/auth redirect
    if (sessionStorage.getItem('fvChatOpen') === '1') {
        const _win = document.getElementById('chatWindow');
        const _ico = document.getElementById('chatBtnIcon');
        if (_win && _ico) { _win.style.display = 'flex'; _ico.textContent = 'close'; }
    }

    // ── Restore persisted conversation history ──────────────────
    (function() {
        const saved = loadHistory();
        if (!saved.length) return;
        chatMessages = saved.slice(); // seed in-memory state
        const container = document.getElementById('chatMessages');
        if (!container) return;
        // Add a subtle separator so students know these are from a prior session
        const sep = document.createElement('div');
        sep.style.cssText = 'display:flex;align-items:center;gap:8px;margin:4px 0';
        sep.innerHTML = `<span style="flex:1;height:1px;background:rgba(255,255,255,0.07)"></span>
            <span style="color:rgba(255,255,255,0.25);font-size:10px;white-space:nowrap">Previous session</span>
            <span style="flex:1;height:1px;background:rgba(255,255,255,0.07)"></span>`;
        container.appendChild(sep);
        saved.forEach(m => {
            appendBubble(m.role, m.role === 'assistant' ? formatAssistantText(m.content) : escapeHtml(m.content));
        });
        // Add "continuing" note + clear button + search button
        const note = document.createElement('div');
        note.style.cssText = 'display:flex;justify-content:center;gap:6px;margin:2px 0 4px';
        note.innerHTML = `<button onclick="openChatSearch()" title="Search chat history" aria-label="Search chat history"
            style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.22);font-size:10px;font-family:inherit;padding:2px 6px;border-radius:6px;transition:color 0.15s"
            onmouseover="this.style.color='rgba(99,102,241,0.8)'" onmouseout="this.style.color='rgba(255,255,255,0.22)'">
            🔍 Search history</button>
            <span style="color:rgba(255,255,255,0.1);font-size:10px;line-height:1.8">·</span>
            <button onclick="clearHistory();location.reload()" title="Clear conversation history" aria-label="Clear conversation history"
            style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.22);font-size:10px;font-family:inherit;padding:2px 6px;border-radius:6px;transition:color 0.15s"
            onmouseover="this.style.color='rgba(239,68,68,0.7)'" onmouseout="this.style.color='rgba(255,255,255,0.22)'">
            🗑 Clear history</button>`;
        container.appendChild(note);
        container.scrollTop = container.scrollHeight;
    })();

    // Inject animation + responsive styles
    if (!document.getElementById('chatWidgetStyles')) {
        const s = document.createElement('style');
        s.id = 'chatWidgetStyles';
        s.textContent = `
            @keyframes fvBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
            #chatMessages::-webkit-scrollbar { width: 4px; }
            #chatMessages::-webkit-scrollbar-track { background: transparent; }
            #chatMessages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

            /* ── Mobile: sit above the bottom nav bar ── */
            @media (max-width: 1023px) {
                #aiChatWidget {
                    left: auto !important;
                    width: auto !important;
                    box-sizing: border-box !important;
                }
                #chatWindow {
                    width: 340px !important;
                    max-width: calc(100vw - 32px) !important;
                    height: min(480px, 70vh) !important;
                    margin-bottom: 12px !important;
                    border-radius: 20px !important;
                    box-sizing: border-box !important;
                }
                /* ── Dragged position overrides the default mobile placement ── */
                #aiChatWidget.fv-dragged {
                    left: var(--fv-drag-left) !important;
                    top: var(--fv-drag-top) !important;
                    right: auto !important;
                    bottom: auto !important;
                }
            }
        `;
        document.head.appendChild(s);
    }
    // Apply saved theme (dark/light) after the widget DOM is ready
    _initTheme();
}

// ─── UI HELPERS ──────────────────────────────────────────────
function toggleChat() {
    const win  = document.getElementById('chatWindow');
    const icon = document.getElementById('chatBtnIcon');
    const btn  = document.getElementById('chatToggleBtn');
    const isOpen = win.style.display === 'flex';
    win.style.display = isOpen ? 'none' : 'flex';
    icon.textContent  = isOpen ? 'smart_toy' : 'close';
    if (btn) {
        btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        btn.setAttribute('aria-label', isOpen ? 'Open FileVault AI chat' : 'Close FileVault AI chat');
    }
    sessionStorage.setItem('fvChatOpen', isOpen ? '0' : '1');
    if (!isOpen) setTimeout(() => document.getElementById('chatInput')?.focus(), 120);
}

function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

function formatAssistantText(text) {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function appendBubble(role, html) {
    const container = document.getElementById('chatMessages');
    const wrap = document.createElement('div');
    wrap.style.cssText = `display:flex;justify-content:${role === 'user' ? 'flex-end' : 'flex-start'}`;

    const bubble = document.createElement('div');
    if (role === 'user') {
        bubble.style.cssText = 'background:rgba(59,130,246,0.22);border:1px solid rgba(59,130,246,0.3);border-radius:14px 14px 4px 14px;padding:10px 14px;color:rgba(255,255,255,0.92);font-size:13px;line-height:1.55;max-width:88%';
    } else {
        bubble.style.cssText = 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:14px 14px 14px 4px;padding:10px 14px;color:rgba(255,255,255,0.88);font-size:13px;line-height:1.65;max-width:92%';
    }
    bubble.innerHTML = html;
    wrap.appendChild(bubble);
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
    return bubble;
}

function appendTyping() {
    const container = document.getElementById('chatMessages');
    const wrap = document.createElement('div');
    wrap.id = 'typingWrap';
    wrap.style.cssText = 'display:flex;justify-content:flex-start';
    wrap.innerHTML = `<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:14px 14px 14px 4px;padding:12px 16px">
        <div style="display:flex;gap:5px;align-items:center">
            <span style="width:7px;height:7px;background:rgba(255,255,255,0.35);border-radius:50%;animation:fvBounce 1.2s ease-in-out infinite"></span>
            <span style="width:7px;height:7px;background:rgba(255,255,255,0.35);border-radius:50%;animation:fvBounce 1.2s ease-in-out 0.2s infinite"></span>
            <span style="width:7px;height:7px;background:rgba(255,255,255,0.35);border-radius:50%;animation:fvBounce 1.2s ease-in-out 0.4s infinite"></span>
        </div>
    </div>`;
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
    return wrap;
}

function setOnlineStatus(online) {
    const dot   = document.getElementById('statusDot');
    const label = document.getElementById('statusLabel');
    if (!dot) return;
    dot.style.background = online ? '#22c55e' : '#f59e0b';
    if (label) label.textContent = online ? 'Online' : 'Connecting…';
}

// ─── SEND MESSAGE ─────────────────────────────────────────────
async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const btn   = document.getElementById('chatSendBtn');
    const text  = input.value.trim();
    if (!text) return;

    // Clear + disable
    input.value = '';
    input.style.height = 'auto';
    btn.disabled = true;
    btn.style.opacity = '0.45';

    appendBubble('user', escapeHtml(text));
    chatMessages.push({ role: 'user', content: text });
    // Trim in-memory array so a very long session doesn't bloat the tab
    if (chatMessages.length > MESSAGES_IN_MEMORY_MAX) {
        chatMessages = chatMessages.slice(-MESSAGES_IN_MEMORY_MAX);
    }

    // ── Manager broadcast shortcut ─────────────────────────────
    // Intercept "notify all students about X" on the manager page.
    if (CURRENT_PAGE === 'manager') {
        const broadcastMatch = text.match(/^notify\s+all\s+students?\s+about\s+(.+)$/i);
        if (broadcastMatch) {
            btn.disabled = false;
            btn.style.opacity = '1';
            _showBroadcastConfirm(broadcastMatch[1].trim());
            return;
        }
        // Intercept structured manager commands (announcements, file requests)
        if (_tryManagerCommand(text)) {
            btn.disabled = false;
            btn.style.opacity = '1';
            return;
        }
    }

    const typing = appendTyping();
    setOnlineStatus(true);

    try {
        // Send only the last 10 exchanges (20 messages) to stay well within
        // llama-3.1-8b-instant's context window. chatMessages itself is unbounded
        // in-memory so the full session remains browsable in the UI.
        const CONTEXT_WINDOW = 20;
        const history = chatMessages.slice(-(CONTEXT_WINDOW + 1), -1).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        // 30-second timeout: if the backend hangs (not an error, just silent),
        // the typing bubble would spin forever without this.
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), 30_000);

        const res = await fetch(CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message:      text,
                history,
                systemPrompt: getSystemPrompt()
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        typing.remove();

        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data  = await res.json();
        const reply = data.text || 'No response received.';

        chatMessages.push({ role: 'assistant', content: reply });
        const aiBubble = appendBubble('assistant', formatAssistantText(reply));
        _addCopyMarkdownBtn(aiBubble);
        saveHistory();

    } catch (err) {
        typing.remove();
        setOnlineStatus(false);
        if (err.name === 'AbortError') {
            appendBubble('assistant', '⏱️ The server took too long to respond (30 s). Check your connection or try again.');
        } else {
            // Queue the message for retry when connectivity returns.
            // Note: the AI backend runs on an external server (Render), so the
            // service worker cannot cache or proxy these requests — offline
            // fallback is handled entirely here in the page.
            _queueOfflineMessage(text);
            appendBubble('assistant', '📶 <strong>The AI assistant is unreachable.</strong> This is usually a network issue — the chat backend runs on an external server and isn\'t available offline. Your message has been saved and will be sent automatically when your connection returns.');

            // Also register a Background Sync tag so the SW can trigger a
            // flush via postMessage even if the 'online' event is unreliable.
            _registerChatSync();
        }
        console.error('Chat error:', err);
    }

    btn.disabled = false;
    btn.style.opacity = '1';
    document.getElementById('chatInput')?.focus();
}

// Just init — never hide the widget. If auth fails, the page redirects anyway.
function showChatWidget() {
    // kept for backward compatibility — no longer needed
}


// ─── MANAGER BROADCAST VIA CHAT ───────────────────────────────
// Called when a manager types "Notify all students about X".
// Shows an inline confirmation card in the chat before sending.

const PUSH_NOTIFY_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api/push/notify'
    : 'https://project-one-187u.onrender.com/api/push/notify';

function _showBroadcastConfirm(message) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const cardId = 'fvBroadcast_' + Date.now();
    const wrap = document.createElement('div');
    wrap.id = cardId;
    wrap.style.cssText = 'display:flex;justify-content:flex-start;margin:4px 0';
    wrap.innerHTML = `<div style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);border-radius:14px;padding:14px 16px;max-width:92%;font-size:13px;color:#e2e8f0;line-height:1.6">
        <p style="font-weight:700;color:#a5b4fc;margin:0 0 6px">📢 Broadcast preview</p>
        <p style="margin:0 0 10px;color:#cbd5e1">"${escapeHtml(message)}"</p>
        <p style="font-size:11px;color:#64748b;margin:0 0 12px">This will be sent as a push notification to all subscribed students.</p>
        <div style="display:flex;gap:8px">
            <button onclick="_sendBroadcast(${JSON.stringify(cardId)}, ${JSON.stringify(message)})"
                style="padding:7px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:10px;color:white;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit">
                Send to all students
            </button>
            <button onclick="document.getElementById(${JSON.stringify(cardId)}).remove()"
                style="padding:7px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#94a3b8;font-weight:600;font-size:12px;cursor:pointer;font-family:inherit">
                Cancel
            </button>
        </div>
    </div>`;
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
}

async function _sendBroadcast(cardId, message) {
    const card = document.getElementById(cardId);
    if (!card) return;

    // Swap buttons for a spinner
    const btnRow = card.querySelector('div[style*="display:flex"]');
    if (btnRow) btnRow.innerHTML = '<span style="font-size:12px;color:#94a3b8">Sending…</span>';

    // Retrieve the PUSH_SECRET stored by the manager page (if any).
    // manager.html stores it as pushSecret on window, or falls back to empty.
    const secret = _getPushSecret();

    try {
        const res = await fetch(PUSH_NOTIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: '📢 FileVault Announcement',
                body: message,
                url: '/index.html',
                secret
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error');
        if (card) card.innerHTML = `<div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);border-radius:14px;padding:12px 16px;font-size:13px">
            <p style="color:#4ade80;font-weight:700;margin:0 0 4px">✅ Broadcast sent</p>
            <p style="color:#94a3b8;font-size:12px;margin:0">${data.sent} student${data.sent !== 1 ? 's' : ''} notified${data.failed ? ' · ' + data.failed + ' failed' : ''}.</p>
        </div>`;
    } catch (err) {
        if (card) card.innerHTML = `<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:14px;padding:12px 16px;font-size:13px">
            <p style="color:#fca5a5;font-weight:700;margin:0 0 4px">❌ Broadcast failed</p>
            <p style="color:#94a3b8;font-size:12px;margin:0">${escapeHtml(err.message)}</p>
        </div>`;
    }
    const container = document.getElementById('chatMessages');
    if (container) container.scrollTop = container.scrollHeight;
}

// ─── MANAGER: SEND TEST PUSH NOTIFICATION ─────────────────────
// Sends a push notification only to the current manager's browser
// subscription — without notifying all students.
async function _sendTestNotification() {
    // Get this browser's push subscription (if any)
    let sub = null;
    try {
        const reg = await navigator.serviceWorker.ready;
        sub = await reg.pushManager.getSubscription();
    } catch(e) {}

    if (!sub) {
        appendBubble('assistant', '⚠️ <strong>No push subscription found.</strong><br>Enable notifications first via the 🔔 bell icon on the student page, then try again.');
        const msgs = document.getElementById('chatMessages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
        return;
    }

    const secret = _getPushSecret();
    const NOTIFY_ONE_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:3000/api/push/notify-one'
        : 'https://project-one-187u.onrender.com/api/push/notify-one';

    // Show a sending bubble
    const bubble = appendBubble('assistant', '🔔 Sending test notification to your browser…');
    const msgs = document.getElementById('chatMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;

    try {
        const res = await fetch(NOTIFY_ONE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                endpoint: sub.endpoint,
                keys: sub.toJSON().keys,
                title: '🔔 FileVault Test Notification',
                body: 'Push notifications are working correctly on your device!',
                url: '/manager.html',
                secret
            })
        });
        const data = await res.json();
        if (bubble) bubble.innerHTML = res.ok
            ? '✅ <strong>Test notification sent!</strong><br>Check your browser or device notifications — it should arrive within a few seconds.'
            : `❌ <strong>Failed:</strong> ${escapeHtml(data.error || 'Unknown error')}`;
    } catch(err) {
        if (bubble) bubble.innerHTML = `❌ <strong>Network error:</strong> ${escapeHtml(err.message)}`;
    }
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
}
// ─── "ASK ABOUT THIS FILE" — called from the file preview modal ───────────
// index.html's preview modal can call:
//   askAboutFile({ name, folder, description })
// This opens the chat widget and pre-fills a contextual question so the
// student immediately gets an AI summary without typing anything.
function askAboutFile(file) {
    if (!file || !file.name) return;

    // Open the widget if it's closed
    const win  = document.getElementById('chatWindow');
    const icon = document.getElementById('chatBtnIcon');
    if (win && win.style.display !== 'flex') {
        win.style.display = 'flex';
        if (icon) icon.textContent = 'close';
        sessionStorage.setItem('fvChatOpen', '1');
    }

    // Build a natural question from file metadata
    const folder = file.folder && file.folder !== 'Root' ? ' in the ' + file.folder + ' folder' : '';
    const desc   = file.description ? ' (' + file.description + ')' : '';
    const prompt = 'Can you tell me what the file "' + file.name + '"' + folder + desc + ' is likely about, and how it might help me as a student?';

    // Drop it into the input and send
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = prompt;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 96) + 'px';
        // Scroll chat to bottom so user sees the message appear
        const msgs = document.getElementById('chatMessages');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;
        // Small delay so the widget finishes animating open before sending
        setTimeout(sendChatMessage, 150);
    }
}

// ─── QUIZ / SELF-TEST FEATURE ─────────────────────────────────
// Generates multiple-choice questions from file names + context
// using the same AI backend. Works on the user page only.

var _quizState = null; // { questions: [{q, options, answer, explanation}], idx, score }

// ── Quiz history: persist last 10 results in localStorage ──
const QUIZ_HISTORY_KEY = 'fvQuizHistory';
const QUIZ_HISTORY_MAX = 10;

function _saveQuizResult(title, score, total, missed) {
    // missed: array of { q, answer, explanation, yourAnswer }
    try {
        var history = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || '[]');
        history.unshift({ title, score, total, pct: Math.round(score/total*100), date: new Date().toISOString(), missed: missed || [] });
        if (history.length > QUIZ_HISTORY_MAX) history = history.slice(0, QUIZ_HISTORY_MAX);
        localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(history));
    } catch(e) {}
}

function _loadQuizHistory() {
    try { return JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || '[]'); } catch(e) { return []; }
}

function openQuizHistory() {
    if (CURRENT_PAGE !== 'user') return;
    const history = _loadQuizHistory();
    _showQuizModal();
    const titleEl    = document.getElementById('fvQuizTitle');
    const progressEl = document.getElementById('fvQuizProgress');
    const content    = document.getElementById('fvQuizContent');
    const actions    = document.getElementById('fvQuizActions');
    if (titleEl) titleEl.textContent = '📋 Quiz History';
    if (progressEl) progressEl.textContent = history.length ? 'Your last ' + history.length + ' quiz' + (history.length > 1 ? 'zes' : '') : '';
    if (!history.length) {
        if (content) content.innerHTML = '<p style="color:#64748b;font-size:13px;text-align:center;padding:32px 0">No quiz history yet — take a quiz first!</p>';
        if (actions) actions.innerHTML = '<button onclick="openQuiz()" style="padding:10px 20px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;border-radius:12px;color:white;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit">Take a Quiz</button>';
        return;
    }

    const rows = history.map(function(h, i) {
        const d    = new Date(h.date);
        const date = d.toLocaleDateString(undefined, { month:'short', day:'numeric' });
        const color= h.pct >= 80 ? '#4ade80' : h.pct >= 60 ? '#fbbf24' : '#f87171';
        const icon = h.pct >= 80 ? '🏆' : h.pct >= 60 ? '🎉' : '📚';
        const missedBadge = h.missed && h.missed.length
            ? `<button onclick="_showMissedReview(${i})" style="font-size:10px;padding:2px 7px;border:1px solid rgba(239,68,68,0.3);border-radius:6px;background:rgba(239,68,68,0.08);color:#fca5a5;cursor:pointer;font-family:inherit;font-weight:700">Review ${h.missed.length} missed</button>`
            : '<span style="font-size:10px;color:#4ade80;font-weight:700">Perfect! ✓</span>';
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
            <span style="font-size:18px">${icon}</span>
            <div style="flex:1;min-width:0">
                <p style="font-size:12px;font-weight:700;color:#e2e8f0;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(h.title)}</p>
                <p style="font-size:10px;color:#64748b;margin:2px 0 0">${date} · ${h.score}/${h.total}</p>
            </div>
            <div style="text-align:right;flex-shrink:0">
                <p style="font-size:14px;font-weight:800;color:${color};margin:0">${h.pct}%</p>
                ${missedBadge}
            </div>
        </div>`;
    }).join('');

    if (content) content.innerHTML = `<div style="max-height:320px;overflow-y:auto;scrollbar-width:thin">${rows}</div>`;
    if (actions) actions.innerHTML = `
        <button onclick="if(confirm('Clear all quiz history?')){localStorage.removeItem('${QUIZ_HISTORY_KEY}');openQuizHistory();}" style="padding:10px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#94a3b8;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit">Clear history</button>
        <button onclick="openQuiz()" style="padding:10px 18px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;border-radius:12px;color:white;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit">New Quiz</button>`;
}

function _showMissedReviewDirect() {
    // Review missed questions from the most recently completed quiz (still in _quizState)
    if (!_quizState || !_quizState.missed) return;
    const { title, missed } = _quizState;
    _renderMissedReviewUI(title, missed, function() { _renderQuizResults(); });
}

function _showMissedReview(historyIdx) {
    const history = _loadQuizHistory();
    const entry = history[historyIdx];
    if (!entry || !entry.missed || !entry.missed.length) return;
    _renderMissedReviewUI(entry.title, entry.missed, function() { openQuizHistory(); });
}

function _renderMissedReviewUI(title, missed, onBack) {
    const titleEl    = document.getElementById('fvQuizTitle');
    const progressEl = document.getElementById('fvQuizProgress');
    const content    = document.getElementById('fvQuizContent');
    const actions    = document.getElementById('fvQuizActions');
    if (titleEl) titleEl.textContent = '📖 Missed Questions';
    if (progressEl) progressEl.textContent = escapeHtml(title) + ' · ' + missed.length + ' to review';

    const html = missed.map(function(m, i) {
        return `<div style="margin-bottom:14px;padding:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px">
            <p style="font-size:13px;font-weight:700;color:white;margin:0 0 8px">${i+1}. ${escapeHtml(m.q)}</p>
            <p style="font-size:12px;margin:0 0 4px"><span style="color:#fca5a5">✗ Your answer:</span> <span style="color:#cbd5e1">${escapeHtml(m.yourAnswer || '—')}</span></p>
            <p style="font-size:12px;margin:0 0 6px"><span style="color:#4ade80">✓ Correct:</span> <span style="color:#cbd5e1">${escapeHtml(m.answer)}</span></p>
            <p style="font-size:11px;color:#64748b;margin:0;line-height:1.5">${escapeHtml(m.explanation || '')}</p>
        </div>`;
    }).join('');

    if (content) content.innerHTML = `<div style="max-height:340px;overflow-y:auto;scrollbar-width:thin">${html}</div>`;
    if (actions) {
        const backFn = '_fvMissedBack_' + Date.now();
        window[backFn] = function() { delete window[backFn]; onBack(); };
        actions.innerHTML = `<button onclick="${backFn}()" style="padding:10px 18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#94a3b8;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">← Back</button>`;
    }
}

// ─── QUIZ SCOPE PICKER ─────────────────────────────────────────
// When a folder is active the student gets an explicit choice:
// "All files" vs "Current folder only". This surfaces the filter
// that was already wired up internally but never shown in the UI.
function openQuiz() {
    // Only available on user page
    if (CURRENT_PAGE !== 'user') {
        showToast('Quiz is available on the main FileVault page.', 'info', 2500);
        return;
    }
    const files = typeof allFiles !== 'undefined' ? allFiles : [];

    // allFiles may still be loading asynchronously when the user opens the quiz.
    // Detect this by checking whether the variable exists but is empty AND the page
    // appears to have finished loading. We show an in-modal loading state and poll
    // briefly rather than presenting a silently empty experience.
    if (!files.length) {
        const pageFullyLoaded = document.readyState === 'complete';
        if (!pageFullyLoaded || typeof allFiles === 'undefined') {
            // Page or allFiles not ready yet — show a waiting state and retry
            _showQuizModal();
            const titleEl    = document.getElementById('fvQuizTitle');
            const progressEl = document.getElementById('fvQuizProgress');
            const content    = document.getElementById('fvQuizContent');
            const actions    = document.getElementById('fvQuizActions');
            if (titleEl)    titleEl.textContent    = 'Loading files…';
            if (progressEl) progressEl.textContent = 'Just a moment';
            if (content)    content.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;padding:32px 0;gap:14px">
                <div style="display:flex;gap:6px">
                    <span style="width:10px;height:10px;border-radius:50%;background:rgba(59,130,246,0.7);animation:fvBounce 1.2s ease-in-out infinite"></span>
                    <span style="width:10px;height:10px;border-radius:50%;background:rgba(59,130,246,0.7);animation:fvBounce 1.2s ease-in-out 0.2s infinite"></span>
                    <span style="width:10px;height:10px;border-radius:50%;background:rgba(59,130,246,0.7);animation:fvBounce 1.2s ease-in-out 0.4s infinite"></span>
                </div>
                <p style="color:#64748b;font-size:13px">Waiting for the file list to load…</p>
            </div>`;
            if (actions)    actions.innerHTML = `<button onclick="closeQuiz()" style="padding:10px 18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#94a3b8;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">Cancel</button>`;
            // Poll for up to 5 s then give up with a clear message
            var _quizRetries = 0;
            var _quizPoll = setInterval(function() {
                _quizRetries++;
                const loaded = typeof allFiles !== 'undefined' ? allFiles : [];
                if (loaded.length) {
                    clearInterval(_quizPoll);
                    openQuiz(); // retry now that files are ready
                } else if (_quizRetries >= 10) {
                    clearInterval(_quizPoll);
                    if (content) content.innerHTML = '<p style="color:#f87171;font-size:13px;text-align:center;padding:32px 0">Could not load file list. Please refresh the page and try again.</p>';
                }
            }, 500);
            return;
        }
        // Page is loaded and allFiles is genuinely empty
        showToast('No files in the vault yet — quiz needs some content!', 'warning', 3000);
        return;
    }
    const folder = typeof currentFolder !== 'undefined' ? currentFolder : null;
    // If a folder is active, show the scope picker; otherwise go straight to All.
    if (folder) {
        _showQuizScopePicker(folder, files);
        return;
    }
    _runQuiz(files, null);
}

function _showQuizScopePicker(folder, files) {
    _showQuizModal();
    const titleEl    = document.getElementById('fvQuizTitle');
    const progressEl = document.getElementById('fvQuizProgress');
    const content    = document.getElementById('fvQuizContent');
    const actions    = document.getElementById('fvQuizActions');
    const folderCount = files.filter(f => f.folder === folder).length;
    if (titleEl) titleEl.textContent = '🎯 Quiz me on…';
    if (progressEl) progressEl.textContent = 'Choose your scope';
    if (content) content.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px;padding:8px 0">
            <button onclick="_runQuiz(window._fvQuizAllFiles, null)" id="fvQuizScopeAll"
                style="padding:14px 18px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:14px;color:#e2e8f0;font-size:13px;font-weight:700;cursor:pointer;text-align:left;font-family:inherit;transition:border-color 0.15s"
                onmouseover="this.style.borderColor='rgba(99,102,241,0.5)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.12)'">
                <span style="font-size:20px;display:block;margin-bottom:4px">📚</span>
                All files <span style="font-weight:400;color:#64748b;font-size:12px">(${files.length} file${files.length !== 1 ? 's' : ''})</span>
            </button>
            <button onclick="_runQuiz(window._fvQuizAllFiles, window._fvQuizCurrentFolder)" id="fvQuizScopeFolder"
                style="padding:14px 18px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:14px;color:#e2e8f0;font-size:13px;font-weight:700;cursor:pointer;text-align:left;font-family:inherit;transition:border-color 0.15s"
                onmouseover="this.style.borderColor='rgba(99,102,241,0.6)'" onmouseout="this.style.borderColor='rgba(99,102,241,0.3)'">
                <span style="font-size:20px;display:block;margin-bottom:4px">📁</span>
                ${escapeHtml(folder)} only <span style="font-weight:400;color:#64748b;font-size:12px">(${folderCount} file${folderCount !== 1 ? 's' : ''})</span>
            </button>
        </div>`;
    // Store refs for the inline onclick handlers above
    window._fvQuizAllFiles = files;
    window._fvQuizCurrentFolder = folder;
    if (actions) actions.innerHTML = `<button onclick="closeQuiz()" style="padding:10px 18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#94a3b8;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">Cancel</button>`;
}

function _runQuiz(files, folder) {
    // Build context from visible files
    const visible = folder ? files.filter(f => f.folder === folder) : files;
    // Sanitize each user-controlled field before it enters the LLM prompt.
    // Strips control characters, newlines (which could break prompt structure),
    // and backtick sequences an attacker might use to escape the template literal.
    // Each field is also hard-truncated so no single value can dominate the context.
    function _sanitizeField(str, maxLen) {
        return String(str || '')
            .replace(/[\x00-\x1F\x7F`]/g, ' ') // strip control chars + backticks
            .replace(/\s+/g, ' ')               // collapse whitespace
            .trim()
            .slice(0, maxLen);
    }
    const sample = visible.slice(0, 20).map(f => {
        const name        = _sanitizeField(f.name,        120);
        const description = _sanitizeField(f.description,  80);
        const folderName  = _sanitizeField(f.folder,        40);
        return name + (description ? ' — ' + description : '')
                    + (folderName  ? ' ['  + folderName  + ']' : '');
    }).join('\n');

    // Show quiz modal / loading state
    _showQuizModal();
    _setQuizLoading(true);

    const prompt = `You are a helpful academic quiz generator for university students.

Based on the following list of study materials available in FileVault, generate a 5-question multiple-choice quiz to help students test themselves.

FILE LIST:
${sample}

RULES:
- Each question should be based on topics that can be inferred from the file names/descriptions (e.g. course content, subject area, key concepts).
- If file names reference specific courses (e.g. "UGBS 301 Lecture 5"), create questions about plausible topics in those lectures.
- 4 answer options per question labeled A, B, C, D.
- Mark the correct answer clearly.
- Provide a short explanation (1–2 sentences) for each answer.
- Respond ONLY with valid JSON, no markdown, no preamble.

JSON FORMAT:
{
  "title": "Short quiz title",
  "questions": [
    {
      "q": "Question text?",
      "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
      "answer": "B",
      "explanation": "Short explanation."
    }
  ]
}`;

    fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [], systemPrompt: 'You are a JSON-only quiz generator. Output only valid JSON.' })
    })
    .then(r => r.json())
    .then(data => {
        _setQuizLoading(false);
        const raw = (data.text || '').replace(/```json|```/g, '').trim();
        let parsed;
        try { parsed = JSON.parse(raw); } catch(e) {
            _setQuizError('Could not parse quiz. Try again!');
            return;
        }
        if (!parsed.questions || !parsed.questions.length) {
            _setQuizError('Quiz returned empty. Try again!');
            return;
        }
        _quizState = { title: parsed.title || 'FileVault Quiz', questions: parsed.questions, idx: 0, score: 0, answered: false, selectedOption: null, missed: [] };
        _renderQuizQuestion();
    })
    .catch(err => {
        _setQuizLoading(false);
        _setQuizError('Network error: ' + err.message);
    });
}

function _showQuizModal() {
    let modal = document.getElementById('fvQuizModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fvQuizModal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px';
        modal.innerHTML = `
        <div id="fvQuizBox" style="background:rgba(15,23,42,0.98);border:1px solid rgba(255,255,255,0.1);border-radius:20px;width:100%;max-width:520px;padding:28px;box-shadow:0 32px 80px rgba(0,0,0,.7);font-family:inherit;color:#e2e8f0;position:relative">
            <button onclick="closeQuiz()" style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;width:32px;height:32px;cursor:pointer;color:#94a3b8;display:flex;align-items:center;justify-content:center;font-size:18px" title="Close">×</button>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
                <span style="font-size:24px">🎯</span>
                <div>
                    <p id="fvQuizTitle" style="font-weight:800;font-size:16px;color:white;margin:0"></p>
                    <p id="fvQuizProgress" style="font-size:11px;color:#64748b;margin:2px 0 0"></p>
                </div>
            </div>
            <div id="fvQuizContent" style="min-height:180px"></div>
            <div id="fvQuizActions" style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end"></div>
        </div>`;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
}

function closeQuiz() {
    const modal = document.getElementById('fvQuizModal');
    if (modal) modal.style.display = 'none';
    _quizState = null;
}

function _setQuizLoading(on) {
    const content = document.getElementById('fvQuizContent');
    const title = document.getElementById('fvQuizTitle');
    const progress = document.getElementById('fvQuizProgress');
    const actions = document.getElementById('fvQuizActions');
    if (!content) return;
    if (on) {
        if (title) title.textContent = 'Generating Quiz…';
        if (progress) progress.textContent = 'Analysing your vault files';
        if (actions) actions.innerHTML = '';
        content.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;padding:32px 0;gap:14px">
            <div style="display:flex;gap:6px">
                <span style="width:10px;height:10px;border-radius:50%;background:rgba(59,130,246,0.7);animation:fvBounce 1.2s ease-in-out infinite"></span>
                <span style="width:10px;height:10px;border-radius:50%;background:rgba(59,130,246,0.7);animation:fvBounce 1.2s ease-in-out 0.2s infinite"></span>
                <span style="width:10px;height:10px;border-radius:50%;background:rgba(59,130,246,0.7);animation:fvBounce 1.2s ease-in-out 0.4s infinite"></span>
            </div>
            <p style="color:#64748b;font-size:13px">AI is building your quiz…</p>
        </div>`;
    }
}

function _setQuizError(msg) {
    const content = document.getElementById('fvQuizContent');
    const actions = document.getElementById('fvQuizActions');
    if (content) content.innerHTML = '<p style="color:#ef4444;font-size:13px;text-align:center;padding:32px 0">' + msg + '</p>';
    if (actions) actions.innerHTML = '<button onclick="openQuiz()" style="padding:10px 20px;background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.3);border-radius:12px;color:#93c5fd;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">Try Again</button>';
}

function _renderQuizQuestion() {
    if (!_quizState) return;
    const { title, questions, idx, score } = _quizState;
    const q = questions[idx];
    const total = questions.length;
    const titleEl = document.getElementById('fvQuizTitle');
    const progressEl = document.getElementById('fvQuizProgress');
    const content = document.getElementById('fvQuizContent');
    const actions = document.getElementById('fvQuizActions');
    if (!q || !content) return;
    if (titleEl) titleEl.textContent = title;
    if (progressEl) progressEl.textContent = 'Question ' + (idx + 1) + ' of ' + total + '  ·  Score: ' + score + '/' + total;
    _quizState.answered = false;
    _quizState.selectedOption = null;

    const optHtml = Object.entries(q.options).map(([k, v]) =>
        `<button data-opt="${k}" onclick="_quizSelectOption('${k}')" style="width:100%;text-align:left;padding:11px 14px;border-radius:11px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#e2e8f0;font-size:13px;cursor:pointer;font-family:inherit;margin-bottom:7px;transition:all .15s;display:flex;align-items:flex-start;gap:10px">
            <span style="min-width:20px;font-weight:800;color:#94a3b8">${k}.</span><span>${escapeHtml(v)}</span>
        </button>`
    ).join('');

    content.innerHTML = `
        <p style="font-size:15px;font-weight:700;color:white;margin:0 0 16px;line-height:1.45">${escapeHtml(q.q)}</p>
        <div id="fvQuizOptions">${optHtml}</div>
        <div id="fvQuizFeedback" style="display:none;margin-top:12px;padding:12px 14px;border-radius:12px;font-size:13px;line-height:1.5"></div>`;

    actions.innerHTML = '<button id="fvQuizNextBtn" onclick="_quizNext()" style="padding:10px 22px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;border-radius:12px;color:white;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;display:none">' +
        (idx + 1 < total ? 'Next →' : 'See Results') + '</button>';
}

function _quizSelectOption(opt) {
    if (!_quizState || _quizState.answered) return;
    _quizState.answered = true;
    _quizState.selectedOption = opt;
    const q = _quizState.questions[_quizState.idx];
    const correct = opt === q.answer;
    if (correct) _quizState.score++;
    else _quizState.missed.push({ q: q.q, answer: q.answer, explanation: q.explanation || '', yourAnswer: (q.options && q.options[opt]) || opt });
    // Style option buttons
    document.querySelectorAll('#fvQuizOptions button').forEach(btn => {
        const k = btn.dataset.opt;
        btn.style.cursor = 'default';
        if (k === q.answer) {
            btn.style.background = 'rgba(34,197,94,0.15)';
            btn.style.borderColor = 'rgba(34,197,94,0.4)';
            btn.style.color = '#4ade80';
            btn.querySelector('span:first-child').style.color = '#4ade80';
        } else if (k === opt && !correct) {
            btn.style.background = 'rgba(239,68,68,0.12)';
            btn.style.borderColor = 'rgba(239,68,68,0.35)';
            btn.style.color = '#fca5a5';
        } else {
            btn.style.opacity = '0.4';
        }
    });
    const feedback = document.getElementById('fvQuizFeedback');
    if (feedback) {
        feedback.style.display = 'block';
        feedback.style.background = correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
        feedback.style.borderColor = correct ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)';
        feedback.style.border = '1px solid ' + (correct ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)');
        feedback.innerHTML = (correct ? '✅ <strong>Correct!</strong> ' : '❌ <strong>Incorrect.</strong> The answer is <strong>' + q.answer + '</strong>. ') + escapeHtml(q.explanation || '');
    }
    const nextBtn = document.getElementById('fvQuizNextBtn');
    if (nextBtn) nextBtn.style.display = 'inline-flex';
}

function _quizNext() {
    if (!_quizState) return;
    const total = _quizState.questions.length;
    if (_quizState.idx + 1 >= total) {
        _renderQuizResults();
    } else {
        _quizState.idx++;
        _renderQuizQuestion();
    }
}

function _renderQuizResults() {
    if (!_quizState) return;
    const { score, questions, title, missed } = _quizState;
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    const grade = pct >= 80 ? '🏆 Excellent!' : pct >= 60 ? '👍 Good effort!' : '📚 Keep studying!';

    // Persist result
    _saveQuizResult(title, score, total, missed);

    const content = document.getElementById('fvQuizContent');
    const actions = document.getElementById('fvQuizActions');
    if (content) {
        content.innerHTML = `
        <div style="text-align:center;padding:16px 0">
            <p style="font-size:44px;margin:0 0 8px">${pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : '📚'}</p>
            <p style="font-size:28px;font-weight:800;color:white;margin:0 0 4px">${score}/${total}</p>
            <p style="font-size:15px;font-weight:700;color:${pct >= 80 ? '#4ade80' : pct >= 60 ? '#fbbf24' : '#f87171'};margin:0 0 8px">${grade}</p>
            <div style="background:rgba(255,255,255,0.06);border-radius:99px;height:8px;overflow:hidden;margin:12px 0">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:99px;transition:width 0.5s ease"></div>
            </div>
            <p style="color:#64748b;font-size:12px">${pct}% score</p>
            ${missed.length ? `<p style="font-size:11px;color:#fca5a5;margin:4px 0 0">${missed.length} question${missed.length > 1 ? 's' : ''} to review below</p>` : '<p style="font-size:11px;color:#4ade80;margin:4px 0 0">Perfect score! 🎉</p>'}
        </div>`;
    }
    const titleEl = document.getElementById('fvQuizTitle');
    if (titleEl) titleEl.textContent = 'Quiz Complete!';
    const progressEl = document.getElementById('fvQuizProgress');
    if (progressEl) progressEl.textContent = 'Saved to history';
    if (actions) {
        const reviewBtn = missed.length
            ? `<button onclick="_showMissedReviewDirect()" style="padding:10px 14px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:12px;color:#fca5a5;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">Review ${missed.length} missed</button>`
            : '';
        actions.innerHTML = `
        ${reviewBtn}
        <button onclick="_exportQuizResult()" title="Download your quiz result as a text file" aria-label="Export quiz result"
            style="padding:10px 14px;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);border-radius:12px;color:#a5b4fc;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">⬇ Export</button>
        <button onclick="closeQuiz()" style="padding:10px 18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#94a3b8;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">Close</button>
        <button onclick="openQuiz()" style="padding:10px 18px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;border-radius:12px;color:white;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit">New Quiz</button>`;
    }
}

// ── Feature 14: Export quiz result as a plain-text download ──
function _exportQuizResult() {
    if (!_quizState) return;
    const { title, score, questions, missed } = _quizState;
    const total = questions.length;
    const pct   = Math.round((score / total) * 100);
    const date  = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    const grade = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good effort' : 'Keep studying';

    let lines = [
        '════════════════════════════════════',
        '  FileVault Quiz Result',
        '════════════════════════════════════',
        `Quiz:   ${title}`,
        `Date:   ${date}`,
        `Score:  ${score} / ${total}  (${pct}%)`,
        `Grade:  ${grade}`,
        '',
    ];

    if (missed.length) {
        lines.push('── Missed Questions ──────────────────');
        missed.forEach((m, i) => {
            lines.push(`${i + 1}. ${m.q}`);
            lines.push(`   Your answer:   ${m.yourAnswer || '—'}`);
            lines.push(`   Correct answer: ${m.answer}`);
            if (m.explanation) lines.push(`   Explanation:   ${m.explanation}`);
            lines.push('');
        });
    } else {
        lines.push('Perfect score — no missed questions! 🎉');
        lines.push('');
    }

    lines.push('════════════════════════════════════');
    lines.push('Generated by FileVault · filevault.works');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `FileVault_Quiz_${date.replace(/\s/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
} else {
    initChatWidget();
}
function enableFullDragging() {
    const container = document.getElementById('aiChatWidget'); // The main wrapper
    const toggleBtn = document.getElementById('chatToggleBtn'); // The closed bubble
    const chatHeader = document.getElementById('chatHeader'); // The top bar of the open chat

    if (!container) return;

    let isDragging = false, startX, startY, initX, initY;

    function attachDrag(handle) {
        if (!handle) return;
        
        // Show a grab hand cursor so users know they can move it
        handle.style.cursor = 'grab';

        handle.addEventListener('pointerdown', (e) => {
            // Ignore clicks on the Close/Minimize 'X' button inside the header
            if (e.target.closest('button')) return;

            isDragging = true;
            handle.style.cursor = 'grabbing';
            startX = e.clientX;
            startY = e.clientY;

            // Get the current position of the widget
            const rect = container.getBoundingClientRect();
            initX = rect.left;
            initY = rect.top;

            // Remove CSS bottom/right constraints so left/top can take over
            container.style.bottom = 'auto';
            container.style.right = 'auto';
            container.style.left = initX + 'px';
            container.style.top = initY + 'px';

            handle.setPointerCapture(e.pointerId);
        });

        handle.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            // Move the container based on how far the mouse/finger moved
            container.style.left = (initX + e.clientX - startX) + 'px';
            container.style.top = (initY + e.clientY - startY) + 'px';
        });

        handle.addEventListener('pointerup', (e) => {
            isDragging = false;
            handle.style.cursor = 'grab';
            handle.releasePointerCapture(e.pointerId);
        });
    }

    // Attach the drag logic to BOTH the bubble and the open header
    attachDrag(toggleBtn);
    attachDrag(chatHeader);
}

// Wait for the widget to be in the DOM before attaching drag handlers.
// setTimeout(500) was fragile on slow connections — if initChatWidget() hadn't
// run yet, the handles simply weren't found and dragging was silently disabled.
// A MutationObserver fires exactly once as soon as #aiChatWidget appears, regardless
// of how long initChatWidget takes.
(function _attachDragWhenReady() {
    if (document.getElementById('aiChatWidget')) {
        enableFullDragging();
        return;
    }
    const observer = new MutationObserver(function(_mutations, obs) {
        if (document.getElementById('aiChatWidget')) {
            obs.disconnect();
            enableFullDragging();
        }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
})();