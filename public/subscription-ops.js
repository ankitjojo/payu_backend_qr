document.addEventListener('DOMContentLoaded', () => {
    const STEPS = {
        mandateStatus:    { num: '①', label: 'Verify Mandate' },
        preDebit:         { num: '②', label: 'Pre-Debit' },
        recurringPayment: { num: '③', label: 'Recurring Payment' },
        verifyPayment:    { num: '④', label: 'Verify Payment' },
    };

    const tabs = document.querySelectorAll('.op-tab');
    const panes = document.querySelectorAll('.op-pane');
    const sharedAuth = document.getElementById('sharedAuthPayuId');
    const resultArea = document.getElementById('resultArea');
    const resMeta = document.getElementById('resMeta');
    const resShortcuts = document.getElementById('resShortcuts');
    const resCurl = document.getElementById('resCurl');
    const resResponse = document.getElementById('resResponse');
    const logList = document.getElementById('logList');

    const results = {};   // last result per step: { time, curl, responseText, data }
    const log = [];       // every call, newest first
    let current = 'mandateStatus';

    // ── helpers ──
    const newId = prefix => prefix + Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-6);
    const pretty = v => (typeof v === 'string' ? v : JSON.stringify(v, null, 2));
    const timeNow = () => new Date().toLocaleTimeString();
    const dayPlus = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    const form = op => document.querySelector(`form[data-op="${op}"]`);

    function storeGet(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } }
    function storeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

    async function copyText(text, btn) {
        const done = () => {
            if (!btn) return;
            const orig = btn.dataset.label || btn.textContent;
            btn.dataset.label = orig;
            btn.textContent = '✅ Copied';
            setTimeout(() => { btn.textContent = orig; }, 1800);
        };
        try {
            await navigator.clipboard.writeText(text);
            done();
        } catch {
            window.prompt('Copy (Cmd/Ctrl+C):', text);
        }
    }

    // ── defaults ──
    document.querySelectorAll('[data-gen]').forEach(i => { i.value = newId(i.dataset.gen); });
    document.querySelectorAll('[data-default-date]').forEach(i => { i.value = dayPlus(Number(i.dataset.defaultDate)); });
    sharedAuth.value = storeGet('subOps.authpayuid');
    syncAuth(false);

    function syncAuth(force) {
        document.querySelectorAll('[data-auth]').forEach(i => { if (force || !i.value) i.value = sharedAuth.value; });
    }
    sharedAuth.addEventListener('input', () => { storeSet('subOps.authpayuid', sharedAuth.value); syncAuth(true); });

    document.querySelectorAll('[data-regen]').forEach(b => {
        b.addEventListener('click', () => { const i = b.parentElement.querySelector('input'); i.value = newId(i.dataset.gen); });
    });

    // ── step switching: always allowed, nothing cleared ──
    function showStep(op) {
        current = op;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.op === op));
        panes.forEach(p => p.classList.toggle('hidden', p.dataset.op !== op));
        renderResult();
    }
    tabs.forEach(t => t.addEventListener('click', () => showStep(t.dataset.op)));

    // ④ mode toggle
    form('verifyPayment').querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', () => {
        const mode = form('verifyPayment').querySelector('input[name="mode"]:checked').value;
        form('verifyPayment').querySelectorAll('[data-mode]').forEach(el => el.classList.toggle('hidden', el.dataset.mode !== mode));
    }));

    // ── render ──
    function renderResult() {
        const r = results[current];
        if (!r) { resultArea.classList.add('hidden'); return; }
        resultArea.classList.remove('hidden');
        resMeta.textContent = `${STEPS[current].num} ${STEPS[current].label} · ${r.command || 'no command'} · ${r.time}`;
        resCurl.textContent = r.curl || '— (call did not reach PayU)';
        resResponse.textContent = r.responseText;
        renderShortcuts(r);
    }

    function renderShortcuts(r) {
        resShortcuts.innerHTML = '';
        const addBtn = (text, fn) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'small-btn'; b.textContent = text; b.style.marginRight = '6px';
            b.addEventListener('click', fn); resShortcuts.appendChild(b);
        };
        const data = r.data;
        if (current === 'verifyPayment' && data && data.transaction_details && typeof data.transaction_details === 'object') {
            Object.entries(data.transaction_details).forEach(([txnid, d]) => {
                if (d && d.mihpayid && d.mihpayid !== 'Not Found') {
                    addBtn(`Use ${d.mihpayid} (${txnid}) as authpayuid`, () => { sharedAuth.value = d.mihpayid; storeSet('subOps.authpayuid', d.mihpayid); syncAuth(true); });
                }
            });
        }
        if (current === 'recurringPayment' && data && data.details && typeof data.details === 'object') {
            Object.keys(data.details).forEach(txnid => addBtn(`Verify ${txnid} in ④`, () => {
                const f = form('verifyPayment');
                f.querySelector('input[name="mode"][value="txnid"]').checked = true;
                f.querySelector('input[name="mode"][value="txnid"]').dispatchEvent(new Event('change'));
                f.querySelector('textarea[name="txnids"]').value = txnid;
                showStep('verifyPayment');
            }));
        }
    }

    function renderLog() {
        if (!log.length) { logList.innerHTML = '<div class="res-meta">No calls yet.</div>'; return; }
        logList.innerHTML = '';
        log.forEach(e => {
            const row = document.createElement('details');
            row.className = 'log-row';
            const sum = document.createElement('summary');
            sum.innerHTML = '<span class="log-time"></span><strong></strong><code></code>';
            sum.children[0].textContent = e.time;
            sum.children[1].textContent = `${STEPS[e.step].num} ${STEPS[e.step].label}`;
            sum.children[2].textContent = e.command || '';
            const body = document.createElement('div');
            body.className = 'log-body';
            [['Postman curl', e.curl || '—'], ['Raw response', e.responseText]].forEach(([title, text]) => {
                const head = document.createElement('div'); head.className = 'res-head'; head.style.marginTop = '8px';
                const span = document.createElement('span'); span.textContent = title;
                const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'copy-btn'; btn.textContent = `📋 Copy`;
                btn.addEventListener('click', () => copyText(text, btn));
                head.append(span, btn);
                const pre = document.createElement('pre'); pre.className = 'resp-pre'; pre.textContent = text;
                body.append(head, pre);
            });
            row.append(sum, body);
            logList.appendChild(row);
        });
    }

    document.getElementById('clearLogBtn').addEventListener('click', () => { log.length = 0; renderLog(); });
    document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copyText(document.getElementById(b.dataset.copy).textContent, b)));

    // ── send: form as typed, no checks ──
    function readForm(op) {
        const f = form(op);
        const body = {};
        f.querySelectorAll('input, select, textarea').forEach(el => {
            if (!el.name) return;
            if (el.type === 'radio') { if (el.checked) body[el.name] = el.value; return; }
            if (el.type === 'checkbox') { body[el.name] = el.checked; return; }
            body[el.name] = el.value;
        });
        return body;
    }

    async function send(op) {
        const btn = form(op).querySelector('button[type="submit"]');
        const label = btn.textContent;
        btn.disabled = true; btn.textContent = 'Sending…';
        let payload;
        try {
            const res = await fetch(endpoints.subscription[op], {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(readForm(op)),
            });
            const text = await res.text();
            try { payload = JSON.parse(text); }
            catch { payload = { command: null, curl: '', response: text || `HTTP ${res.status} (empty body)` }; }
        } catch (err) {
            payload = { command: null, curl: '', response: { error: err.message } };
        }
        const entry = {
            step: op,
            time: timeNow(),
            command: payload.command || null,
            curl: payload.curl || '',
            data: payload.response,
            responseText: pretty(payload.response === undefined ? payload : payload.response),
        };
        results[op] = entry;
        log.unshift(entry);
        btn.disabled = false; btn.textContent = label;
        if (current === op) renderResult();
        renderLog();
    }

    Object.keys(STEPS).forEach(op => form(op).addEventListener('submit', e => { e.preventDefault(); send(op); }));
});
