import socket
import time
import frappe


# ===============================
# LOW LEVEL SEND (CORE)
# ===============================
def send_to_printer(ip, port, content, kot_name=None, retries=2):
    last_error = None
    for attempt in range(retries + 1):
        printer = None
        try:
            printer = socket.socket()
            printer.settimeout(5)
            printer.connect((ip, int(port)))
            printer.sendall(content.encode("utf-8"))
            printer.sendall(b"\n\n\n\n\n\n")
            printer.sendall(b"\x1d\x56\x00")
            if kot_name:
                frappe.db.set_value("KOT", kot_name, "status", "Printed")
                frappe.publish_realtime(
                    "cook_desk_print_status",
                    {"kot": kot_name, "status": "Printed"},
                )
            return True
        except Exception as error:
            last_error = error
            if attempt < retries:
                time.sleep(2 ** attempt)
        finally:
            if printer:
                printer.close()

    frappe.log_error(f"{ip}:{port} -> {last_error}", "Printer Error")
    if kot_name:
        frappe.db.set_value("KOT", kot_name, "status", "Print Failed")
        frappe.publish_realtime(
            "cook_desk_print_status",
            {"kot": kot_name, "status": "Print Failed"},
        )
    return False


# ===============================
# BACKGROUND QUEUE PRINT
# ===============================
def enqueue_print(ip, port, content, kot_name=None):
    frappe.enqueue(
        "cook_desk.api.printer.send_to_printer",
        queue="short",
        timeout=15,
        ip=ip,
        port=port,
        content=content,
        kot_name=kot_name,
        enqueue_after_commit=True,
    )


# ===============================
# TEST CONNECTION
# ===============================
@frappe.whitelist()
def test_connection(ip, port):
    try:
        s = socket.socket()
        s.settimeout(3)
        s.connect((ip, int(port)))
        s.close()

        return "✅ Printer Connected Successfully"

    except Exception as e:
        return f"❌ Connection Failed: {str(e)}"


# ===============================
# TEST PRINT
# ===============================
@frappe.whitelist()
def test_print(ip, port):
    try:
        content = "\n\n*** TEST PRINT ***\nCook Desk Working\n\n\n"
        enqueue_print(ip, port, content)

        return "🖨️ Test Print Sent"

    except Exception as e:
        return f"❌ Print Failed: {str(e)}"
