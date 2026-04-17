"use strict";

const os   = require("os");
const fs   = require("fs");
const path = require("path");
const { execSync, exec } = require("child_process");

// ─── Try loading node-printer ─────────────────────────────────────────────────
let nodePrinter = null;
try {
    nodePrinter = require("node-printer");
    console.log("✅ node-printer loaded");
} catch (e) {
    console.log("⚠️  node-printer not available — using Windows fallback");
}


// ─── List Printers ────────────────────────────────────────────────────────────
async function listPrinters() {
    if (process.platform === "win32") {
        try {
            const out = execSync(
                "wmic printer get Name,Default /format:csv 2>nul",
                { encoding: "utf-8", timeout: 5000 }
            );
            const lines = out.trim().split(/\r?\n/).filter(l =>
                l.trim() && !l.toLowerCase().startsWith("node")
            );
            const printers = lines.map(line => {
                const parts = line.split(",");
                return {
                    name:       (parts[2] || "").trim(),
                    is_default: (parts[1] || "").trim().toUpperCase() === "TRUE",
                    status:     "Ready",
                };
            }).filter(p => p.name && p.name !== "Name" && p.name.length > 0);

            if (printers.length > 0) return printers;
        } catch (e) {
            console.error("wmic error:", e.message);
        }
    }

    if (nodePrinter) {
        try {
            const printers    = nodePrinter.getPrinters();
            const defaultName = nodePrinter.getDefaultPrinterName();
            return printers.map(p => ({
                name:       p.name,
                is_default: p.name === defaultName,
                status:     "Ready",
            }));
        } catch (e) {
            console.error("node-printer error:", e.message);
        }
    }

    return [{ name: "No printer found", is_default: false, status: "Check USB connection" }];
}


// ─── Get Default Printer Name ─────────────────────────────────────────────────
function getDefaultPrinterName() {
    if (process.platform === "win32") {
        try {
            const out = execSync(
                "wmic printer where Default=TRUE get Name /format:list 2>nul",
                { encoding: "utf-8", timeout: 5000 }
            );
            const match = out.match(/Name=(.+)/);
            if (match && match[1].trim()) return match[1].trim();
        } catch (_) {}
    }

    if (nodePrinter) {
        try { return nodePrinter.getDefaultPrinterName(); } catch (_) {}
    }

    return null;
}


// ─── Print Receipt ────────────────────────────────────────────────────────────
async function printReceipt({ content, printerName }) {
    const target = printerName || getDefaultPrinterName();
    console.log(`🖨️  Target printer: "${target || "none found"}"`);

    // Method 1: node-printer (native, best for thermal)
    if (nodePrinter && target) {
        try {
            await _rawPrint(target, content);
            console.log("✅ Printed via node-printer");
            return;
        } catch (e) {
            console.error("node-printer failed:", e.message);
        }
    }

    // Method 2: PowerShell silent print
    if (process.platform === "win32" && target) {
        try {
            await _powershellPrint(content, target);
            console.log("✅ Printed via PowerShell");
            return;
        } catch (e) {
            console.error("PowerShell print failed:", e.message);
        }
    }

    // Method 3: Notepad /p fallback (always works on Windows)
    if (process.platform === "win32") {
        try {
            await _notepadPrint(content, target);
            console.log("✅ Printed via Notepad fallback");
            return;
        } catch (e) {
            console.error("Notepad print failed:", e.message);
        }
    }

    throw new Error(
        target
            ? `Print failed for "${target}". Is printer online and connected?`
            : "No printer found. Connect a USB printer first."
    );
}


// ─── node-printer raw ─────────────────────────────────────────────────────────
function _rawPrint(printerName, content) {
    return new Promise((resolve, reject) => {
        nodePrinter.printDirect({
            data:    Buffer.from(content, "utf-8"),
            printer: printerName,
            type:    "RAW",
            success(jobId) { resolve(jobId); },
            error(err)     { reject(new Error(String(err))); }
        });
    });
}


// ─── PowerShell silent print ──────────────────────────────────────────────────
function _powershellPrint(content, printerName) {
    return new Promise((resolve, reject) => {
        const tmpFile = path.join(os.tmpdir(), `usb_print_${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, content, "utf-8");

        const safeContent  = content.replace(/'/g, "''");
        const safePrinter  = (printerName || "").replace(/'/g, "''");
        const printerLine  = safePrinter
            ? `$pd.PrinterSettings.PrinterName = '${safePrinter}';`
            : "";

        const ps = [
            `Add-Type -AssemblyName System.Drawing;`,
            `$content = [System.IO.File]::ReadAllText('${tmpFile}');`,
            `$pd = New-Object System.Drawing.Printing.PrintDocument;`,
            printerLine,
            `$pd.add_PrintPage({`,
            `  param($s,$e)`,
            `  $font = New-Object System.Drawing.Font('Courier New', 9);`,
            `  $e.Graphics.DrawString($content, $font, [System.Drawing.Brushes]::Black, 10, 10);`,
            `});`,
            `$pd.Print();`,
        ].join(" ");

        exec(`powershell -NoProfile -Command "${ps}"`, { timeout: 15000 }, (err) => {
            setTimeout(() => { try { fs.unlinkSync(tmpFile); } catch (_) {} }, 3000);
            if (err) reject(err); else resolve();
        });
    });
}


// ─── Notepad /p fallback ──────────────────────────────────────────────────────
function _notepadPrint(content, printerName) {
    return new Promise((resolve) => {
        const tmpFile = path.join(os.tmpdir(), `usb_print_${Date.now()}.txt`);
        fs.writeFileSync(tmpFile, content, "utf-8");

        const printerPart = printerName ? `/d:"${printerName}"` : "";
        exec(`notepad /p "${tmpFile}" ${printerPart}`, { timeout: 15000 }, () => {
            setTimeout(() => { try { fs.unlinkSync(tmpFile); } catch (_) {} }, 5000);
            resolve(); // notepad /p sometimes returns non-zero even on success
        });
    });
}


// ─── Test Print ───────────────────────────────────────────────────────────────
// 80mm thermal = 48 chars per line
const WIDTH = 33;
function _line(c = "-") { return c.repeat(WIDTH); }
function _center(t) {
    return " ".repeat(Math.max(0, Math.floor((WIDTH - t.length) / 2))) + t;
}
function _row(l, r) {
    return l + " ".repeat(Math.max(1, WIDTH - l.length - r.length)) + r;
}
function _col4(c1, c2, c3, c4, w1=18, w2=5, w3=10, w4=11) {
    return c1.padEnd(w1) + c2.padStart(w2) + c3.padStart(w3) + c4.padStart(w4);
}

async function testPrint() {
    const config      = require("./config");
    const now         = new Date();
    const printerName = getDefaultPrinterName();
    console.log(`🖨️  Default printer detected: ${printerName || "none"}`);

    const dateStr = now.toLocaleDateString("en-PK", { day:"2-digit", month:"short", year:"numeric" });
    const timeStr = now.toLocaleTimeString("en-PK", { hour:"2-digit", minute:"2-digit", second:"2-digit" });

    const lines = [
        "",
        _center("PIXYMO RESTAURANT"),
        _center("Shop #12, Lorem Ipsum, ipsum"),
        _center("Tel: 0321-1234567"),
        _line("="),
        _center("POS INVOICE"),
        _line("="),
        _row("Invoice#:", "PIX-20240601-001"),
        _row("Date:",      dateStr),
        _row("Time:",      timeStr),
        _row("Customer:",  "Walk-in"),
        _row("Cashier:",   "pixymo"),
        _line("-"),
        _col4("Description", "Qty", "Rate", "Amt"),
        _line("-"),
        _col4("Item 01",  "1",   "850",  "850"),
        _col4("Item 02",            "4",    "30",  "120"),
        _col4("Item 03",    "2",   "400",  "720"),
        _col4("Item 04",           "2",    "80",  "160"),
        _col4("Item 05",      "3",    "70",  "210"),
        _line("-"),
        _row("Subtotal",   "PKR 2,060"),
        _row("Discount",   "- PKR  80"),
        _row("GST (16%)",  "PKR   316"),
        _line("="),
        _row("TOTAL",      "PKR 2,296"),
        _line("="),
        _row("Cash",       "PKR 2,500"),
        _row("Change",     "PKR   204"),
        _line("-"),
        _center("** Thank You! **"),
        _center("Please Visit Again"),
        _line("-"),
        _center("Cook Desk by Pixymo Tech"),
        _center("0321-1234567"),
        "", "", "",
    ].join("\n");

    await printReceipt({ content: lines });
}


module.exports = { listPrinters, printReceipt, testPrint, getDefaultPrinterName };