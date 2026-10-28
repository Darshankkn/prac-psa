// ============================================================================
// PSA Sprint — Common Definitions
// Reusable types, enumerations, and aspects for the PSA application.
// ============================================================================
namespace psasprint.common;

using { managed, cuid } from '@sap/cds/common';

// ---------------------------------------------------------------------------
// Reusable Data Types
// ---------------------------------------------------------------------------

type Guid     : UUID;
type Name     : String(100);
type Code     : String(20);
type Title    : String(200);
type Description : String(1000);
type Email    : String(256);
type PhoneNo  : String(30);
type CurrencyCode : String(3);
type Amount   : Decimal(15, 2);
type Hours    : Decimal(8, 2);
type Percentage : Decimal(5, 2);

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/**
 * ClientStatus — Lifecycle state of a client.
 *   ACTIVE   — Currently engaged; available for new projects.
 *   INACTIVE — No longer actively engaged.
 *   PROSPECT — Potential client, not yet onboarded.
 *   BLOCKED  — Blocked from new business (e.g., payment issues).
 */
type ClientStatus : String(10) enum {
  Active   = 'ACTIVE';
  Inactive = 'INACTIVE';
  Prospect = 'PROSPECT';
  Blocked  = 'BLOCKED';
};

/**
 * ProjectStatus — Lifecycle state of a project.
 *   PLANNING   — Project being planned; not yet started.
 *   ACTIVE     — Work is in progress.
 *   ON_HOLD    — Temporarily paused.
 *   COMPLETED  — All deliverables met; project closed.
 *   CANCELLED  — Project terminated before completion.
 */
type ProjectStatus : String(12) enum {
  Planning  = 'PLANNING';
  Active    = 'ACTIVE';
  OnHold    = 'ON_HOLD';
  Completed = 'COMPLETED';
  Cancelled = 'CANCELLED';
};

/**
 * BillingType — How a project is billed.
 *   T_AND_M      — Time and Material: billed per hour worked.
 *   FIXED_PRICE  — Fixed Price: billed at agreed milestones/amounts.
 *   NON_BILLABLE — Internal/non-billable project.
 */
type BillingType : String(15) enum {
  TimeAndMaterial = 'T_AND_M';
  FixedPrice      = 'FIXED_PRICE';
  NonBillable     = 'NON_BILLABLE';
};

/**
 * BudgetStatus — State of a project budget.
 *   DRAFT    — Budget created but not yet approved.
 *   APPROVED — Budget approved and active.
 *   EXCEEDED — Consumption has exceeded the budget.
 *   CLOSED   — Budget period closed.
 */
type BudgetStatus : String(10) enum {
  Draft    = 'DRAFT';
  Approved = 'APPROVED';
  Exceeded = 'EXCEEDED';
  Closed   = 'CLOSED';
};

/**
 * TaskStatus — Lifecycle state of a task.
 *   OPEN        — Task created, not started.
 *   IN_PROGRESS — Work has begun.
 *   COMPLETED   — Task finished.
 *   BLOCKED     — Blocked by a dependency or issue.
 *   CANCELLED   — Task no longer needed.
 */
type TaskStatus : String(15) enum {
  Open       = 'OPEN';
  InProgress = 'IN_PROGRESS';
  Completed  = 'COMPLETED';
  Blocked    = 'BLOCKED';
  Cancelled  = 'CANCELLED';
};

/**
 * TimesheetStatus — Workflow state of a timesheet.
 *   Permitted transitions:
 *     DRAFT → SUBMITTED → APPROVED
 *                       → REJECTED → DRAFT (resubmission)
 *   DRAFT      — Being prepared; editable.
 *   SUBMITTED  — Sent for approval; locked for employee edits.
 *   APPROVED   — Approved by manager; hours count for billing.
 *   REJECTED   — Returned with mandatory reason; employee may correct & resubmit.
 */
type TimesheetStatus : String(12) enum {
  Draft     = 'DRAFT';
  Submitted = 'SUBMITTED';
  Approved  = 'APPROVED';
  Rejected  = 'REJECTED';
};

/**
 * InvoiceStatus — Lifecycle state of an invoice.
 *   DRAFT     — Being prepared; not yet sent.
 *   ISSUED    — Sent to client.
 *   PAID      — Payment received in full.
 *   OVERDUE   — Past due date without full payment.
 *   CANCELLED — Invoice voided.
 */
type InvoiceStatus : String(12) enum {
  Draft     = 'DRAFT';
  Issued    = 'ISSUED';
  Paid      = 'PAID';
  Overdue   = 'OVERDUE';
  Cancelled = 'CANCELLED';
};

// ---------------------------------------------------------------------------
// Reusable Aspects
// ---------------------------------------------------------------------------

// AuditInfo — Tracks who created/modified each record.
aspect AuditInfo : managed {}

/**
 * Address — Postal address fields, reused by Clients and Employees.
 */
aspect Address {
  STREET   : String(200);
  CITY     : String(100);
  STATE    : String(100);
  COUNTRY  : String(100);
  ZIP_CODE : String(20);
}

/**
 * AmountFields — Standard financial amount breakdown.
 * GROSS = NET + TAX.  Default currency is INR.
 */
aspect AmountFields {
  NET_AMOUNT   : Amount;
  TAX_AMOUNT   : Amount;
  GROSS_AMOUNT : Amount;
  CURRENCY     : CurrencyCode default 'INR';
}

/**
 * DateRange — Start and end date pair, reused by Projects, Budgets, etc.
 */
aspect DateRange {
  START_DATE : Date;
  END_DATE   : Date;
}
