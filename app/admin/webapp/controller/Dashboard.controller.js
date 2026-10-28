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

  return Controller.extend("psasprint.admin.controller.Dashboard", {
    onInit: function() {
      this.loadAllData();
    },

    loadAllData: function() {
      var oModel = this.getOwnerComponent().getModel("admin");
      oModel.setProperty("/busy", true);

      Promise.all([
        this._fetchAdminKPIs(),
        this._fetchInvoices(),
        this._fetchProjects(),
        this._fetchClients(),
        this._fetchManagers(),
        this._fetchPendingTimesheets()
      ]).then(function() {
        oModel.setProperty("/busy", false);
      }).catch(function(err) {
        oModel.setProperty("/busy", false);
        console.error("Error loading admin dashboard data:", err);
      });
    },

    onRefresh: function() {
      this.loadAllData();
      MessageToast.show("Admin Dashboard refreshed");
    },

    _fetchAdminKPIs: function() {
      var oModel = this.getOwnerComponent().getModel("admin");
      return fetch("/psa/getAdminDashboard()", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load Admin KPIs");
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

    _fetchInvoices: function() {
      var oModel = this.getOwnerComponent().getModel("admin");
      return fetch("/psa/Invoices?$expand=client,project&$orderby=INVOICE_DATE desc", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        oModel.setProperty("/invoices", data.value || []);
      });
    },

    _fetchProjects: function() {
      var oModel = this.getOwnerComponent().getModel("admin");
      return fetch("/psa/Projects?$expand=client,manager&$orderby=PROJECT_CODE asc", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        oModel.setProperty("/projects", data.value || []);
      });
    },

    _fetchClients: function() {
      var oModel = this.getOwnerComponent().getModel("admin");
      return fetch("/psa/Clients?$orderby=CLIENT_CODE asc", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        oModel.setProperty("/clients", data.value || []);
      });
    },

    _fetchManagers: function() {
      var oModel = this.getOwnerComponent().getModel("admin");
      return fetch("/psa/Employees?$filter=ROLE eq 'MANAGER' or ROLE eq 'ADMIN'", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        oModel.setProperty("/managers", data.value || []);
      });
    },

    _fetchPendingTimesheets: function() {
      var oModel = this.getOwnerComponent().getModel("admin");
      return fetch("/psa/Timesheets?$filter=STATUS eq 'SUBMITTED'&$expand=employee", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load Timesheets");
        return res.json();
      })
      .then(function(data) {
        var items = data.value || [];
        oModel.setProperty("/pendingTimesheets", items);
      });
    },

    // =========================================================================
    // Formatters
    // =========================================================================
    formatCurrency: function(v) {
      if (v === null || v === undefined) return "0.00";
      return Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatInvoiceStatusState: function(status) {
      switch (status) {
        case "PAID": return "Success";
        case "ISSUED": return "Information";
        case "DRAFT": return "Warning";
        case "OVERDUE": return "Error";
        default: return "None";
      }
    },

    formatProjectStatusState: function(status) {
      switch (status) {
        case "ACTIVE": return "Success";
        case "PLANNING": return "Information";
        case "ON_HOLD": return "Warning";
        case "COMPLETED": return "None";
        case "CANCELLED": return "Error";
        default: return "None";
      }
    },

    // =========================================================================
    // 1. Client Actions (Create & Edit)
    // =========================================================================
    onOpenCreateClientDialog: function() {
      var that = this;
      var oCodeInput = new Input({ placeholder: "e.g. C007", required: true });
      var oNameInput = new Input({ placeholder: "e.g. Horizon Digital Systems", required: true });
      var oEmailInput = new Input({ placeholder: "contact@horizondigital.com", type: "Email" });
      var oPhoneInput = new Input({ placeholder: "+91-80-45678912" });
      var oContactInput = new Input({ placeholder: "Kiran Rao" });
      var oCityInput = new Input({ placeholder: "Bengaluru" });
      var oCountryInput = new Input({ value: "India" });

      var oDialog = new Dialog({
        title: "Create Client Record",
        contentWidth: "480px",
        content: new VBox({
          items: [
            new Label({ text: "Client Code (Required):", required: true }),
            oCodeInput,
            new Label({ text: "Client Name (Required):", required: true }),
            oNameInput,
            new Label({ text: "Contact Person:" }),
            oContactInput,
            new Label({ text: "Email Address:" }),
            oEmailInput,
            new Label({ text: "Phone Number:" }),
            oPhoneInput,
            new Label({ text: "City:" }),
            oCityInput,
            new Label({ text: "Country:" }),
            oCountryInput
          ]
        }).addStyleClass("sapUiSmallMargin"),
        beginButton: new Button({
          text: "Create Client",
          type: "Emphasized",
          press: function() {
            var sCode = oCodeInput.getValue().trim();
            var sName = oNameInput.getValue().trim();
            if (!sCode || !sName) {
              MessageBox.warning("Client Code and Client Name are required.");
              return;
            }
            oDialog.close();

            var newClient = {
              ID: generateUUID(),
              CLIENT_CODE: sCode,
              CLIENT_NAME: sName,
              CONTACT_PERSON: oContactInput.getValue().trim(),
              EMAIL: oEmailInput.getValue().trim() || null,
              PHONE: oPhoneInput.getValue().trim() || null,
              CITY: oCityInput.getValue().trim() || null,
              COUNTRY: oCountryInput.getValue().trim() || "India",
              STATUS: "ACTIVE"
            };

            fetch("/psa/Clients", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newClient)
            })
            .then(function(res) {
              if (!res.ok) return res.json().then(function(err) { throw new Error(err.error?.message || "Failed to create client"); });
              return res.json();
            })
            .then(function() {
              MessageToast.show("Client record '" + sName + "' created successfully!");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Could not create client");
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

    onOpenEditClientDialog: function(oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext("admin");
      var oClient = oContext.getObject();

      var oNameInput = new Input({ value: oClient.CLIENT_NAME, required: true });
      var oContactInput = new Input({ value: oClient.CONTACT_PERSON || "" });
      var oEmailInput = new Input({ value: oClient.EMAIL || "", type: "Email" });
      var oPhoneInput = new Input({ value: oClient.PHONE || "" });
      var oStatusSelect = new Select({
        selectedKey: oClient.STATUS,
        items: [
          new Item({ key: "ACTIVE", text: "ACTIVE" }),
          new Item({ key: "INACTIVE", text: "INACTIVE" }),
          new Item({ key: "PROSPECT", text: "PROSPECT" })
        ]
      });

      var oDialog = new Dialog({
        title: "Edit Client: " + oClient.CLIENT_CODE,
        contentWidth: "480px",
        content: new VBox({
          items: [
            new Label({ text: "Client Name:", required: true }),
            oNameInput,
            new Label({ text: "Contact Person:" }),
            oContactInput,
            new Label({ text: "Email Address:" }),
            oEmailInput,
            new Label({ text: "Phone Number:" }),
            oPhoneInput,
            new Label({ text: "Status:" }),
            oStatusSelect
          ]
        }).addStyleClass("sapUiSmallMargin"),
        beginButton: new Button({
          text: "Save Changes",
          type: "Emphasized",
          press: function() {
            var sName = oNameInput.getValue().trim();
            if (!sName) {
              MessageBox.warning("Client Name is required.");
              return;
            }
            oDialog.close();

            fetch("/psa/Clients(" + oClient.ID + ")", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                CLIENT_NAME: sName,
                CONTACT_PERSON: oContactInput.getValue().trim(),
                EMAIL: oEmailInput.getValue().trim() || null,
                PHONE: oPhoneInput.getValue().trim() || null,
                STATUS: oStatusSelect.getSelectedKey()
              })
            })
            .then(function(res) {
              if (!res.ok) return res.json().then(function(err) { throw new Error(err.error?.message || "Failed to update client"); });
              MessageToast.show("Client record updated successfully!");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Update failed");
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
    // 2. Project Actions (Create & Assign Manager)
    // =========================================================================
    onOpenCreateProjectDialog: function() {
      var that = this;
      var oModel = this.getOwnerComponent().getModel("admin");
      var aClients = oModel.getProperty("/clients") || [];
      var aManagers = oModel.getProperty("/managers") || [];

      var oCodeInput = new Input({ placeholder: "e.g. P008", required: true });
      var oNameInput = new Input({ placeholder: "e.g. Cloud Security Integration", required: true });
      var oDescInput = new TextArea({ placeholder: "Enter project scope and description...", rows: 3 });

      var oClientSelect = new Select({
        items: aClients.map(function(c) {
          return new Item({ key: c.ID, text: c.CLIENT_NAME + " (" + c.CLIENT_CODE + ")" });
        })
      });

      var oManagerSelect = new Select({
        items: aManagers.map(function(m) {
          return new Item({ key: m.ID, text: m.FULL_NAME + " - " + m.ROLE + " (" + m.EMPLOYEE_CODE + ")" });
        })
      });

      var oBillingSelect = new Select({
        selectedKey: "T_AND_M",
        items: [
          new Item({ key: "T_AND_M", text: "Time & Materials (T_AND_M)" }),
          new Item({ key: "FIXED_PRICE", text: "Fixed Price (FIXED_PRICE)" }),
          new Item({ key: "NON_BILLABLE", text: "Non-Billable (NON_BILLABLE)" })
        ]
      });

      var oHoursInput = new Input({ value: "1000", type: "Number" });
      var oStartDatePicker = new DatePicker({ value: "2026-06-01", valueFormat: "yyyy-MM-dd", displayFormat: "yyyy-MM-dd" });
      var oEndDatePicker = new DatePicker({ value: "2026-12-31", valueFormat: "yyyy-MM-dd", displayFormat: "yyyy-MM-dd" });

      var oDialog = new Dialog({
        title: "Create Project & Assign Manager",
        contentWidth: "520px",
        content: new VBox({
          items: [
            new Label({ text: "Project Code (Required):", required: true }),
            oCodeInput,
            new Label({ text: "Project Name (Required):", required: true }),
            oNameInput,
            new Label({ text: "Client Organization (Required):", required: true }),
            oClientSelect,
            new Label({ text: "Assign Project Manager (Required):", required: true }),
            oManagerSelect,
            new Label({ text: "Billing Type:" }),
            oBillingSelect,
            new Label({ text: "Planned Hours:" }),
            oHoursInput,
            new Label({ text: "Start Date:" }),
            oStartDatePicker,
            new Label({ text: "End Date:" }),
            oEndDatePicker,
            new Label({ text: "Description:" }),
            oDescInput
          ]
        }).addStyleClass("sapUiSmallMargin"),
        beginButton: new Button({
          text: "Create & Assign",
          type: "Emphasized",
          press: function() {
            var sCode = oCodeInput.getValue().trim();
            var sName = oNameInput.getValue().trim();
            var sClientId = oClientSelect.getSelectedKey();
            var sManagerId = oManagerSelect.getSelectedKey();

            if (!sCode || !sName || !sClientId || !sManagerId) {
              MessageBox.warning("Project Code, Name, Client, and Manager are required.");
              return;
            }
            oDialog.close();

            var newProject = {
              ID: generateUUID(),
              PROJECT_CODE: sCode,
              PROJECT_NAME: sName,
              DESCRIPTION: oDescInput.getValue().trim() || null,
              client_ID: sClientId,
              manager_ID: sManagerId,
              BILLING_TYPE: oBillingSelect.getSelectedKey(),
              PLANNED_HOURS: parseFloat(oHoursInput.getValue()) || 1000,
              START_DATE: oStartDatePicker.getValue(),
              END_DATE: oEndDatePicker.getValue(),
              STATUS: "ACTIVE"
            };

            fetch("/psa/Projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newProject)
            })
            .then(function(res) {
              if (!res.ok) return res.json().then(function(err) { throw new Error(err.error?.message || "Failed to create project"); });
              return res.json();
            })
            .then(function() {
              MessageToast.show("Project '" + sName + "' created and assigned to Manager!");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Project creation failed");
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

    onOpenEditProjectDialog: function(oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext("admin");
      var oProject = oContext.getObject();
      var oModel = this.getOwnerComponent().getModel("admin");
      var aManagers = oModel.getProperty("/managers") || [];

      var oNameInput = new Input({ value: oProject.PROJECT_NAME, required: true });
      var oManagerSelect = new Select({
        selectedKey: oProject.manager_ID,
        items: aManagers.map(function(m) {
          return new Item({ key: m.ID, text: m.FULL_NAME + " (" + m.EMPLOYEE_CODE + ")" });
        })
      });
      var oStatusSelect = new Select({
        selectedKey: oProject.STATUS,
        items: [
          new Item({ key: "ACTIVE", text: "ACTIVE" }),
          new Item({ key: "PLANNING", text: "PLANNING" }),
          new Item({ key: "ON_HOLD", text: "ON_HOLD" }),
          new Item({ key: "COMPLETED", text: "COMPLETED" }),
          new Item({ key: "CANCELLED", text: "CANCELLED" })
        ]
      });
      var oHoursInput = new Input({ value: String(oProject.PLANNED_HOURS || 1000), type: "Number" });

      var oDialog = new Dialog({
        title: "Manage Project: " + oProject.PROJECT_CODE,
        contentWidth: "480px",
        content: new VBox({
          items: [
            new Label({ text: "Project Name:", required: true }),
            oNameInput,
            new Label({ text: "Assigned Project Manager:", required: true }),
            oManagerSelect,
            new Label({ text: "Status:" }),
            oStatusSelect,
            new Label({ text: "Planned Hours:" }),
            oHoursInput
          ]
        }).addStyleClass("sapUiSmallMargin"),
        beginButton: new Button({
          text: "Update Project",
          type: "Emphasized",
          press: function() {
            var sName = oNameInput.getValue().trim();
            if (!sName) {
              MessageBox.warning("Project Name is required.");
              return;
            }
            oDialog.close();

            fetch("/psa/Projects(" + oProject.ID + ")", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                PROJECT_NAME: sName,
                manager_ID: oManagerSelect.getSelectedKey(),
                STATUS: oStatusSelect.getSelectedKey(),
                PLANNED_HOURS: parseFloat(oHoursInput.getValue()) || oProject.PLANNED_HOURS
              })
            })
            .then(function(res) {
              if (!res.ok) return res.json().then(function(err) { throw new Error(err.error?.message || "Failed to update project"); });
              MessageToast.show("Project updated and Manager reassigned successfully!");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Update failed");
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
    // 3. Invoice Actions (Generate, Mark Issued, Mark Paid)
    // =========================================================================
    onOpenGenerateInvoiceDialog: function() {
      var that = this;
      var oModel = this.getOwnerComponent().getModel("admin");
      var aClients = oModel.getProperty("/clients") || [];
      var aProjects = oModel.getProperty("/projects") || [];

      var nextInvoiceNum = "INV-2026-00" + ((oModel.getProperty("/invoices")?.length || 7) + 1);
      var oNumInput = new Input({ value: nextInvoiceNum, required: true });

      var oClientSelect = new Select({
        items: aClients.map(function(c) {
          return new Item({ key: c.ID, text: c.CLIENT_NAME + " (" + c.CLIENT_CODE + ")" });
        })
      });

      var oProjectSelect = new Select({
        items: aProjects.map(function(p) {
          return new Item({ key: p.ID, text: p.PROJECT_NAME + " (" + p.PROJECT_CODE + ")" });
        })
      });

      var today = new Date().toISOString().split("T")[0];
      var nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      var dueDateStr = nextMonth.toISOString().split("T")[0];

      var oDateInput = new DatePicker({ value: today, valueFormat: "yyyy-MM-dd", displayFormat: "yyyy-MM-dd" });
      var oDueDateInput = new DatePicker({ value: dueDateStr, valueFormat: "yyyy-MM-dd", displayFormat: "yyyy-MM-dd" });

      var oNetInput = new Input({ value: "500000", type: "Number", liveChange: updateGross });
      var oTaxInput = new Input({ value: "90000", type: "Number", liveChange: updateGross });
      var oGrossText = new Input({ value: "590000", editable: false });

      function updateGross() {
        var net = parseFloat(oNetInput.getValue()) || 0;
        var tax = parseFloat(oTaxInput.getValue()) || 0;
        oGrossText.setValue(String(parseFloat((net + tax).toFixed(2))));
      }

      var oDialog = new Dialog({
        title: "Generate Client Invoice (Draft)",
        contentWidth: "500px",
        content: new VBox({
          items: [
            new Label({ text: "Invoice Number (Required):", required: true }),
            oNumInput,
            new Label({ text: "Client Organization (Required):", required: true }),
            oClientSelect,
            new Label({ text: "Project (Required):", required: true }),
            oProjectSelect,
            new Label({ text: "Invoice Date:" }),
            oDateInput,
            new Label({ text: "Payment Due Date:" }),
            oDueDateInput,
            new Label({ text: "Net Amount (INR):", required: true }),
            oNetInput,
            new Label({ text: "Tax Amount (18% GST):", required: true }),
            oTaxInput,
            new Label({ text: "Gross Total (Net + Tax):" }),
            oGrossText
          ]
        }).addStyleClass("sapUiSmallMargin"),
        beginButton: new Button({
          text: "Generate Invoice",
          type: "Emphasized",
          press: function() {
            var sNum = oNumInput.getValue().trim();
            var net = parseFloat(oNetInput.getValue()) || 0;
            var tax = parseFloat(oTaxInput.getValue()) || 0;
            var gross = parseFloat((net + tax).toFixed(2));

            if (!sNum || net <= 0) {
              MessageBox.warning("Please provide a valid Invoice Number and Net Amount.");
              return;
            }
            oDialog.close();

            var newInvoice = {
              ID: generateUUID(),
              INVOICE_NUMBER: sNum,
              client_ID: oClientSelect.getSelectedKey(),
              project_ID: oProjectSelect.getSelectedKey(),
              INVOICE_DATE: oDateInput.getValue(),
              DUE_DATE: oDueDateInput.getValue(),
              NET_AMOUNT: net,
              TAX_AMOUNT: tax,
              GROSS_AMOUNT: gross,
              PAID_AMOUNT: 0,
              CURRENCY: "INR",
              STATUS: "DRAFT"
            };

            fetch("/psa/Invoices", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newInvoice)
            })
            .then(function(res) {
              if (!res.ok) return res.json().then(function(err) { throw new Error(err.error?.message || "Failed to generate invoice"); });
              return res.json();
            })
            .then(function() {
              MessageToast.show("Invoice '" + sNum + "' generated in DRAFT status!");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Invoice generation failed");
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

    onMarkInvoiceIssued: function(oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext("admin");
      var oInvoice = oContext.getObject();

      MessageBox.confirm("Issue invoice '" + oInvoice.INVOICE_NUMBER + "' to client for ₹" + Number(oInvoice.GROSS_AMOUNT).toLocaleString("en-IN") + "?", {
        title: "Mark Invoice as Issued",
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        onClose: function(sAction) {
          if (sAction === MessageBox.Action.YES) {
            fetch("/psa/markInvoiceIssued", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ invoiceId: oInvoice.ID })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data.error) throw new Error(data.error.message);
              MessageToast.show("Invoice '" + oInvoice.INVOICE_NUMBER + "' status changed to ISSUED!");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Failed to issue invoice");
            });
          }
        }
      });
    },

    onMarkInvoicePaid: function(oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext("admin");
      var oInvoice = oContext.getObject();

      var oPaidAmountInput = new Input({
        value: String(oInvoice.GROSS_AMOUNT),
        type: "Number"
      });

      var oDialog = new Dialog({
        title: "Record Payment: " + oInvoice.INVOICE_NUMBER,
        contentWidth: "400px",
        content: new VBox({
          items: [
            new Text({ text: "Invoice Total: ₹" + Number(oInvoice.GROSS_AMOUNT).toLocaleString("en-IN") }),
            new Label({ text: "Received Payment Amount (INR):", class: "sapUiTinyMarginTop" }),
            oPaidAmountInput
          ]
        }).addStyleClass("sapUiSmallMargin"),
        beginButton: new Button({
          text: "Mark as Paid",
          type: "Accept",
          press: function() {
            var paid = parseFloat(oPaidAmountInput.getValue()) || oInvoice.GROSS_AMOUNT;
            oDialog.close();

            fetch("/psa/markInvoicePaid", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                invoiceId: oInvoice.ID,
                paidAmount: paid
              })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data.error) throw new Error(data.error.message);
              MessageToast.show("Invoice '" + oInvoice.INVOICE_NUMBER + "' successfully marked as PAID!");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Payment recording failed");
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
    // 4. Timesheet Approvals
    // =========================================================================
    onAdminApprove: function(oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext("admin");
      var oItem = oContext.getObject();

      MessageBox.confirm("Approve timesheet as Administrator for " + (oItem.employee ? oItem.employee.FULL_NAME : "Employee") + "?", {
        title: "Admin Approval",
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        onClose: function(sAction) {
          if (sAction === MessageBox.Action.YES) {
            fetch("/psa/approveTimesheet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ timesheetId: oItem.ID })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data.error) throw new Error(data.error.message);
              MessageToast.show("Timesheet approved by Admin");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Approval failed");
            });
          }
        }
      });
    },

    onAdminReject: function(oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext("admin");
      var oItem = oContext.getObject();

      var oTextArea = new TextArea({
        width: "100%",
        rows: 4,
        placeholder: "Enter reason for administrative rejection (mandatory)..."
      });

      var oDialog = new Dialog({
        title: "Admin Reject Timesheet",
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
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ timesheetId: oItem.ID, reason: sReason })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data.error) throw new Error(data.error.message);
              MessageToast.show("Timesheet rejected by Admin");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Rejection failed");
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

    onNavClients: function() { window.location.href = "/clients/webapp/index.html"; },
    onNavEmployees: function() { window.location.href = "/employees/webapp/index.html"; },
    onNavProjects: function() { window.location.href = "/projects/webapp/index.html"; },
    onNavBudgets: function() { window.location.href = "/budgets/webapp/index.html"; },
    onNavTimesheets: function() { window.location.href = "/timesheets/webapp/index.html"; },
    onNavTasks: function() { window.location.href = "/tasks/webapp/index.html"; },
    onNavMilestones: function() { window.location.href = "/milestones/webapp/index.html"; },
    onNavInvoices: function() { window.location.href = "/invoices/webapp/index.html"; },
    onNavAlerts: function() { window.location.href = "/alerts/webapp/index.html"; }
  });
});
