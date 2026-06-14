// FileVault AI Chat Widget
// Routes through your Node.js backend (server.js on Render) — keeps API key secure

const CHAT_API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api/chat'
    : 'https://project-one-187u.onrender.com/api/chat';

// ─── PAGE DETECTION ──────────────────────────────────────────
function detectPage() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('manager')) return 'manager';
    if (path.includes('login'))   return 'login';
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

─── COMMON ISSUES ───
- Files not showing on the user page: check Supabase RLS policies — the files_list table needs USING (true) with no role restriction.
- Sync mismatch: click "Repair Sync" in the Library Files section.
- Expired files hidden on user page: check the expires_at column in files_list — it must be a timestamptz column.
- Download count not updating: make sure the increment_download_count(file_id uuid) RPC function exists in Supabase.
- Duplicate file on upload: the system will prompt you to replace or keep both — choose based on your need.
- Offline mode: the sync dot turns red and a warning toast appears. Uploads and deletes are unavailable until back online.
- High contrast not persisting: it is saved in localStorage — clearing browser data will reset it.`;


const SYSTEM_PROMPT_LOGIN = `You are the FileVault AI assistant helping a user on the LOGIN PAGE (login.html).

STRICT RULES:
- Only answer questions about features on the login page listed below.
- This page is for admins and managers only — regular users do not log in here.
- Be concise. Use exact field/button names as listed below.

=== LOGIN PAGE FEATURES (login.html) ===

SIGN IN FORM:
- Email field — enter your admin or manager email address.
- Password field — enter your password.
- Show/hide password toggle (eye icon) — reveals or hides the password.
- "Remember me" checkbox — keeps you signed in across browser sessions.
- "Sign In" button — submits the form.

FORGOT PASSWORD:
- First enter your email in the email field, then click "Forgot password?" link.
- A password reset email will be sent to that address.

PASSWORD RESET CARD:
- Appears automatically when you visit login.html via a reset link from your email.
- Contains: "New password" field, "Confirm new password" field, and "Update Password" button.

ACCESS RULES:
- Only admins and managers can sign in here.
- Regular users do not have accounts and cannot log in — they use the main FileVault page (index.html) to browse and download files.
- After signing in, admins and managers are taken to the Manager Portal (manager.html).
- Non-privileged accounts are redirected to the user page (index.html).

BACK LINK:
- "Back to FileVault" button (top-left) — returns to the user page (index.html) without logging in.`;


// ─── PICK PROMPT FOR CURRENT PAGE ───────────────────────────
function getSystemPrompt() {
    if (CURRENT_PAGE === 'manager') return SYSTEM_PROMPT_MANAGER;
    if (CURRENT_PAGE === 'login')   return SYSTEM_PROMPT_LOGIN;
    return SYSTEM_PROMPT_USER;
}

function getChatTitle() {
    if (CURRENT_PAGE === 'manager') return 'FileVault AI · Manager';
    if (CURRENT_PAGE === 'login')   return 'FileVault AI · Login Help';
    return 'FileVault AI';
}

function getWelcomeMessage() {
    if (CURRENT_PAGE === 'manager') {
        return '👋 Hi! I\'m your FileVault Manager assistant. Ask me about uploading files, managing folders, fixing sync issues, bulk actions, or anything in the Manager Portal!';
    }
    if (CURRENT_PAGE === 'login') {
        return '👋 Need help signing in? I can guide you through logging in, resetting your password, or explain who this page is for.';
    }
    return '👋 Hi! I\'m the FileVault AI assistant. Ask me how to find files, filter by folder, preview or download files, use bulk ZIP, or search the vault!';
}

// ─── CHAT STATE ──────────────────────────────────────────────
let chatMessages = [];

// ─── INIT ────────────────────────────────────────────────────
function initChatWidget() {
    const html = `
    <div id="aiChatWidget" style="position:fixed;bottom:24px;right:24px;z-index:9999;font-family:'Plus Jakarta Sans',sans-serif">
        <!-- Chat Window -->
        <div id="chatWindow" style="display:none;margin-bottom:16px;width:340px;height:480px;background:rgba(10,15,30,0.95);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.1);border-radius:20px;overflow:hidden;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.6)">
            <!-- Header -->
            <div style="padding:13px 16px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
                <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:34px;height:34px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                        <span class="material-symbols-outlined" style="color:white;font-size:18px">smart_toy</span>
                    </div>
                    <div>
                        <p style="color:white;font-weight:700;font-size:13px;margin:0;line-height:1.2">${getChatTitle()}</p>
                        <div style="display:flex;align-items:center;gap:5px;margin-top:2px">
                            <span id="statusDot" style="width:6px;height:6px;background:#22c55e;border-radius:50%;display:inline-block"></span>
                            <p id="statusLabel" style="color:rgba(255,255,255,0.7);font-size:10px;margin:0">Online</p>
                        </div>
                    </div>
                </div>
                <button onclick="toggleChat()" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.7);display:flex;align-items:center;padding:4px;border-radius:6px" onmouseover="this.style.color='white';this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.color='rgba(255,255,255,0.7)';this.style.background='none'">
                    <span class="material-symbols-outlined" style="font-size:20px">close</span>
                </button>
            </div>

            <!-- Messages -->
            <div id="chatMessages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent">
                <div style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);border-radius:14px;padding:12px 14px">
                    <p style="color:rgba(255,255,255,0.85);font-size:13px;line-height:1.6;margin:0">${getWelcomeMessage()}</p>
                </div>
            </div>

            <!-- Input -->
            <div style="padding:10px 12px 12px;border-top:1px solid rgba(255,255,255,0.07);flex-shrink:0;background:rgba(0,0,0,0.25)">
                <div style="display:flex;gap:8px;align-items:flex-end">
                    <textarea id="chatInput" placeholder="Ask something…" rows="1"
                        style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:9px 12px;color:white;font-size:13px;outline:none;resize:none;font-family:inherit;line-height:1.45;max-height:96px;overflow-y:auto;transition:border-color 0.2s"
                        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatMessage()}"
                        oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,96)+'px'"
                        onfocus="this.style.borderColor='rgba(59,130,246,0.55)'"
                        onblur="this.style.borderColor='rgba(255,255,255,0.1)'"></textarea>
                    <button onclick="sendChatMessage()" id="chatSendBtn"
                        style="width:38px;height:38px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity 0.2s,transform 0.1s"
                        onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        <span class="material-symbols-outlined" style="color:white;font-size:16px">send</span>
                    </button>
                </div>
                <p style="color:rgba(255,255,255,0.18);font-size:9px;text-align:center;margin:6px 0 0;line-height:1">Shift+Enter for new line · <button onclick="openQuiz()" style="background:none;border:none;cursor:pointer;color:rgba(59,130,246,0.6);font-size:9px;font-family:inherit;padding:0;text-decoration:underline" title="Generate a quiz from your vault files">🎯 Quiz me</button></p>
            </div>
        </div>

        <!-- Floating Button -->
        <button onclick="toggleChat()" id="chatToggleBtn"
            style="width:56px;height:56px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(59,130,246,0.45);transition:transform 0.2s,box-shadow 0.2s"
            onmouseover="this.style.transform='scale(1.1)';this.style.boxShadow='0 12px 36px rgba(59,130,246,0.55)'"
            onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 8px 28px rgba(59,130,246,0.45)'">
            <span class="material-symbols-outlined" id="chatBtnIcon" style="color:white;font-size:24px">smart_toy</span>
        </button>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // Restore chat open state after page load/auth redirect
    if (sessionStorage.getItem('fvChatOpen') === '1') {
        const _win = document.getElementById('chatWindow');
        const _ico = document.getElementById('chatBtnIcon');
        if (_win && _ico) { _win.style.display = 'flex'; _ico.textContent = 'close'; }
    }

    // Inject animation + responsive styles
    if (!document.getElementById('chatWidgetStyles')) {
        const s = document.createElement('style');
        s.id = 'chatWidgetStyles';
        s.textContent = `
            @keyframes fvBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
            #chatMessages::-webkit-scrollbar { width: 4px; }
            #chatMessages::-webkit-scrollbar-track { background: transparent; }
            #chatMessages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

            /* ── Mobile: right-anchored widget — window stays partial right, never overflows ── */
            @media (max-width: 1023px) {
                #aiChatWidget {
                    right: 16px !important;
                    left: auto !important;
                    bottom: calc(var(--mobile-nav-height, 72px) + env(safe-area-inset-bottom, 0px) + 12px) !important;
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
                /* ── Login page: chatbot floats at top-right, clear of the sign-in card ── */
                body.login-page #aiChatWidget {
                    top: 16px !important;
                    bottom: auto !important;
                    right: 16px !important;
                    display: flex !important;
                    flex-direction: column-reverse !important;
                }
                body.login-page #chatWindow {
                    height: min(440px, 60vh) !important;
                    margin-bottom: 0 !important;
                    margin-top: 12px !important;
                }
            }
        `;
        document.head.appendChild(s);
    }
}

// ─── UI HELPERS ──────────────────────────────────────────────
function toggleChat() {
    const win  = document.getElementById('chatWindow');
    const icon = document.getElementById('chatBtnIcon');
    const isOpen = win.style.display === 'flex';
    win.style.display = isOpen ? 'none' : 'flex';
    icon.textContent  = isOpen ? 'smart_toy' : 'close';
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

    const typing = appendTyping();
    setOnlineStatus(true);

    try {
        const history = chatMessages.slice(0, -1).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const res = await fetch(CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message:      text,
                history,
                systemPrompt: getSystemPrompt()
            })
        });

        typing.remove();

        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data  = await res.json();
        const reply = data.text || 'No response received.';

        chatMessages.push({ role: 'assistant', content: reply });
        appendBubble('assistant', formatAssistantText(reply));

    } catch (err) {
        typing.remove();
        setOnlineStatus(false);
        appendBubble('assistant', '⚠️ Could not reach the server. Make sure the backend is running on Render and try again.');
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

// ─── QUIZ / SELF-TEST FEATURE ─────────────────────────────────
// Generates multiple-choice questions from file names + context
// using the same AI backend. Works on the user page only.

var _quizState = null; // { questions: [{q, options, answer, explanation}], idx, score }

function openQuiz() {
    // Only available on user page
    if (CURRENT_PAGE !== 'user') {
        showToast('Quiz is available on the main FileVault page.', 'info', 2500);
        return;
    }
    // Build context from visible files
    const files = typeof allFiles !== 'undefined' ? allFiles : [];
    if (!files.length) {
        showToast('No files in the vault yet — quiz needs some content!', 'warning', 3000);
        return;
    }
    const folder = typeof currentFolder !== 'undefined' ? currentFolder : null;
    const visible = folder ? files.filter(f => f.folder === folder) : files;
    const sample = visible.slice(0, 20).map(f => (f.name || '') + (f.description ? ' — ' + f.description : '') + (f.folder ? ' [' + f.folder + ']' : '')).join('\n');

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
        _quizState = { title: parsed.title || 'FileVault Quiz', questions: parsed.questions, idx: 0, score: 0, answered: false, selectedOption: null };
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
    const { score, questions } = _quizState;
    const total = questions.length;
    const pct = Math.round((score / total) * 100);
    const grade = pct >= 80 ? '🏆 Excellent!' : pct >= 60 ? '👍 Good effort!' : '📚 Keep studying!';
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
        </div>`;
    }
    const titleEl = document.getElementById('fvQuizTitle');
    if (titleEl) titleEl.textContent = 'Quiz Complete!';
    const progressEl = document.getElementById('fvQuizProgress');
    if (progressEl) progressEl.textContent = 'Well done';
    if (actions) {
        actions.innerHTML = `
        <button onclick="closeQuiz()" style="padding:10px 18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#94a3b8;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">Close</button>
        <button onclick="openQuiz()" style="padding:10px 18px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border:none;border-radius:12px;color:white;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit">New Quiz</button>`;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
} else {
    initChatWidget();
}