; USB Print Agent — NSIS Windows Installer Script
; Cook Desk by Pixymo Tech
;
; Build with: makensis installer.nsi
; Output: usb_print_agent_setup.exe
;
; Prerequisites:
;   - NSIS 3.x installed
;   - Node.js runtime bundled in dist/
;   - Electron app compiled to dist/win-unpacked/
;
; ─────────────────────────────────────────────────────────────

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

; ── Metadata ──────────────────────────────────────────────────────────────────
Name              "USB Print Agent"
OutFile           "usb_print_agent_setup.exe"
InstallDir        "$PROGRAMFILES64\USBPrintAgent"
InstallDirRegKey  HKLM "Software\USBPrintAgent" "InstallDir"
RequestExecutionLevel admin
SetCompressor     /SOLID lzma

; ── Version Info ──────────────────────────────────────────────────────────────
VIProductVersion  "1.0.0.0"
VIAddVersionKey   "ProductName"      "USB Print Agent"
VIAddVersionKey   "CompanyName"      "Pixymo Tech"
VIAddVersionKey   "FileDescription"  "USB Print Agent for Cook Desk"
VIAddVersionKey   "FileVersion"      "1.0.0"
VIAddVersionKey   "LegalCopyright"   "Copyright 2026 Pixymo Tech"

; ── MUI Settings ──────────────────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON                    "assets\icon.ico"
!define MUI_UNICON                  "assets\icon.ico"
!define MUI_WELCOMEPAGE_TITLE       "USB Print Agent Setup"
!define MUI_WELCOMEPAGE_TEXT        "This will install the USB Print Agent for Cook Desk ERPNext.$\n$\nThe agent runs in your system tray and bridges your USB thermal printers to ERPNext.$\n$\nClick Next to continue."
!define MUI_FINISHPAGE_RUN          "$INSTDIR\USBPrintAgent.exe"
!define MUI_FINISHPAGE_RUN_TEXT     "Launch USB Print Agent now"
!define MUI_FINISHPAGE_SHOWREADME   ""

; ── Pages ─────────────────────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE       "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ── Install Section ───────────────────────────────────────────────────────────
Section "USB Print Agent" SecMain
    SectionIn RO  ; required section

    SetOutPath "$INSTDIR"

    ; Copy all compiled Electron app files
    File /r "dist\win-unpacked\*.*"

    ; Write registry keys for uninstaller
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\USBPrintAgent" \
                "DisplayName"     "USB Print Agent"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\USBPrintAgent" \
                "UninstallString" '"$INSTDIR\Uninstall.exe"'
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\USBPrintAgent" \
                "DisplayIcon"     "$INSTDIR\USBPrintAgent.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\USBPrintAgent" \
                "Publisher"       "Pixymo Tech"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\USBPrintAgent" \
                "DisplayVersion"  "1.0.0"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\USBPrintAgent" \
                "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\USBPrintAgent" \
                "NoRepair" 1

    ; Save install dir
    WriteRegStr HKLM "Software\USBPrintAgent" "InstallDir" "$INSTDIR"

    ; Create uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"

    ; Desktop shortcut (optional)
    CreateShortCut "$DESKTOP\USB Print Agent.lnk" \
        "$INSTDIR\USBPrintAgent.exe" "" "$INSTDIR\USBPrintAgent.exe" 0

    ; Start Menu shortcut
    CreateDirectory "$SMPROGRAMS\USB Print Agent"
    CreateShortCut "$SMPROGRAMS\USB Print Agent\USB Print Agent.lnk" \
        "$INSTDIR\USBPrintAgent.exe"
    CreateShortCut "$SMPROGRAMS\USB Print Agent\Uninstall.lnk" \
        "$INSTDIR\Uninstall.exe"

    ; Auto-start registry entry (agent registers itself via auto-launch too, this is belt+suspenders)
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" \
                "USBPrintAgent" '"$INSTDIR\USBPrintAgent.exe" --hidden'

    ; Launch agent after install (silent, tray only)
    Exec '"$INSTDIR\USBPrintAgent.exe" --hidden'

SectionEnd


; ── Uninstall Section ─────────────────────────────────────────────────────────
Section "Uninstall"

    ; Kill the agent process if running
    ExecWait 'taskkill /F /IM USBPrintAgent.exe' $0

    ; Remove files
    RMDir /r "$INSTDIR"

    ; Remove shortcuts
    Delete "$DESKTOP\USB Print Agent.lnk"
    RMDir /r "$SMPROGRAMS\USB Print Agent"

    ; Remove registry entries
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\USBPrintAgent"
    DeleteRegKey HKLM "Software\USBPrintAgent"
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "USBPrintAgent"

SectionEnd
