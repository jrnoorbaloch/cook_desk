app_name = "cook_desk"
app_title = "Cook Desk"
app_publisher = "Pixymo Tech"
app_description = "KOT SYSTEM + USB Printing"
app_email = "info@pixymotech.com"
app_license = "mit"

# ── Fixtures ──────────────────────────────────────────────────────────────────
fixtures = [
    {
        "doctype": "Print Format",
        "filters": [["module", "=", "Cook Desk"]]
    }
]

# ── KOT System ───────────────────────────────────────────────────────────────
doc_events = {
    "POS Invoice": {
        "on_submit": "cook_desk.services.kot.process_pos_invoice"
    }
}

# ── DocType JS ────────────────────────────────────────────────────────────────
doctype_js = {
    "Kitchen Printer":      "public/js/kitchen_printer.js",
    "USB Printer Settings": "usb_printing/doctype/usb_printer_settings/usb_printer_settings.js",
}


