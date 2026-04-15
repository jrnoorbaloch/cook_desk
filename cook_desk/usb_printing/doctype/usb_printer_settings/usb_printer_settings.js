// Copyright (c) 2026, Pixymo Tech
// USB Printer Settings — Client Controller
// Fully isolated from KOT system.

frappe.ui.form.on("USB Printer Settings", {

    onload(frm) {
        frm.disable_save();
    },

    refresh(frm) {
        frm.disable_save();
        _setup_buttons(frm);
        _render_instructions(frm);
        if (frm.doc.auto_connect) {
            _check_agent_status(frm, false);
        }
    },

    test_connection_button(frm) {
        _test_connection_and_print(frm);
    },

    download_agent_button(frm) {
        _download_agent(frm);
    },
});


// ─── Buttons ──────────────────────────────────────────────────────────────────
function _setup_buttons(frm) {
    frm.add_custom_button(__("Check Agent Status"), () => {
        _check_agent_status(frm, true);
    }, __("USB Agent"));

    frm.add_custom_button(__("List Printers"), () => {
        _list_printers(frm);
    }, __("USB Agent"));

    frm.add_custom_button(__("Save Settings"), () => {
        frm.save();
    });
}


// ─── Agent URL ────────────────────────────────────────────────────────────────
function _get_agent_url(frm, path) {
    const ip   = frm.doc.server_ip || "127.0.0.1";
    const port = frm.doc.port || 3535;
    return `http://${ip}:${port}${path}`;
}


// ─── Check Status ─────────────────────────────────────────────────────────────
function _check_agent_status(frm, show_message) {
    frappe.call({
        method: "cook_desk.usb_printing.api.usb_agent.check_agent_status",
        args: {
            ip:   frm.doc.server_ip || "127.0.0.1",
            port: frm.doc.port || 3535
        },
        callback(r) {
            if (r.message && r.message.running) {
                _set_status(frm, "🟢 Connected");
                if (show_message) {
                    frappe.msgprint({
                        title:     __("USB Print Agent"),
                        message:   __("✅ Agent is running and reachable."),
                        indicator: "green"
                    });
                }
            } else {
                _set_status(frm, "🔴 Not Connected");
                if (show_message) _show_agent_not_found(frm);
            }
        },
        error() {
            _set_status(frm, "🔴 Not Connected");
            if (show_message) _show_agent_not_found(frm);
        }
    });
}


// ─── Test Print ───────────────────────────────────────────────────────────────
function _test_connection_and_print(frm) {
    if (!frm.doc.server_ip) {
        frappe.msgprint(__("Please enter the Agent IP Address first."));
        return;
    }
    frappe.call({
        method: "cook_desk.usb_printing.api.usb_agent.test_print",
        args: { ip: frm.doc.server_ip || "127.0.0.1", port: frm.doc.port || 3535 },
        freeze: true,
        freeze_message: __("Sending test print to USB agent..."),
        callback(r) {
            if (r.message && r.message.success) {
                _set_status(frm, "🟢 Connected");
                frappe.msgprint({
                    title:     __("Test Print"),
                    message:   __("🖨️ Test receipt sent! Check your printer."),
                    indicator: "green"
                });
            } else {
                _set_status(frm, "🔴 Not Connected");
                _show_agent_not_found(frm, r.message && r.message.error);
            }
        },
        error() {
            _set_status(frm, "🔴 Not Connected");
            _show_agent_not_found(frm);
        }
    });
}


// ─── List Printers ────────────────────────────────────────────────────────────
function _list_printers(frm) {
    frappe.call({
        method: "cook_desk.usb_printing.api.usb_agent.list_printers",
        args: { ip: frm.doc.server_ip || "127.0.0.1", port: frm.doc.port || 3535 },
        callback(r) {
            if (r.message && r.message.printers && r.message.printers.length) {
                const list = r.message.printers.map((p, i) =>
                    `<li style="padding:4px 0"><b>${i + 1}.</b> ${p.name} ${p.is_default
                        ? "<span class='badge badge-success ml-2'>Default</span>"
                        : ""
                    }</li>`
                ).join("");
                frappe.msgprint({
                    title:     __("Detected USB Printers"),
                    message:   `<ul style="margin:10px 0 0">${list}</ul>`,
                    indicator: "blue"
                });
            } else {
                frappe.msgprint(__("No USB printers detected. Connect a USB printer and try again."));
            }
        }
    });
}


// ─── Download Agent ───────────────────────────────────────────────────────────
function _download_agent(frm) {
    const link    = document.createElement("a");
    link.href     = "/files/usb_print_agent_setup.exe";
    link.download = "usb_print_agent_setup.exe";
    link.click();
}


// ─── Download Chrome Extension ────────────────────────────────────────────────
function _download_extension() {
    const link    = document.createElement("a");
    link.href     = "/files/usb_print_agent_extension.zip";
    link.download = "usb_print_agent_extension.zip";
    link.click();
}


// ─── Status Helpers ───────────────────────────────────────────────────────────
function _set_status(frm, text) {
    frm.set_value("connection_status", text);
    frm.set_value("last_checked", frappe.datetime.now_datetime());
    frm.refresh_field("connection_status");
    frm.refresh_field("last_checked");
}

function _show_agent_not_found(frm, extra_error) {
    const port = frm.doc.port || 3535;
    let msg = `
        <div style="font-size:13px;line-height:1.8">
            <b>Agent is not reachable.</b><br><br>
            Possible reasons:<br>
            &bull; Agent not installed on this PC<br>
            &bull; Agent not running — check system tray<br>
            &bull; Firewall is blocking port ${port}<br><br>
            <b>Solution:</b> Download and install the agent from the section below.
        </div>`;
    if (extra_error) {
        msg += `<br><small class="text-muted">Error: ${extra_error}</small>`;
    }
    frappe.msgprint({
        title:   __("Agent Not Found"),
        message: msg,
        indicator: "red",
        primary_action: {
            label:  __("⬇️ Download Agent"),
            action: () => _download_agent(frm)
        }
    });
}


// ─── Render Full Instructions ─────────────────────────────────────────────────
function _render_instructions(frm) {
    const port = frm.doc.port || 3535;

    const html = `
    <div style="font-family:var(--font-stack);font-size:13px;color:var(--text-color);line-height:1.8">

        <!-- ═══════════════════════════════════════════
             SECTION 1 — USB PRINT AGENT
        ════════════════════════════════════════════ -->
        <div style="background:var(--control-bg);border:1px solid var(--border-color);
                    border-radius:10px;padding:20px 24px;margin-bottom:16px">

            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
                <span style="font-size:22px">🖨️</span>
                <div>
                    <div style="font-size:16px;font-weight:700">USB Print Agent</div>
                    <div style="color:var(--text-muted);font-size:12px">
                        Background service — runs silently on your Windows PC
                    </div>
                </div>
            </div>

            <!-- Step 1 -->
            ${_step(1, "indigo",
                "Download the Installer",
                `Click the <b>⬇️ Download USB Print Agent</b> button below.<br>
                <span style="color:var(--text-muted)">File: usb_print_agent_setup.exe &nbsp;|&nbsp; Size: ~120MB</span>`
            )}

            <!-- Step 2 -->
            ${_step(2, "indigo",
                "Run as Administrator",
                `Right-click the downloaded file → <b>Run as Administrator</b><br>
                Click <b>Next → Next → Install</b> and wait for completion.`
            )}

            <!-- Step 3 -->
            ${_step(3, "indigo",
                "Agent Starts Automatically",
                `After installation, a <b>🖨️ printer icon</b> will appear in your
                <b>system tray</b> (bottom-right corner of taskbar).<br>
                The agent runs silently in the background and
                <b>starts automatically every time Windows boots.</b>`
            )}

            <!-- Step 4 -->
            ${_step(4, "green",
                "Test the Connection",
                `Come back to this page and click <b>"Test Connection & Print"</b>.<br>
                A test receipt will print on your USB thermal printer. ✅`,
                true
            )}

            <!-- Download Agent Button -->
            <div style="margin-top:18px">
                <button onclick="
                    var l=document.createElement('a');
                    l.href='/files/usb_print_agent_setup.exe';
                    l.download='usb_print_agent_setup.exe';
                    l.click();
                " style="
                    background:#4f46e5;color:#fff;border:none;
                    padding:10px 24px;border-radius:6px;
                    font-size:13px;font-weight:600;cursor:pointer;
                    display:inline-flex;align-items:center;gap:8px
                ">
                    ⬇️ Download USB Print Agent (.exe)
                </button>
            </div>
        </div>


        <!-- ═══════════════════════════════════════════
             SECTION 2 — CHROME EXTENSION
        ════════════════════════════════════════════ -->
        <div style="background:var(--control-bg);border:1px solid var(--border-color);
                    border-radius:10px;padding:20px 24px;margin-bottom:16px">

            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
                <span style="font-size:22px">🌐</span>
                <div>
                    <div style="font-size:16px;font-weight:700">Chrome Extension</div>
                    <div style="color:var(--text-muted);font-size:12px">
                        Optional — monitor agent status directly from Chrome toolbar
                    </div>
                </div>
            </div>

            <!-- Chrome check warning -->
            <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;
                        padding:10px 14px;margin-bottom:14px;font-size:12px">
                <b>⚠️ Requirement:</b> Google Chrome must be installed before loading the extension.<br>
                Don't have Chrome?
                <a href="https://www.google.com/chrome" target="_blank"
                   style="color:#4f46e5;font-weight:600">
                    Download Chrome here →
                </a>
            </div>

            <!-- Step 1 -->
            ${_step(1, "blue",
                "Download the Extension",
                `Click <b>⬇️ Download Chrome Extension</b> button below.<br>
                <span style="color:var(--text-muted)">File: usb_print_agent_extension.zip</span>`
            )}

            <!-- Step 2 -->
            ${_step(2, "blue",
                "Extract the ZIP file",
                `Right-click the downloaded <b>.zip file → Extract All</b><br>
                Remember where you extracted it (e.g. Downloads\\usb_print_agent_extension)`
            )}

            <!-- Step 3 -->
            ${_step(3, "blue",
                "Open Chrome Extensions Page",
                `Open Google Chrome and go to:<br>
                <code style="background:var(--control-bg);padding:2px 8px;border-radius:4px;
                             font-size:12px;border:1px solid var(--border-color)">
                    chrome://extensions
                </code><br>
                Turn ON <b>Developer Mode</b> toggle (top-right corner).`
            )}

            <!-- Step 4 -->
            ${_step(4, "blue",
                "Load the Extension",
                `Click <b>"Load unpacked"</b> button.<br>
                Browse and select the <b>extracted folder</b> (not the .zip file).<br>
                The 🖨️ printer icon will appear in your Chrome toolbar.`
            )}

            <!-- Step 5 -->
            ${_step(5, "green",
                "Verify Connection",
                `Click the 🖨️ icon in Chrome toolbar.<br>
                Status should show <b style="color:#16a34a">● Connected</b> if the agent is running. ✅`,
                true
            )}

            <!-- Download Extension Button -->
            <div style="margin-top:18px">
                <button onclick="
                    var l=document.createElement('a');
                    l.href='/files/usb_print_agent_extension.zip';
                    l.download='usb_print_agent_extension.zip';
                    l.click();
                " style="
                    background:#1d4ed8;color:#fff;border:none;
                    padding:10px 24px;border-radius:6px;
                    font-size:13px;font-weight:600;cursor:pointer;
                    display:inline-flex;align-items:center;gap:8px
                ">
                    ⬇️ Download Chrome Extension (.zip)
                </button>
            </div>
        </div>


        <!-- ═══════════════════════════════════════════
             SECTION 3 — SYSTEM REQUIREMENTS
        ════════════════════════════════════════════ -->
        <div style="background:#fefce8;border:1px solid #fde68a;
                    border-radius:10px;padding:16px 20px;margin-bottom:16px">
            <b style="font-size:14px">⚙️ System Requirements</b>
            <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
                <div>✅ Windows 10 or higher (64-bit)</div>
                <div>✅ USB Thermal Printer (ESC/POS)</div>
                <div>✅ Google Chrome browser</div>
                <div>✅ Administrator access</div>
                <div>✅ Port ${port} open in firewall</div>
                <div>✅ USB printer set as Windows default</div>
            </div>
        </div>


        <!-- ═══════════════════════════════════════════
             SECTION 4 — TROUBLESHOOTING
        ════════════════════════════════════════════ -->
        <div style="background:var(--control-bg);border:1px solid var(--border-color);
                    border-radius:10px;padding:16px 20px">
            <b style="font-size:14px">🔧 Troubleshooting</b>
            <table style="width:100%;margin-top:10px;border-collapse:collapse;font-size:12px">
                <thead>
                    <tr style="background:var(--border-color)">
                        <th style="padding:8px 12px;text-align:left;border-radius:4px 0 0 4px">
                            Problem
                        </th>
                        <th style="padding:8px 12px;text-align:left;border-radius:0 4px 4px 0">
                            Solution
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${_tr("Not Connected after install",
                          "Check system tray — right-click printer icon → Start")}
                    ${_tr("No printer found",
                          "Connect USB printer → click List Printers button")}
                    ${_tr("Print goes out of paper width",
                          "Set your thermal printer as Windows Default Printer")}
                    ${_tr("Chrome extension icon missing",
                          "Restart Chrome → check chrome://extensions page")}
                    ${_tr(`Firewall blocking port ${port}`,
                          `Allow port ${port} TCP in Windows Defender Firewall`)}
                    ${_tr("Agent not starting on boot",
                          "Re-run installer as Administrator")}
                </tbody>
            </table>
        </div>

    </div>`;

    frm.get_field("agent_info_html").$wrapper.html(html);
}


// ─── Helper: Step Block ───────────────────────────────────────────────────────
function _step(num, color, title, body, isLast = false) {
    const colors = {
        indigo: { bg: "#4f46e5", light: "#eef2ff" },
        blue:   { bg: "#1d4ed8", light: "#eff6ff" },
        green:  { bg: "#16a34a", light: "#f0fdf4" },
    };
    const c = colors[color] || colors.indigo;
    return `
        <div style="display:flex;gap:14px;margin-bottom:${isLast ? "0" : "14px"}">
            <div style="
                min-width:28px;height:28px;
                background:${c.bg};color:#fff;
                border-radius:50%;
                display:flex;align-items:center;justify-content:center;
                font-weight:700;font-size:13px;
                flex-shrink:0;margin-top:2px
            ">${num}</div>
            <div style="background:${c.light};border-radius:8px;padding:10px 14px;flex:1">
                <div style="font-weight:600;margin-bottom:4px">${title}</div>
                <div style="color:var(--text-muted);font-size:12px;line-height:1.7">${body}</div>
            </div>
        </div>`;
}


// ─── Helper: Table Row ────────────────────────────────────────────────────────
function _tr(problem, solution) {
    return `
        <tr style="border-bottom:1px solid var(--border-color)">
            <td style="padding:8px 12px;color:var(--text-color)">${problem}</td>
            <td style="padding:8px 12px;color:var(--text-muted)">${solution}</td>
        </tr>`;
}
