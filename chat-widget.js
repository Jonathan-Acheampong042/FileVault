// FileVault AI Chat Widget
// Routes through your Node.js backend (server.js on Render) — keeps API key secure

const CHAT_API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api/chat'
    : 'https://project-one-187u.onrender.com/api/chat';

// Accurate system prompt matched to actual buttons & sections in the HTML
const SYSTEM_PROMPT = `You are the FileVault AI assistant. FileVault is a secure file-sharing web app. Be concise and use the exact names of buttons and sections below.

--- USER PAGE (index.html) ---
Header: search bar (Ctrl/Cmd+F focuses it).
Folder pills: "All" button + one pill per folder — click to filter files by folder.
File controls: Grid view button, List view button, Sort dropdown (Newest, Oldest, Name).
File cards: each has a visibility (eye) icon to open the file and a download icon. Expired files are hidden automatically; files near expiry show a badge like "3d left".
Bulk select: tick the checkboxes on file cards → a bulk bar appears with a "ZIP" download button and a close (×) button.
Recent uploads section: shows the 4 newest non-expired files.
Need help? section: contact info (email, WhatsApp, phone) and a "Contact Support" button.
No sign-in or account creation on this page — users just browse and download.

--- LOGIN PAGE (login.html) ---
Admin-only login: email + password fields, show/hide password toggle (eye icon), "Remember me" checkbox, "Forgot password?" link, "Sign In" button.
Forgot password: enter your email first, then click "Forgot password?" — a reset email is sent.
Password reset card: appears automatically when you visit login.html via a reset link. Has "New password" and "Confirm new password" fields plus an "Update Password" button.
This page is for admins and managers only — regular users do not log in.

--- MANAGER PAGE (manager.html) ---
Header: FileVault logo, "Manager Portal" title, sync dot (green=synced, yellow=warning, red=error) + sync label, "Logout" button.
Folders section: grid of folder cards, each with edit (pencil) and delete (trash) icon buttons. "New Folder" button top-right of section.
Publish New File section: Folder dropdown + "New Folder" button, Description field (optional), Expiry field in days (optional), File upload zone (drag & drop or click), "Upload & Share" button.
Library Files section:
  - Sort dropdown: Newest First, Oldest First, Name A-Z, Size.
  - Grid/List view toggle buttons.
  - "Repair Sync" button and "Refresh" button.
  - Bulk bar (appears when files checked): shows count, "Download ZIP" button, "Delete All" button, close (×) button.
  - Tabs: "Database View" (tab-db), "Storage View" (tab-storage), "Downloads" tracker (tab-tracker, bar chart of download counts).
  - File cards: visibility (eye), rename (pencil), move (drive_file_move), edit description (notes), delete (trash) buttons.
Sync Status Panel: shows "Database Records" count, "Storage Files" count, "Status" (Synced/Mismatch).
File Request Link section: folder dropdown, "Generate Link" button, copy button on the generated URL.

--- USER ROLES ---
admin / manager: can access the Manager page.
Other users: redirected to the user page (index.html) if they try to log in — the login page is admin/manager only.

--- COMMON ISSUES ---
Files not showing: check Supabase RLS policies — use USING (true) with no role restriction.
Sync mismatch: use the "Repair Sync" button in the Library Files section.
Expired files hidden: check the expires_at column in files_list — it must be a timestamptz.
Download count not updating: make sure the increment_download_count(file_id uuid) RPC function exists in Supabase.`;

// Chat state
let chatMessages = [];

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
                        <p style="color:white;font-weight:700;font-size:13px;margin:0;line-height:1.2">FileVault AI</p>
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
                    <p style="color:rgba(255,255,255,0.85);font-size:13px;line-height:1.6;margin:0">👋 Hi! I'm the FileVault AI assistant. Ask me how to upload files, manage folders, fix sync issues, or anything about the app!</p>
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

    // Inject bounce animation
    if (!document.getElementById('chatWidgetStyles')) {
        const s = document.createElement('style');
        s.id = 'chatWidgetStyles';
        s.textContent = `
            @keyframes fvBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
            #chatMessages::-webkit-scrollbar { width: 4px; }
            #chatMessages::-webkit-scrollbar-track { background: transparent; }
            #chatMessages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        `;
        document.head.appendChild(s);
    }
}

function toggleChat() {
    const win = document.getElementById('chatWindow');
    const icon = document.getElementById('chatBtnIcon');
    const isOpen = win.style.display === 'flex';
    win.style.display = isOpen ? 'none' : 'flex';
    icon.textContent = isOpen ? 'smart_toy' : 'close';
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
    const dot = document.getElementById('statusDot');
    const label = document.getElementById('statusLabel');
    if (!dot) return;
    dot.style.background = online ? '#22c55e' : '#f59e0b';
    if (label) label.textContent = online ? 'Online' : 'Connecting…';
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('chatSendBtn');
    const text = input.value.trim();
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
                message: text,
                history,
                systemPrompt: SYSTEM_PROMPT
            })
        });

        typing.remove();

        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
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

document.addEventListener('DOMContentLoaded', initChatWidget);