(function () {
// Everything in this file is scoped inside this IIFE so none of it leaks onto
// window — this file can never collide with chat-widget.js or any other script
// you load on a page later, regardless of variable/function naming overlap.
'use strict';

        const _supabase = supabase.createClient(
            'https://lvhecpvwpzmstciewziv.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aGVjcHZ3cHptc3RjaWV3eml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODIzODIsImV4cCI6MjA4NTY1ODM4Mn0.kjaJKidkubl-_-K87WEAe91puG1qoEvJqnfcOiaG2kI'
        );

        const _PUSH_API = window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : 'https://project-one-187u.onrender.com';

        // ── Capture the logged-in user's email so the row can be matched
        // back to them via realtime when the request is approved ──
        var _requesterEmail = null;
        (async function() {
            try {
                const { data: { session } } = await _supabase.auth.getSession();
                if (session && session.user) _requesterEmail = session.user.email || null;
            } catch(e) {}
        })();

        // ── Capture push subscription so manager can ping you on approval ──
        var _reqPushEndpoint = null;
        var _reqPushKeys = null;

        async function _captureRequestPushSub() {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
            try {
                const res = await fetch(_PUSH_API + '/api/push/vapid-public-key');
                const { key } = await res.json();
                if (!key) return;
                // Register service worker if not already
                let reg;
                try { reg = await navigator.serviceWorker.register('/Sw.js'); }
                catch(e) { reg = await navigator.serviceWorker.ready; }
                reg = await navigator.serviceWorker.ready;
                // Get existing or create new subscription
                let sub = await reg.pushManager.getSubscription();
                if (!sub) {
                    const perm = await Notification.requestPermission();
                    if (perm !== 'granted') return;
                    const padding = '='.repeat((4 - key.length % 4) % 4);
                    const base64 = (key + padding).replace(/-/g, '+').replace(/_/g, '/');
                    const rawData = atob(base64);
                    const appKey = new Uint8Array(rawData.length);
                    for (let i = 0; i < rawData.length; ++i) appKey[i] = rawData.charCodeAt(i);
                    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
                    // Register on server
                    await fetch(_PUSH_API + '/api/push/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ subscription: sub.toJSON() })
                    });
                }
                _reqPushEndpoint = sub.endpoint;
                _reqPushKeys = sub.toJSON().keys || null;
            } catch(e) { /* non-critical */ }
        }

        // Push permission is opt-in only — see the checkbox listener further down.
        // We never call _captureRequestPushSub() automatically on load anymore,
        // since requesting Notification permission without a direct user gesture
        // gets silently auto-blocked by some browsers and burns the prompt for good.
        window.addEventListener('load', () => {
            // ── Wire up char counters (moved from inline oninput= so CSP can drop 'unsafe-inline') ──
            document.getElementById('req_filename')?.addEventListener('input', () => updateCount('req_filename','fn_count',160));
            document.getElementById('req_desc')?.addEventListener('input', () => updateCount('req_desc','desc_count',400));
            document.getElementById('req_reason')?.addEventListener('input', () => updateCount('req_reason','reason_count',300));
            document.getElementById('req_folder')?.addEventListener('input', () => updateCount('req_folder','folder_count',80));

            // ── Wire up buttons (moved from inline onclick= so CSP can drop 'unsafe-inline') ──
            document.getElementById('copyTokenBtn')?.addEventListener('click', copyToken);
            document.getElementById('refreshStatusBtn')?.addEventListener('click', pollStatus);

            // ── Push opt-in: only requests permission as a direct result of this checkbox ──
            const pushOptin = document.getElementById('req_push_optin');
            if (pushOptin) {
                pushOptin.addEventListener('change', () => {
                    if (pushOptin.checked) {
                        _captureRequestPushSub().catch(() => { pushOptin.checked = false; });
                    }
                });
            }

            // ── Populate folder autocomplete from existing folders in DB ──
            (async () => {
                try {
                    const { data, error } = await _supabase
                        .from('files_list')
                        .select('folder_name')
                        .not('folder_name', 'is', null)
                        .order('folder_name')
                        .limit(500);
                    if (!error && data && data.length) {
                        const dl = document.getElementById('folderSuggestions');
                        const seen = new Set();
                        data.forEach(row => {
                            const name = (row.folder_name || '').trim();
                            if (name && !seen.has(name)) {
                                seen.add(name);
                                const opt = document.createElement('option');
                                opt.value = name;
                                dl.appendChild(opt);
                            }
                        });
                        // Update field note to hint that suggestions are available
                        if (seen.size > 0) {
                            const note = document.querySelector('#req_folder ~ .char-count + .field-note') ||
                                         document.querySelector('[for="req_folder"]')?.closest('.form-group')?.querySelector('.field-note');
                            if (note) note.textContent = 'Start typing to see existing folders, or leave blank if unsure.';
                        }
                    }
                } catch(e) { /* non-critical — field still works as plain text */ }
            })();
            // Pre-fill from ?filename=...&folder=... (set by index.html "Need" button)
            const params = new URLSearchParams(window.location.search);
            const prefillName   = params.get('filename');
            const prefillFolder = params.get('folder');
            if (prefillName) {
                const inp = document.getElementById('req_filename');
                if (inp) {
                    inp.value = prefillName;
                    inp.dispatchEvent(new Event('input')); // trigger char count
                }
            }
            if (prefillFolder) {
                const folderEl = document.getElementById('req_folder');
                if (folderEl) {
                    folderEl.value = prefillFolder;
                    folderEl.dispatchEvent(new Event('input'));
                }
            }
            if (prefillName) {
                // Show a subtle banner so students know the form was pre-filled
                const banner = document.createElement('div');
                banner.style.cssText = 'background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25);border-radius:10px;padding:9px 14px;font-size:12px;color:#93c5fd;margin-bottom:16px;display:flex;align-items:center;gap:8px';
                banner.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;flex-shrink:0">auto_fix_high</span>Form pre-filled from your Vault — just add a reason and submit!';
                const form = document.getElementById('requestForm');
                if (form) form.insertBefore(banner, form.firstChild);
                // Scroll the reason field into view gently
                setTimeout(() => { const r = document.getElementById('req_reason'); if (r) r.focus(); }, 300);
            }
        });

        function updateCount(inputId, countId, max) {
            const el = document.getElementById(inputId);
            const cnt = document.getElementById(countId);
            if (el && cnt) cnt.textContent = el.value.length;
        }

        // ── Request token helpers ────────────────────────────────────
        let _activeReqId = null;

        function showRequestToken(id) {
            _activeReqId = id;
            const box = document.getElementById('tokenBox');
            const display = document.getElementById('tokenDisplay');
            if (box && display) {
                display.textContent = id;
                box.style.display = 'block';
            }
        }

        function copyToken() {
            if (!_activeReqId) return;
            const btn = document.getElementById('copyTokenBtn');

            function markCopied() {
                if (btn) {
                    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">check</span> Copied!';
                    setTimeout(() => { btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">content_copy</span> Copy'; }, 2000);
                }
            }
            function markFailed() {
                if (btn) {
                    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">error</span> Failed';
                    setTimeout(() => { btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">content_copy</span> Copy'; }, 2500);
                }
                // Last resort: select the text so the user can copy manually
                const display = document.getElementById('tokenDisplay');
                if (display) {
                    const range = document.createRange();
                    range.selectNodeContents(display);
                    const sel = window.getSelection();
                    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
                }
            }

            // Primary: modern async clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(_activeReqId).then(markCopied).catch(() => {
                    // Fallback: execCommand (deprecated but broadly supported, works without HTTPS)
                    try {
                        const tmp = document.createElement('textarea');
                        tmp.value = _activeReqId;
                        tmp.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
                        document.body.appendChild(tmp);
                        tmp.focus(); tmp.select();
                        const ok = document.execCommand('copy');
                        document.body.removeChild(tmp);
                        ok ? markCopied() : markFailed();
                    } catch(e2) { markFailed(); }
                });
            } else {
                // No clipboard API at all — go straight to execCommand
                try {
                    const tmp = document.createElement('textarea');
                    tmp.value = _activeReqId;
                    tmp.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
                    document.body.appendChild(tmp);
                    tmp.focus(); tmp.select();
                    const ok = document.execCommand('copy');
                    document.body.removeChild(tmp);
                    ok ? markCopied() : markFailed();
                } catch(e) { markFailed(); }
            }
        }

        const STATUS_CONFIG = {
            pending:   { dot: '#f59e0b', label: 'Pending review' },
            approved:  { dot: '#22c55e', label: 'Approved — file uploaded to Vault!' },
            dismissed: { dot: '#64748b', label: 'Dismissed by manager' }
        };

        async function pollStatus() {
            if (!_activeReqId) return;
            const refreshBtn = document.getElementById('refreshStatusBtn');
            const refreshIcon = document.getElementById('refreshIcon');
            if (refreshIcon) { refreshIcon.style.animation = 'spin .7s linear infinite'; }
            if (refreshBtn) refreshBtn.disabled = true;

            try {
                const { data, error } = await _supabase
                    .from('upload_requests')
                    .select('status, manager_note')
                    .eq('id', _activeReqId)
                    .single();

                if (!error && data) {
                    const cfg = STATUS_CONFIG[data.status] || { dot: '#94a3b8', label: data.status };
                    document.getElementById('statusDisplay').innerHTML =
                        `<span style="width:8px;height:8px;border-radius:50%;background:${cfg.dot};flex-shrink:0;display:inline-block"></span>` +
                        `<span style="font-size:13px;color:#e2e8f0;font-weight:600">${cfg.label}</span>`;
                    const noteEl = document.getElementById('managerNote');
                    if (data.manager_note) {
                        noteEl.textContent = '💬 ' + data.manager_note;
                        noteEl.style.display = 'block';
                    } else {
                        noteEl.style.display = 'none';
                    }
                }
            } catch(e) {}

            if (refreshIcon) refreshIcon.style.animation = '';
            if (refreshBtn) refreshBtn.disabled = false;
        }

        // ── On load: check if returning via bookmarked #req= URL ────
        window.addEventListener('load', () => {
            // Check URL hash for a stored request ID (e.g. from a bookmark)
            const hashMatch = window.location.hash.match(/[#&]req=([^&]+)/);
            if (hashMatch) {
                const resumeId = hashMatch[1];
                _activeReqId = resumeId;
                document.getElementById('requestForm').style.display = 'none';
                document.getElementById('successState').style.display = 'block';
                showRequestToken(resumeId);
                pollStatus();
            }
        });

        function showToast(msg, type) {
            const t = document.getElementById('toast');
            const m = document.getElementById('toastMsg');
            const icon = document.getElementById('toastIcon');
            t.className = type;
            m.textContent = msg;
            icon.textContent = type === 'success' ? 'check_circle' : 'error';
            clearTimeout(t._timer);
            t._timer = setTimeout(() => { t.style.display = 'none'; t.className = ''; }, 4000);
        }

        // ── Feature 10: Notify ALL push subscribers (manager included) about a new request ──
        // KNOWN ISSUE, NOT FULLY FIXABLE FROM THIS FILE: this broadcasts to every
        // subscriber, including other students who opted into push for their OWN
        // request status. The real fix is server-side — store the manager's
        // subscription in its own table (e.g. `manager_push_subscriptions`) and
        // target it with /api/push/notify-one instead of a broadcast. That change
        // belongs in server.js, which wasn't provided alongside this file.
        // As a stopgap, the requester's email is intentionally left OUT of the
        // broadcast body below so the one piece of real PII isn't shown to every
        // other subscribed student until the server-side targeting is fixed.
        async function _notifyManagerNewRequest(filename) {
            if (!('serviceWorker' in navigator)) return;
            try {
                const folder = (document.getElementById('req_folder').value || '').trim();
                const body = 'New request: ' + filename + (folder ? ' (' + folder + ')' : '');
                await fetch(_PUSH_API + '/api/push/notify-manager', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: '📥 New File Request',
                        body: body.length > 120 ? body.slice(0, 117) + '…' : body,
                        url: '/manager.html'
                    })
                });
            } catch(e) {
                console.warn('[upload-request] manager push failed (non-critical):', e.message);
            }
        }

        document.getElementById('requestForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const filename = document.getElementById('req_filename').value.trim();
            const reason = document.getElementById('req_reason').value.trim();

            if (!filename) {
                document.getElementById('req_filename').focus();
                showToast('Please enter the file name.', 'error');
                return;
            }
            if (!reason) {
                document.getElementById('req_reason').focus();
                showToast('Please provide a reason.', 'error');
                return;
            }

            // Honeypot check — real users never fill this field
            if (document.getElementById('hp_website').value) {
                // Silently appear to succeed; bots shouldn't know they were caught
                document.getElementById('requestForm').style.display = 'none';
                document.getElementById('successState').style.display = 'block';
                return;
            }

            // ── Local throttle: applies even when no email is given, closing the
            // gap where the DB-based check below was skipped entirely for anonymous
            // submitters. Still bypassable by clearing storage / private browsing —
            // the durable fix is a server-side check (IP- or trigger-based), which
            // belongs in the Supabase policies / server.js, not in client JS. ──
            const LOCAL_THROTTLE_KEY = 'fv_last_submit_ts';
            try {
                const lastTs = parseInt(localStorage.getItem(LOCAL_THROTTLE_KEY) || '0', 10);
                if (lastTs && (Date.now() - lastTs) < 60 * 60 * 1000) {
                    showToast('You\'ve already submitted a request in the last hour. Please wait before submitting another.', 'error');
                    return;
                }
            } catch(e) { /* localStorage unavailable — fall through to the server-side check */ }

            const emailInput = (document.getElementById('req_email').value || '').trim();
            // Use the logged-in email if available, otherwise fall back to the typed one
            const contactEmail = _requesterEmail || emailInput || null;

            const btn = document.getElementById('submitBtn');
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;animation:spin .8s linear infinite">refresh</span> Submitting…';

            try {
                // ── Rate-limit: one request per email per hour ──────────────
                if (contactEmail) {
                    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                    const { count } = await _supabase
                        .from('upload_requests')
                        .select('id', { count: 'exact', head: true })
                        .eq('requester_email', contactEmail)
                        .gte('created_at', oneHourAgo);
                    if (count > 0) {
                        showToast('You\'ve already submitted a request in the last hour. Please wait before submitting another.', 'error');
                        btn.disabled = false;
                        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">send</span> Submit Request';
                        return;
                    }
                }
                // ───────────────────────────────────────────────────────────


                const { data: inserted, error } = await _supabase.from('upload_requests').insert({
                    filename: filename,
                    description: document.getElementById('req_desc').value.trim() || null,
                    reason: reason,
                    folder: document.getElementById('req_folder').value.trim() || null,
                    status: 'pending',
                    requester_email: contactEmail,
                    subscriber_endpoint: _reqPushEndpoint || null,
                    subscriber_keys: _reqPushKeys ? JSON.stringify(_reqPushKeys) : null
                }).select('id').single();
                if (error) throw error;

                // Record the local throttle timestamp now that the insert succeeded
                try { localStorage.setItem(LOCAL_THROTTLE_KEY, String(Date.now())); } catch(e) {}

                // ── Persist the request ID so the student can check status later ──
                const reqId = inserted?.id;
                if (reqId) {
                    // Store in both localStorage and sessionStorage for resilience
                    try {
                        const stored = JSON.parse(localStorage.getItem('fv_request_ids') || '[]');
                        stored.unshift(reqId);
                        localStorage.setItem('fv_request_ids', JSON.stringify(stored.slice(0, 10)));
                    } catch(e) {}
                    try { sessionStorage.setItem('fv_last_request_id', reqId); } catch(e) {}
                    // Put it in the URL hash so a bookmark or copy of the URL preserves it
                    history.replaceState(null, '', '#req=' + reqId);
                    showRequestToken(reqId);
                }

                // ── Feature 10: Notify manager about new file request ──
                // Fire-and-forget — don't block the success state on push delivery
                _notifyManagerNewRequest(filename).catch(() => {});

                document.getElementById('requestForm').style.display = 'none';
                document.getElementById('successState').style.display = 'block';
            } catch (err) {
                console.error(err);
                showToast('Submission failed: ' + (err.message || 'Unknown error'), 'error');
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">send</span> Submit Request';
            }
        });

// ── QR Code generation ──
(function() {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = function() {
        const vaultUrl = window.location.origin + '/index.html';
        const urlEl = document.getElementById('qrUrl');
        if (urlEl) urlEl.textContent = vaultUrl;
        const container = document.getElementById('qrCodeCanvas');
        if (!container) return;
        try {
            new QRCode(container, {
                text: vaultUrl,
                width: 160,
                height: 160,
                colorDark: '#0f172a',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
        } catch(e) {
            const cv = document.getElementById('qrCanvas');
            if (cv) cv.innerHTML = '<p style="color:#64748b;font-size:11px;padding:12px">QR unavailable</p>';
        }
    };
    script.onerror = function() {
        const cv = document.getElementById('qrCanvas');
        if (cv) cv.innerHTML = '<p style="color:#64748b;font-size:11px;padding:12px">QR unavailable</p>';
    };
    document.head.appendChild(script);
})();
})();
