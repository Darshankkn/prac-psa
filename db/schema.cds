// ============================================================================
// PSA Sprint — Database Schema
// Master and Transaction entities for the PSA application.
// ============================================================================
namespace psasprint.db;

using { psasprint.common as cmn } from './common';
using { cuid } from '@sap/cds/common';

// ===========================================================================
// MASTER CONTEXT — Master-data entities
// ===========================================================================
context master {

  
   // Clients — Customer / client organizations.
   
  entity Clients : cuid, cmn.AuditInfo, cmn.Address {
    CLIENT_CODE    : cmn.Code      @mandatory;
    CLIENT_NAME    : cmn.Name      @mandatory;
    EMAIL          : cmn.Email;
    PHONE          : cmn.PhoneNo;
    CONTACT_PERSON : cmn.Name;
    STATUS         : cmn.ClientStatus default 'ACTIVE';
    // Navigation
    projects       : Association to many transaction.Projects on projects.client = $self;
    invoices       : Association to many transaction.Invoices on invoices.client = $self;
  }

  /**
   * Employees — Staff members with identity mapping.
   * Employee code and email must be unique.
   * ROLE: ADMIN | MANAGER | EMPLOYEE (controlled values).
   * AUTH_ID: maps to the SAP BTP authenticated user identity.
   */
  entity Employees : cuid, cmn.AuditInfo {
    EMPLOYEE_CODE  : cmn.Code      @mandatory;
    FIRST_NAME     : cmn.Name      @mandatory;
    LAST_NAME      : cmn.Name      @mandatory;
    FULL_NAME      : cmn.Name;       // Maintained as FIRST_NAME + ' ' + LAST_NAME
    EMAIL          : cmn.Email     @mandatory;
    PHONE          : cmn.PhoneNo;
    ROLE           : String(20)    default 'EMPLOYEE';  // ADMIN, MANAGER, EMPLOYEE
    DEPARTMENT     : String(100);
    STATUS         : String(10)    default 'ACTIVE';    // ACTIVE, INACTIVE
    AUTH_ID        : String(256);    // SAP BTP identity mapping key
    // Self-referencing manager relationship
    manager        : Association to Employees;
    // Navigation
    assignments    : Association to many transaction.ProjectAssignments
                       on assignments.employee = $self;
    timesheets     : Association to many transaction.Timesheets
                       on timesheets.employee = $self;
    tasks          : Association to many transaction.Tasks
                       on tasks.assignedTo = $self;
  }
}

// ===========================================================================
// TRANSACTION CONTEXT — Business / transactional entities
// ===========================================================================
context transaction {

  /**
   * Projects — Core project entity.
   * Project code must be unique. Must reference a valid client.
   */
  entity Projects : cuid, cmn.AuditInfo, cmn.DateRange {
    PROJECT_CODE   : cmn.Code          @mandatory;
    PROJECT_NAME   : cmn.Name          @mandatory;
    DESCRIPTION    : cmn.Description;
    STATUS         : cmn.ProjectStatus default 'PLANNING';
    BILLING_TYPE   : cmn.BillingType   default 'T_AND_M';
    PLANNED_HOURS  : cmn.Hours;
    // Associations
    client         : Association to master.Clients    @mandatory;
    manager        : Association to master.Employees;
    // Navigation
    budgets        : Association to many Budgets on budgets.project = $self;
    milestones     : Association to many Milestones on milestones.project = $self;
    tasks          : Association to many Tasks on tasks.project = $self;
    assignments    : Association to many ProjectAssignments on assignments.project = $self;
    invoices       : Association to many Invoices on invoices.project = $self;
    timesheetEntries : Association to many TimesheetEntries on timesheetEntries.project = $self;
  }

  /**
   * ProjectAssignments — Many-to-many link between Employees and Projects.
   * Tracks which employees are assigned to which projects.
   */
  entity ProjectAssignments : cuid, cmn.AuditInfo {
    project         : Association to Projects          @mandatory;
    employee        : Association to master.Employees  @mandatory;
    ROLE_ON_PROJECT : String(50);       // e.g., Developer, Lead, Consultant
    ASSIGNED_DATE   : Date;
  }

  /**
   * Budgets — Financial budget tracking per project.
   * Budget amounts must be non-negative. Consumption is tracked for burn calculation.
   */
  entity Budgets : cuid, cmn.AuditInfo {
    BUDGET_CODE     : cmn.Code     @mandatory;
    BUDGET_NAME     : cmn.Name;
    TOTAL_AMOUNT    : cmn.Amount   @mandatory;
    CONSUMED_AMOUNT : cmn.Amount   default 0;
    CURRENCY        : cmn.CurrencyCode default 'INR';
    STATUS          : cmn.BudgetStatus default 'DRAFT';
    PERIOD_START    : Date;
    PERIOD_END      : Date;
    // Associations
    project         : Association to Projects          @mandatory;
    responsible     : Association to master.Employees;
  }

  /**
   * Milestones — Project milestones with due dates and completion tracking.
   */
  entity Milestones : cuid, cmn.AuditInfo {
    MILESTONE_NAME  : cmn.Name     @mandatory;
    DESCRIPTION     : cmn.Description;
    DUE_DATE        : Date         @mandatory;
    STATUS          : String(15)   default 'PENDING'; // PENDING, COMPLETED, OVERDUE
    COMPLETED_DATE  : Date;
    COMPLETION_PCT  : cmn.Percentage default 0;
    // Associations
    project         : Association to Projects          @mandatory;
    responsible     : Association to master.Employees;
  }

  /**
   * Tasks — Work items assigned to employees within a project.
   */
  entity Tasks : cuid, cmn.AuditInfo {
    TASK_TITLE      : cmn.Title    @mandatory;
    DESCRIPTION     : cmn.Description;
    DUE_DATE        : Date;
    STATUS          : cmn.TaskStatus default 'OPEN';
    PRIORITY        : String(10)   default 'MEDIUM';  // LOW, MEDIUM, HIGH, CRITICAL
    ESTIMATED_HOURS : cmn.Hours;
    ACTUAL_HOURS    : cmn.Hours    default 0;
    // Associations
    project         : Association to Projects          @mandatory;
    assignedTo      : Association to master.Employees;
  }

  /**
   * Timesheets — Weekly timesheet header with workflow.
   * Workflow: DRAFT → SUBMITTED → APPROVED | REJECTED → DRAFT (resubmit)
   */
  entity Timesheets : cuid, cmn.AuditInfo {
    WEEK_START       : Date        @mandatory;
    SUBMISSION_DATE  : DateTime;
    STATUS           : cmn.TimesheetStatus default 'DRAFT';
    TOTAL_HOURS      : cmn.Hours   default 0;
    REJECTION_REASON : String(500);
    APPROVED_AT      : DateTime;
    REJECTED_AT      : DateTime;
    // Associations
    employee         : Association to master.Employees  @mandatory;
    approver         : Association to master.Employees;
    // Navigation
    entries          : Association to many TimesheetEntries on entries.timesheet = $self;
  }

  /**
   * TimesheetEntries — Individual time entries within a timesheet.
   * Hours must be > 0, work date must fall within the timesheet's reporting week.
   */
  entity TimesheetEntries : cuid, cmn.AuditInfo {
    WORK_DATE   : Date             @mandatory;
    HOURS       : cmn.Hours        @mandatory;
    DESCRIPTION : cmn.Description;
    // Associations
    timesheet   : Association to Timesheets  @mandatory;
    project     : Association to Projects    @mandatory;
    task        : Association to Tasks;
  }

  /**
   * Invoices — Client invoices with financial amounts.
   * Invoice number must be unique. GROSS = NET + TAX.
   */
  entity Invoices : cuid, cmn.AuditInfo, cmn.AmountFields {
    INVOICE_NUMBER       : String(50) @mandatory;
    INVOICE_DATE         : Date       @mandatory;
    DUE_DATE             : Date       @mandatory;
    STATUS               : cmn.InvoiceStatus default 'DRAFT';
    BILLING_PERIOD_START : Date;
    BILLING_PERIOD_END   : Date;
    PAID_AMOUNT          : cmn.Amount default 0;
    // Associations
    client               : Association to master.Clients  @mandatory;
    project              : Association to Projects;
  }

  /**
   * Alerts — System-generated notifications for business events.
   * Types: BUDGET_RISK, OVERDUE_INVOICE, PENDING_APPROVAL, REJECTED_TIMESHEET,
   *        OVERDUE_TASK, MILESTONE_DUE, GENERAL
   */
  entity Alerts : cuid, cmn.AuditInfo {
    ALERT_TYPE   : String(30)  @mandatory;
    TITLE        : cmn.Title   @mandatory;
    MESSAGE      : String(1000);
    SEVERITY     : String(10)  default 'MEDIUM'; // LOW, MEDIUM, HIGH, CRITICAL
    CREATED_ON   : DateTime    default $now;
    IS_READ      : Boolean     default false;
    IS_RESOLVED  : Boolean     default false;
    RESOLVED_AT  : DateTime;
    // Associations — link to the relevant business entity
    recipient    : Association to master.Employees;
    project      : Association to Projects;
    timesheet    : Association to Timesheets;
    budget       : Association to Budgets;
    invoice      : Association to Invoices;
  }
}
