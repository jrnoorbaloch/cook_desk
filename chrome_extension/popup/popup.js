/**
 * USB Print Agent — Popup Controller
 * Handles all UI interactions in the Chrome Extension popup.
 */

"use strict";

// ─── DOM References ───────────────────────────────────────────────────────────

const statusDot      = document.getElementById("statusDot");
const statusText     = document.getElementById("statusText");
const statusDetail   = document.getElementById("statusDetail");
const agentIpInput   = document.getElementById("agentIp");
const agentPortInput = document.getElementById("agentPort");
const btnSave        = document.getElementById("btnSave");
const btnTestPrint   = document.getElementById("btnTestPrint");
const btnRefresh     = document.getElementById("btnRefresh");
const btnPrinters    = document.getElementById("btnPrinters");
const btnDownload    = document.getElementById("btnDownload");
const printersSection = document.getElementById("printersSection");
const printersList   = document.getElementById("printersList");
const logSection     = document.getElementById("logSection");


// ─── Log ──────────────────────────────────────────────────────────────────────

function log(msg, type = "info") {
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${msg}`;
    logSection.insertBefore(entry, logSection.firstChild);
    // Keep max 10 entries
    while (logSection.children.length > 10) {
        logSection.removeChild(logSection.lastChild);
    }
}


// ─── Status UI ────────────────────────────────────────────────────────────────

function setStatus(state, detail = "") {
    statusDot.className = "dot";

    if (state === "connected") {
        statusDot.classList.add("green");
        statusText.textContent = "Connected ✅";
        statusDetail.textContent = detail || "Agent is running";
    } else if (state === "disconnected") {
        statusDot.classList.add("red");
        statusText.textContent = "Not Connected ❌";
        statusDetail.textContent = detail || "Agent not reachable. Install it below.";
    } else {
        statusDot.classList.add("amber");
        statusText.textContent = "Checking…";
        statusDetail.textContent = detail || "Connecting to agent…";
    }
}


// ─── Check Status ─────────────────────────────────────────────────────────────

async function checkStatus(showLog = true) {
    setStatus("checking");
    btnRefresh.disabled = true;

    try {
        chrome.runtime.sendMessage({ type: "CHECK_STATUS" }, response => {
            if (response && response.running) {
                setStatus("connected");
                if (showLog) log("Agent is online ✅", "success");
            } else {
                setStatus("disconnected");
                if (showLog) log("Agent not reachable ❌", "error");
            }
            btnRefresh.disabled = false;
        });
    } catch (err) {
        setStatus("disconnected", err.message);
        btnRefresh.disabled = false;
    }
}


// ─── Test Print ───────────────────────────────────────────────────────────────

async function doTestPrint() {
    btnTestPrint.disabled = true;
    log("Sending test print…", "info");

    chrome.runtime.sendMessage({ type: "TEST_PRINT" }, response => {
        btnTestPrint.disabled = false;
        if (response && response.success) {
            log("✅ Test receipt printed!", "success");
            setStatus("connected", "Last print: test receipt");
        } else {
            const err = (response && response.error) || "Unknown error";
            log(`❌ Print failed: ${err}`, "error");
            setStatus("disconnected");
        }
    });
}


// ─── List Printers ────────────────────────────────────────────────────────────

async function doListPrinters() {
    const isVisible = printersSection.classList.contains("visible");
    if (isVisible) {
        printersSection.classList.remove("visible");
        return;
    }

    printersList.innerHTML = "<div style='font-size:11px;color:#64748b'>Loading…</div>";
    printersSection.classList.add("visible");
    log("Fetching printer list…", "info");

    chrome.runtime.sendMessage({ type: "LIST_PRINTERS" }, response => {
        if (response && response.printers && response.printers.length) {
            printersList.innerHTML = response.printers.map(p => `
                <div class="printer-item">
                    <span class="printer-name">🖨️ ${p.name}</span>
                    ${p.is_default ? '<span class="printer-default">Default</span>' : ""}
                </div>
            `).join("");
            log(`Found ${response.printers.length} printer(s)`, "success");
        } else if (response && response.error) {
            printersList.innerHTML = `<div class='log-entry error'>Error: ${response.error}</div>`;
            log("Failed to fetch printers ❌", "error");
        } else {
            printersList.innerHTML = "<div style='font-size:11px;color:#64748b'>No printers found.</div>";
        }
    });
}


// ─── Save Config ──────────────────────────────────────────────────────────────

async function saveConfig() {
    const ip   = agentIpInput.value.trim() || "127.0.0.1";
    const port = parseInt(agentPortInput.value) || 3535;

    await chrome.storage.local.set({ agentIp: ip, agentPort: port });
    log(`Config saved: ${ip}:${port}`, "success");

    btnSave.textContent = "Saved ✓";
    setTimeout(() => { btnSave.textContent = "Save"; }, 1500);

    // Re-check status with new config
    checkStatus(true);
}


// ─── Download Agent ───────────────────────────────────────────────────────────

function downloadAgent() {
    // Open the ERPNext download page or direct file
    chrome.tabs.create({ url: "http://127.0.0.1:8000/app/usb-printer-settings" });
    log("Opened ERPNext USB Printer Settings page", "info");
}


// ─── Load Saved Config ────────────────────────────────────────────────────────

async function loadConfig() {
    const data = await chrome.storage.local.get({
        agentIp:   "127.0.0.1",
        agentPort: 3535,
    });
    agentIpInput.value   = data.agentIp;
    agentPortInput.value = data.agentPort;
}


// ─── Event Bindings ───────────────────────────────────────────────────────────

btnRefresh.addEventListener("click",   () => checkStatus(true));
btnTestPrint.addEventListener("click", doTestPrint);
btnPrinters.addEventListener("click",  doListPrinters);
btnSave.addEventListener("click",      saveConfig);
btnDownload.addEventListener("click",  downloadAgent);

// Enter key in config inputs triggers save
[agentIpInput, agentPortInput].forEach(el => {
    el.addEventListener("keydown", e => {
        if (e.key === "Enter") saveConfig();
    });
});


// ─── Init ─────────────────────────────────────────────────────────────────────

(async function init() {
    await loadConfig();
    checkStatus(false);
})();
