"use strict";

const DEFAULT_IP   = "127.0.0.1";
const DEFAULT_PORT = 3535;

function setBadgeConnected() {
    chrome.action.setBadgeText({ text: "ON" });
    chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
    chrome.action.setTitle({ title: "USB Print Agent — Connected ✅" });
}

function setBadgeDisconnected() {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    chrome.action.setTitle({ title: "USB Print Agent — Not Connected ❌" });
}

function setBadgeChecking() {
    chrome.action.setBadgeText({ text: "..." });
    chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
}

// ─── Fetch with manual timeout (AbortSignal.timeout unreliable in SW) ─────────
function fetchWithTimeout(url, options = {}, ms = 4000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timer));
}

// ─── Status Check ─────────────────────────────────────────────────────────────
async function checkAgentStatus() {
    setBadgeChecking();

    const data = await chrome.storage.local.get({
        agentIp:   DEFAULT_IP,
        agentPort: DEFAULT_PORT,
    });
    const ip   = data.agentIp   || DEFAULT_IP;
    const port = data.agentPort || DEFAULT_PORT;

    try {
        const response = await fetchWithTimeout(`http://${ip}:${port}/status`, {}, 4000);
        if (response.ok) {
            const json = await response.json();
            if (json.running) {
                setBadgeConnected();
                chrome.storage.local.set({ agentStatus: "connected", lastChecked: Date.now() });
                return true;
            }
        }
    } catch (_e) {
        // agent not reachable
    }

    setBadgeDisconnected();
    chrome.storage.local.set({ agentStatus: "disconnected", lastChecked: Date.now() });
    return false;
}

// ─── Polling via alarms ───────────────────────────────────────────────────────
chrome.alarms.create("pollAgentStatus", {
    periodInMinutes: 0.5,   // every 30 seconds
    delayInMinutes:  0.05,  // first check in ~3 seconds
});

chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === "pollAgentStatus") {
        checkAgentStatus();
    }
});

// ─── Message Handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

    if (message.type === "CHECK_STATUS") {
        checkAgentStatus().then(running => sendResponse({ running }));
        return true;
    }

    if (message.type === "TEST_PRINT") {
        (async () => {
            const d = await chrome.storage.local.get({ agentIp: DEFAULT_IP, agentPort: DEFAULT_PORT });
            try {
                const resp = await fetchWithTimeout(
                    `http://${d.agentIp}:${d.agentPort}/test-print`,
                    { method: "POST" },
                    5000
                );
                sendResponse(await resp.json());
            } catch (err) {
                sendResponse({ success: false, error: err.message });
            }
        })();
        return true;
    }

    if (message.type === "LIST_PRINTERS") {
        (async () => {
            const d = await chrome.storage.local.get({ agentIp: DEFAULT_IP, agentPort: DEFAULT_PORT });
            try {
                const resp = await fetchWithTimeout(
                    `http://${d.agentIp}:${d.agentPort}/printers`,
                    {},
                    5000
                );
                sendResponse(await resp.json());
            } catch (err) {
                sendResponse({ printers: [], error: err.message });
            }
        })();
        return true;
    }
});

// ─── On Install ───────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        agentIp:    DEFAULT_IP,
        agentPort:  DEFAULT_PORT,
        agentStatus: "unknown",
    });
    checkAgentStatus();
});