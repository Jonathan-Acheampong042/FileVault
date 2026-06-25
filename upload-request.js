(function() {
    // Everything in this file is scoped inside this IIFE so none of it leaks onto
    // window — this file can never collide with chat-widget.js or any other script
    // you load on a page later, regardless of variable/function naming overlap.
    'use strict';

    // Reuse the single Supabase client created by the inline script in
    // upload-request.html (window._fvSupabase). Having two separate clients
    // both calling onAuthStateChange causes a race that leaves the form locked
    // for social login users. Fall back to creating one only if the inline
    // script hasn't run yet (shouldn't happen, but keeps things safe).
    const _supabase = window._fvSupabase || supabase.createClient(
        'https://lvhecpvwpzmstciewziv.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2aGVjcHZ3cHptc3RjaWV3eml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODIzODIsImV4cCI6MjA4NTY1ODM4Mn0.kjaJKidkubl-_-K87WEAe91puG1qoEvJqnfcOiaG2kI',
        {
            auth: {
                storage: window.localStorage,
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false
            }
        }
        );

    const _PUSH_API = window.location.hostname === 'localhost' ?
        'http://localhost:3000' :
        'https://project-one-187u.onrender.com';

    // ── Auth state ────────────────────────────────────────────────
    // NOTE: Auth gate visibility is controlled entirely by the inline
    // script in upload-request.html (via onAuthStateChange + getSession).
    // This file only tracks _isAuthenticated so the submit handler can
    // guard against unauthenticated submissions. We sync it here via
    // onAuthStateChange so it stays in step with the inline script.
    var _requesterEmail = null;
    var _isAuthenticated = false;

    _supabase.auth.onAuthStateChange(function(event, session) {
        if (session && session.user) {
            _requesterEmail = session.user.email || null;
            _isAuthenticated = true;
        } else {
            _requesterEmail = null;
            _isAuthenticated = false;
        }
    });

    // Also read the session immediately for browsers where the storage
    // event fires before onAuthStateChange resolves.
    _supabase.auth.getSession().then(function(result) {
        var session = result && result.data && result.data.session;
        if (session && session.user) {
            _requesterEmail = session.user.email || null;
            _isAuthenticated = true;
        }
    }).catch(function() {});

    // ── Capture push subscription ──
    var _reqPushEndpoint = null;
    var _reqPushKeys = null;

    async function _captureRequestPushSub() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        try {
            const res = await fetch(_PUSH_API + '/api/push/vapid-public-key');
            const {
                key
            } = await res.json();
            if (!key) return;
            let reg;
            try {
                reg = await navigator.serviceWorker.register('/Sw.js');
            } catch (e) {
                reg = await navigator.serviceWorker.ready;
            }
            reg = await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') return;
                const padding = '='.repeat((4 - key.length % 4) % 4);
                const base64 = (key + padding).replace(/-/g, '+').replace(/_/g, '/');
                const rawData = atob(base64);
                const appKey = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) appKey[i] = rawData.charCodeAt(i);
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: appKey
                });
                await fetch(_PUSH_API + '/api/push/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        subscription: sub.toJSON()
                    })
                });
            }
            _reqPushEndpoint = sub.endpoint;
            _reqPushKeys = sub.toJSON().keys || null;
        } catch (e) {
            /* non-critical */ }
    }

    window.addEventListener('load', () => {
        // ── Char counters ──
        document.getElementById('req_filename')?.addEventListener('input', () => updateCount('req_filename', 'fn_count', 160));
        document.getElementById('req_desc')?.addEventListener('input', () => updateCount('req_desc', 'desc_count', 400));
        document.getElementById('req_reason')?.addEventListener('input', () => updateCount('req_reason', 'reason_count', 300));
        document.getElementById('req_folder')?.addEventListener('input', () => updateCount('req_folder', 'folder_count', 80));

        // ── Button listeners ──
        document.getElementById('copyTokenBtn')?.addEventListener('click', copyToken);
        document.getElementById('refreshStatusBtn')?.addEventListener('click', pollStatus);

        // ── Push opt-in ──
        const pushOptin = document.getElementById('req_push_optin');
        if (pushOptin) {
            pushOptin.addEventListener('change', () => {
                if (pushOptin.checked) {
                    _captureRequestPushSub().catch(() => {
                        pushOptin.checked = false;
                    });
                }
            });
        }

        // ── Folder autocomplete ──
        (async () => {
            try {
                const {
                    data,
                    error
                } = await _supabase
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
                    if (seen.size > 0) {
                        const note = document.querySelector('[for="req_folder"]')?.closest('.form-group')?.querySelector('.field-note');
                        if (note) note.textContent = 'Start typing to see existing folders, or leave blank if unsure.';
                    }
                }
            } catch (e) {}
        })();

        // ── Pre-fill from URL params ──
        const params = new URLSearchParams(window.location.search);
        const prefillName = params.get('filename');
        const prefillFolder = params.get('folder');
        if (prefillName) {
            const inp = document.getElementById('req_filename');
            if (inp) {
                inp.value = prefillName;
                inp.dispatchEvent(new Event('input'));
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
            const banner = document.createElement('div');
            banner.style.cssText = 'background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25);border-radius:10px;padding:9px 14px;font-size:12px;color:#93c5fd;margin-bottom:16px;display:flex;align-items:center;gap:8px';
            banner.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;flex-shrink:0">auto_fix_high</span>Form pre-filled from your Vault — just add a reason and submit!';
            const form = document.getElementById('requestForm');
            if (form) form.insertBefore(banner, form.firstChild);
            setTimeout(() => {
                const r = document.getElementById('req_reason');
                if (r) r.focus();
            }, 300);
        }

    });

    function updateCount(inputId, countId, max) {
        const el = document.getElementById(inputId);
        const cnt = document.getElementById(countId);
        if (el && cnt) cnt.textContent = el.value.length;
    }

    // ── Request token helpers ──
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

    // Expose globally so the inline auth script can navigate to a saved request
    // when a user clicks one of their past request items.
    window._fvShowSavedRequest = function(id) {
        _activeReqId = id;
        history.replaceState(null, '', '#req=' + id);
        document.getElementById('requestForm').style.display = 'none';
        document.getElementById('successState').style.display = 'block';
        showRequestToken(id);
        pollStatus();
    };

    function copyToken() {
        if (!_activeReqId) return;
        const btn = document.getElementById('copyTokenBtn');

        function markCopied() {
            if (btn) {
                btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">check</span> Copied!';
                setTimeout(() => {
                    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">content_copy</span> Copy';
                }, 2000);
            }
        }

        function markFailed() {
            if (btn) {
                btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">error</span> Failed';
                setTimeout(() => {
                    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">content_copy</span> Copy';
                }, 2500);
            }
            const display = document.getElementById('tokenDisplay');
            if (display) {
                const range = document.createRange();
                range.selectNodeContents(display);
                const sel = window.getSelection();
                if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(_activeReqId).then(markCopied).catch(() => {
                try {
                    const tmp = document.createElement('textarea');
                    tmp.value = _activeReqId;
                    tmp.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
                    document.body.appendChild(tmp);
                    tmp.focus();
                    tmp.select();
                    document.execCommand('copy') ? markCopied() : markFailed();
                    document.body.removeChild(tmp);
                } catch (e2) {
                    markFailed();
                }
            });
        } else {
            try {
                const tmp = document.createElement('textarea');
                tmp.value = _activeReqId;
                tmp.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
                document.body.appendChild(tmp);
                tmp.focus();
                tmp.select();
                document.execCommand('copy') ? markCopied() : markFailed();
                document.body.removeChild(tmp);
            } catch (e) {
                markFailed();
            }
        }
    }

    const STATUS_CONFIG = {
        pending: {
            dot: '#f59e0b',
            label: 'Pending review'
        },
        approved: {
            dot: '#22c55e',
            label: 'Approved — file uploaded to Vault!'
        },
        dismissed: {
            dot: '#64748b',
            label: 'Dismissed by manager'
        }
    };

    async function pollStatus() {
        if (!_activeReqId) return;
        const refreshBtn = document.getElementById('refreshStatusBtn');
        const refreshIcon = document.getElementById('refreshIcon');
        if (refreshIcon) refreshIcon.style.animation = 'spin .7s linear infinite';
        if (refreshBtn) refreshBtn.disabled = true;
        try {
            const {
                data,
                error
            } = await _supabase
                .from('upload_requests')
                .select('status, manager_note')
                .eq('id', _activeReqId)
                .single();
            if (!error && data) {
                const cfg = STATUS_CONFIG[data.status] || {
                    dot: '#94a3b8',
                    label: data.status
                };
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
        } catch (e) {}
        if (refreshIcon) refreshIcon.style.animation = '';
        if (refreshBtn) refreshBtn.disabled = false;
    }

    // ── Resume from bookmarked #req= URL ──
    window.addEventListener('load', () => {
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
        t.style.display = 'flex'; // override any previous inline display:none
        m.textContent = msg;
        icon.textContent = type === 'success' ? 'check_circle' : 'error';
        clearTimeout(t._timer);
        t._timer = setTimeout(() => {
            t.style.display = 'none';
            t.className = '';
        }, 4000);
    }

    async function _notifyManagerNewRequest(filename) {
        if (!('serviceWorker' in navigator)) return;
        try {
            const folder = (document.getElementById('req_folder').value || '').trim();
            const body = 'New request: ' + filename + (folder ? ' (' + folder + ')' : '');

            // server.js's /api/push/notify-manager requires a real
            // Authorization: Bearer <token> when Supabase is configured (see
            // its `if (_supa) { ... if (!token) return 401 ... }` check) —
            // this form already requires sign-in before submission is even
            // allowed (see the _isAuthenticated gate above), so a session
            // should always be available here.
            const headers = {
                'Content-Type': 'application/json'
            };
            try {
                const {
                    data: {
                        session
                    }
                } = await _supabase.auth.getSession();
                if (session && session.access_token) {
                    headers['Authorization'] = 'Bearer ' + session.access_token;
                }
            } catch (e) {
                /* fall through without auth header — server will 401 and this
                   is already a non-critical, swallowed-error code path */
            }

            await fetch(_PUSH_API + '/api/push/notify-manager', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    title: '📥 New File Request',
                    body: body.length > 120 ? body.slice(0, 117) + '…' : body,
                    url: '/manager.html'
                })
            });
        } catch (e) {
            console.warn('[upload-request] manager push failed (non-critical):', e.message);
        }
    }

    document.getElementById('requestForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        // Re-check the session at submit time in case onAuthStateChange fired late
        // (race condition between Supabase SDK init and page render).
        if (!_isAuthenticated) {
            const {
                data: {
                    session
                }
            } = await _supabase.auth.getSession().catch(() => ({
                data: {
                    session: null
                }
            }));
            if (session && session.user) {
                _requesterEmail = session.user.email || null;
                _isAuthenticated = true;
            }
        }

        if (!_isAuthenticated) {
            showToast('Please create an account or sign in to submit a request.', 'error');
            // Redirect to login with return target so they come back here
            setTimeout(() => {
                window.location.href = 'login.html?next=upload-request.html';
            }, 1500);
            return;
        }

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

        if (document.getElementById('hp_website').value) {
            document.getElementById('requestForm').style.display = 'none';
            document.getElementById('successState').style.display = 'block';
            return;
        }

        const LOCAL_THROTTLE_KEY = 'fv_last_submit_ts';
        try {
            const lastTs = parseInt(localStorage.getItem(LOCAL_THROTTLE_KEY) || '0', 10);
            if (lastTs && (Date.now() - lastTs) < 60 * 60 * 1000) {
                showToast('You\'ve already submitted a request in the last hour. Please wait before submitting another.', 'error');
                return;
            }
        } catch (e) {}

        const emailInput = (document.getElementById('req_email').value || '').trim();
        const contactEmail = _requesterEmail || emailInput || null;

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;animation:spin .8s linear infinite">refresh</span> Submitting…';

        try {
            if (contactEmail) {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                const {
                    count
                } = await _supabase
                    .from('upload_requests')
                    .select('id', {
                        count: 'exact',
                        head: true
                    })
                    .eq('requester_email', contactEmail)
                    .gte('created_at', oneHourAgo);
                if (count > 0) {
                    showToast('You\'ve already submitted a request in the last hour.', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">send</span> Submit Request';
                    return;
                }
            }

            const {
                data: inserted,
                error
            } = await _supabase.from('upload_requests').insert({
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

            try {
                localStorage.setItem(LOCAL_THROTTLE_KEY, String(Date.now()));
            } catch (e) {}

            const reqId = inserted?.id;
            if (reqId) {
                try {
                    const stored = JSON.parse(localStorage.getItem('fv_request_ids') || '[]');
                    stored.unshift(reqId);
                    localStorage.setItem('fv_request_ids', JSON.stringify(stored.slice(0, 10)));
                } catch (e) {}
                try {
                    sessionStorage.setItem('fv_last_request_id', reqId);
                } catch (e) {}
                history.replaceState(null, '', '#req=' + reqId);
                showRequestToken(reqId);
            }

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

})();