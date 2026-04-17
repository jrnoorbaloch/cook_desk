/**
 * USB Print Agent — Main HTTP Server
 * Cook Desk ERPNext | Pixymo Tech
 *
 * Endpoints:
 *   GET  /status      → { running: true, version, uptime, port }
 *   GET  /printers    → { printers: [ { name, is_default, status } ] }
 *   POST /print       → { content, printer? } → { success, message }
 *   POST /test-print  → { success, message }
 *   GET  /dashboard   → Dashboard UI (static HTML)
 *
 * Runs on configurable port (default 3535).
 * Can be launched as a standalone service OR imported by the Electron tray app.
 */

"use strict";

const express    = require("express");
const cors       = require("cors");
const os         = require("os");
const path       = require("path");
const fs         = require("fs");
const { printReceipt, listPrinters, testPrint } = require("./printer");
const config     = require("./config");

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ─── Static Dashboard ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "../public")));

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /status
 * Health-check used by Chrome Extension + ERPNext.
 */
app.get("/status", (_req, res) => {
    res.json({
        running:  true,
        version:  "1.0.0",
        uptime:   Math.floor(process.uptime()),
        port:     config.port,
        hostname: os.hostname(),
        platform: process.platform,
    });
});


/**
 * GET /printers
 * Returns all detected USB/network printers on this machine.
 */
app.get("/printers", async (_req, res) => {
    try {
        const printers = await listPrinters();
        res.json({ printers });
    } catch (err) {
        console.error("List printers error:", err);
        res.status(500).json({ printers: [], error: err.message });
    }
});


/**
 * POST /print
 * Body: { content: string, printer?: string }
 * Prints raw text / ESC-POS to the specified (or default) printer.
 */
app.post("/print", async (req, res) => {
    const { content, printer } = req.body;

    if (!content) {
        return res.status(400).json({ success: false, error: "Missing 'content' field" });
    }

    try {
        await printReceipt({ content, printerName: printer });
        res.json({ success: true, message: "Print job sent" });
    } catch (err) {
        console.error("Print error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});


/**
 * POST /test-print
 * Prints a pre-defined test receipt to the default printer.
 */
app.post("/test-print", async (_req, res) => {
    try {
        await testPrint();
        res.json({ success: true, message: "Test receipt printed" });
    } catch (err) {
        console.error("Test print error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});


// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: "Unknown endpoint" });
});


// ─── Start ────────────────────────────────────────────────────────────────────

function startServer(port) {
    const listenPort = port || config.port;
    return new Promise((resolve, reject) => {
        const server = app.listen(listenPort, "0.0.0.0", () => {
            console.log(`\n✅ USB Print Agent running on http://0.0.0.0:${listenPort}`);
            console.log(`   Platform  : ${process.platform}`);
            console.log(`   Hostname  : ${os.hostname()}`);
            console.log(`   PID       : ${process.pid}`);
            console.log(`   Dashboard : http://localhost:${listenPort}/dashboard.html\n`);
            resolve(server);
        });
        server.on("error", reject);
    });
}

// Run directly if this is the entry point
if (require.main === module) {
    startServer().catch(err => {
        console.error("Failed to start server:", err);
        process.exit(1);
    });
}

module.exports = { app, startServer };