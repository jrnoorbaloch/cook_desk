/**
 * USB Print Agent — Build & Installer Script
 * Run: node scripts/build-installer.js
 *
 * What this does:
 *   1. Installs npm dependencies
 *   2. Compiles the Electron app via electron-builder → dist/win-unpacked/
 *   3. Copies dist into installer/
 *   4. Runs makensis to build the .exe installer
 *   5. Outputs: installer/usb_print_agent_setup.exe
 */

"use strict";

const { execSync } = require("child_process");
const fs           = require("fs");
const path         = require("path");

const ROOT      = path.resolve(__dirname, "..");
const DIST_DIR  = path.join(ROOT, "dist");
const INST_DIR  = path.join(ROOT, "installer");

function run(cmd, cwd = ROOT) {
    console.log(`\n▶ ${cmd}`);
    execSync(cmd, { stdio: "inherit", cwd });
}

console.log("═══════════════════════════════════════════");
console.log("  USB Print Agent — Build Script");
console.log("═══════════════════════════════════════════\n");

// Step 1: Install dependencies
console.log("📦 Installing dependencies…");
run("npm install");

// Step 2: Build Electron app
console.log("\n🔨 Building Electron app…");
run("npx electron-builder --win --x64 --dir");

// Step 3: Copy dist to installer folder
console.log("\n📁 Copying build output to installer/…");
const winUnpacked = path.join(DIST_DIR, "win-unpacked");
if (!fs.existsSync(winUnpacked)) {
    console.error("❌ dist/win-unpacked not found — electron-builder may have failed.");
    process.exit(1);
}
run(`xcopy "${winUnpacked}" "${path.join(INST_DIR, "dist\\win-unpacked")}" /E /I /Y`);

// Step 4: Run NSIS
console.log("\n📦 Building NSIS installer…");
try {
    run(`makensis installer.nsi`, INST_DIR);
    console.log("\n✅ Installer built: installer/usb_print_agent_setup.exe");
} catch {
    console.log("\n⚠️  makensis not found or failed.");
    console.log("   Install NSIS from https://nsis.sourceforge.io/");
    console.log("   Then run: makensis installer/installer.nsi");
}

console.log("\n═══════════════════════════════════════════");
console.log("  Build complete!");
console.log("═══════════════════════════════════════════\n");
