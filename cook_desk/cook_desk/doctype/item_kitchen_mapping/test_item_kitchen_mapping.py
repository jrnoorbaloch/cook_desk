# Copyright (c) 2026, Pixymo Tech and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase


class TestItemKitchenMapping(FrappeTestCase):
	def test_kot_supports_unmapped_item_statuses(self):
		status_options = frappe.get_meta("KOT").get_field("status").options
		self.assertIn("Printer Not Configured", status_options)
		self.assertIn("Print Failed", status_options)
