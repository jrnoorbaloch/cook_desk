/**
 * USB Print Agent — Configuration
 * Reads/writes config from %APPDATA%/usb-print-agent/config.json on Windows
 * or ~/.usb-print-agent/config.json on other platforms.
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

const CONFIG_DIR = path.join(
    process.env.APPDATA || os.homedir(),
    "usb-print-agent"
);
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULTS = {
    port:           3535,
    autoStart:      true,
    defaultPrinter: null,
    logLevel:       "info",
};

function _load() {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        if (!fs.existsSync(CONFIG_FILE)) {
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULTS, null, 2));
            return { ...DEFAULTS };
        }
        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        return { ...DEFAULTS, ...JSON.parse(raw) };
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
