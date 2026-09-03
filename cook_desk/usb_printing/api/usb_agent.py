# Copyright (c) 2026, Pixymo Tech and contributors
# USB Printing — Agent API (ERPNext backend)
# Communicates with the local Node.js USB Print Agent via HTTP.
# IMPORTANT: This module is fully isolated from the KOT system.

import frappe
import requests


# ─── Config ──────────────────────────────────────────────────────────────────

AGENT_TIMEOUT = 5  # seconds


def _agent_url(ip: str, port: int, path: str) -> str:
    return f"http://{ip}:{int(port)}{path}"


def _get_settings():
    """Return saved USB Printer Settings."""
    return frappe.get_single("USB Printer Settings")


def _agent_headers(settings):
    token = settings.get_password("agent_token") if settings else None
    return {"Authorization": f"Bearer {token}"} if token else {}


def _connection(ip, port):
    settings = _get_settings()
    return (
        ip or settings.server_ip or "127.0.0.1",
        int(port or settings.port or 3535),
        settings,
    )


# ─── Whitelisted API Endpoints ───────────────────────────────────────────────

@frappe.whitelist()
def check_agent_status(ip: str = None, port: int = None):
    """
    Check if the USB Print Agent is reachable.
    Returns: { running: bool, version: str }
    """
    try:
        ip, port, _settings = _connection(ip, port)

        url = _agent_url(ip, int(port), "/status")
        resp = requests.get(url, timeout=AGENT_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return {"running": True, "version": data.get("version", "unknown")}

    except requests.exceptions.ConnectionError:
        return {"running": False, "error": "Agent not reachable — is it running?"}
    except Exception as e:
        frappe.log_error(str(e), "USB Agent Status Check")
        return {"running": False, "error": str(e)}


@frappe.whitelist()
def list_printers(ip: str = None, port: int = None):
    """
    Fetch list of USB printers from the local agent.
    Returns: { printers: [ { name, is_default } ] }
    """
    try:
        ip, port, settings = _connection(ip, port)

        url = _agent_url(ip, int(port), "/printers")
        resp = requests.get(url, headers=_agent_headers(settings), timeout=AGENT_TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    except requests.exceptions.ConnectionError:
        return {"printers": [], "error": "Agent not reachable"}
    except Exception as e:
        frappe.log_error(str(e), "USB Agent List Printers")
        return {"printers": [], "error": str(e)}


@frappe.whitelist()
def test_print(ip: str = None, port: int = None):
    """
    Send a test print via the local agent.
    Returns: { success: bool, message: str }
    """
    try:
        ip, port, settings = _connection(ip, port)

        url = _agent_url(ip, int(port), "/test-print")
        resp = requests.post(url, headers=_agent_headers(settings), timeout=AGENT_TIMEOUT)
        resp.raise_for_status()
        return {"success": True, "message": "Test print sent"}

    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "Agent not reachable — is it installed and running?"}
    except Exception as e:
        frappe.log_error(str(e), "USB Agent Test Print")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def send_print(content: str, printer_name: str = None, ip: str = None, port: int = None):
    """
    Send raw print content to agent.
    Args:
        content:      ESC/POS or plain text to print
        printer_name: Optional specific printer name (agent uses default if omitted)
        ip, port:     Agent address (uses saved settings if omitted)
    Returns: { success: bool }
    """
    try:
        ip, port, settings = _connection(ip, port)

        url = _agent_url(ip, int(port), "/print")
        payload = {"content": content}
        if printer_name:
            payload["printer"] = printer_name

        resp = requests.post(url, json=payload, headers=_agent_headers(settings), timeout=AGENT_TIMEOUT)
        resp.raise_for_status()
        return {"success": True}

    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "Agent not reachable"}
    except Exception as e:
        frappe.log_error(str(e), "USB Agent Send Print")
        return {"success": False, "error": str(e)}


@frappe.whitelist()
def get_agent_credentials():
    """Return pairing data to an authenticated ERPNext user."""
    settings = _get_settings()
    return {
        "ip": settings.server_ip or "127.0.0.1",
        "port": int(settings.port or 3535),
        "token": settings.get_password("agent_token"),
    }
