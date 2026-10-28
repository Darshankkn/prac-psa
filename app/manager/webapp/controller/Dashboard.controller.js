sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/TextArea",
  "sap/m/Input",
  "sap/m/Label",
  "sap/m/Select",
  "sap/ui/core/Item",
  "sap/m/DatePicker",
  "sap/m/Text",
  "sap/m/VBox",
  "sap/m/HBox"
], function(Controller, MessageToast, MessageBox, Dialog, Button, TextArea, Input, Label, Select, Item, DatePicker, Text, VBox, HBox) {
  "use strict";

  function generateUUID() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  return Controller.extend("psasprint.manager.controller.Dashboard", {
    onInit: function() {
      this.loadAllData();
    },

    loadAllData: function() {
      var oModel = this.getOwnerComponent().getModel("dash");
      oModel.setProperty("/busy", true);

      Promise.all([
        this._fetchKPIs(),
        this._fetchPortfolio(),
        this._fetchPendingApprovals(),
        this._fetchTasks(),
        this._fetchInvoices(),
        this._fetchEmployees(),
        this._fetchManagedProjects()
      ]).then(function() {
        oModel.setProperty("/busy", false);
      }).catch(function(err) {
        oModel.setProperty("/busy", false);
        console.error("Error loading dashboard data:", err);
      });
    },

    onRefresh: function() {
      this.loadAllData();
      MessageToast.show("Dashboard refreshed");
    },

    _fetchKPIs: function() {
      var oModel = this.getOwnerComponent().getModel("dash");
      return fetch("/psa/getManagerDashboard()", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load Manager KPIs");
        return res.json();
      })
      .then(function(data) {
        var kpis = data.value || data;
        oModel.setProperty("/kpis", {
          activeProjects: kpis.activeProjects || 0,
          atRiskBudgets: kpis.atRiskBudgets || 0,
          pendingApprovals: kpis.pendingApprovals || 0,
          unbilledHours: Number(kpis.unbilledHours || 0).toFixed(1),
          draftInvoices: kpis.draftInvoices || 0,
          overdueAmount: Number(kpis.overdueAmount || 0).toLocaleString("en-IN")
        });
      });
    },

    _fetchPortfolio: function() {
      var oModel = this.getOwnerComponent().getModel("dash");
      return fetch("/psa/getProjectPortfolio()", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load Project Portfolio");
        return res.json();
      })
      .then(function(data) {
        var items = data.value || [];
        oModel.setProperty("/portfolio", items);
      });
    },

    _fetchPendingApprovals: function() {
      var oModel = this.getOwnerComponent().getModel("dash");
      return fetch("/psa/Timesheets?$filter=STATUS eq 'SUBMITTED'&$expand=employee", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load Approvals");
        return res.json();
      })
      .then(function(data) {
        var items = data.value || [];
        oModel.setProperty("/approvals", items);
      });
    },

    _fetchTasks: function() {
      var oModel = this.getOwnerComponent().getModel("dash");
      return fetch("/psa/Tasks?$expand=project,assignedTo&$orderby=createdAt desc", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load tasks");
        return res.json();
      })
      .then(function(data) {
        var items = data.value || [];
        oModel.setProperty("/tasks", items);
      });
    },

    _fetchInvoices: function() {
      var oModel = this.getOwnerComponent().getModel("dash");
      return fetch("/psa/Invoices?$expand=project,client&$orderby=INVOICE_DATE desc", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load invoices");
        return res.json();
      })
      .then(function(data) {
        var items = data.value || [];
        oModel.setProperty("/invoices", items);
      });
    },

    _fetchEmployees: function() {
      var oModel = this.getOwnerComponent().getModel("dash");
      return fetch("/psa/Employees?$filter=IS_ACTIVE eq true&$orderby=FULL_NAME asc", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load employees");
        return res.json();
      })
      .then(function(data) {
        var items = data.value || [];
        oModel.setProperty("/employees", items);
      });
    },

    _fetchManagedProjects: function() {
      var oModel = this.getOwnerComponent().getModel("dash");
      return fetch("/psa/Projects?$filter=STATUS eq 'ACTIVE' or STATUS eq 'PLANNING'&$orderby=PROJECT_NAME asc", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load projects");
        return res.json();
      })
      .then(function(data) {
        var items = data.value || [];
        oModel.setProperty("/managedProjects", items);
      });
    },

    // =========================================================================
    // Manager Responsibility: Allocate & Assign Tasks
    // =========================================================================
    onOpenAssignTaskDialog: function() {
      var that = this;
      var oModel = this.getOwnerComponent().getModel("dash");
      var aProjects = oModel.getProperty("/managedProjects") || [];

      if (!aProjects.length) {
        MessageBox.warning("No active projects found under your management. Please verify with Admin.");
        return;
      }

      var oTitleInput = new Input({ placeholder: "e.g. Build Payment Gateway Module", required: true });
      var oDescInput = new TextArea({ placeholder: "Detailed instructions and expected deliverables...", rows: 3, width: "100%" });

      var oProjectSelect = new Select({
        width: "100%",
        items: aProjects.map(function(p) {
          return new Item({ key: p.ID, text: (p.PROJECT_CODE ? p.PROJECT_CODE + " - " : "") + p.PROJECT_NAME });
        })
      });

      var oPrioritySelect = new Select({
        width: "100%",
        selectedKey: "MEDIUM",
        items: [
          new Item({ key: "LOW", text: "Low Priority" }),
          new Item({ key: "MEDIUM", text: "Medium Priority" }),
          new Item({ key: "HIGH", text: "High Priority" }),
          new Item({ key: "CRITICAL", text: "Critical Priority" })
        ]
      });

      var oEstHoursInput = new Input({ value: "16", type: "Number", width: "100%" });
      var oDueDatePicker = new DatePicker({
        width: "100%",
        value: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        valueFormat: "yyyy-MM-dd",
        displayFormat: "yyyy-MM-dd"
      });

      var oDialog = new Dialog({
        title: "Assign Task",
        contentWidth: "480px",
        content: new VBox({
          items: [
            new Label({ text: "Deliverable / Task Title:", required: true }),
            oTitleInput,
            new Label({ text: "Project Context:", required: true, class: "sapUiTinyMarginTop" }),
            oProjectSelect,
            new HBox({
              justifyContent: "SpaceBetween",
              items: [
                new VBox({
                  width: "48%",
                  items: [
                    new Label({ text: "Priority Level:" }),
                    oPrioritySelect
                  ]
                }),
                new VBox({
                  width: "48%",
                  items: [
                    new Label({ text: "Estimated Hours:" }),
                    oEstHoursInput
                  ]
                })
              ]
            }).addStyleClass("sapUiTinyMarginTop"),
            new Label({ text: "Target Due Date:", class: "sapUiTinyMarginTop" }),
            oDueDatePicker,
            new Label({ text: "Scope / Instructions:", class: "sapUiTinyMarginTop" }),
            oDescInput
          ]
        }).addStyleClass("sapUiSmallMargin"),
        beginButton: new Button({
          text: "Assign Task",
          type: "Emphasized",
          icon: "sap-icon://add-task",
          press: function() {
            var sTitle = oTitleInput.getValue().trim();
            var sProjectId = oProjectSelect.getSelectedKey();
            var sPriority = oPrioritySelect.getSelectedKey();
            var fHours = parseFloat(oEstHoursInput.getValue()) || 0;
            var sDueDate = oDueDatePicker.getValue();
            var sDesc = oDescInput.getValue().trim();

            if (!sTitle) {
              MessageBox.warning("Task Title is required.");
              return;
            }
            if (!sProjectId) {
              MessageBox.warning("Please select a project.");
              return;
            }

            oDialog.close();

            var newTask = {
              ID: generateUUID(),
              TASK_TITLE: sTitle,
              DESCRIPTION: sDesc,
              project_ID: sProjectId,
              PRIORITY: sPriority,
              STATUS: "OPEN",
              ESTIMATED_HOURS: fHours,
              ACTUAL_HOURS: 0,
              DUE_DATE: sDueDate || null
            };

            fetch("/psa/Tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newTask)
            })
            .then(function(res) {
              if (!res.ok) {
                return res.json().then(function(err) {
                  throw new Error(err.error?.message || "Failed to assign task");
                });
              }
              return res.json();
            })
            .then(function() {
              MessageToast.show("Task '" + sTitle + "' created successfully!");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Failed to create task");
            });
          }
        }),
        endButton: new Button({
          text: "Cancel",
          press: function() { oDialog.close(); }
        }),
        afterClose: function() { oDialog.destroy(); }
      });

      oDialog.open();
    },

    // =========================================================================
    // Manager Responsibility: Review & Approve / Reject Timesheets
    // =========================================================================
    onApproveTimesheet: function(oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext("dash");
      var oItem = oContext.getObject();

      MessageBox.confirm("Approve timesheet for " + (oItem.employee ? oItem.employee.FULL_NAME : "Employee") + " (" + oItem.TOTAL_HOURS + " hours)?", {
        title: "Approve Timesheet",
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        onClose: function(sAction) {
          if (sAction === MessageBox.Action.YES) {
            fetch("/psa/approveTimesheet", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
              },
              body: JSON.stringify({ timesheetId: oItem.ID })
            })
            .then(function(res) {
              return res.json().then(function(data) {
                if (!res.ok) throw new Error(data.error ? data.error.message : "Approval failed");
                return data;
              });
            })
            .then(function() {
              MessageToast.show("Timesheet approved successfully");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Failed to approve timesheet");
            });
          }
        }
      });
    },

    onOpenRejectDialog: function(oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext("dash");
      var oItem = oContext.getObject();

      var oTextArea = new TextArea({
        width: "100%",
        rows: 4,
        placeholder: "Enter the specific reason for rejecting this timesheet (mandatory)..."
      });

      var oDialog = new Dialog({
        title: "Reject Timesheet",
        type: "Message",
        content: new VBox({
          items: [
            new Label({ text: "Rejection Reason (Required):", required: true }),
            oTextArea
          ]
        }).addStyleClass("sapUiSmallMargin"),
        beginButton: new Button({
          text: "Reject",
          type: "Reject",
          press: function() {
            var sReason = oTextArea.getValue().trim();
            if (!sReason) {
              MessageBox.warning("A rejection reason is mandatory.");
              return;
            }
            oDialog.close();

            fetch("/psa/rejectTimesheet", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
              },
              body: JSON.stringify({
                timesheetId: oItem.ID,
                reason: sReason
              })
            })
            .then(function(res) {
              return res.json().then(function(data) {
                if (!res.ok) throw new Error(data.error ? data.error.message : "Rejection failed");
                return data;
              });
            })
            .then(function() {
              MessageToast.show("Timesheet rejected with feedback");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Failed to reject timesheet");
            });
          }
        }),
        endButton: new Button({
          text: "Cancel",
          press: function() {
            oDialog.close();
          }
        }),
        afterClose: function() {
          oDialog.destroy();
        }
      });

      oDialog.open();
    },

    // =========================================================================
    // Formatters
    // =========================================================================
    formatStatusState: function(sStatus) {
      switch (sStatus) {
        case "ACTIVE": return "Success";
        case "PLANNING": return "Information";
        case "ON_HOLD": return "Warning";
        case "COMPLETED": return "None";
        case "CANCELLED": return "Error";
        default: return "None";
      }
    },

    formatBudgetBurnState: function(fBurn) {
      var burn = Number(fBurn) || 0;
      if (burn >= 100) return "Error";     // Red (>= 100%)
      if (burn >= 80) return "Warning";   // Amber (80-99%)
      return "Success";                   // Green (< 80%)
    },

    formatBudgetBurnBar: function(fBurn) {
      var burn = Number(fBurn) || 0;
      var width = Math.min(burn, 100);
      var colorClass = "green";
      if (burn >= 100) {
        colorClass = "red";
      } else if (burn >= 80) {
        colorClass = "amber";
      }
      return '<div class="psaBudgetBar"><div class="psaBudgetBarFill ' + colorClass + '" style="width: ' + width + '%;"></div></div>';
    },

    formatBudgetBurnClass: function(fBurn) {
      var burn = Number(fBurn) || 0;
      if (burn >= 100) return "psaBudgetBurnText red";
      if (burn >= 80) return "psaBudgetBurnText amber";
      return "psaBudgetBurnText green";
    },

    formatDate: function(sDate) {
      if (!sDate) return "";
      return new Date(sDate).toLocaleDateString();
    },

    formatCurrency: function(val) {
      var n = Number(val) || 0;
      return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatInvoiceStatusState: function(sStatus) {
      switch (sStatus) {
        case "PAID": return "Success";
        case "ISSUED": return "Information";
        case "OVERDUE": return "Error";
        case "DRAFT": return "Warning";
        case "CANCELLED": return "None";
        default: return "None";
      }
    },

    formatPriorityState: function(sPriority) {
      switch (sPriority) {
        case "CRITICAL": return "Error";
        case "HIGH": return "Warning";
        case "MEDIUM": return "Information";
        case "LOW": return "None";
        default: return "None";
      }
    },

    formatTaskStatusState: function(sStatus) {
      switch (sStatus) {
        case "COMPLETED": return "Success";
        case "IN_PROGRESS": return "Information";
        case "OPEN": return "None";
        case "BLOCKED": return "Error";
        default: return "None";
      }
    },

    // =========================================================================
    // Navigation Handlers
    // =========================================================================
    onViewProjectDetails: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("dash");
      var oProject = oContext.getObject();
      window.location.href = "/projects/webapp/index.html#/Projects(" + oProject.ID + ")";
    },

    onKpiPressProjects: function() { window.location.href = "/projects/webapp/index.html"; },
    onKpiPressBudgets: function() { window.location.href = "/budgets/webapp/index.html"; },
    onKpiPressApprovals: function() { window.location.href = "/timesheets/webapp/index.html"; },
    onKpiPressTimesheets: function() { window.location.href = "/timesheets/webapp/index.html"; },
    onKpiPressInvoices: function() { window.location.href = "/invoices/webapp/index.html"; },
    onNavProjects: function() { window.location.href = "/projects/webapp/index.html"; },
    onNavTasks: function() { window.location.href = "/tasks/webapp/index.html"; },
    onNavTimesheets: function() { window.location.href = "/timesheets/webapp/index.html"; },
    onNavInvoices: function() { window.location.href = "/invoices/webapp/index.html"; }
  });
});
