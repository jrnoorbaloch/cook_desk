/**
 * USB Print Agent — Electron Tray App
 * Runs the HTTP server + shows a system tray icon on Windows.
 *
 * Features:
 *  - System tray icon with status indicator
 *  - Auto-start on Windows boot (via auto-launch)
 *  - Right-click menu: status, port config, quit
 *  - Embedded HTTP server (calls src/index.js startServer)
 */

"use strict";

const { app, Tray, Menu, nativeImage, dialog, BrowserWindow, shell } = require("electron");
const path       = require("path");
const os         = require("os");
const AutoLaunch = require("auto-launch");
const config     = require("./config");
const { startServer } = require("./index");

let tray          = null;
let serverRunning = false;
let currentPort   = config.port;

// ─── Auto-launch on Windows boot ──────────────────────────────────────────────

const autoLauncher = new AutoLaunch({
    name: "USB Print Agent",
    path: process.execPath,
});

async function ensureAutoLaunch() {
    try {
        const isEnabled = await autoLauncher.isEnabled();
        if (config.autoStart && !isEnabled) {
            await autoLauncher.enable();
            console.log("Auto-launch enabled");
        }
    } catch (err) {
        console.error("Auto-launch setup failed:", err);
    }
}


// ─── Tray Icon ────────────────────────────────────────────────────────────────

function getIconPath(status) {
    // Use bundled icons; green = running, red = stopped
    const name = status === "running" ? "icon-green.png" : "icon-red.png";
    const iconPath = path.join(__dirname, "../assets", name);

    // Fallback to a simple nativeImage if icons aren't present
    if (require("fs").existsSync(iconPath)) {
        return nativeImage.createFromPath(iconPath);
    }
    // Create a 16x16 colored icon programmatically as fallback
    return nativeImage.createEmpty();
}


function buildTrayMenu() {
    return Menu.buildFromTemplate([
        {
            label: serverRunning
                ? `✅ Running on port ${currentPort}`
                : "❌ Server not running",
            enabled: false,
        },
        { type: "separator" },
        {
            label: "Change Port…",
            click: showPortDialog,
        },
        {
            label: "Open Settings Folder",
            click() {
                shell.openPath(path.dirname(config.configFilePath));
            },
        },
        { type: "separator" },
        {
            label: "Test Print",
            click: runTestPrint,
        },
        { type: "separator" },
        {
            label: "Quit USB Print Agent",
            click() {
                app.quit();
            },
        },
    ]);
}


function updateTray() {
    if (!tray) return;
    tray.setImage(getIconPath(serverRunning ? "running" : "stopped"));
    tray.setToolTip(
        serverRunning
            ? `USB Print Agent ✅ | Port: ${currentPort}`
            : "USB Print Agent ❌ Stopped"
    );
    tray.setContextMenu(buildTrayMenu());
}


// ─── Port Dialog ──────────────────────────────────────────────────────────────

function showPortDialog() {
    // Simple prompt window
    const win = new BrowserWindow({
        width:          360,
        height:         200,
        resizable:      false,
        minimizable:    false,
        maximizable:    false,
        alwaysOnTop:    true,
        title:          "Change Agent Port",
        webPreferences: { nodeIntegration: true, contextIsolation: false },
    });

    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <html>
        <body style="font-family:sans-serif;padding:20px">
            <h3>USB Print Agent Port</h3>
            <p>Current port: <b>${currentPort}</b></p>
            <input id="p" type="number" value="${currentPort}" min="1024" max="65535"
                   style="font-size:18px;width:120px;padding:4px">
            <br><br>
            <button onclick="save()" style="padding:8px 20px;font-size:14px">Save & Restart</button>
            <script>
                const { ipcRenderer } = require("electron");
                function save() {
                    const p = parseInt(document.getElementById("p").value);
                    if (p >= 1024 && p <= 65535) {
                        ipcRenderer.send("change-port", p);
                    }
                }
            </script>
        </body>
        </html>
    `)}`);

    const { ipcMain } = require("electron");
    ipcMain.once("change-port", async (_e, newPort) => {
        config.save({ port: newPort });
        currentPort = newPort;
        win.close();
        // Restart server on new port
        await restartServer(newPort);
        updateTray();
    });
}


// ─── Server Lifecycle ─────────────────────────────────────────────────────────

let httpServer = null;

async function restartServer(port) {
    if (httpServer) {
        await new Promise(resolve => httpServer.close(resolve));
        httpServer = null;
    }
    httpServer = await startServer(port);
    serverRunning = true;
    currentPort = port;
}


async function runTestPrint() {
    try {
        const { testPrint } = require("./printer");
        await testPrint();
        dialog.showMessageBox({
            type:    "info",
            title:   "Test Print",
            message: "✅ Test receipt sent to default printer!",
        });
    } catch (err) {
        dialog.showErrorBox("Test Print Failed", err.message);
    }
}


// ─── App Lifecycle ────────────────────────────────────────────────────────────

// Prevent the app from showing in the taskbar
app.dock && app.dock.hide();

app.whenReady().then(async () => {
    // Single instance guard
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
        app.quit();
        return;
    }

    await ensureAutoLaunch();

    // Start HTTP server
    try {
        httpServer   = await startServer(config.port);
        serverRunning = true;
    } catch (err) {
        serverRunning = false;
        console.error("Server failed to start:", err);
    }

    // Create tray
    tray = new Tray(getIconPath(serverRunning ? "running" : "stopped"));
    updateTray();

    tray.on("double-click", () => {
        // Double-click shows a quick status notification
        const msg = serverRunning
            ? `Agent running on port ${currentPort}`
            : "Agent server not running — check logs";
        dialog.showMessageBox({ type: "info", title: "USB Print Agent", message: msg });
    });

    console.log("Tray app ready");
});

app.on("window-all-closed", () => {
    // Keep running in tray even when all windows close
});

app.on("before-quit", () => {
    if (httpServer) {
        httpServer.close();
    }
});
