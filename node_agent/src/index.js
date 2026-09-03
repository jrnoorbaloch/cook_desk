/**
 * USB Print Agent — Main HTTP Server
 * Cook Desk ERPNext | Pixymo Tech
 *
 * Endpoints:
 *   GET  /status      → { running: true, version, uptime, port }
 *   GET  /printers    → { printers: [ { name, is_default, status } ] }
 *   POST /print       → { content, printer? } → { success, message }
 *   POST /test-print  → { success, message }
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
const AGENT_VERSION = require("../package.json").version;

function allowedOrigins() {
    return new Set([
        `chrome-extension://${config.extensionId}`,
        config.erpNextOrigin,
        ...(config.allowedOrigins || []),
    ].filter(Boolean));
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins().has(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

function requireAgentToken(req, res, next) {
    const authorization = req.get("Authorization") || "";
    const supplied = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : req.get("X-Agent-Token");
    if (!supplied || supplied !== config.agentToken) {
        return res.status(401).json({ success: false, error: "Agent authentication required" });
    }
    next();
}

// Request logger
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /status
 * Health-check used by Chrome Extension + ERPNext.
 */
app.get("/status", (_req, res) => {
    res.json({
        running:  true,
        version:  AGENT_VERSION,
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
app.get("/printers", requireAgentToken, async (_req, res) => {
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
app.post("/print", requireAgentToken, async (req, res) => {
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
app.post("/test-print", requireAgentToken, async (_req, res) => {
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
    const listenHost = config.allowLanAccess ? "0.0.0.0" : "127.0.0.1";
    return new Promise((resolve, reject) => {
        const server = app.listen(listenPort, listenHost, () => {
            console.log(`\n✅ USB Print Agent running on http://${listenHost}:${listenPort}`);
            console.log(`   Platform : ${process.platform}`);
            console.log(`   Hostname : ${os.hostname()}`);
            console.log(`   PID      : ${process.pid}\n`);
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
