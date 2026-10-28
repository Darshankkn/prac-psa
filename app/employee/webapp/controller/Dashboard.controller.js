sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/m/Dialog",
  "sap/m/Button",
  "sap/m/DatePicker",
  "sap/m/Input",
  "sap/m/Select",
  "sap/ui/core/Item",
  "sap/m/TextArea",
  "sap/m/Label",
  "sap/m/Text",
  "sap/m/VBox"
], function(Controller, MessageToast, MessageBox, Dialog, Button, DatePicker, Input, Select, Item, TextArea, Label, Text, VBox) {
  "use strict";

  return Controller.extend("psasprint.employee.controller.Dashboard", {
    onInit: function() {
      this.loadAllData();
    },

    loadAllData: function() {
      var oModel = this.getOwnerComponent().getModel("emp");
      oModel.setProperty("/busy", true);

      var that = this;
      this._fetchEmployees().then(function(aEmployees) {
        // Find Amit Patel (E003) as default employee with rich dashboard data
        var defaultEmp = aEmployees.find(function(e) {
          return e.EMAIL === "employee@psa.com" || e.EMPLOYEE_CODE === "E003" || e.FULL_NAME === "Amit Patel";
        }) || aEmployees[0];

        var profile = {
          employeeId: defaultEmp.ID,
          employeeCode: defaultEmp.EMPLOYEE_CODE,
          fullName: defaultEmp.FULL_NAME || (defaultEmp.FIRST_NAME + " " + defaultEmp.LAST_NAME),
          email: defaultEmp.EMAIL,
          role: defaultEmp.ROLE,
          department: defaultEmp.DEPARTMENT
        };
        oModel.setProperty("/profile", profile);

        return that._loadEmployeeData(profile.employeeId);
      }).then(function() {
        oModel.setProperty("/busy", false);
      }).catch(function(err) {
        oModel.setProperty("/busy", false);
        console.error("Error loading employee dashboard data:", err);
      });
    },

    onRefresh: function() {
      var oModel = this.getOwnerComponent().getModel("emp");
      var sCurrentId = oModel.getProperty("/profile/employeeId");
      if (sCurrentId) {
        oModel.setProperty("/busy", true);
        this._loadEmployeeData(sCurrentId).then(function() {
          oModel.setProperty("/busy", false);
          MessageToast.show("Employee Dashboard refreshed");
        });
      } else {
        this.loadAllData();
      }
    },

    _fetchEmployees: function() {
      var oModel = this.getOwnerComponent().getModel("emp");
      return fetch("/psa/Employees?$filter=STATUS eq 'ACTIVE'&$orderby=EMPLOYEE_CODE asc", {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load employees");
        return res.json();
      })
      .then(function(data) {
        var items = data.value || [];
        var staff = items.filter(function(e) { return e.ROLE === 'EMPLOYEE' || e.ROLE === 'CONSULTANT'; });
        if (staff.length === 0) staff = items;
        oModel.setProperty("/availableEmployees", staff);
        return staff;
      });
    },

    _loadEmployeeData: function(sEmpId) {
      var that = this;
      return Promise.all([
        that._fetchMyProjects(sEmpId),
        that._fetchMyTimesheets(sEmpId),
        that._fetchMyTasks(sEmpId)
      ]).then(function(results) {
        var aProjects = results[0] || [];
        var aTimesheets = results[1] || [];
        var aTasks = results[2] || [];

        var activeProjects = aProjects.filter(function(p) { return p.status === 'ACTIVE'; }).length;
        var openTimesheets = aTimesheets.filter(function(t) { return t.STATUS === 'DRAFT'; }).length;
        var pendingTasks = aTasks.filter(function(t) { return t.STATUS === 'OPEN' || t.STATUS === 'IN_PROGRESS'; }).length;
        var needsAttention = aTimesheets.filter(function(t) { return t.STATUS === 'REJECTED'; }).length;

        var oModel = that.getOwnerComponent().getModel("emp");
        oModel.setProperty("/kpis", {
          myActiveProjects: activeProjects,
          myOpenTimesheets: openTimesheets,
          myPendingTasks: pendingTasks,
          needsAttention: needsAttention
        });
      });
    },

    onEmployeeChange: function(oEvent) {
      var sEmpId = oEvent.getParameter("selectedItem").getKey();
      var oModel = this.getOwnerComponent().getModel("emp");
      var aEmps = oModel.getProperty("/availableEmployees") || [];
      var oSelectedEmp = aEmps.find(function(e) { return e.ID === sEmpId; });

      if (oSelectedEmp) {
        var profile = {
          employeeId: oSelectedEmp.ID,
          employeeCode: oSelectedEmp.EMPLOYEE_CODE,
          fullName: oSelectedEmp.FULL_NAME || (oSelectedEmp.FIRST_NAME + " " + oSelectedEmp.LAST_NAME),
          email: oSelectedEmp.EMAIL,
          role: oSelectedEmp.ROLE,
          department: oSelectedEmp.DEPARTMENT
        };
        oModel.setProperty("/profile", profile);
        oModel.setProperty("/busy", true);

        var that = this;
        this._loadEmployeeData(sEmpId).then(function() {
          oModel.setProperty("/busy", false);
          MessageToast.show("Switched to employee: " + profile.fullName);
        }).catch(function(err) {
          oModel.setProperty("/busy", false);
          MessageBox.error("Could not load data for " + profile.fullName);
        });
      }
    },

    _fetchMyProjects: function(sEmpId) {
      var oModel = this.getOwnerComponent().getModel("emp");
      var filter = sEmpId ? "?$filter=employee_ID eq " + sEmpId + "&$expand=project($expand=client)" : "?$expand=project($expand=client)";
      return fetch("/psa/ProjectAssignments" + filter, {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load assigned projects");
        return res.json();
      })
      .then(function(data) {
        var items = data.value || [];
        var projects = items.map(function(item) {
          var proj = item.project || {};
          return {
            ID: proj.ID,
            projectCode: proj.PROJECT_CODE,
            projectName: proj.PROJECT_NAME,
            clientName: proj.client ? proj.client.CLIENT_NAME : "",
            billingType: proj.BILLING_TYPE,
            status: proj.STATUS,
            consumedHours: proj.PLANNED_HOURS || 0
          };
        });
        oModel.setProperty("/myProjects", projects);
        return projects;
      });
    },

    _fetchMyTimesheets: function(sEmpId) {
      var oModel = this.getOwnerComponent().getModel("emp");
      var filter = sEmpId ? "?$filter=employee_ID eq " + sEmpId + "&$expand=entries&$orderby=WEEK_START desc" : "?$expand=entries&$orderby=WEEK_START desc";
      return fetch("/psa/Timesheets" + filter, {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load timesheets");
        return res.json();
      })
      .then(function(data) {
        var items = data.value || [];
        oModel.setProperty("/myTimesheets", items);
        return items;
      });
    },

    _fetchMyTasks: function(sEmpId) {
      var oModel = this.getOwnerComponent().getModel("emp");
      var filter = sEmpId ? "?$filter=assignedTo_ID eq " + sEmpId + "&$expand=project&$orderby=DUE_DATE asc" : "?$expand=project&$orderby=DUE_DATE asc";
      return fetch("/psa/Tasks" + filter, {
        headers: { "Accept": "application/json" }
      })
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load tasks");
        return res.json();
      })
      .then(function(data) {
        var items = data.value || [];
        oModel.setProperty("/myTasks", items);
        return items;
      });
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

    formatStatusState: function(sStatus) {
      switch (sStatus) {
        case "ACTIVE": return "Success";
        case "PLANNING": return "Information";
        case "ON_HOLD": return "Warning";
        default: return "None";
      }
    },

    formatTimesheetState: function(sStatus) {
      switch (sStatus) {
        case "APPROVED": return "Success";
        case "SUBMITTED": return "Warning";
        case "REJECTED": return "Error";
        case "DRAFT": return "None";
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

    onOpenCreateTimesheetDialog: function() {
      var that = this;
      var oModel = this.getOwnerComponent().getModel("emp");
      var oProfile = oModel.getProperty("/profile");

      var oDatePicker = new DatePicker({
        displayFormat: "yyyy-MM-dd",
        valueFormat: "yyyy-MM-dd",
        placeholder: "Select Monday of the work week"
      });

      var oDialog = new Dialog({
        title: "Create Weekly Timesheet",
        type: "Message",
        content: new VBox({
          items: [
            new Label({ text: "Reporting Week Starting Date:", required: true }),
            oDatePicker
          ]
        }).addStyleClass("sapUiSmallMargin"),
        beginButton: new Button({
          text: "Create Draft",
          type: "Emphasized",
          press: function() {
            var sWeekStart = oDatePicker.getValue();
            if (!sWeekStart) {
              MessageBox.warning("Please select a week starting date.");
              return;
            }
            oDialog.close();

            fetch("/psa/Timesheets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                WEEK_START: sWeekStart,
                employee_ID: oProfile.employeeId,
                STATUS: "DRAFT"
              })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data.error) throw new Error(data.error.message);
              MessageToast.show("Draft timesheet created for week " + sWeekStart);
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Failed to create timesheet");
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

    onOpenAddEntryDialog: function(oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext("emp");
      var oTimesheet = oContext.getObject();
      var oModel = this.getOwnerComponent().getModel("emp");
      var aProjects = oModel.getProperty("/myProjects") || [];

      var oProjSelect = new Select({ width: "100%" });
      aProjects.forEach(function(p) {
        oProjSelect.addItem(new Item({ key: p.ID, text: p.projectCode + " - " + p.projectName }));
      });

      var oDatePicker = new DatePicker({
        displayFormat: "yyyy-MM-dd",
        valueFormat: "yyyy-MM-dd",
        value: oTimesheet.WEEK_START
      });

      var oHoursInput = new Input({ type: "Number", value: "8.0", placeholder: "Hours (e.g. 8.0)" });
      var oDescInput = new TextArea({ rows: 3, width: "100%", placeholder: "Description of work performed" });

      var oDialog = new Dialog({
        title: "Add Timesheet Entry",
        contentWidth: "400px",
        content: new VBox({
          items: [
            new Label({ text: "Project:", required: true }),
            oProjSelect,
            new Label({ text: "Work Date:", required: true }),
            oDatePicker,
            new Label({ text: "Hours Worked:", required: true }),
            oHoursInput,
            new Label({ text: "Description:" }),
            oDescInput
          ]
        }).addStyleClass("sapUiSmallMargin"),
        beginButton: new Button({
          text: "Add Entry",
          type: "Emphasized",
          press: function() {
            var sProjId = oProjSelect.getSelectedKey();
            var sDate = oDatePicker.getValue();
            var fHours = parseFloat(oHoursInput.getValue());
            var sDesc = oDescInput.getValue();

            if (!sProjId || !sDate || !fHours || fHours <= 0) {
              MessageBox.warning("Please provide a valid project, date, and hours (> 0).");
              return;
            }
            oDialog.close();

            fetch("/psa/TimesheetEntries", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                timesheet_ID: oTimesheet.ID,
                project_ID: sProjId,
                WORK_DATE: sDate,
                HOURS: fHours,
                DESCRIPTION: sDesc
              })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data.error) throw new Error(data.error.message);
              MessageToast.show("Entry added successfully");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Failed to add entry");
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

    onSubmitTimesheet: function(oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext("emp");
      var oTimesheet = oContext.getObject();

      MessageBox.confirm("Submit timesheet for week " + oTimesheet.WEEK_START + " (" + oTimesheet.TOTAL_HOURS + " hours) for manager approval?", {
        title: "Submit Timesheet",
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        onClose: function(sAction) {
          if (sAction === MessageBox.Action.YES) {
            fetch("/psa/submitTimesheet", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ timesheetId: oTimesheet.ID })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              if (data.error) throw new Error(data.error.message);
              MessageToast.show("Timesheet submitted for approval!");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Submission failed");
            });
          }
        }
      });
    },

    // =========================================================================
    // Employee Responsibility: Execute Assigned Tasks & Update Status/Hours
    // =========================================================================
    onOpenUpdateTaskDialog: function(oEvent) {
      var that = this;
      var oContext = oEvent.getSource().getBindingContext("emp");
      var oTask = oContext.getObject();

      var oStatusSelect = new Select({
        width: "100%",
        selectedKey: oTask.STATUS || "OPEN",
        items: [
          new Item({ key: "OPEN", text: "Open / Not Started" }),
          new Item({ key: "IN_PROGRESS", text: "In Progress" }),
          new Item({ key: "COMPLETED", text: "Completed" }),
          new Item({ key: "BLOCKED", text: "Blocked / Waiting" })
        ]
      });

      var oActualHoursInput = new Input({
        width: "100%",
        type: "Number",
        value: String(oTask.ACTUAL_HOURS !== undefined && oTask.ACTUAL_HOURS !== null ? oTask.ACTUAL_HOURS : 0)
      });

      var oDialog = new Dialog({
        title: "Update Task Progress & Status",
        contentWidth: "400px",
        content: new VBox({
          items: [
            new Label({ text: "Deliverable / Task:" }),
            new Text({ text: oTask.TASK_TITLE + (oTask.project ? " (" + oTask.project.PROJECT_NAME + ")" : "") }).addStyleClass("sapUiSmallMarginBottom"),
            new Label({ text: "Execution Status:", required: true }),
            oStatusSelect,
            new Label({ text: "Actual Hours Spent to Date:", required: true, class: "sapUiTinyMarginTop" }),
            oActualHoursInput
          ]
        }).addStyleClass("sapUiSmallMargin"),
        beginButton: new Button({
          text: "Save Updates",
          type: "Emphasized",
          icon: "sap-icon://save",
          press: function() {
            var sNewStatus = oStatusSelect.getSelectedKey();
            var fActualHours = parseFloat(oActualHoursInput.getValue());
            if (isNaN(fActualHours) || fActualHours < 0) {
              MessageBox.warning("Please enter a valid number for actual hours (>= 0).");
              return;
            }

            oDialog.close();

            fetch("/psa/Tasks(" + oTask.ID + ")", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
              },
              body: JSON.stringify({
                STATUS: sNewStatus,
                ACTUAL_HOURS: fActualHours
              })
            })
            .then(function(res) {
              if (!res.ok) {
                return res.json().then(function(err) {
                  throw new Error(err.error?.message || "Failed to update task");
                });
              }
              return res.json().catch(function() { return {}; });
            })
            .then(function() {
              MessageToast.show("Task status updated to '" + sNewStatus + "'");
              that.loadAllData();
            })
            .catch(function(err) {
              MessageBox.error(err.message || "Failed to update task");
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

    onViewProjectDetails: function(oEvent) {
      var oContext = oEvent.getSource().getBindingContext("emp");
      var oProject = oContext.getObject();
      window.location.href = "/projects/webapp/index.html#/Projects(" + oProject.ID + ")";
    },

    onNavProjects: function() { window.location.href = "/projects/webapp/index.html"; },
    onNavTasks: function() { window.location.href = "/tasks/webapp/index.html"; }
  });
});
