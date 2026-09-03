# Copyright (c) 2026, Pixymo Tech and Contributors
# See license.txt

from types import SimpleNamespace
from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from cook_desk.api.printer import send_to_printer
from cook_desk.services.kot import _create_kot, attach_kitchen, process_pos_invoice


class TestKOT(FrappeTestCase):
	def test_status_and_printer_fields_exist(self):
		meta = frappe.get_meta("KOT")
		self.assertEqual(meta.get_field("printer").options, "Kitchen Printer")
		self.assertIn("Printer Not Configured", meta.get_field("status").options)
		self.assertIn("Print Failed", meta.get_field("status").options)

	def test_unmapped_items_are_skipped(self):
		items = [
			{"item_code": "MAPPED", "qty": 1},
			{"item_code": "UNMAPPED", "qty": 1},
		]
		with patch("cook_desk.services.kot.frappe.log_error"):
			result = attach_kitchen(items, {"MAPPED": "Kitchen 1"})
		self.assertEqual(result, [{**items[0], "kitchen": "Kitchen 1"}])

	def test_invoice_processing_does_not_raise_without_mapping(self):
		invoice = SimpleNamespace(items=[])
		with patch("cook_desk.services.kot.frappe.get_all", return_value=[]), \
				patch("cook_desk.services.kot.frappe.log_error"):
			process_pos_invoice(invoice, "on_submit")

	def test_missing_printer_creates_visible_kot(self):
		kot = SimpleNamespace(
			append=lambda *args, **kwargs: None,
			insert=lambda **kwargs: None,
			printer=None,
			status=None,
		)
		invoice = SimpleNamespace(name="POS-1")
		with patch("cook_desk.services.kot.frappe.db.exists", return_value=False), \
				patch("cook_desk.services.kot.frappe.db.get_value", return_value=None), \
				patch("cook_desk.services.kot.frappe.new_doc", return_value=kot), \
				patch("cook_desk.services.kot.frappe.log_error"):
			_create_kot("Kitchen 1", [{"item_code": "ITEM-1", "qty": 1}], invoice)

		self.assertEqual(kot.status, "Printer Not Configured")

	def test_failed_print_marks_kot_and_notifies(self):
		socket_factory = patch("cook_desk.api.printer.socket.socket")
		with socket_factory as socket_class, \
				patch("cook_desk.api.printer.frappe.db.set_value") as set_value, \
				patch("cook_desk.api.printer.frappe.log_error"), \
				patch("cook_desk.api.printer.time.sleep"), \
				patch("cook_desk.api.printer.frappe.publish_realtime") as publish:
			socket_class.return_value.connect.side_effect = OSError("offline")
			result = send_to_printer("127.0.0.1", 9100, "KOT", kot_name="KOT-1")

		self.assertFalse(result)
		set_value.assert_called_with("KOT", "KOT-1", "status", "Print Failed")
		publish.assert_called_with(
			"cook_desk_print_status",
			{"kot": "KOT-1", "status": "Print Failed"},
		)

	def test_successful_print_marks_kot_printed(self):
		with patch("cook_desk.api.printer.socket.socket") as socket_class, \
				patch("cook_desk.api.printer.frappe.db.set_value") as set_value, \
				patch("cook_desk.api.printer.frappe.publish_realtime") as publish:
			result = send_to_printer("127.0.0.1", 9100, "KOT", kot_name="KOT-1")

		self.assertTrue(result)
		set_value.assert_called_with("KOT", "KOT-1", "status", "Printed")
		publish.assert_called_with(
			"cook_desk_print_status",
			{"kot": "KOT-1", "status": "Printed"},
		)
		socket_class.return_value.connect.assert_called_once_with(("127.0.0.1", 9100))
