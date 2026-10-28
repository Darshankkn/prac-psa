sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/json/JSONModel"
], function(UIComponent, JSONModel) {
  "use strict";

  return UIComponent.extend("psasprint.employee.Component", {
    metadata: {
      manifest: "json"
    },

    init: function() {
      UIComponent.prototype.init.apply(this, arguments);

      var oEmpModel = new JSONModel({
        kpis: {
          myActiveProjects: 0,
          myOpenTimesheets: 0,
          myPendingTasks: 0,
          needsAttention: 0
        },
        profile: {
          fullName: "Loading...",
          employeeCode: "",
          email: "",
          role: "EMPLOYEE",
          department: ""
        },
        myProjects: [],
        myTimesheets: [],
        myTasks: [],
        busy: false
      });
      this.setModel(oEmpModel, "emp");

      this.getRouter().initialize();
    }
  });
});
