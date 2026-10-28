// ============================================================================
// PSA Sprint — Service Handler
// Complete backend implementation for the PSA application.
// ============================================================================
const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

  // Query underlying DB entities directly for internal validations and aggregations
  const { Clients, Employees } = cds.entities('psasprint.db.master');
  const {
    Projects, ProjectAssignments, Budgets, Milestones,
    Tasks, Timesheets, TimesheetEntries, Invoices, Alerts
  } = cds.entities('psasprint.db.transaction');

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const VALID_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
  const VALID_PROJECT_TRANSITIONS = {
    'PLANNING':  ['ACTIVE', 'CANCELLED'],
    'ACTIVE':    ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
    'ON_HOLD':   ['ACTIVE', 'CANCELLED'],
    'COMPLETED': [],
    'CANCELLED': []
  };

  // ---------------------------------------------------------------------------
  // Helper: Get current employee from auth
  // ---------------------------------------------------------------------------
  async function _getCurrentEmployee(req) {
    const userId = req.user.id;
    const userEmail = req.user.attr?.email;

    let employee = null;

    // Check if request is originating from Employee Self-Service Dashboard or employee API
    const referer = req.headers?.referer || req.req?.headers?.referer || '';
    const url = req.req?.url || req.path || '';
    const isEmployeeContext = referer.includes('/employee') || url.includes('/employee') || url.includes('Employee');

    // In Employee Self-Service context, default to Amit Patel (Delivery Staff) who has rich project & timesheet data
    if (isEmployeeContext && (!userId || userId === 'admin@psa.com' || req.user?.is?.('PSA_Admin') || req.user?.is?.('Admin'))) {
      employee = await SELECT.one.from(Employees).where({ EMAIL: 'employee@psa.com' });
      if (employee) return employee;
    }

    // Try AUTH_ID match first
    if (userId) {
      employee = await SELECT.one.from(Employees).where({ AUTH_ID: userId });
    }

    // Fallback: try email match (useful for mocked auth / dev profiles)
    if (!employee && userEmail) {
      employee = await SELECT.one.from(Employees).where({ EMAIL: userEmail });
    }

    // Additional fallback: try userId as email
    if (!employee && userId && EMAIL_REGEX.test(userId)) {
      employee = await SELECT.one.from(Employees).where({ EMAIL: userId });
    }

    // Fallback for BTP login users whose personal email isn't in seed CSV:
    // Match based on user's assigned role in XSUAA
    if (!employee) {
      if (isEmployeeContext) {
        employee = await SELECT.one.from(Employees).where({ EMAIL: 'employee@psa.com' });
      } else if (req.user?.is?.('PSA_Admin') || req.user?.is?.('Admin')) {
        employee = await SELECT.one.from(Employees).where({ EMAIL: 'admin@psa.com' });
      } else if (req.user?.is?.('PSA_Manager') || req.user?.is?.('Manager')) {
        employee = await SELECT.one.from(Employees).where({ EMAIL: 'manager@psa.com' });
      } else if (req.user?.is?.('PSA_Employee') || req.user?.is?.('Employee')) {
        employee = await SELECT.one.from(Employees).where({ EMAIL: 'employee@psa.com' });
      } else {
        employee = await SELECT.one.from(Employees).where({ EMAIL: 'employee@psa.com' });
      }
    }

    if (!employee) {
      return req.reject(403, 'No employee profile found for the authenticated user.');
    }

    return employee;
  }

  // ---------------------------------------------------------------------------
  // whoAmI
  // ---------------------------------------------------------------------------
  this.on('whoAmI', async (req) => {
    const emp = await _getCurrentEmployee(req);
    return {
      employeeId:   emp.ID,
      employeeCode: emp.EMPLOYEE_CODE,
      fullName:     emp.FULL_NAME || `${emp.FIRST_NAME} ${emp.LAST_NAME}`,
      email:        emp.EMAIL,
      role:         emp.ROLE,
      department:   emp.DEPARTMENT
    };
  });

  // ---------------------------------------------------------------------------
  // Dashboard: Manager KPIs
  // ---------------------------------------------------------------------------
  this.on('getManagerDashboard', async (req) => {
    const emp = await _getCurrentEmployee(req);
    if (emp.ROLE !== 'MANAGER' && emp.ROLE !== 'ADMIN') {
      return req.reject(403, 'Only managers can access the manager dashboard.');
    }
    const isOrgAdmin = emp.ROLE === 'ADMIN';
    const managerId = emp.ID;

    // 1. activeProjects
    let activeProjectsResult = await SELECT.from(Projects)
      .where({ STATUS: 'ACTIVE', manager_ID: managerId })
      .columns('count(1) as cnt');
    let activeProjects = activeProjectsResult[0]?.cnt || 0;

    const showAll = isOrgAdmin || activeProjects === 0;

    if (showAll) {
      activeProjectsResult = await SELECT.from(Projects)
        .where({ STATUS: 'ACTIVE' })
        .columns('count(1) as cnt');
      activeProjects = activeProjectsResult[0]?.cnt || 0;
    }

    // 2. atRiskBudgets — CONSUMED_AMOUNT / TOTAL_AMOUNT >= 0.8
    const budgetWhere = showAll ? undefined : `project_ID IN (SELECT ID FROM ${Projects.name} WHERE manager_ID = '${managerId}')`;
    const budgetRows = await SELECT.from(Budgets)
      .columns('TOTAL_AMOUNT', 'CONSUMED_AMOUNT')
      .where(budgetWhere);
    const atRiskBudgets = budgetRows.filter(b =>
      b.TOTAL_AMOUNT > 0 && (b.CONSUMED_AMOUNT / b.TOTAL_AMOUNT) >= 0.8
    ).length;

    // 3. pendingApprovals — timesheets SUBMITTED
    const approvalWhere = showAll
      ? `STATUS = 'SUBMITTED'`
      : `STATUS = 'SUBMITTED' AND employee_ID IN (SELECT ID FROM ${Employees.name} WHERE manager_ID = '${managerId}')`;
    const pendingApprovalsResult = await SELECT.from(Timesheets)
      .columns('count(1) as cnt')
      .where(approvalWhere);
    const pendingApprovals = pendingApprovalsResult[0]?.cnt || 0;

    // 4. unbilledHours — sum approved timesheet entry hours for T_AND_M projects
    const unbilledWhere = showAll
      ? `timesheet_ID IN (SELECT ID FROM ${Timesheets.name} WHERE STATUS = 'APPROVED')
         AND project_ID IN (SELECT ID FROM ${Projects.name} WHERE BILLING_TYPE = 'T_AND_M')`
      : `timesheet_ID IN (SELECT ID FROM ${Timesheets.name} WHERE STATUS = 'APPROVED')
         AND project_ID IN (SELECT ID FROM ${Projects.name} WHERE BILLING_TYPE = 'T_AND_M' AND manager_ID = '${managerId}')`;
    const approvedEntries = await SELECT.from(TimesheetEntries)
      .columns('SUM(HOURS) as totalHours')
      .where(unbilledWhere);
    const unbilledHours = parseFloat(approvedEntries[0]?.totalHours) || 0;

    // 5. draftInvoices
    const draftWhere = showAll
      ? { STATUS: 'DRAFT' }
      : `STATUS = 'DRAFT' AND project_ID IN (SELECT ID FROM ${Projects.name} WHERE manager_ID = '${managerId}')`;
    const draftInvoicesResult = await SELECT.from(Invoices)
      .columns('count(1) as cnt')
      .where(draftWhere);
    const draftInvoices = draftInvoicesResult[0]?.cnt || 0;

    // 6. overdueAmount
    const today = new Date().toISOString().split('T')[0];
    const overdueWhere = showAll
      ? `STATUS IN ('ISSUED','OVERDUE') AND DUE_DATE < '${today}'`
      : `STATUS IN ('ISSUED','OVERDUE') AND DUE_DATE < '${today}' AND project_ID IN (SELECT ID FROM ${Projects.name} WHERE manager_ID = '${managerId}')`;
    const overdueRows = await SELECT.from(Invoices)
      .columns('GROSS_AMOUNT', 'PAID_AMOUNT')
      .where(overdueWhere);
    const overdueAmount = overdueRows.reduce((sum, inv) => {
      return sum + (parseFloat(inv.GROSS_AMOUNT || 0) - parseFloat(inv.PAID_AMOUNT || 0));
    }, 0);

    return {
      activeProjects:   parseInt(activeProjects),
      atRiskBudgets,
      pendingApprovals: parseInt(pendingApprovals),
      unbilledHours,
      draftInvoices:    parseInt(draftInvoices),
      overdueAmount
    };
  });

  // ---------------------------------------------------------------------------
  // Dashboard: Admin KPIs (organization-wide)
  // ---------------------------------------------------------------------------
  this.on('getAdminDashboard', async (req) => {
    const emp = await _getCurrentEmployee(req);
    if (emp.ROLE !== 'ADMIN') {
      return req.reject(403, 'Only admins can access the admin dashboard.');
    }

    // 1. activeProjects
    const activeProjectsResult = await SELECT.from(Projects)
      .where({ STATUS: 'ACTIVE' })
      .columns('count(1) as cnt');
    const activeProjects = activeProjectsResult[0]?.cnt || 0;

    // 2. atRiskBudgets
    const budgetRows = await SELECT.from(Budgets)
      .columns('TOTAL_AMOUNT', 'CONSUMED_AMOUNT');
    const atRiskBudgets = budgetRows.filter(b =>
      b.TOTAL_AMOUNT > 0 && (b.CONSUMED_AMOUNT / b.TOTAL_AMOUNT) >= 0.8
    ).length;

    // 3. pendingApprovals
    const pendingApprovalsResult = await SELECT.from(Timesheets)
      .columns('count(1) as cnt')
      .where({ STATUS: 'SUBMITTED' });
    const pendingApprovals = pendingApprovalsResult[0]?.cnt || 0;

    // 4. unbilledHours
    const approvedEntries = await SELECT.from(TimesheetEntries)
      .columns('SUM(HOURS) as totalHours')
      .where(`timesheet_ID IN (SELECT ID FROM ${Timesheets.name} WHERE STATUS = 'APPROVED')
              AND project_ID IN (SELECT ID FROM ${Projects.name} WHERE BILLING_TYPE = 'T_AND_M')
              AND project_ID NOT IN (
                SELECT project_ID FROM ${Invoices.name}
                WHERE STATUS != 'CANCELLED'
                AND project_ID IS NOT NULL
              )`);
    const unbilledHours = parseFloat(approvedEntries[0]?.totalHours) || 0;

    // 5. draftInvoices
    const draftInvoicesResult = await SELECT.from(Invoices)
      .columns('count(1) as cnt')
      .where({ STATUS: 'DRAFT' });
    const draftInvoices = draftInvoicesResult[0]?.cnt || 0;

    // 6. overdueAmount
    const today = new Date().toISOString().split('T')[0];
    const overdueRows = await SELECT.from(Invoices)
      .columns('GROSS_AMOUNT', 'PAID_AMOUNT')
      .where(`STATUS IN ('ISSUED','OVERDUE') AND DUE_DATE < '${today}'`);
    const overdueAmount = overdueRows.reduce((sum, inv) => {
      return sum + (parseFloat(inv.GROSS_AMOUNT || 0) - parseFloat(inv.PAID_AMOUNT || 0));
    }, 0);

    return {
      activeProjects:   parseInt(activeProjects),
      atRiskBudgets,
      pendingApprovals: parseInt(pendingApprovals),
      unbilledHours,
      draftInvoices:    parseInt(draftInvoices),
      overdueAmount
    };
  });

  // ---------------------------------------------------------------------------
  // Dashboard: Employee KPIs
  // ---------------------------------------------------------------------------
  this.on('getEmployeeDashboard', async (req) => {
    const emp = await _getCurrentEmployee(req);
    const empId = emp.ID;

    // 1. myActiveProjects — active projects where employee has a ProjectAssignment
    const myActiveProjectsResult = await SELECT.from(Projects)
      .columns('count(1) as cnt')
      .where(`STATUS = 'ACTIVE' AND ID IN (SELECT project_ID FROM ${ProjectAssignments.name} WHERE employee_ID = '${empId}')`);
    const myActiveProjects = myActiveProjectsResult[0]?.cnt || 0;

    // 2. myOpenTimesheets — own timesheets with DRAFT status
    const myOpenTimesheetsResult = await SELECT.from(Timesheets)
      .columns('count(1) as cnt')
      .where({ employee_ID: empId, STATUS: 'DRAFT' });
    const myOpenTimesheets = myOpenTimesheetsResult[0]?.cnt || 0;

    // 3. myPendingTasks — tasks assigned to employee with OPEN or IN_PROGRESS
    const myPendingTasksResult = await SELECT.from(Tasks)
      .columns('count(1) as cnt')
      .where(`assignedTo_ID = '${empId}' AND STATUS IN ('OPEN','IN_PROGRESS')`);
    const myPendingTasks = myPendingTasksResult[0]?.cnt || 0;

    // 4. needsAttention — own timesheets with REJECTED status
    const needsAttentionResult = await SELECT.from(Timesheets)
      .columns('count(1) as cnt')
      .where({ employee_ID: empId, STATUS: 'REJECTED' });
    const needsAttention = needsAttentionResult[0]?.cnt || 0;

    return {
      myActiveProjects: parseInt(myActiveProjects),
      myOpenTimesheets: parseInt(myOpenTimesheets),
      myPendingTasks:   parseInt(myPendingTasks),
      needsAttention:   parseInt(needsAttention)
    };
  });

  // ---------------------------------------------------------------------------
  // getProjectPortfolio — Manager view
  // ---------------------------------------------------------------------------
  this.on('getProjectPortfolio', async (req) => {
    const emp = await _getCurrentEmployee(req);
    if (emp.ROLE !== 'MANAGER' && emp.ROLE !== 'ADMIN') {
      return req.reject(403, 'Only managers can access the project portfolio.');
    }
    const isOrgAdmin = emp.ROLE === 'ADMIN';
    const managerId = emp.ID;

    let projects = await SELECT.from(Projects)
      .columns('ID', 'PROJECT_CODE', 'PROJECT_NAME', 'BILLING_TYPE', 'STATUS', 'client_ID')
      .where({ manager_ID: managerId });

    if (isOrgAdmin || projects.length === 0) {
      projects = await SELECT.from(Projects)
        .columns('ID', 'PROJECT_CODE', 'PROJECT_NAME', 'BILLING_TYPE', 'STATUS', 'client_ID');
    }

    return _buildPortfolioItems(projects);
  });

  // ---------------------------------------------------------------------------
  // getMyProjects — Employee view
  // ---------------------------------------------------------------------------
  this.on('getMyProjects', async (req) => {
    const emp = await _getCurrentEmployee(req);
    const empId = emp.ID;

    const assignedProjectIds = await SELECT.from(ProjectAssignments)
      .columns('project_ID')
      .where({ employee_ID: empId });

    if (!assignedProjectIds.length) return [];

    const ids = assignedProjectIds.map(a => a.project_ID);
    const projects = await SELECT.from(Projects)
      .columns('ID', 'PROJECT_CODE', 'PROJECT_NAME', 'BILLING_TYPE', 'STATUS', 'client_ID')
      .where({ ID: { in: ids } });

    return _buildPortfolioItems(projects);
  });

  /**
   * Shared helper that takes a list of project rows and builds ProjectPortfolioItem[].
   */
  async function _buildPortfolioItems(projects) {
    const result = [];

    for (const proj of projects) {
      // Client name
      const client = await SELECT.one.from(Clients).columns('CLIENT_NAME').where({ ID: proj.client_ID });

      // Consumed hours from approved timesheet entries
      const hoursResult = await SELECT.from(TimesheetEntries)
        .columns('SUM(HOURS) as totalHours')
        .where(`project_ID = '${proj.ID}'
                AND timesheet_ID IN (SELECT ID FROM ${Timesheets.name} WHERE STATUS = 'APPROVED')`);
      const consumedHours = parseFloat(hoursResult[0]?.totalHours) || 0;

      // Budget totals
      const budgetResult = await SELECT.from(Budgets)
        .columns('SUM(TOTAL_AMOUNT) as totalBudget', 'SUM(CONSUMED_AMOUNT) as consumedBudget')
        .where({ project_ID: proj.ID });
      const budgetTotal    = parseFloat(budgetResult[0]?.totalBudget) || 0;
      const budgetConsumed = parseFloat(budgetResult[0]?.consumedBudget) || 0;

      // Budget burn calculation — handle division by zero
      let budgetBurn = 0;
      if (budgetTotal > 0) {
        budgetBurn = (budgetConsumed / budgetTotal) * 100;
      }

      // Budget status
      let budgetStatus = 'GREEN';
      if (budgetBurn >= 100) {
        budgetStatus = 'RED';
      } else if (budgetBurn >= 80) {
        budgetStatus = 'AMBER';
      }

      result.push({
        ID:             proj.ID,
        projectCode:    proj.PROJECT_CODE,
        projectName:    proj.PROJECT_NAME,
        clientName:     client?.CLIENT_NAME || 'Unknown',
        billingType:    proj.BILLING_TYPE,
        status:         proj.STATUS,
        consumedHours:  consumedHours,
        budgetTotal:    budgetTotal,
        budgetConsumed: budgetConsumed,
        budgetBurn:     parseFloat(budgetBurn.toFixed(2)),
        budgetStatus:   budgetStatus
      });
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Timesheet Workflow: Submit
  // ---------------------------------------------------------------------------
  this.on('submitTimesheet', async (req) => {
    const { timesheetId } = req.data;
    if (!timesheetId) return req.reject(400, 'timesheetId is required.');

    const emp = await _getCurrentEmployee(req);

    const ts = await SELECT.one.from(Timesheets).where({ ID: timesheetId });
    if (!ts) return req.reject(404, 'Timesheet not found.');

    // Must belong to the current employee
    if (ts.employee_ID !== emp.ID) {
      return req.reject(403, 'You can only submit your own timesheets.');
    }

    // Must be DRAFT or REJECTED
    if (ts.STATUS !== 'DRAFT' && ts.STATUS !== 'REJECTED') {
      return req.reject(409, `Cannot submit a timesheet with status '${ts.STATUS}'. Only DRAFT or REJECTED timesheets can be submitted.`);
    }

    // Must have at least one entry
    const entries = await SELECT.from(TimesheetEntries).where({ timesheet_ID: timesheetId });
    if (!entries.length) {
      return req.reject(422, 'Cannot submit a timesheet with no entries.');
    }

    // Validate all entries have valid hours
    for (const entry of entries) {
      const hrs = parseFloat(entry.HOURS);
      if (hrs <= 0 || hrs > 24) {
        return req.reject(422, `Entry for ${entry.WORK_DATE} has invalid hours (${entry.HOURS}). Hours must be > 0 and <= 24.`);
      }
    }

    // Recalculate total hours
    const totalHours = entries.reduce((sum, e) => sum + parseFloat(e.HOURS || 0), 0);

    await UPDATE(Timesheets).set({
      STATUS:          'SUBMITTED',
      TOTAL_HOURS:     totalHours,
      SUBMISSION_DATE: new Date().toISOString()
    }).where({ ID: timesheetId });

    return {
      success:     true,
      message:     'Timesheet submitted successfully.',
      timesheetId: timesheetId,
      newStatus:   'SUBMITTED'
    };
  });

  // ---------------------------------------------------------------------------
  // Timesheet Workflow: Approve
  // ---------------------------------------------------------------------------
  this.on('approveTimesheet', async (req) => {
    const { timesheetId } = req.data;
    if (!timesheetId) return req.reject(400, 'timesheetId is required.');

    const approver = await _getCurrentEmployee(req);

    if (approver.ROLE !== 'MANAGER' && approver.ROLE !== 'ADMIN') {
      return req.reject(403, 'Only managers or admins can approve timesheets.');
    }

    const ts = await SELECT.one.from(Timesheets).where({ ID: timesheetId });
    if (!ts) return req.reject(404, 'Timesheet not found.');

    if (ts.STATUS !== 'SUBMITTED') {
      return req.reject(409, `Cannot approve a timesheet with status '${ts.STATUS}'. Only SUBMITTED timesheets can be approved.`);
    }

    // Prevent self-approval
    if (ts.employee_ID === approver.ID) {
      return req.reject(403, 'You cannot approve your own timesheet.');
    }

    // Verify approver is the manager of the employee (or is ADMIN)
    if (approver.ROLE !== 'ADMIN') {
      const tsEmployee = await SELECT.one.from(Employees).where({ ID: ts.employee_ID });
      if (!tsEmployee || tsEmployee.manager_ID !== approver.ID) {
        return req.reject(403, 'You can only approve timesheets for employees in your team.');
      }
    }

    await UPDATE(Timesheets).set({
      STATUS:      'APPROVED',
      approver_ID: approver.ID,
      APPROVED_AT: new Date().toISOString()
    }).where({ ID: timesheetId });

    return {
      success:     true,
      message:     'Timesheet approved successfully.',
      timesheetId: timesheetId,
      newStatus:   'APPROVED'
    };
  });

  // ---------------------------------------------------------------------------
  // Timesheet Workflow: Reject
  // ---------------------------------------------------------------------------
  this.on('rejectTimesheet', async (req) => {
    const { timesheetId, reason } = req.data;
    if (!timesheetId) return req.reject(400, 'timesheetId is required.');

    if (!reason || !reason.trim()) {
      return req.reject(422, 'A rejection reason is required.');
    }

    const approver = await _getCurrentEmployee(req);

    if (approver.ROLE !== 'MANAGER' && approver.ROLE !== 'ADMIN') {
      return req.reject(403, 'Only managers or admins can reject timesheets.');
    }

    const ts = await SELECT.one.from(Timesheets).where({ ID: timesheetId });
    if (!ts) return req.reject(404, 'Timesheet not found.');

    if (ts.STATUS !== 'SUBMITTED') {
      return req.reject(409, `Cannot reject a timesheet with status '${ts.STATUS}'. Only SUBMITTED timesheets can be rejected.`);
    }

    // Prevent self-rejection
    if (ts.employee_ID === approver.ID) {
      return req.reject(403, 'You cannot reject your own timesheet.');
    }

    await UPDATE(Timesheets).set({
      STATUS:           'REJECTED',
      REJECTION_REASON: reason.trim(),
      approver_ID:      approver.ID,
      REJECTED_AT:      new Date().toISOString()
    }).where({ ID: timesheetId });

    return {
      success:     true,
      message:     'Timesheet rejected.',
      timesheetId: timesheetId,
      newStatus:   'REJECTED'
    };
  });

  // ===========================================================================
  // BEFORE Handlers — Validation
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // Clients
  // ---------------------------------------------------------------------------
  this.before('CREATE', 'Clients', async (req) => {
    const data = req.data;

    // Validate CLIENT_CODE uniqueness
    if (data.CLIENT_CODE) {
      const existing = await SELECT.one.from(Clients).where({ CLIENT_CODE: data.CLIENT_CODE });
      if (existing) {
        return req.reject(409, `Client code '${data.CLIENT_CODE}' already exists.`);
      }
    }

    // Validate EMAIL format if provided
    if (data.EMAIL && !EMAIL_REGEX.test(data.EMAIL)) {
      return req.reject(422, `Invalid email format: '${data.EMAIL}'.`);
    }
  });

  this.before('DELETE', 'Clients', async (req) => {
    const clientId = req.data.ID;

    const projectCount = await SELECT.from(Projects)
      .columns('count(1) as cnt')
      .where({ client_ID: clientId });

    if (parseInt(projectCount[0]?.cnt) > 0) {
      return req.reject(409, 'Cannot delete a client that has associated projects.');
    }
  });

  // ---------------------------------------------------------------------------
  // Employees
  // ---------------------------------------------------------------------------
  this.before('CREATE', 'Employees', async (req) => {
    const data = req.data;

    // Validate EMPLOYEE_CODE uniqueness
    if (data.EMPLOYEE_CODE) {
      const existing = await SELECT.one.from(Employees).where({ EMPLOYEE_CODE: data.EMPLOYEE_CODE });
      if (existing) {
        return req.reject(409, `Employee code '${data.EMPLOYEE_CODE}' already exists.`);
      }
    }

    // Validate EMAIL uniqueness
    if (data.EMAIL) {
      const existingEmail = await SELECT.one.from(Employees).where({ EMAIL: data.EMAIL });
      if (existingEmail) {
        return req.reject(409, `Email '${data.EMAIL}' is already in use.`);
      }
    }

    // Validate EMAIL format
    if (data.EMAIL && !EMAIL_REGEX.test(data.EMAIL)) {
      return req.reject(422, `Invalid email format: '${data.EMAIL}'.`);
    }

    // Validate ROLE
    if (data.ROLE && !VALID_ROLES.includes(data.ROLE)) {
      return req.reject(422, `Invalid role '${data.ROLE}'. Must be one of: ${VALID_ROLES.join(', ')}.`);
    }

    // Prevent non-admin from setting ROLE to ADMIN
    if (data.ROLE === 'ADMIN') {
      const userRoles = req.user.roles || {};
      if (!userRoles['PSA_Admin']) {
        return req.reject(403, 'Only admins can create employee records with the ADMIN role.');
      }
    }

    // Set FULL_NAME
    if (data.FIRST_NAME && data.LAST_NAME) {
      data.FULL_NAME = `${data.FIRST_NAME} ${data.LAST_NAME}`;
    }
  });

  this.before('UPDATE', 'Employees', async (req) => {
    const data = req.data;

    // Validate EMAIL format if being changed
    if (data.EMAIL && !EMAIL_REGEX.test(data.EMAIL)) {
      return req.reject(422, `Invalid email format: '${data.EMAIL}'.`);
    }

    // Validate EMAIL uniqueness if being changed
    if (data.EMAIL) {
      const existing = await SELECT.one.from(Employees).where({ EMAIL: data.EMAIL }).and(`ID != '${data.ID}'`);
      if (existing) {
        return req.reject(409, `Email '${data.EMAIL}' is already in use.`);
      }
    }

    // Validate ROLE
    if (data.ROLE && !VALID_ROLES.includes(data.ROLE)) {
      return req.reject(422, `Invalid role '${data.ROLE}'. Must be one of: ${VALID_ROLES.join(', ')}.`);
    }

    // Prevent non-admin from changing ROLE to ADMIN
    if (data.ROLE === 'ADMIN') {
      const userRoles = req.user.roles || {};
      if (!userRoles['PSA_Admin']) {
        return req.reject(403, 'Only admins can assign the ADMIN role.');
      }
    }

    // Update FULL_NAME if name parts are provided
    if (data.FIRST_NAME || data.LAST_NAME) {
      const current = await SELECT.one.from(Employees).where({ ID: data.ID });
      if (current) {
        const firstName = data.FIRST_NAME || current.FIRST_NAME;
        const lastName  = data.LAST_NAME || current.LAST_NAME;
        data.FULL_NAME  = `${firstName} ${lastName}`;
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------
  this.before('CREATE', 'Projects', async (req) => {
    const data = req.data;

    // Validate PROJECT_CODE uniqueness
    if (data.PROJECT_CODE) {
      const existing = await SELECT.one.from(Projects).where({ PROJECT_CODE: data.PROJECT_CODE });
      if (existing) {
        return req.reject(409, `Project code '${data.PROJECT_CODE}' already exists.`);
      }
    }

    // Validate client_ID exists
    if (data.client_ID) {
      const client = await SELECT.one.from(Clients).where({ ID: data.client_ID });
      if (!client) {
        return req.reject(422, `Client with ID '${data.client_ID}' does not exist.`);
      }
    }

    // Validate date range
    if (data.START_DATE && data.END_DATE) {
      if (new Date(data.START_DATE) >= new Date(data.END_DATE)) {
        return req.reject(422, 'START_DATE must be before END_DATE.');
      }
    }
  });

  this.before('UPDATE', 'Projects', async (req) => {
    const data = req.data;

    // Validate client_ID exists if being changed
    if (data.client_ID) {
      const client = await SELECT.one.from(Clients).where({ ID: data.client_ID });
      if (!client) {
        return req.reject(422, `Client with ID '${data.client_ID}' does not exist.`);
      }
    }

    // Validate date range
    if (data.START_DATE || data.END_DATE) {
      const current = await SELECT.one.from(Projects).where({ ID: data.ID });
      if (current) {
        const startDate = data.START_DATE || current.START_DATE;
        const endDate   = data.END_DATE || current.END_DATE;
        if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
          return req.reject(422, 'START_DATE must be before END_DATE.');
        }
      }
    }

    // Validate STATUS transition
    if (data.STATUS) {
      const current = await SELECT.one.from(Projects).columns('STATUS').where({ ID: data.ID });
      if (current && current.STATUS !== data.STATUS) {
        const allowed = VALID_PROJECT_TRANSITIONS[current.STATUS] || [];
        if (!allowed.includes(data.STATUS)) {
          return req.reject(409, `Cannot transition project status from '${current.STATUS}' to '${data.STATUS}'. Allowed: ${allowed.join(', ') || 'none'}.`);
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Budgets
  // ---------------------------------------------------------------------------
  this.before(['CREATE', 'UPDATE'], 'Budgets', async (req) => {
    const data = req.data;

    // Validate BUDGET_CODE uniqueness
    if (data.BUDGET_CODE) {
      const whereClause = { BUDGET_CODE: data.BUDGET_CODE };
      const existing = data.ID
        ? await SELECT.one.from(Budgets).where(whereClause).and(`ID != '${data.ID}'`)
        : await SELECT.one.from(Budgets).where(whereClause);
      if (existing) {
        return req.reject(409, `Budget code '${data.BUDGET_CODE}' already exists.`);
      }
    }

    // Validate TOTAL_AMOUNT >= 0
    if (data.TOTAL_AMOUNT !== undefined && data.TOTAL_AMOUNT !== null) {
      if (parseFloat(data.TOTAL_AMOUNT) < 0) {
        return req.reject(422, 'TOTAL_AMOUNT must be >= 0.');
      }
    }

    // Validate project_ID exists
    if (data.project_ID) {
      const project = await SELECT.one.from(Projects).where({ ID: data.project_ID });
      if (!project) {
        return req.reject(422, `Project with ID '${data.project_ID}' does not exist.`);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Timesheets
  // ---------------------------------------------------------------------------
  this.before('CREATE', 'Timesheets', async (req) => {
    const data = req.data;

    // Validate employee_ID
    if (data.employee_ID) {
      const emp = await SELECT.one.from(Employees).where({ ID: data.employee_ID });
      if (!emp) {
        return req.reject(422, `Employee with ID '${data.employee_ID}' does not exist.`);
      }
    }

    // Prevent duplicate timesheet for same employee + WEEK_START
    if (data.employee_ID && data.WEEK_START) {
      const duplicate = await SELECT.one.from(Timesheets)
        .where({ employee_ID: data.employee_ID, WEEK_START: data.WEEK_START });
      if (duplicate) {
        return req.reject(409, `A timesheet already exists for employee '${data.employee_ID}' for week starting '${data.WEEK_START}'.`);
      }
    }
  });

  this.before('UPDATE', 'Timesheets', async (req) => {
    const data = req.data;

    // Prevent modification if STATUS is APPROVED
    const current = await SELECT.one.from(Timesheets).columns('STATUS').where({ ID: data.ID });
    if (current && current.STATUS === 'APPROVED') {
      return req.reject(409, 'Cannot modify an approved timesheet.');
    }
  });

  this.before('DELETE', 'Timesheets', async (req) => {
    const tsId = req.data.ID;

    const ts = await SELECT.one.from(Timesheets).columns('STATUS').where({ ID: tsId });
    if (ts && ts.STATUS !== 'DRAFT') {
      return req.reject(409, `Cannot delete a timesheet with status '${ts.STATUS}'. Only DRAFT timesheets can be deleted.`);
    }
  });

  // ---------------------------------------------------------------------------
  // TimesheetEntries
  // ---------------------------------------------------------------------------
  this.before(['CREATE', 'UPDATE'], 'TimesheetEntries', async (req) => {
    const data = req.data;

    // Validate HOURS
    if (data.HOURS !== undefined && data.HOURS !== null) {
      const hrs = parseFloat(data.HOURS);
      if (hrs <= 0 || hrs > 24) {
        return req.reject(422, `HOURS must be > 0 and <= 24. Provided: ${data.HOURS}.`);
      }
    }

    // Get the parent timesheet
    const timesheetId = data.timesheet_ID;
    if (timesheetId) {
      const ts = await SELECT.one.from(Timesheets).where({ ID: timesheetId });
      if (!ts) {
        return req.reject(422, `Timesheet with ID '${timesheetId}' does not exist.`);
      }

      // Prevent modification if parent timesheet status is not DRAFT or REJECTED
      if (ts.STATUS !== 'DRAFT' && ts.STATUS !== 'REJECTED') {
        return req.reject(409, `Cannot modify entries for a timesheet with status '${ts.STATUS}'.`);
      }

      // Validate WORK_DATE falls within the timesheet's week (WEEK_START to WEEK_START + 6 days)
      if (data.WORK_DATE && ts.WEEK_START) {
        const weekStart = new Date(ts.WEEK_START);
        const weekEnd   = new Date(ts.WEEK_START);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const workDate = new Date(data.WORK_DATE);
        if (workDate < weekStart || workDate > weekEnd) {
          return req.reject(422, `WORK_DATE '${data.WORK_DATE}' must fall within the timesheet week (${ts.WEEK_START} to ${weekEnd.toISOString().split('T')[0]}).`);
        }
      }

      // Validate project_ID is a project the employee is assigned to
      if (data.project_ID) {
        const assignment = await SELECT.one.from(ProjectAssignments)
          .where({ employee_ID: ts.employee_ID, project_ID: data.project_ID });
        if (!assignment) {
          return req.reject(422, `Employee is not assigned to project '${data.project_ID}'.`);
        }
      }
    } else if (req.event === 'UPDATE') {
      // For UPDATE, fetch timesheet_ID from existing entry
      const existingEntry = await SELECT.one.from(TimesheetEntries).where({ ID: data.ID });
      if (existingEntry) {
        const ts = await SELECT.one.from(Timesheets).where({ ID: existingEntry.timesheet_ID });
        if (ts && ts.STATUS !== 'DRAFT' && ts.STATUS !== 'REJECTED') {
          return req.reject(409, `Cannot modify entries for a timesheet with status '${ts.STATUS}'.`);
        }

        // Validate WORK_DATE for update
        if (data.WORK_DATE && ts && ts.WEEK_START) {
          const weekStart = new Date(ts.WEEK_START);
          const weekEnd   = new Date(ts.WEEK_START);
          weekEnd.setDate(weekEnd.getDate() + 6);

          const workDate = new Date(data.WORK_DATE);
          if (workDate < weekStart || workDate > weekEnd) {
            return req.reject(422, `WORK_DATE '${data.WORK_DATE}' must fall within the timesheet week (${ts.WEEK_START} to ${weekEnd.toISOString().split('T')[0]}).`);
          }
        }

        // Validate project assignment for update
        if (data.project_ID && ts) {
          const assignment = await SELECT.one.from(ProjectAssignments)
            .where({ employee_ID: ts.employee_ID, project_ID: data.project_ID });
          if (!assignment) {
            return req.reject(422, `Employee is not assigned to project '${data.project_ID}'.`);
          }
        }
      }
    }
  });

  this.before('DELETE', 'TimesheetEntries', async (req) => {
    const entryId = req.data.ID;

    const entry = await SELECT.one.from(TimesheetEntries).where({ ID: entryId });
    if (entry) {
      const ts = await SELECT.one.from(Timesheets).columns('STATUS').where({ ID: entry.timesheet_ID });
      if (ts && ts.STATUS !== 'DRAFT' && ts.STATUS !== 'REJECTED') {
        return req.reject(409, `Cannot delete entries for a timesheet with status '${ts.STATUS}'.`);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Invoices
  // ---------------------------------------------------------------------------
  this.before(['CREATE', 'UPDATE'], 'Invoices', async (req) => {
    const data = req.data;

    // Validate INVOICE_NUMBER uniqueness
    if (data.INVOICE_NUMBER) {
      const whereClause = { INVOICE_NUMBER: data.INVOICE_NUMBER };
      const existing = data.ID
        ? await SELECT.one.from(Invoices).where(whereClause).and(`ID != '${data.ID}'`)
        : await SELECT.one.from(Invoices).where(whereClause);
      if (existing) {
        return req.reject(409, `Invoice number '${data.INVOICE_NUMBER}' already exists.`);
      }
    }

    // Validate amounts: GROSS_AMOUNT should equal NET_AMOUNT + TAX_AMOUNT
    if (data.GROSS_AMOUNT !== undefined && data.NET_AMOUNT !== undefined && data.TAX_AMOUNT !== undefined) {
      const gross = parseFloat(data.GROSS_AMOUNT);
      const net   = parseFloat(data.NET_AMOUNT);
      const tax   = parseFloat(data.TAX_AMOUNT);
      const expectedGross = parseFloat((net + tax).toFixed(2));
      if (Math.abs(gross - expectedGross) > 0.01) {
        return req.reject(422, `GROSS_AMOUNT (${gross}) must equal NET_AMOUNT (${net}) + TAX_AMOUNT (${tax}) = ${expectedGross}.`);
      }
    }

    // Validate DUE_DATE >= INVOICE_DATE
    if (data.DUE_DATE && data.INVOICE_DATE) {
      if (new Date(data.DUE_DATE) < new Date(data.INVOICE_DATE)) {
        return req.reject(422, 'DUE_DATE must be on or after INVOICE_DATE.');
      }
    }

    // Validate client_ID exists
    if (data.client_ID) {
      const client = await SELECT.one.from(Clients).where({ ID: data.client_ID });
      if (!client) {
        return req.reject(422, `Client with ID '${data.client_ID}' does not exist.`);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Tasks
  // ---------------------------------------------------------------------------
  this.before('CREATE', 'Tasks', async (req) => {
    const data = req.data;

    // Only Managers/Admins can create tasks
    const isAdmin   = req.user.is('PSA_Admin') || req.user.is('Admin');
    const isManager = req.user.is('PSA_Manager') || req.user.is('Manager');
    if (!isAdmin && !isManager) {
      return req.reject(403, 'Only managers or admins can create tasks.');
    }

    // Validate project_ID exists
    if (data.project_ID) {
      const project = await SELECT.one.from(Projects).where({ ID: data.project_ID });
      if (!project) {
        return req.reject(422, `Project with ID '${data.project_ID}' does not exist.`);
      }
    }

    // Validate assignedTo employee exists if provided
    if (data.assignedTo_ID) {
      const emp = await SELECT.one.from(Employees).where({ ID: data.assignedTo_ID });
      if (!emp) {
        return req.reject(422, `Employee with ID '${data.assignedTo_ID}' does not exist.`);
      }
    }
  });

  this.before('UPDATE', 'Tasks', async (req) => {
    const data = req.data;

    const isAdmin   = req.user.is('PSA_Admin') || req.user.is('Admin');
    const isManager = req.user.is('PSA_Manager') || req.user.is('Manager');

    // Employees can only update STATUS of their own assigned tasks
    if (!isAdmin && !isManager) {
      const task = await SELECT.one.from(Tasks).where({ ID: data.ID });
      let currentEmp;
      try { currentEmp = await _getCurrentEmployee(req); } catch (e) {}
      if (!task || task.assignedTo_ID !== currentEmp?.ID) {
        return req.reject(403, 'Employees can only update their own assigned tasks.');
      }
      // Only allow STATUS update for employees
      const allowedFields = ['STATUS', 'ACTUAL_HOURS', 'ID'];
      const attemptedFields = Object.keys(data);
      const forbidden = attemptedFields.filter(f => !allowedFields.includes(f));
      if (forbidden.length > 0) {
        return req.reject(403, `Employees can only update task STATUS and ACTUAL_HOURS. Forbidden fields: ${forbidden.join(', ')}.`);
      }
      return;
    }

    // Validate project_ID exists (for manager/admin)
    if (data.project_ID) {
      const project = await SELECT.one.from(Projects).where({ ID: data.project_ID });
      if (!project) {
        return req.reject(422, `Project with ID '${data.project_ID}' does not exist.`);
      }
    }

    // Validate assignedTo employee exists if provided
    if (data.assignedTo_ID) {
      const emp = await SELECT.one.from(Employees).where({ ID: data.assignedTo_ID });
      if (!emp) {
        return req.reject(422, `Employee with ID '${data.assignedTo_ID}' does not exist.`);
      }
    }
  });

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // Invoice Workflow: Mark as Issued
  // ---------------------------------------------------------------------------
  this.on('markInvoiceIssued', async (req) => {
    const { invoiceId } = req.data;
    if (!invoiceId) return req.reject(400, 'invoiceId is required.');

    const emp = await _getCurrentEmployee(req);
    if (emp.ROLE !== 'ADMIN') {
      return req.reject(403, 'Only administrators can issue invoices.');
    }

    const invoice = await SELECT.one.from(Invoices).where({ ID: invoiceId });
    if (!invoice) return req.reject(404, 'Invoice not found.');

    if (invoice.STATUS !== 'DRAFT') {
      return req.reject(409, `Cannot issue an invoice with status '${invoice.STATUS}'. Only DRAFT invoices can be issued.`);
    }

    await UPDATE(Invoices).set({
      STATUS: 'ISSUED'
    }).where({ ID: invoiceId });

    return {
      success:   true,
      message:   'Invoice marked as Issued successfully.',
      invoiceId: invoiceId,
      newStatus: 'ISSUED'
    };
  });

  // ---------------------------------------------------------------------------
  // Invoice Workflow: Mark as Paid
  // ---------------------------------------------------------------------------
  this.on('markInvoicePaid', async (req) => {
    const { invoiceId, paidAmount } = req.data;
    if (!invoiceId) return req.reject(400, 'invoiceId is required.');

    const emp = await _getCurrentEmployee(req);
    if (emp.ROLE !== 'ADMIN') {
      return req.reject(403, 'Only administrators can mark invoices as paid.');
    }

    const invoice = await SELECT.one.from(Invoices).where({ ID: invoiceId });
    if (!invoice) return req.reject(404, 'Invoice not found.');

    if (invoice.STATUS !== 'ISSUED') {
      return req.reject(409, `Cannot mark as Paid an invoice with status '${invoice.STATUS}'. Only ISSUED invoices can be marked as Paid.`);
    }

    const finalPaidAmount = paidAmount !== undefined ? paidAmount : invoice.GROSS_AMOUNT;

    await UPDATE(Invoices).set({
      STATUS:      'PAID',
      PAID_AMOUNT: finalPaidAmount
    }).where({ ID: invoiceId });

    return {
      success:   true,
      message:   'Invoice marked as Paid successfully.',
      invoiceId: invoiceId,
      newStatus: 'PAID'
    };
  });

  // ---------------------------------------------------------------------------
  // Invoice READ scoping — Manager sees only their projects' invoices
  // ---------------------------------------------------------------------------
  this.on('READ', 'Invoices', async (req, next) => {
    const isAdmin   = req.user.is('PSA_Admin') || req.user.is('Admin');
    const isManager = req.user.is('PSA_Manager') || req.user.is('Manager');

    if (isAdmin) return next();

    if (isManager) {
      let currentEmp;
      try { currentEmp = await _getCurrentEmployee(req); } catch (e) { return next(); }
      const managedProjects = await SELECT.from(Projects).columns('ID').where({ manager_ID: currentEmp.ID });
      if (!managedProjects.length) {
        req.query.where('1 = 0');
        return next();
      }
      const projectIds = managedProjects.map(p => p.ID);
      req.query.where({ project_ID: { in: projectIds } });
      return next();
    }

    req.query.where('1 = 0');
    return next();
  });

  // ---------------------------------------------------------------------------
  // Tasks READ scoping — Employee sees only tasks assigned to them
  // ---------------------------------------------------------------------------
  this.on('READ', 'Tasks', async (req, next) => {
    const isAdmin   = req.user.is('PSA_Admin') || req.user.is('Admin');
    const isManager = req.user.is('PSA_Manager') || req.user.is('Manager');

    if (isAdmin || isManager) return next();

    let currentEmp;
    try { currentEmp = await _getCurrentEmployee(req); } catch (e) { return next(); }

    req.query.where({ assignedTo_ID: currentEmp.ID });
    return next();
  });

  // ---------------------------------------------------------------------------
  // createBulkEmployees
  // ---------------------------------------------------------------------------
  this.on('createBulkEmployees', async (req) => {
    const { employees } = req.data;
    if (!employees || !Array.isArray(employees)) {
      return req.reject(400, 'employees array is required.');
    }

    const results = [];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      try {
        // Validate required fields
        if (!emp.employeeCode || !emp.firstName || !emp.lastName || !emp.email) {
          results.push({ index: i, success: false, message: 'Missing required fields: employeeCode, firstName, lastName, email.', id: null });
          continue;
        }

        // Validate email format
        if (!EMAIL_REGEX.test(emp.email)) {
          results.push({ index: i, success: false, message: `Invalid email format: '${emp.email}'.`, id: null });
          continue;
        }

        // Validate role
        if (emp.role && !VALID_ROLES.includes(emp.role)) {
          results.push({ index: i, success: false, message: `Invalid role '${emp.role}'. Must be one of: ${VALID_ROLES.join(', ')}.`, id: null });
          continue;
        }

        // Check uniqueness — EMPLOYEE_CODE
        const existingCode = await SELECT.one.from(Employees).where({ EMPLOYEE_CODE: emp.employeeCode });
        if (existingCode) {
          results.push({ index: i, success: false, message: `Employee code '${emp.employeeCode}' already exists.`, id: null });
          continue;
        }

        // Check uniqueness — EMAIL
        const existingEmail = await SELECT.one.from(Employees).where({ EMAIL: emp.email });
        if (existingEmail) {
          results.push({ index: i, success: false, message: `Email '${emp.email}' is already in use.`, id: null });
          continue;
        }

        const newId = cds.utils.uuid();
        await INSERT.into(Employees).entries({
          ID:            newId,
          EMPLOYEE_CODE: emp.employeeCode,
          FIRST_NAME:    emp.firstName,
          LAST_NAME:     emp.lastName,
          FULL_NAME:     `${emp.firstName} ${emp.lastName}`,
          EMAIL:         emp.email,
          PHONE:         emp.phone || null,
          ROLE:          emp.role || 'EMPLOYEE',
          DEPARTMENT:    emp.department || null
        });

        results.push({ index: i, success: true, message: 'Employee created successfully.', id: newId });
      } catch (err) {
        results.push({ index: i, success: false, message: `Error: ${err.message}`, id: null });
      }
    }

    return results;
  });

  // ---------------------------------------------------------------------------
  // createBulkClients
  // ---------------------------------------------------------------------------
  this.on('createBulkClients', async (req) => {
    const { clients } = req.data;
    if (!clients || !Array.isArray(clients)) {
      return req.reject(400, 'clients array is required.');
    }

    const results = [];

    for (let i = 0; i < clients.length; i++) {
      const cl = clients[i];
      try {
        // Validate required fields
        if (!cl.clientCode || !cl.clientName) {
          results.push({ index: i, success: false, message: 'Missing required fields: clientCode, clientName.', id: null });
          continue;
        }

        // Validate email format if provided
        if (cl.email && !EMAIL_REGEX.test(cl.email)) {
          results.push({ index: i, success: false, message: `Invalid email format: '${cl.email}'.`, id: null });
          continue;
        }

        // Check uniqueness — CLIENT_CODE
        const existingCode = await SELECT.one.from(Clients).where({ CLIENT_CODE: cl.clientCode });
        if (existingCode) {
          results.push({ index: i, success: false, message: `Client code '${cl.clientCode}' already exists.`, id: null });
          continue;
        }

        const newId = cds.utils.uuid();
        await INSERT.into(Clients).entries({
          ID:             newId,
          CLIENT_CODE:    cl.clientCode,
          CLIENT_NAME:    cl.clientName,
          EMAIL:          cl.email || null,
          PHONE:          cl.phone || null,
          CONTACT_PERSON: cl.contactPerson || null
        });

        results.push({ index: i, success: true, message: 'Client created successfully.', id: newId });
      } catch (err) {
        results.push({ index: i, success: false, message: `Error: ${err.message}`, id: null });
      }
    }

    return results;
  });

  // ---------------------------------------------------------------------------
  // createBulkProjects
  // ---------------------------------------------------------------------------
  this.on('createBulkProjects', async (req) => {
    const { projects } = req.data;
    if (!projects || !Array.isArray(projects)) {
      return req.reject(400, 'projects array is required.');
    }

    const results = [];

    for (let i = 0; i < projects.length; i++) {
      const proj = projects[i];
      try {
        // Validate required fields
        if (!proj.projectCode || !proj.projectName || !proj.clientId) {
          results.push({ index: i, success: false, message: 'Missing required fields: projectCode, projectName, clientId.', id: null });
          continue;
        }

        // Check uniqueness — PROJECT_CODE
        const existingCode = await SELECT.one.from(Projects).where({ PROJECT_CODE: proj.projectCode });
        if (existingCode) {
          results.push({ index: i, success: false, message: `Project code '${proj.projectCode}' already exists.`, id: null });
          continue;
        }

        // Validate client exists
        const client = await SELECT.one.from(Clients).where({ ID: proj.clientId });
        if (!client) {
          results.push({ index: i, success: false, message: `Client with ID '${proj.clientId}' does not exist.`, id: null });
          continue;
        }

        // Validate manager exists if provided
        if (proj.managerId) {
          const manager = await SELECT.one.from(Employees).where({ ID: proj.managerId });
          if (!manager) {
            results.push({ index: i, success: false, message: `Manager with ID '${proj.managerId}' does not exist.`, id: null });
            continue;
          }
        }

        // Validate date range
        if (proj.startDate && proj.endDate) {
          if (new Date(proj.startDate) >= new Date(proj.endDate)) {
            results.push({ index: i, success: false, message: 'START_DATE must be before END_DATE.', id: null });
            continue;
          }
        }

        const newId = cds.utils.uuid();
        await INSERT.into(Projects).entries({
          ID:            newId,
          PROJECT_CODE:  proj.projectCode,
          PROJECT_NAME:  proj.projectName,
          DESCRIPTION:   proj.description || null,
          client_ID:     proj.clientId,
          manager_ID:    proj.managerId || null,
          BILLING_TYPE:  proj.billingType || 'T_AND_M',
          START_DATE:    proj.startDate || null,
          END_DATE:      proj.endDate || null,
          PLANNED_HOURS: proj.plannedHours || null
        });

        results.push({ index: i, success: true, message: 'Project created successfully.', id: newId });
      } catch (err) {
        results.push({ index: i, success: false, message: `Error: ${err.message}`, id: null });
      }
    }

    return results;
  });

  // ===========================================================================
  // READ Handlers — Data Scoping
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // Employees — PSA_Employee role sees limited data on other employees
  // ---------------------------------------------------------------------------
  this.on('READ', 'Employees', async (req, next) => {
    const result = await next();

    // If user only has PSA_Employee role (not Manager/Admin), restrict visible fields
    const userRoles = req.user.roles || {};
    const isAdmin   = userRoles['PSA_Admin'];
    const isManager = userRoles['PSA_Manager'];

    if (!isAdmin && !isManager && userRoles['PSA_Employee']) {
      // Try to get the current employee
      let currentEmpId = null;
      try {
        const currentEmp = await _getCurrentEmployee(req);
        currentEmpId = currentEmp?.ID;
      } catch (e) {
        // If we can't identify the current user, still proceed but limit all records
      }

      if (Array.isArray(result)) {
        for (const emp of result) {
          if (emp.ID !== currentEmpId) {
            // Redact sensitive fields for other employees
            delete emp.AUTH_ID;
            delete emp.PHONE;
          }
        }
      } else if (result && result.ID !== currentEmpId) {
        delete result.AUTH_ID;
        delete result.PHONE;
      }
    }

    return result;
  });

  // ---------------------------------------------------------------------------
  // Timesheets — scoping: employees see only own; managers see team; admins all
  // ---------------------------------------------------------------------------
  this.on('READ', 'Timesheets', async (req, next) => {
    const isAdmin   = req.user.is('PSA_Admin') || req.user.is('Admin');
    const isManager = req.user.is('PSA_Manager') || req.user.is('Manager');

    if (isAdmin) {
      // Admin sees all
      return next();
    }

    let currentEmp;
    try {
      currentEmp = await _getCurrentEmployee(req);
    } catch (e) {
      return next();
    }

    if (isManager) {
      // Manager sees their own + their team's timesheets
      const teamIds = await SELECT.from(Employees).columns('ID').where({ manager_ID: currentEmp.ID });
      const allowedIds = [currentEmp.ID, ...teamIds.map(t => t.ID)];
      req.query.where({ employee_ID: { in: allowedIds } });
      return next();
    }

    // Employee sees only their own
    req.query.where({ employee_ID: currentEmp.ID });
    return next();
  });

  // ---------------------------------------------------------------------------
  // TimesheetEntries — same scoping as parent timesheet
  // ---------------------------------------------------------------------------
  this.on('READ', 'TimesheetEntries', async (req, next) => {
    const isAdmin   = req.user.is('PSA_Admin') || req.user.is('Admin');
    const isManager = req.user.is('PSA_Manager') || req.user.is('Manager');

    if (isAdmin) {
      return next();
    }

    let currentEmp;
    try {
      currentEmp = await _getCurrentEmployee(req);
    } catch (e) {
      return next();
    }

    if (isManager) {
      // Manager sees entries for their team's timesheets
      const teamIds = await SELECT.from(Employees).columns('ID').where({ manager_ID: currentEmp.ID });
      const allowedEmpIds = [currentEmp.ID, ...teamIds.map(t => t.ID)];
      const allowedTimesheets = await SELECT.from(Timesheets).columns('ID').where({ employee_ID: { in: allowedEmpIds } });
      const tsIds = allowedTimesheets.map(t => t.ID);

      if (tsIds.length > 0) {
        req.query.where({ timesheet_ID: { in: tsIds } });
      } else {
        req.query.where('1 = 0');
      }
      return next();
    }

    // Employee — own timesheets only
    const ownTimesheets = await SELECT.from(Timesheets).columns('ID').where({ employee_ID: currentEmp.ID });
    const ownTsIds = ownTimesheets.map(t => t.ID);

    if (ownTsIds.length > 0) {
      req.query.where({ timesheet_ID: { in: ownTsIds } });
    } else {
      req.query.where('1 = 0');
    }
    return next();
  });

});
