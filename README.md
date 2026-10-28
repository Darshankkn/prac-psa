# psasprint — Enterprise Professional Services Automation (PSA)

A complete, production-ready enterprise SAP Cloud Application Programming Model (CAP) and SAP Fiori application engineered for deployment on **SAP Business Technology Platform (SAP BTP)** with **SAP HANA Cloud**.

---

## 1. Project Overview

`psasprint` delivers an end-to-end Professional Services Automation (PSA) suite featuring:
- **Three Dedicated Role-Based Dashboards**: Manager, Administrator, and Employee self-service.
- **Nine Dedicated Entity Applications**: Standardized SAP Fiori Elements List Report and Object Pages for every core business entity.
- **Comprehensive Business Logic**: Live metric aggregation, budget burn calculation, strict association checks, and transactional integrity.
- **Auditable Timesheet Workflow**: Complete Draft → Submit → Approve / Reject lifecycle with mandatory rejection feedback and self-approval prevention.
- **Dual-Database Support**: High-performance SQLite for local offline testing and full **SAP HANA Cloud HDI container** deployment for BTP production.

---

## 2. Technology Stack

| Component | Technology | Version / Specification |
|---|---|---|
| **Backend Framework** | SAP Cloud Application Programming Model (CAP) | `@sap/cds` v8+ |
| **Runtime** | Node.js | v20+ / LTS |
| **Service Protocol** | OData V4 | Principal `PSAService` (`/psa/`) |
| **Frontend Framework** | SAPUI5 / SAP Fiori Elements | `1.120.0` with `sap_horizon` theme |
| **UI Architecture** | MVC Pattern (XML Views & Controllers) + CDS Annotations | Fiori Elements for standard entities; XML views for dashboards |
| **Production Database** | SAP HANA Cloud | HDI Container (`@sap/hdi-deploy` v5+, `hdb` driver) |
| **Local Database** | SQLite | In-memory / file-based via `@cap-js/sqlite` |
| **Security & Auth** | SAP BTP XSUAA Service | `@sap/xssec` v4+, `passport` |
| **Deployment Packaging** | Cloud MTA (Multi-Target Application) | Cloud Foundry deployment (`mta.yaml`) |

---

## 3. Project Structure

```text
psasprint/
├── package.json                   # Root manifest, CAP dependencies, scripts, dev users
├── .gitignore                     # Git exclusion rules
├── mta.yaml                       # BTP Cloud Foundry Multi-Target Application descriptor
├── xs-security.json               # XSUAA authorization scopes, templates & collections
├── request.http                   # Integration test suite for all endpoints & workflows
├── README.md                      # Comprehensive technical documentation
├── db/
│   ├── common.cds                 # Reusable types, enums (ClientStatus, etc.), and aspects
│   ├── schema.cds                 # Master & Transaction contexts with CDS associations
│   └── data/                      # Realistic initial seed data in CSV format
│       ├── psasprint.db.master-Clients.csv
│       ├── psasprint.db.master-Employees.csv
│       ├── psasprint.db.transaction-Projects.csv
│       ├── psasprint.db.transaction-ProjectAssignments.csv
│       ├── psasprint.db.transaction-Budgets.csv
│       ├── psasprint.db.transaction-Milestones.csv
│       ├── psasprint.db.transaction-Tasks.csv
│       ├── psasprint.db.transaction-Timesheets.csv
│       ├── psasprint.db.transaction-TimesheetEntries.csv
│       ├── psasprint.db.transaction-Invoices.csv
│       └── psasprint.db.transaction-Alerts.csv
├── srv/
│   ├── psa-service.cds            # Principal PSAService API, actions, functions & restrictions
│   ├── psa-service.js             # Robust backend handlers, validations, KPI aggregations
│   └── annotations.cds            # Complete Fiori Elements UI annotations (LineItems, Facets)
└── app/
    ├── index.html                 # Central Fiori Launchpad / Application Portal
    ├── common/
    │   └── style.css              # Shared Fiori Horizon CSS (budget burn bar, badges)
    ├── manager/                   # Custom Manager Dashboard (XML View + JS Controller)
    ├── admin/                     # Custom Administrator Dashboard (XML View + Controller)
    ├── employee/                  # Custom Employee Dashboard (XML View + Controller)
    ├── clients/                   # Fiori Elements App — Clients
    ├── employees/                 # Fiori Elements App — Employees
    ├── projects/                  # Fiori Elements App — Projects
    ├── budgets/                   # Fiori Elements App — Budgets
    ├── timesheets/                # Fiori Elements App — Timesheets
    ├── tasks/                     # Fiori Elements App — Tasks
    ├── milestones/                # Fiori Elements App — Milestones
    ├── invoices/                  # Fiori Elements App — Invoices
    └── alerts/                    # Fiori Elements App — Alerts
```

---

## 4. Namespace Conventions

All CDS definitions use clean, dedicated namespaces:
- **Common Reusable Definitions**: `psasprint.common` (`db/common.cds`)
- **Database Schema**: `psasprint.db` (`db/schema.cds`)
- **Master Context**: `psasprint.db.master`
- **Transaction Context**: `psasprint.db.transaction`
- **Principal Service**: `PSAService` exposed at path `/psa/`

---

## 5. Database Schema & Entity Relationships

The data model is partitioned into **Master** and **Transaction** contexts in `db/schema.cds`. In accordance with architectural principles, entities use **Associations** (not Compositions) to enforce relational integrity:

```
[Clients] (1) <─────── (N) [Projects] (1) <─────── (N) [Budgets]
                              │   │
     ┌────────────────────────┘   └───────────────┐
     ▼                                            ▼
[Milestones] (N)                             [Tasks] (N)
                                                  │
                                                  ▼
[Employees] (1) <───── (N) [Timesheets] (1) <── (N) [TimesheetEntries]
     │                           ▲
     └────────── (Approver) ─────┘
```

1. **Clients (`master.Clients`)**: Master records with unique `CLIENT_CODE`, addresses, email, phone, contact person, and status.
2. **Employees (`master.Employees`)**: Staff directory with unique `EMPLOYEE_CODE`, email, role (`ADMIN`, `MANAGER`, `EMPLOYEE`), department, status, self-referential manager association, and `AUTH_ID` for BTP identity mapping.
3. **Projects (`transaction.Projects`)**: Core delivery unit linked to `master.Clients` and `manager` (`master.Employees`). Contains unique `PROJECT_CODE`, billing type (`T_AND_M`, `FIXED_PRICE`, `NON_BILLABLE`), status, planned hours, and date range.
4. **ProjectAssignments (`transaction.ProjectAssignments`)**: Explicit many-to-many junction between projects and assigned employees with assigned roles.
5. **Budgets (`transaction.Budgets`)**: Project financial allocations with `TOTAL_AMOUNT`, `CONSUMED_AMOUNT`, currency (`INR` default), and budget status.
6. **Milestones (`transaction.Milestones`)**: Key project deliverables with due dates, completion percentages, and overdue status.
7. **Tasks (`transaction.Tasks`)**: Detailed project work items assigned to employees, with priority, estimated hours, and actual hours.
8. **Timesheets (`transaction.Timesheets`)**: Weekly submission headers linked to employees with workflow state (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`), total hours, rejection reason, and approval timestamps.
9. **TimesheetEntries (`transaction.TimesheetEntries`)**: Granular daily time allocations with work date, hours (0 < hours <= 24), project reference, and task reference.
10. **Invoices (`transaction.Invoices`)**: Client invoices with unique invoice number, dates, net amount, tax amount, calculated gross amount, and payment tracking.
11. **Alerts (`transaction.Alerts`)**: Automated event alerts for budget risks, overdue invoices, pending approvals, and rejected timesheets.

---

## 6. Role & Authorization Model

Access is controlled via declarative `@restrict` annotations in `srv/psa-service.cds` and verified programmatically in `srv/psa-service.js`:

| Role | Business Scope | Permissions |
|---|---|---|
| **PSA_Admin** (`admin@psa.com`) | Organization-Wide | Full Read/Write access across all master data, financial records, employee identities, budgets, invoices, and timesheet approvals. |
| **PSA_Manager** (`manager@psa.com`) | Portfolio & Team Scope | Access to managed projects, associated clients, assigned team members, budget consumption tracking, and timesheet approvals for reporting employees. Cannot self-approve timesheets. |
| **PSA_Employee** (`employee@psa.com`, `emp2@psa.com`) | Self-Service Scope | Access to personal assigned projects, assigned tasks, and personal timesheets (Draft, Add Entries, Submit, View Rejections, Resubmit). Strictly blocked from reading other employees' timesheets or financial budgets. |

---

## 7. Dashboards & Precise KPI Definitions

### 7.1 Manager Dashboard (6 KPIs + Exact Portfolio Table + Approval Queue)
- **Active Projects**: Count of projects with status `ACTIVE` managed by the logged-in manager.
- **At-Risk Budgets**: Count of budgets for managed projects where `(CONSUMED_AMOUNT / TOTAL_AMOUNT) >= 0.80`.
- **Pending Approvals**: Count of timesheets in status `SUBMITTED` belonging to direct report employees.
- **Unbilled Hours**: Sum of approved timesheet entry hours for Time & Material (`T_AND_M`) projects not yet covered by an issued invoice.
- **Draft Invoices**: Count of invoices in status `DRAFT` for managed projects.
- **Overdue Amount**: Total outstanding gross amount on invoices past their `DUE_DATE` for managed projects.

**Project Portfolio Table Restriction Enforcement**:
The Project Portfolio table contains **strictly the 8 required columns**:
1. `Code` (Project Code)
2. `Project` (Project Name with detail navigation link)
3. `Client` (Client Name)
4. `Billing` (Billing Type)
5. `Status` (Status Badge)
6. `Consumed h` (Actual hours worked — plain text)
7. `Budget Burn` (Horizontal Progress Bar with color coding)
8. `Action` (View Project action button)
*(No Planned Hours column, no Hours Burn column, and no progress bar on Consumed Hours).*

### 7.2 Budget Burn Visual Thresholds
Budget Burn is computed dynamically as:
$$\text{Budget Burn (\%)} = \frac{\text{CONSUMED\_AMOUNT}}{\text{TOTAL\_AMOUNT}} \times 100$$
The horizontal progress bar in `app/common/style.css` applies the exact specified color thresholds:
- **Green** (`#2b7c2b`): Budget burn $< 80\%$
- **Amber** (`#e78c07`): Budget burn $\ge 80\%$ and $< 100\%$
- **Red** (`#bb0000`): Budget burn $\ge 100\%$

### 7.3 Admin Dashboard
Displays the same 6 KPIs computed across the **entire organization**, alongside an Entity Management Hub and organization-wide Timesheet Oversight.

### 7.4 Employee Dashboard (4 Personal KPIs + Timesheet Interface)
1. **My Active Projects**: Projects currently assigned to the employee.
2. **My Open Timesheets**: Employee's timesheets in `DRAFT` status.
3. **My Pending Tasks**: Tasks assigned to the employee in `OPEN` or `IN_PROGRESS` status.
4. **Timesheets Needing Attention**: Employee's timesheets in `REJECTED` status requiring revision.

---

## 8. Timesheet Workflow State Machine

The timesheet lifecycle is enforced by backend actions in `srv/psa-service.js`:

```
               ┌───────────────────────┐
               │         DRAFT         │ <──────────────┐
               └───────────┬───────────┘                │
                           │ submitTimesheet            │
                           ▼                            │
               ┌───────────────────────┐                │
               │       SUBMITTED       │                │
               └─────┬───────────┬─────┘                │
   approveTimesheet  │           │ rejectTimesheet      │
                     ▼           ▼                      │
        ┌──────────────┐       ┌──────────────┐         │
        │   APPROVED   │       │   REJECTED   ├─────────┘
        └──────────────┘       └──────────────┘ (edit & resubmit)
```

- **Validation on Submit**: Verifies ownership, ensures at least one entry exists, recalculates total hours, and checks that daily hours do not exceed 24.
- **Approval Constraints**: Prevents self-approval (managers cannot approve their own timesheets). Verifies that the approver is either the designated manager or an administrator.
- **Rejection Constraints**: Requires a mandatory, non-empty rejection reason string. Rejection history is preserved for employee review.

---

## 9. Local Development & Setup

### Prerequisites
- Node.js v20.x or higher
- npm v10.x or higher
- SAP CDS Development Kit (`@sap/cds-dk` v8+)

### Step-by-Step Instructions
1. **Clone / Navigate to Project Directory**:
   ```powershell
   cd c:\Users\Shiva\OneDrive\Desktop\ap\psasprint
   ```
2. **Install Dependencies**:
   ```powershell
   npm install
   ```
3. **Launch Local Server**:
   ```powershell
   npm run dev
   # or
   npx cds watch
   ```
4. **Access Applications in Browser**:
   - **Central Portal**: [http://localhost:4004/index.html](http://localhost:4004/index.html)
   - **Manager Dashboard**: [http://localhost:4004/manager/webapp/index.html](http://localhost:4004/manager/webapp/index.html)
   - **Admin Dashboard**: [http://localhost:4004/admin/webapp/index.html](http://localhost:4004/admin/webapp/index.html)
   - **Employee Dashboard**: [http://localhost:4004/employee/webapp/index.html](http://localhost:4004/employee/webapp/index.html)
   - **Projects App**: [http://localhost:4004/projects/webapp/index.html](http://localhost:4004/projects/webapp/index.html)
   - **OData Service Endpoint**: [http://localhost:4004/psa/](http://localhost:4004/psa/)
   - **OData Metadata ($metadata)**: [http://localhost:4004/psa/$metadata](http://localhost:4004/psa/$metadata)

### Pre-Configured Local Mock Users
| Username | Password | Role / Scope | Full Name |
|---|---|---|---|
| `admin@psa.com` | `admin` | `PSA_Admin` | Rajesh Kumar |
| `manager@psa.com` | `manager` | `PSA_Manager` | Priya Sharma |
| `employee@psa.com` | `employee` | `PSA_Employee` | Amit Patel |
| `emp2@psa.com` | `employee` | `PSA_Employee` | Sneha Reddy |

---

## 10. SAP HANA Cloud Production Configuration & Data Protection

### 10.1 Production Database Target
Production uses **SAP HANA Cloud**. SQLite is strictly isolated to development. In `package.json`, production activates:
```json
"[production]": {
  "db": { "kind": "hana-cloud" },
  "auth": { "kind": "xsuaa" }
}
```

### 10.2 Protection of Existing HANA Instance (`psaa-db`)
> [!IMPORTANT]
> If reusing an existing SAP HANA instance or HDI container previously used by an earlier `psaa` project:
> 1. **Do not run destructive drop/recreate commands.**
> 2. The table naming generated by CAP for `psasprint` uses prefix `PSASPRINT_DB_MASTER_*` and `PSASPRINT_DB_TRANSACTION_*`.
> 3. Inspect existing tables in SAP HANA Database Explorer:
>    ```sql
>    SELECT TABLE_NAME FROM SYS.TABLES WHERE SCHEMA_NAME = CURRENT_SCHEMA;
>    ```
> 4. Ensure any data migration from old `psaa` tables into `psasprint` tables is performed using selective `INSERT INTO ... SELECT FROM` scripts after backing up container data.

### 10.3 Deploying to SAP HANA via MTA
```bash
# 1. Login to Cloud Foundry target
cf login -a <API_ENDPOINT> -o <ORG> -s <SPACE>

# 2. Build production artifacts
npx mbt build

# 3. Deploy Multi-Target Application archive
cf deploy mta_archives/psasprint_1.0.0.mtar
```

---

## 11. Verification & Testing Guide

A complete test script is provided in [`request.http`](file:///request.http). You can execute requests directly using the VS Code REST Client extension or through `curl`:

1. **Verify Identity Mapping**:
   ```bash
   curl -u manager@psa.com:manager http://localhost:4004/psa/whoAmI()
   ```
2. **Verify Manager Dashboard KPIs**:
   ```bash
   curl -u manager@psa.com:manager http://localhost:4004/psa/getManagerDashboard()
   ```
3. **Verify Budget Burn Calculation & Project Portfolio**:
   ```bash
   curl -u manager@psa.com:manager http://localhost:4004/psa/getProjectPortfolio()
   ```
4. **Verify Mandatory Rejection Reason (Must Fail when empty)**:
   ```bash
   curl -X POST -u manager@psa.com:manager -H "Content-Type: application/json" \
     -d '{"timesheetId":"55555555-5555-5555-5555-555555555505","reason":""}' \
     http://localhost:4004/psa/rejectTimesheet
   # Returns 400 Bad Request: Rejection reason is mandatory
   ```
5. **Verify Self-Approval Prevention**:
   ```bash
   curl -X POST -u employee@psa.com:employee -H "Content-Type: application/json" \
     -d '{"timesheetId":"55555555-5555-5555-5555-555555555501"}' \
     http://localhost:4004/psa/approveTimesheet
   # Returns 403 Forbidden: Self-approval not permitted
   ```

---

## 12. File Editing Guide for Future Maintenance

| What You Want to Change | File to Edit |
|---|---|
| Database entity fields, types, enums | `db/common.cds` & `db/schema.cds` |
| Service exposed endpoints, actions, roles | `srv/psa-service.cds` |
| Business rules, validations, KPI queries | `srv/psa-service.js` |
| Fiori Elements tables, filters, facets | `srv/annotations.cds` |
| Manager, Admin, or Employee Dashboard layout | `app/<manager|admin|employee>/webapp/view/Dashboard.view.xml` |
| Dashboard controllers & interaction logic | `app/<manager|admin|employee>/webapp/controller/Dashboard.controller.js` |
| Progress bar colors, badges, styles | `app/common/style.css` |
| BTP Cloud Foundry deployment resources | `mta.yaml` & `xs-security.json` |
| Initial test data / seed records | `db/data/psasprint.db.*.csv` |
