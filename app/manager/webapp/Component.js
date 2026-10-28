sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("psasprint.manager.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      var oDashboardModel = new JSONModel({
        kpis: {
          activeProjects: 0,
          atRiskBudgets: 0,
          pendingApprovals: 0,
          unbilledHours: 0,
          draftInvoices: 0,
          overdueAmount: 0
        },
        portfolio: [],
        approvals: [],
        busy: false
      });
      this.setModel(oDashboardModel, "dash");

      this.getRouter().initialize();
    }
  });
});
