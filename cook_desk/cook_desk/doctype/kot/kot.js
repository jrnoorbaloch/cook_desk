// Copyright (c) 2026, Pixymo Tech and contributors
// For license information, please see license.txt

frappe.ui.form.on("KOT", {
	refresh(frm) {
		if (frm.is_new()) {
			return;
		}

		frm.add_custom_button(__("Print Again"), () => {
			frappe.prompt(
				[{
					fieldname: "printer",
					fieldtype: "Link",
					label: __("Printer"),
					options: "Kitchen Printer",
					reqd: 1,
					default: frm.doc.printer,
				}],
				(values) => frappe.call({
					method: "cook_desk.services.kot.print_again",
					args: { kot_name: frm.doc.name, printer_name: values.printer },
					freeze: true,
					callback: () => {
						frappe.show_alert({ message: __("Print queued"), indicator: "blue" });
						frm.reload_doc();
					},
				}),
				__("Print KOT Again"),
				__("Queue Print"),
			);
		});
	},
});
