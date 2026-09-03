frappe.listview_settings["KOT"] = {
    get_indicator(doc) {
        const colors = {
            "Printer Not Configured": ["Printer Not Configured", "orange"],
            "Print Failed": ["Print Failed", "red"],
            Printed: ["Printed", "green"],
            Draft: ["Draft", "blue"],
        };
        return colors[doc.status] || [doc.status, "gray"];
    },
    onload(listview) {
        listview.page.add_inner_button(__("Missed Prints"), () => {
            listview.filter_area.add([["KOT", "status", "in", [
                "Printer Not Configured",
                "Print Failed",
            ]]]);
        });
    },
};