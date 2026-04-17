frappe.pages['cook-desk-dashboard'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '🍳 Cook Desk Dashboard',
        single_column: true
    });

    // Agent URL — USB Print Agent
    const AGENT_BASE = 'http://localhost:3535';

    // ── Main HTML ──────────────────────────────────────────────────────────
    $(wrapper).find('.layout-main-section').html(`
        <style>
            .cd-wrap { font-family: 'Inter', sans-serif; padding: 0; }

            /* ── Stat Cards ── */
            .cd-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 20px; }
            .cd-stat {
                background: #fff; border: 1px solid #e2e8f0;
                border-radius: 10px; padding: 16px 18px;
                border-top: 3px solid #e2e8f0;
            }
            .cd-stat.green  { border-top-color: #22c55e; }
            .cd-stat.blue   { border-top-color: #3b82f6; }
            .cd-stat.orange { border-top-color: #f97316; }
            .cd-stat.red    { border-top-color: #ef4444; }
            .cd-stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px; }
            .cd-stat-value { font-size: 26px; font-weight: 700; color: #1e293b; }
            .cd-stat-sub   { font-size: 11px; color: #94a3b8; margin-top: 4px; }

            /* ── Section ── */
            .cd-section { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 16px; overflow: hidden; }
            .cd-section-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
            .cd-section-head h3 { font-size: 13px; font-weight: 600; color: #1e293b; margin: 0; }
            .cd-section-body { padding: 16px; }

            /* ── Printer Cards ── */
            .cd-printer-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap: 12px; }
            .cd-printer-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; border-left: 3px solid #e2e8f0; }
            .cd-printer-card.online  { border-left-color: #22c55e; }
            .cd-printer-card.offline { border-left-color: #ef4444; }
            .cd-printer-card.def     { border-left-color: #f97316; }
            .cd-printer-name { font-weight: 600; font-size: 13px; color: #1e293b; }
            .cd-printer-meta { font-size: 11px; color: #94a3b8; margin: 4px 0 10px; }
            .cd-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
            .cd-dot.green { background: #22c55e; box-shadow: 0 0 5px #22c55e; }
            .cd-dot.red   { background: #ef4444; }

            /* ── Agent pill ── */
            .cd-agent-pill {
                display: inline-flex; align-items: center; gap: 7px;
                padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
            }
            .cd-agent-pill.online  { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .cd-agent-pill.offline { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

            /* ── Buttons ── */
            .cd-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; }
            .cd-btn-primary { background: #f97316; color: #fff; }
            .cd-btn-primary:hover { background: #ea6c0a; }
            .cd-btn-ghost { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
            .cd-btn-ghost:hover { background: #e2e8f0; }
            .cd-btn-green { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .cd-btn-green:hover { background: #bbf7d0; }

            /* ── Log ── */
            .cd-log { background: #0f172a; border-radius: 6px; padding: 12px; height: 160px; overflow-y: auto; font-family: monospace; font-size: 11px; line-height: 1.8; }
            .cd-log-line { display: flex; gap: 10px; }
            .cd-log-time { color: #475569; flex-shrink: 0; }
            .cd-log-msg.ok   { color: #22c55e; }
            .cd-log-msg.err  { color: #ef4444; }
            .cd-log-msg.info { color: #60a5fa; }

            /* ── Doctype Grid ── */
            .cd-doctype-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px,1fr)); gap: 10px; }
            .cd-doctype-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; cursor: pointer; transition: all .15s; text-align: center; }
            .cd-doctype-card:hover { border-color: #f97316; background: #fff7ed; transform: translateY(-2px); }
            .cd-doctype-icon { font-size: 22px; margin-bottom: 6px; }
            .cd-doctype-name { font-size: 12px; font-weight: 600; color: #1e293b; }

            /* ── Tabs ── */
            .cd-tabs { display: flex; gap: 4px; margin-bottom: 20px; background: #f1f5f9; padding: 4px; border-radius: 8px; width: fit-content; }
            .cd-tab { padding: 7px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; color: #64748b; border: none; background: transparent; }
            .cd-tab.active { background: #fff; color: #f97316; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

            /* ── Test print ── */
            .cd-textarea { width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; font-family: monospace; font-size: 12px; color: #1e293b; resize: vertical; outline: none; }
            .cd-textarea:focus { border-color: #f97316; }

            @media (max-width: 900px) {
                .cd-stats { grid-template-columns: repeat(2,1fr); }
            }
        </style>

        <div class="cd-wrap">

            <!-- Top Bar -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                <div>
                    <div id="cd-agent-pill" class="cd-agent-pill offline">
                        <span>⬤</span> <span id="cd-agent-text">Connecting...</span>
                    </div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:5px;" id="cd-agent-meta">USB Print Agent · localhost:3535</div>
                </div>
                <button class="cd-btn cd-btn-ghost" onclick="cdRefresh()">⟳ Refresh</button>
            </div>

            <!-- Tabs -->
            <div class="cd-tabs">
                <button class="cd-tab active" onclick="cdTab('overview', this)">◈ Overview</button>
                <button class="cd-tab" onclick="cdTab('printers', this)">🖨 Printers</button>
                <button class="cd-tab" onclick="cdTab('test', this)">⚡ Test Print</button>
                <button class="cd-tab" onclick="cdTab('doctypes', this)">🗂 Doctypes</button>
            </div>

            <!-- ── OVERVIEW ── -->
            <div id="cd-tab-overview">
                <div class="cd-stats">
                    <div class="cd-stat green">
                        <div class="cd-stat-label">Agent</div>
                        <div class="cd-stat-value" id="cd-s-agent">--</div>
                        <div class="cd-stat-sub" id="cd-s-port">port: --</div>
                    </div>
                    <div class="cd-stat blue">
                        <div class="cd-stat-label">Total Printers</div>
                        <div class="cd-stat-value" id="cd-s-total">--</div>
                        <div class="cd-stat-sub" id="cd-s-def">default: --</div>
                    </div>
                    <div class="cd-stat orange">
                        <div class="cd-stat-label">Online</div>
                        <div class="cd-stat-value" id="cd-s-online">--</div>
                        <div class="cd-stat-sub">ready to print</div>
                    </div>
                    <div class="cd-stat red">
                        <div class="cd-stat-label">Uptime</div>
                        <div class="cd-stat-value" id="cd-s-uptime" style="font-size:16px;">--</div>
                        <div class="cd-stat-sub" id="cd-s-host">host: --</div>
                    </div>
                </div>

                <div class="cd-section">
                    <div class="cd-section-head">
                        <h3>🖨 Connected Printers</h3>
                        <button class="cd-btn cd-btn-ghost" onclick="cdLoadPrinters()">⟳</button>
                    </div>
                    <div class="cd-section-body">
                        <div class="cd-printer-grid" id="cd-overview-printers">
                            <div style="color:#94a3b8;font-size:12px;">Loading...</div>
                        </div>
                    </div>
                </div>

                <div class="cd-section">
                    <div class="cd-section-head">
                        <h3>📡 Activity Log</h3>
                        <button class="cd-btn cd-btn-ghost" onclick="document.getElementById('cd-log').innerHTML=''">Clear</button>
                    </div>
                    <div class="cd-section-body">
                        <div class="cd-log" id="cd-log">
                            <div class="cd-log-line"><span class="cd-log-time">--:--:--</span><span class="cd-log-msg info">Dashboard loaded. Connecting to agent...</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── PRINTERS ── -->
            <div id="cd-tab-printers" style="display:none;">
                <div style="margin-bottom:14px;">
                    <button class="cd-btn cd-btn-primary" onclick="cdLoadPrinters()">⟳ Scan Printers</button>
                </div>
                <div class="cd-printer-grid" id="cd-printers-list">
                    <div style="color:#94a3b8;font-size:12px;">Click Scan to detect printers</div>
                </div>
            </div>

            <!-- ── TEST PRINT ── -->
            <div id="cd-tab-test" style="display:none;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div class="cd-section">
                        <div class="cd-section-head"><h3>⚡ Quick Test</h3></div>
                        <div class="cd-section-body">
                            <p style="font-size:12px;color:#94a3b8;margin-bottom:14px;">Send test receipt to default printer</p>
                            <button class="cd-btn cd-btn-primary" onclick="cdTestPrint()" style="width:100%;justify-content:center;padding:10px;">
                                🖨 Send Test Print
                            </button>
                        </div>
                    </div>
                    <div class="cd-section">
                        <div class="cd-section-head"><h3>✏️ Custom Print</h3></div>
                        <div class="cd-section-body">
                            <textarea class="cd-textarea" id="cd-custom-text" rows="5" placeholder="Enter text to print...">COOK DESK TEST
================================
Hello from ERPNext!
================================


</textarea>
                            <button class="cd-btn cd-btn-green" onclick="cdCustomPrint()" style="width:100%;justify-content:center;margin-top:10px;">
                                📤 Send Print
                            </button>
                        </div>
                    </div>
                </div>
                <div class="cd-section" style="margin-top:0;">
                    <div class="cd-section-head"><h3>📡 Print Log</h3></div>
                    <div class="cd-section-body">
                        <div class="cd-log" id="cd-print-log">
                            <div class="cd-log-line"><span class="cd-log-time">--:--:--</span><span class="cd-log-msg info">Ready...</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── DOCTYPES ── -->
            <div id="cd-tab-doctypes" style="display:none;">
                <div style="font-size:12px;color:#94a3b8;margin-bottom:14px;">Click any doctype to open it</div>
                <div class="cd-doctype-grid">
                    <div class="cd-doctype-card" onclick="frappe.set_route('List', 'Kitchen')">
                        <div class="cd-doctype-icon">🍳</div>
                        <div class="cd-doctype-name">Kitchen</div>
                    </div>
                    <div class="cd-doctype-card" onclick="frappe.set_route('List', 'Kitchen Printer')">
                        <div class="cd-doctype-icon">🖨</div>
                        <div class="cd-doctype-name">Kitchen Printer</div>
                    </div>
                    <div class="cd-doctype-card" onclick="frappe.set_route('List', 'KOT')">
                        <div class="cd-doctype-icon">📋</div>
                        <div class="cd-doctype-name">KOT</div>
                    </div>
                    <div class="cd-doctype-card" onclick="frappe.set_route('List', 'KOT Item')">
                        <div class="cd-doctype-icon">🍽</div>
                        <div class="cd-doctype-name">KOT Item</div>
                    </div>
                    <div class="cd-doctype-card" onclick="frappe.set_route('List', 'Item Kitchen Mapping')">
                        <div class="cd-doctype-icon">🗺</div>
                        <div class="cd-doctype-name">Item Kitchen Mapping</div>
                    </div>
                    <div class="cd-doctype-card" onclick="frappe.set_route('List', 'USB Printer Settings')">
                        <div class="cd-doctype-icon">🔌</div>
                        <div class="cd-doctype-name">USB Printer Settings</div>
                    </div>
                </div>
            </div>

        </div>
    `);

    // ── JavaScript Logic ────────────────────────────────────────────────────
    let uptimeSec = 0;

    function cdTab(name, el) {
        ['overview','printers','test','doctypes'].forEach(t => {
            document.getElementById('cd-tab-' + t).style.display = 'none';
        });
        document.querySelectorAll('.cd-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('cd-tab-' + name).style.display = 'block';
        el.classList.add('active');
        if (name === 'printers') cdLoadPrinters();
    }
    window.cdTab = cdTab;

    function cdLog(msg, type='info') {
        const box = document.getElementById('cd-log');
        const now = new Date().toTimeString().slice(0,8);
        box.innerHTML += `<div class="cd-log-line"><span class="cd-log-time">${now}</span><span class="cd-log-msg ${type}">${msg}</span></div>`;
        box.scrollTop = box.scrollHeight;
    }

    function cdPrintLog(msg, type='info') {
        const box = document.getElementById('cd-print-log');
        const now = new Date().toTimeString().slice(0,8);
        box.innerHTML += `<div class="cd-log-line"><span class="cd-log-time">${now}</span><span class="cd-log-msg ${type}">${msg}</span></div>`;
        box.scrollTop = box.scrollHeight;
    }

    async function cdCheckAgent() {
        try {
            const r = await fetch(AGENT_BASE + '/status', { signal: AbortSignal.timeout(3000) });
            const d = await r.json();
            document.getElementById('cd-agent-pill').className = 'cd-agent-pill online';
            document.getElementById('cd-agent-text').textContent = 'Agent Online';
            document.getElementById('cd-agent-meta').textContent = `USB Print Agent · ${d.hostname}:${d.port}`;
            document.getElementById('cd-s-agent').textContent = 'ONLINE';
            document.getElementById('cd-s-port').textContent = `port: ${d.port}`;
            document.getElementById('cd-s-host').textContent = `host: ${d.hostname}`;
            uptimeSec = d.uptime || 0;
            cdLog(`Agent connected · v${d.version}`, 'ok');
        } catch(e) {
            document.getElementById('cd-agent-pill').className = 'cd-agent-pill offline';
            document.getElementById('cd-agent-text').textContent = 'Agent Offline';
            document.getElementById('cd-s-agent').textContent = 'OFFLINE';
            cdLog('Agent unreachable — start node src/index.js', 'err');
        }
    }

    async function cdLoadPrinters() {
        try {
            const r = await fetch(AGENT_BASE + '/printers', { signal: AbortSignal.timeout(4000) });
            const d = await r.json();
            const printers = d.printers || [];
            const online = printers.filter(p => p.status === 'Ready').length;
            const def = printers.find(p => p.is_default);

            document.getElementById('cd-s-total').textContent  = printers.length;
            document.getElementById('cd-s-online').textContent = online;
            document.getElementById('cd-s-def').textContent    = `default: ${def ? def.name : 'none'}`;

            const html = printers.length ? printers.map(p => {
                const cls = p.is_default ? 'def' : (p.status === 'Ready' ? 'online' : 'offline');
                const dot = p.status === 'Ready' ? 'green' : 'red';
                return `
                <div class="cd-printer-card ${cls}">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                        <div class="cd-printer-name">${p.name}</div>
                        <span class="cd-dot ${dot}"></span>
                    </div>
                    <div class="cd-printer-meta">${p.is_default ? '★ Default · ' : ''}${p.status}</div>
                    <button class="cd-btn cd-btn-green" style="font-size:11px;padding:4px 10px;" onclick="cdTestTo('${p.name}')">⚡ Test</button>
                </div>`;
            }).join('') : '<div style="color:#94a3b8;font-size:12px;">No printers found</div>';

            document.getElementById('cd-overview-printers').innerHTML = html;
            document.getElementById('cd-printers-list').innerHTML     = html;
            cdLog(`${printers.length} printers found, ${online} online`, 'info');
        } catch(e) {
            cdLog('Failed to load printers', 'err');
        }
    }
    window.cdLoadPrinters = cdLoadPrinters;

    async function cdTestPrint() {
        cdPrintLog('Sending test print...', 'info');
        try {
            const r = await fetch(AGENT_BASE + '/test-print', { method: 'POST' });
            const d = await r.json();
            cdPrintLog(d.success ? '✅ ' + d.message : '❌ ' + d.error, d.success ? 'ok' : 'err');
            frappe.show_alert({ message: d.success ? '✅ Test print sent!' : '❌ ' + d.error, indicator: d.success ? 'green' : 'red' });
        } catch(e) {
            cdPrintLog('❌ Agent unreachable', 'err');
        }
    }
    window.cdTestPrint = cdTestPrint;

    async function cdTestTo(name) {
        cdLog(`Testing printer: ${name}`, 'info');
        try {
            const r = await fetch(AGENT_BASE + '/test-print', { method: 'POST' });
            const d = await r.json();
            frappe.show_alert({ message: d.success ? `✅ ${name} OK!` : `❌ ${name} failed`, indicator: d.success ? 'green' : 'red' });
            cdLog(d.success ? `✅ ${name} OK` : `❌ ${name} failed`, d.success ? 'ok' : 'err');
        } catch(e) {
            frappe.show_alert({ message: '❌ Agent unreachable', indicator: 'red' });
        }
    }
    window.cdTestTo = cdTestTo;

    async function cdCustomPrint() {
        const content = document.getElementById('cd-custom-text').value;
        if (!content.trim()) { frappe.show_alert({ message: 'Enter content first', indicator: 'orange' }); return; }
        cdPrintLog('Sending custom print...', 'info');
        try {
            const r = await fetch(AGENT_BASE + '/print', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            const d = await r.json();
            cdPrintLog(d.success ? '✅ Print sent' : '❌ ' + d.error, d.success ? 'ok' : 'err');
            frappe.show_alert({ message: d.success ? '✅ Print sent!' : '❌ ' + d.error, indicator: d.success ? 'green' : 'red' });
        } catch(e) {
            cdPrintLog('❌ Agent unreachable', 'err');
        }
    }
    window.cdCustomPrint = cdCustomPrint;

    function cdRefresh() {
        cdCheckAgent();
        cdLoadPrinters();
    }
    window.cdRefresh = cdRefresh;

    // Uptime ticker
    setInterval(() => {
        uptimeSec++;
        const h = Math.floor(uptimeSec/3600);
        const m = Math.floor((uptimeSec%3600)/60);
        const s = uptimeSec%60;
        const el = document.getElementById('cd-s-uptime');
        if (el) el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }, 1000);

    // Auto refresh every 10s
    setInterval(cdRefresh, 10000);

    // Init
    cdRefresh();
};