// ============================================================================
// PSA Sprint — Service Definition
// Single principal service exposing all business entities, actions, and functions.
// ============================================================================
using { psasprint.db as db } from '../db/schema';

service PSAService @(path: '/psa') @(requires: 'authenticated-user') {

  // -------------------------------------------------------------------------
  // Master Entity Projections
  // -------------------------------------------------------------------------

  @(restrict: [
    { grant: ['READ'],                       to: ['PSA_Employee', 'PSA_Manager', 'PSA_Admin'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'],  to: ['PSA_Manager', 'PSA_Admin'] }
  ])
  entity Clients as projection on db.master.Clients;

  @(restrict: [
    { grant: ['READ'],                       to: ['PSA_Employee', 'PSA_Manager', 'PSA_Admin'] },
    { grant: ['CREATE', 'UPDATE'],            to: ['PSA_Admin'] },
    { grant: ['DELETE'],                      to: ['PSA_Admin'] }
  ])
  entity Employees as projection on db.master.Employees;

  // -------------------------------------------------------------------------
  // Transaction Entity Projections
  // -------------------------------------------------------------------------

  @(restrict: [
    { grant: ['READ'],                       to: ['PSA_Employee', 'PSA_Manager', 'PSA_Admin'] },
    { grant: ['CREATE', 'UPDATE'],            to: ['PSA_Manager', 'PSA_Admin'] },
    { grant: ['DELETE'],                      to: ['PSA_Admin'] }
  ])
  entity Projects as projection on db.transaction.Projects;

  @(restrict: [
    { grant: ['READ'],                       to: ['PSA_Employee', 'PSA_Manager', 'PSA_Admin'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'],  to: ['PSA_Manager', 'PSA_Admin'] }
  ])
  entity ProjectAssignments as projection on db.transaction.ProjectAssignments;

  @(restrict: [
    { grant: ['READ'],                       to: ['PSA_Manager', 'PSA_Admin'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'],  to: ['PSA_Manager', 'PSA_Admin'] }
  ])
  entity Budgets as projection on db.transaction.Budgets;

  @(restrict: [
    { grant: ['READ'],                       to: ['PSA_Employee', 'PSA_Manager', 'PSA_Admin'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'],  to: ['PSA_Manager', 'PSA_Admin'] }
  ])
  entity Milestones as projection on db.transaction.Milestones;

  @(restrict: [
    { grant: ['READ'],                       to: ['PSA_Employee', 'PSA_Manager', 'PSA_Admin'] },
    { grant: ['CREATE', 'DELETE'],            to: ['PSA_Manager', 'PSA_Admin'] },
    { grant: ['UPDATE'],                      to: ['PSA_Employee', 'PSA_Manager', 'PSA_Admin'] }
  ])
  entity Tasks as projection on db.transaction.Tasks;

  @(restrict: [
    { grant: ['READ'],                       to: ['PSA_Employee', 'PSA_Manager', 'PSA_Admin'] },
    { grant: ['CREATE', 'UPDATE'],            to: ['PSA_Employee', 'PSA_Manager', 'PSA_Admin'] },
    { grant: ['DELETE'],                      to: ['PSA_Admin'] }
  ])
  entity Timesheets as projection on db.transaction.Timesheets;

  @(restrict: [
    { grant: ['READ'],                       to: ['PSA_Employee', 'PSA_Manager', 'PSA_Admin'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'],  to: ['PSA_Employee', 'PSA_Manager', 'PSA_Admin'] }
  ])
  entity TimesheetEntries as projection on db.transaction.TimesheetEntries;

  @(restrict: [
    { grant: ['READ'],                       to: ['PSA_Manager', 'PSA_Admin'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'],  to: ['PSA_Admin'] }
  ])
  entity Invoices as projection on db.transaction.Invoices;

  @(restrict: [
    { grant: ['READ'],                       to: ['PSA_Employee', 'PSA_Manager', 'PSA_Admin'] },
    { grant: ['CREATE', 'UPDATE'],            to: ['PSA_Manager', 'PSA_Admin'] },
    { grant: ['DELETE'],                      to: ['PSA_Admin'] }
  ])
  entity Alerts as projection on db.transaction.Alerts;

  // -------------------------------------------------------------------------
  // Dashboard Functions (read-only)
  // -------------------------------------------------------------------------

  /** Returns the 6 KPIs scoped to the manager's authorized projects/team */
  function getManagerDashboard() returns DashboardKPIs;

  /** Returns the 6 KPIs for organization-wide admin view */
  function getAdminDashboard()   returns DashboardKPIs;

  /** Returns the 4 personal KPIs for the authenticated employee */
  function getEmployeeDashboard() returns EmployeeDashboardKPIs;

  /** Returns project portfolio rows for manager dashboard table */
  function getProjectPortfolio() returns array of ProjectPortfolioItem;

  /** Returns projects assigned to the authenticated employee */
  function getMyProjects()       returns array of ProjectPortfolioItem;

  /** Returns the current authenticated user's profile and role */
  function whoAmI()              returns UserProfile;

  // -------------------------------------------------------------------------
  // Timesheet Workflow Actions (state-changing)
  // -------------------------------------------------------------------------

  /** Employee submits a draft timesheet for approval */
  action submitTimesheet(timesheetId : UUID) returns TimesheetActionResult;

  /** Manager approves a submitted timesheet */
  action approveTimesheet(timesheetId : UUID) returns TimesheetActionResult;

  /** Manager rejects a submitted timesheet (reason is mandatory) */
  action rejectTimesheet(timesheetId : UUID, reason : String(500)) returns TimesheetActionResult;

  /** Admin marks an invoice as Issued */
  action markInvoiceIssued(invoiceId : UUID) returns InvoiceActionResult;

  /** Admin marks an issued invoice as Paid */
  action markInvoicePaid(invoiceId : UUID, paidAmount : Decimal(15,2)) returns InvoiceActionResult;

  // -------------------------------------------------------------------------
  // Bulk Create Actions
  // -------------------------------------------------------------------------

  action createBulkEmployees(employees : array of CreateEmployeesIP) returns array of BulkResult;
  action createBulkClients(clients : array of CreateClientsIP)       returns array of BulkResult;
  action createBulkProjects(projects : array of CreateProjectsIP)    returns array of BulkResult;

  // -------------------------------------------------------------------------
  // Return Types
  // -------------------------------------------------------------------------

  /** 6 KPIs shared by Manager and Admin dashboards */
  type DashboardKPIs {
    activeProjects   : Integer;
    atRiskBudgets    : Integer;
    pendingApprovals : Integer;
    unbilledHours    : Decimal(10, 2);
    draftInvoices    : Integer;
    overdueAmount    : Decimal(15, 2);
  }

  /** 4 personal KPIs for Employee dashboard */
  type EmployeeDashboardKPIs {
    myActiveProjects : Integer;
    myOpenTimesheets : Integer;
    myPendingTasks   : Integer;
    needsAttention   : Integer;
  }

  /** Row in the project portfolio table */
  type ProjectPortfolioItem {
    ID             : UUID;
    projectCode    : String(20);
    projectName    : String(100);
    clientName     : String(100);
    billingType    : String(15);
    status         : String(12);
    consumedHours  : Decimal(10, 2);
    budgetTotal    : Decimal(15, 2);
    budgetConsumed : Decimal(15, 2);
    budgetBurn     : Decimal(5, 2);
    budgetStatus   : String(10);
  }

  /** Authenticated user profile */
  type UserProfile {
    employeeId   : UUID;
    employeeCode : String(20);
    fullName     : String(100);
    email        : String(256);
    role         : String(20);
    department   : String(100);
  }

  /** Result of a timesheet workflow action */
  type TimesheetActionResult {
    success : Boolean;
    message : String(500);
    timesheetId : UUID;
    newStatus   : String(12);
  }

  /** Input structure for bulk employee creation */
  type CreateEmployeesIP {
    employeeCode : String(20);
    firstName    : String(100);
    lastName     : String(100);
    email        : String(256);
    phone        : String(30);
    role         : String(20);
    department   : String(100);
  }

  /** Input structure for bulk client creation */
  type CreateClientsIP {
    clientCode    : String(20);
    clientName    : String(100);
    email         : String(256);
    phone         : String(30);
    contactPerson : String(100);
  }

  /** Input structure for bulk project creation */
  type CreateProjectsIP {
    projectCode : String(20);
    projectName : String(100);
    description : String(1000);
    clientId    : UUID;
    managerId   : UUID;
    billingType : String(15);
    startDate   : Date;
    endDate     : Date;
    plannedHours : Decimal(8, 2);
  }

  /** Result item for bulk operations */
  type BulkResult {
    index   : Integer;
    success : Boolean;
    message : String(500);
    id      : UUID;
  }

  /** Result of an invoice status action */
  type InvoiceActionResult {
    success   : Boolean;
    message   : String(500);
    invoiceId : UUID;
    newStatus : String(12);
  }
}
