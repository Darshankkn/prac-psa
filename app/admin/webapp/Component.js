sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("psasprint.admin.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      var oAdminModel = new JSONModel({
        kpis: {
          activeProjects: 0,
          atRiskBudgets: 0,
          pendingApprovals: 0,
          unbilledHours: 0,
          draftInvoices: 0,
          overdueAmount: 0
        },
        recentProjects: [],
        pendingTimesheets: [],
        counts: {
          clients: 0,
          employees: 0,
          projects: 0,
          budgets: 0,
          tasks: 0,
          invoices: 0
        },
        busy: false
      });
      this.setModel(oAdminModel, "admin");

      this.getRouter().initialize();
    }
  });
});
