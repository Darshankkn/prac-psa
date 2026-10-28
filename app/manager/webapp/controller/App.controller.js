sap.ui.define([
  "sap/ui/core/mvc/Controller"
], function(Controller) {
  "use strict";

  return Controller.extend("psasprint.manager.controller.App", {
    onMenuButtonPress: function() {
      var oToolPage = this.byId("toolPage");
      oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
    },

    onItemSelect: function(oEvent) {
      var oItem = (oEvent.getParameter && oEvent.getParameter("item")) || (oEvent.getParameters && oEvent.getParameters().item);
      if (!oItem && oEvent.getSource) {
        var oSource = oEvent.getSource();
        if (oSource.getKey) {
          oItem = oSource;
        } else if (oSource.getSelectedItem) {
          oItem = oSource.getSelectedItem();
        }
      }
      var sKey = oItem && oItem.getKey ? oItem.getKey() : "";
      if (!sKey) {
        var oSideNav = this.byId("sideNavigation");
        sKey = oSideNav && oSideNav.getSelectedKey ? oSideNav.getSelectedKey() : "";
      }

      if (sKey === "dashboard") {
        this.getOwnerComponent().getRouter().navTo("dashboard");
      } else if (sKey) {
        window.location.href = "/" + sKey + "/webapp/index.html";
      }
    },

    onNavAlerts: function() {
      window.location.href = "/alerts/webapp/index.html";
    }
  });
});
