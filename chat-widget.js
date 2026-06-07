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

HEADER:
- Search bar — press Ctrl/Cmd+F or click it to search files, folders, and descriptions.

FOLDERS SECTION:
- Folder pills — click "All" to show every file, or click a specific folder pill to filter files to that folder only.

FILE CONTROLS (above the file grid):
- Grid view button — switches files to a grid layout.
- List view button — switches files to a list layout.
- Sort dropdown — options: Newest, Oldest, Name A-Z.

FILE CARDS:
- Eye (visibility) icon — opens a preview of the file without downloading.
- Download icon — downloads the file directly.
- Expiry badge — if a file is close to expiring, a badge like "3d left" appears on the card.
- Expired files — hidden automatically; they will not appear in the list.

BULK SELECT:
- Tick the checkbox on one or more file cards to select them.
- A bulk bar appears at the bottom with: a "ZIP" download button (downloads all selected files as a ZIP) and a close (×) button to deselect all.

RECENT UPLOADS SECTION:
- Shows the 4 newest non-expired files for quick access.

NEED HELP? SECTION:
- Displays contact info: email, WhatsApp, and phone number.
- "Contact Support" button links to support contact.

SIDEBAR (desktop only):
- "My Vault" link — shows all files.
- Folder links — click to jump to a specific folder.
- "Admin" link at the bottom — takes admins/managers to the login page.

MOBILE BOTTOM NAV:
- Vault — shows all files.
- Search — focuses the search bar.
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
- "Logout" button (top-right) — signs out and redirects to login.html.

KEYBOARD SHORTCUTS:
- Ctrl/Cmd + U — opens the file upload dialog.
- Ctrl/Cmd + R — refreshes the file library.

─── FOLDERS SECTION ───
- Displays all folders as cards in a grid.
- Each folder card has: edit (pencil) icon to rename, delete (trash) icon to remove.
- "New Folder" button (top-right of section) — creates a new folder via a prompt.

─── PUBLISH NEW FILE SECTION ───
- Folder dropdown — select which folder to publish the file into, or leave as "No folder (root)".
- "New Folder" icon button — creates a folder without leaving the upload form.
- Description field (optional) — short note about the file(s).
- Expiry field (optional) — number of days until the file link expires (e.g. 7). Leave blank for no expiry.
- File upload zone — drag & drop files here, or click to open the file picker.
  - Ctrl/Cmd+Click in the file picker to select multiple files at once.
- "Upload & Share" button — uploads selected file(s) and syncs them to both Storage and the Database automatically.

─── LIBRARY FILES SECTION ───
Sort & View controls:
- Sort dropdown — Newest First, Oldest First, Name A-Z, Size.
- Grid view button / List view button — toggle layout.
- "Repair Sync" button — scans Storage for files missing from the Database and adds the missing records. Use when sync status shows a mismatch.
- "Refresh" button — reloads the file list from the database.

Bulk actions (appear when files are checked):
- Count label showing how many files are selected.
- "Download ZIP" button — downloads all selected files as a ZIP.
- "Delete All" button — permanently deletes all selected files.
- Close (×) button — deselects all.

Tabs inside Library:
- "Database View" (tab-db) — shows files recorded in the Supabase database.
- "Storage View" (tab-storage) — shows files actually stored in Supabase Storage; useful for spotting orphaned files not in the DB.
- "Downloads" tracker (tab-tracker) — bar chart showing download counts per file.

File card action icons (hover over a file card):
- Eye icon — preview the file.
- Pencil (rename) icon — rename the file.
- Move (drive_file_move) icon — move the file to a different folder.
- Notes (edit description) icon — edit the file's description.
- Trash (delete) icon — permanently delete the file.

─── SYNC STATUS PANEL ───
- "Database Records" count — how many files are in the DB.
- "Storage Files" count — how many files are in Storage.
- "Status" — "Synced" if counts match, "Mismatch" if they differ.
- Fix mismatches with the "Repair Sync" button in the Library section.

─── FILE REQUEST LINK SECTION ───
- Folder dropdown — pick which folder the request link targets.
- "Generate Link" button — creates a shareable upload-request URL for that folder.
- Copy button — copies the generated URL to clipboard.

─── COMMON ISSUES ───
- Files not showing on the user page: check Supabase RLS policies — the files_list table needs USING (true) with no role restriction.
- Sync mismatch: click "Repair Sync" in the Library Files section.
- Expired files hidden: check the expires_at column in files_list — it must be a timestamptz column.
- Download count not updating: make sure the increment_download_count(file_id uuid) RPC function exists in Supabase.
- Offline mode: the sync dot turns red and a warning toast appears. Some features are unavailable until back online.`;


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
                <p style="color:rgba(255,255,255,0.18);font-size:9px;text-align:center;margin:6px 0 0;line-height:1">Shift+Enter for new line</p>
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

            /* ── Mobile: full-width chat window anchored to bottom-right ── */
            @media (max-width: 768px) {
                #aiChatWidget {
                    position: fixed !important;
                    right: 16px !important;
                    left: 16px !important;
                    bottom: 20px !important;
                    width: auto !important;
                    box-sizing: border-box !important;
                }
                #chatWindow {
                    width: 100% !important;
                    height: min(480px, 70vh) !important;
                    margin-bottom: 12px !important;
                    border-radius: 20px !important;
                    box-sizing: border-box !important;
                }
                #chatToggleBtn {
                    position: absolute !important;
                    bottom: 0 !important;
                    right: 0 !important;
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
} else {
    initChatWidget();
}