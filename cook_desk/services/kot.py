import frappe
from datetime import datetime
from cook_desk.api.printer import enqueue_print


def process_pos_invoice(doc, method):
    try:
        items = extract_items(doc)
        mapping = get_item_kitchen_map()
        enriched = attach_kitchen(items, mapping)
        grouped = group_by_kitchen(enriched)
        create_kots(grouped, doc)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "KOT processing failed")


# ─── Item Extraction ──────────────────────────────────────────────────────────

def extract_items(doc):
    return [
        {"item_code": d.item_code, "qty": d.qty}
        for d in doc.items
    ]


# ─── Kitchen Mapping ──────────────────────────────────────────────────────────

def get_item_kitchen_map():
    mapping = {}
    docs = frappe.get_all("Item Kitchen Mapping", limit=1)
    if not docs:
        frappe.log_error("Item Kitchen Mapping not found", "KOT mapping skipped")
        return mapping
    mapping_doc = frappe.get_doc("Item Kitchen Mapping", docs[0].name)
    for row in mapping_doc.items:
        mapping[row.item_code] = row.kitchen
    return mapping


# ─── Attach & Group ───────────────────────────────────────────────────────────

def attach_kitchen(items, mapping):
    result = []
    for item in items:
        kitchen = mapping.get(item["item_code"])
        if not kitchen:
            frappe.log_error(
                f"No kitchen assigned for item: {item['item_code']}",
                "KOT item skipped",
            )
            continue
        result.append({**item, "kitchen": kitchen})
    return result


def group_by_kitchen(items):
    grouped = {}
    for item in items:
        grouped.setdefault(item["kitchen"], []).append(item)
    return grouped


# ─── KOT Text Generator (Full Width Thermal) ─────────────────────────────────

WIDTH = 48  # Standard 80mm thermal printer character width

def _line(char="-"):
    return char * WIDTH + "\n"

def _center(text):
    return text.center(WIDTH) + "\n"

def _row(left, right, width=WIDTH):
    space = width - len(left) - len(right)
    return left + " " * max(space, 1) + right + "\n"

def generate_kot_text(kot):
    now = datetime.now()
    date_str = now.strftime("%d-%b-%Y")
    time_str = now.strftime("%I:%M:%S %p")

    lines = []
    lines.append("\n")
    lines.append(_line("="))
    lines.append(_center("KITCHEN ORDER TICKET"))   # semibold equivalent → plain text
    lines.append(_line("="))
    lines.append(_center("KOT"))                    # extra bold equivalent → all caps large
    lines.append(_line("-"))
    lines.append(_row("Invoice :", kot.pos_invoice))
    lines.append(_row("Kitchen :", kot.kitchen))
    lines.append(_row("Date    :", date_str))
    lines.append(_row("Time    :", time_str))
    lines.append(_line("-"))
    lines.append(_row("ITEM", "QTY"))
    lines.append(_line("-"))

    for item in kot.items:
        name = item.item_code[:WIDTH - 8]
        qty  = f"x {int(item.qty)}"
        lines.append(_row(name, qty))

    lines.append(_line("="))
    lines.append(_center("*** PREPARE NOW ***"))
    lines.append("\n\n\n")
    return "".join(lines)


# ─── KOT Creation ─────────────────────────────────────────────────────────────

def create_kots(grouped, invoice):
    for kitchen, items in grouped.items():
        try:
            _create_kot(kitchen, items, invoice)
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"KOT creation failed: {kitchen}")


def _create_kot(kitchen, items, invoice):
    if frappe.db.exists("KOT", {
        "pos_invoice": invoice.name,
        "kitchen": kitchen
    }):
        return

    printer_name = frappe.db.get_value("Kitchen", kitchen, "printer")

    kot = frappe.new_doc("KOT")
    kot.pos_invoice = invoice.name
    kot.kitchen     = kitchen
    kot.printer     = printer_name or None
    kot.status      = "Draft" if printer_name else "Printer Not Configured"

    for item in items:
        kot.append("items", {
            "item_code": item["item_code"],
            "qty": item["qty"],
        })

    kot.insert(ignore_permissions=True)

    if not printer_name:
        frappe.log_error(
            f"No printer configured for kitchen: {kitchen}",
            "KOT print skipped",
        )
        return

    try:
        printer_doc = frappe.get_doc("Kitchen Printer", printer_name)
        content = generate_kot_text(kot)
        enqueue_print(
            printer_doc.ip_address,
            printer_doc.port or 9100,
            content,
            kot_name=kot.name,
        )
    except Exception:
        kot.db_set("status", "Print Failed")
        frappe.log_error(frappe.get_traceback(), f"KOT print queue failed: {kot.name}")


@frappe.whitelist()
def print_again(kot_name, printer_name):
    """Queue a KOT for a selected printer without blocking the desk request."""
    kot = frappe.get_doc("KOT", kot_name)
    printer_doc = frappe.get_doc("Kitchen Printer", printer_name)
    kot.printer = printer_name
    kot.status = "Draft"
    kot.save(ignore_permissions=True)
    enqueue_print(
        printer_doc.ip_address,
        printer_doc.port or 9100,
        generate_kot_text(kot),
        kot_name=kot.name,
    )
    return {"status": "queued", "kot": kot.name}
