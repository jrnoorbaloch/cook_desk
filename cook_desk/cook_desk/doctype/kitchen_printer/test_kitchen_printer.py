# Copyright (c) 2026, Pixymo Tech and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase


class TestKitchenPrinter(FrappeTestCase):
	def test_kot_printer_field_links_to_kitchen_printer(self):
		self.assertEqual(
			frappe.get_meta("KOT").get_field("printer").options,
			"Kitchen Printer",
		)
