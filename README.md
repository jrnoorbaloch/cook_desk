# Cook Desk

A custom Frappe/ERPNext app for restaurant order management and USB thermal printing.

Developed and maintained by Pixymo Tech.

| | |
|---|---|
| Version | 1.0.0 |
| Author | Pixymo Tech |
| Website | www.pixymotech.com |
| Email | info@pixymotech.com |
| Phone | +92 321 204 3228 |
| License | MIT |

---

## What This App Does

Cook Desk adds two modules to your ERPNext:

**KOT System (Kitchen Order Ticket)**
Automatically generates and prints kitchen orders when a POS Invoice is submitted. Orders are routed to the correct kitchen printer based on item mapping.

**USB Printing System**
Allows direct printing to USB thermal printers connected to a Windows PC without any network printer configuration. Includes a local agent, Chrome Extension, and ERPNext settings page.

---

## Requirements

- ERPNext v14 or v15 and v16
- Frappe Framework v14+
- Python 3.10+

---

## Installation

```bash
# Go to your bench directory
cd ~/frappe-bench

# Get the app
bench get-app https://github.com/jrnoorbaloch/cook_desk.git

# Install on your site
bench --site your-site.com install-app cook_desk

# Migrate database
bench --site your-site.com migrate

# Restart bench
bench restart
```

---

## After Installation

1. Open ERPNext and search for **Kitchen Printer** — add your printer IP and port
2. Open **Item Kitchen Mapping** — assign items to kitchens
3. Open **USB Printer Settings** — download and install the USB Print Agent on your Windows PC
4. Click **Test Connection and Print** to verify everything is working

---

## Upcoming Updates

### v1.1.0 — Kitchen Display System (KDS)

- Real-time order display on kitchen tablets and monitors
- Order status tracking (New, Preparing, Ready)
- Touch-based order confirmation
- Sound alerts for new orders

### v1.2.0 — Enhancements

- Print queue management
- Printer health monitoring
- Order timer tracking

### v2.0.0 — Advanced

- WhatsApp order notifications
- Multi-branch support
- Analytics dashboard

This repository is actively maintained and updated. Watch or Star to stay notified.

---

## Support

For installation help or any issues, contact us:

- Email: info@pixymotech.com
- Website: www.pixymotech.com
- Phone: +92 321 204 3228

---

## License

MIT License — Copyright 2026 Pixymo Tech
