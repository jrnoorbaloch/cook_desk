/**
 * USB Print Agent — Configuration
 * Reads/writes config from %APPDATA%/usb-print-agent/config.json on Windows
 * or ~/.usb-print-agent/config.json on other platforms.
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");
const crypto = require("crypto");

const CONFIG_DIR = process.platform === "win32"
    ? path.join(process.env.APPDATA || os.homedir(), "usb-print-agent")
    : path.join(os.homedir(), ".usb-print-agent");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULTS = {
    port:           3535,
    autoStart:      true,
    defaultPrinter: null,
    logLevel:       "info",
    allowLanAccess: false,
    allowedOrigins: [],
    erpNextOrigin:  null,
    extensionId:    null,
    agentToken:     null,
};

function _load() {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        if (!fs.existsSync(CONFIG_FILE)) {
            const initial = { ...DEFAULTS, agentToken: crypto.randomBytes(32).toString("hex") };
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(initial, null, 2));
            return initial;
        }
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        const loaded = { ...DEFAULTS, ...JSON.parse(raw) };
        if (!loaded.agentToken) {
            loaded.agentToken = crypto.randomBytes(32).toString("hex");
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(loaded, null, 2));
        }
        return loaded;
    } catch (err) {
        console.error("Config load error:", err);
        return { ...DEFAULTS };
    }
}

function save(updates) {
    try {
        const current = _load();
        const merged  = { ...current, ...updates };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
        // Reload into module scope
        Object.assign(config, merged);
        return merged;
    } catch (err) {
        console.error("Config save error:", err);
    }
}

const config = _load();
config.save = save;
config.configFilePath = CONFIG_FILE;

module.exports = config;
