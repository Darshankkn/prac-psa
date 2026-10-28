// ============================================================================
// PSA Sprint — CDS UI Annotations
// Comprehensive UI annotations for all service entities.
// ============================================================================
using PSAService as service from './psa-service';

// ===========================================================================
// CLIENTS
// ===========================================================================
annotate service.Clients with @(
  UI : {
    HeaderInfo : {
      TypeName       : 'Client',
      TypeNamePlural : 'Clients',
      Title          : { Value : CLIENT_NAME },
      Description    : { Value : CLIENT_CODE }
    },
    SelectionFields : [
      CLIENT_CODE,
      CLIENT_NAME,
      STATUS
    ],
    LineItem : [
      { Value : CLIENT_CODE,    Label : 'Client Code' },
      { Value : CLIENT_NAME,    Label : 'Client Name' },
      { Value : EMAIL,          Label : 'Email' },
      { Value : PHONE,          Label : 'Phone' },
      { Value : CONTACT_PERSON, Label : 'Contact Person' },
      { Value : STATUS,         Label : 'Status' }
    ],
    FieldGroup #GeneralInfo : {
      Label : 'General Information',
      Data  : [
        { Value : CLIENT_CODE,    Label : 'Client Code' },
        { Value : CLIENT_NAME,    Label : 'Client Name' },
        { Value : STATUS,         Label : 'Status' }
      ]
    },
    FieldGroup #ContactInfo : {
      Label : 'Contact Information',
      Data  : [
        { Value : CONTACT_PERSON, Label : 'Contact Person' },
        { Value : EMAIL,          Label : 'Email' },
        { Value : PHONE,          Label : 'Phone' }
      ]
    },
    FieldGroup #Address : {
      Label : 'Address',
      Data  : [
        { Value : STREET,   Label : 'Street' },
        { Value : CITY,     Label : 'City' },
        { Value : STATE,    Label : 'State' },
        { Value : COUNTRY,  Label : 'Country' },
        { Value : ZIP_CODE, Label : 'ZIP Code' }
      ]
    },
    Facets : [
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'GeneralInfoFacet',
        Label  : 'General Information',
        Target : '@UI.FieldGroup#GeneralInfo'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'ContactInfoFacet',
        Label  : 'Contact Information',
        Target : '@UI.FieldGroup#ContactInfo'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'AddressFacet',
        Label  : 'Address',
        Target : '@UI.FieldGroup#Address'
      }
    ],
    Identification : [
      { Value : CLIENT_CODE }
    ]
  }
) {
  CLIENT_CODE    @Common.Label : 'Client Code';
  CLIENT_NAME    @Common.Label : 'Client Name';
  EMAIL          @Common.Label : 'Email';
  PHONE          @Common.Label : 'Phone';
  CONTACT_PERSON @Common.Label : 'Contact Person';
  STATUS         @Common.Label : 'Status';
  STREET         @Common.Label : 'Street';
  CITY           @Common.Label : 'City';
  STATE          @Common.Label : 'State';
  COUNTRY        @Common.Label : 'Country';
  ZIP_CODE       @Common.Label : 'ZIP Code';
};


// ===========================================================================
// EMPLOYEES
// ===========================================================================
annotate service.Employees with @(
  UI : {
    HeaderInfo : {
      TypeName       : 'Employee',
      TypeNamePlural : 'Employees',
      Title          : { Value : FULL_NAME },
      Description    : { Value : EMPLOYEE_CODE }
    },
    SelectionFields : [
      EMPLOYEE_CODE,
      FULL_NAME,
      ROLE,
      STATUS
    ],
    LineItem : [
      { Value : EMPLOYEE_CODE, Label : 'Employee Code' },
      { Value : FULL_NAME,     Label : 'Full Name' },
      { Value : EMAIL,         Label : 'Email' },
      { Value : ROLE,          Label : 'Role' },
      { Value : DEPARTMENT,    Label : 'Department' },
      { Value : STATUS,        Label : 'Status' }
    ],
    FieldGroup #PersonalInfo : {
      Label : 'Personal Information',
      Data  : [
        { Value : EMPLOYEE_CODE, Label : 'Employee Code' },
        { Value : FIRST_NAME,    Label : 'First Name' },
        { Value : LAST_NAME,     Label : 'Last Name' },
        { Value : FULL_NAME,     Label : 'Full Name' },
        { Value : STATUS,        Label : 'Status' }
      ]
    },
    FieldGroup #EmployeeContactInfo : {
      Label : 'Contact Information',
      Data  : [
        { Value : EMAIL, Label : 'Email' },
        { Value : PHONE, Label : 'Phone' }
      ]
    },
    FieldGroup #EmploymentInfo : {
      Label : 'Employment Information',
      Data  : [
        { Value : ROLE,       Label : 'Role' },
        { Value : DEPARTMENT, Label : 'Department' },
        { Value : manager_ID, Label : 'Manager' },
        { Value : AUTH_ID,    Label : 'Auth ID' }
      ]
    },
    Facets : [
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'PersonalInfoFacet',
        Label  : 'Personal Information',
        Target : '@UI.FieldGroup#PersonalInfo'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'EmployeeContactFacet',
        Label  : 'Contact Information',
        Target : '@UI.FieldGroup#EmployeeContactInfo'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'EmploymentInfoFacet',
        Label  : 'Employment Information',
        Target : '@UI.FieldGroup#EmploymentInfo'
      }
    ],
    Identification : [
      { Value : EMPLOYEE_CODE }
    ]
  }
) {
  EMPLOYEE_CODE @Common.Label : 'Employee Code';
  FIRST_NAME    @Common.Label : 'First Name';
  LAST_NAME     @Common.Label : 'Last Name';
  FULL_NAME     @Common.Label : 'Full Name';
  EMAIL         @Common.Label : 'Email';
  PHONE         @Common.Label : 'Phone';
  ROLE          @Common.Label : 'Role';
  DEPARTMENT    @Common.Label : 'Department';
  STATUS        @Common.Label : 'Status';
  AUTH_ID       @Common.Label : 'Auth ID';
  manager       @Common.Label : 'Manager'
                @Common.Text  : manager.FULL_NAME  @Common.TextArrangement : #TextOnly;
  manager       @Common.ValueList : {
    CollectionPath : 'Employees',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : manager_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'FULL_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'EMPLOYEE_CODE' }
    ]
  };
};


// ===========================================================================
// PROJECTS
// ===========================================================================
annotate service.Projects with @(
  UI : {
    HeaderInfo : {
      TypeName       : 'Project',
      TypeNamePlural : 'Projects',
      Title          : { Value : PROJECT_NAME },
      Description    : { Value : PROJECT_CODE }
    },
    SelectionFields : [
      PROJECT_CODE,
      PROJECT_NAME,
      STATUS,
      BILLING_TYPE
    ],
    LineItem : [
      { Value : PROJECT_CODE,  Label : 'Project Code' },
      { Value : PROJECT_NAME,  Label : 'Project Name' },
      { Value : client_ID,     Label : 'Client', ![@Common.Text] : client.CLIENT_NAME },
      { Value : BILLING_TYPE,  Label : 'Billing Type' },
      { Value : STATUS,        Label : 'Status' },
      { Value : START_DATE,    Label : 'Start Date' },
      { Value : END_DATE,      Label : 'End Date' }
    ],
    FieldGroup #ProjectGeneral : {
      Label : 'General',
      Data  : [
        { Value : PROJECT_CODE,  Label : 'Project Code' },
        { Value : PROJECT_NAME,  Label : 'Project Name' },
        { Value : DESCRIPTION,   Label : 'Description' },
        { Value : client_ID,     Label : 'Client' },
        { Value : manager_ID,    Label : 'Project Manager' },
        { Value : STATUS,        Label : 'Status' },
        { Value : BILLING_TYPE,  Label : 'Billing Type' }
      ]
    },
    FieldGroup #ProjectDates : {
      Label : 'Dates',
      Data  : [
        { Value : START_DATE, Label : 'Start Date' },
        { Value : END_DATE,   Label : 'End Date' }
      ]
    },
    FieldGroup #ProjectFinancial : {
      Label : 'Financial',
      Data  : [
        { Value : PLANNED_HOURS, Label : 'Planned Hours' }
      ]
    },
    Facets : [
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'ProjectGeneralFacet',
        Label  : 'General',
        Target : '@UI.FieldGroup#ProjectGeneral'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'ProjectDatesFacet',
        Label  : 'Dates',
        Target : '@UI.FieldGroup#ProjectDates'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'ProjectFinancialFacet',
        Label  : 'Financial',
        Target : '@UI.FieldGroup#ProjectFinancial'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'ProjectBudgetsFacet',
        Label  : 'Budgets',
        Target : 'budgets/@UI.LineItem'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'ProjectTasksFacet',
        Label  : 'Tasks',
        Target : 'tasks/@UI.LineItem'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'ProjectMilestonesFacet',
        Label  : 'Milestones',
        Target : 'milestones/@UI.LineItem'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'ProjectAssignmentsFacet',
        Label  : 'Assignments',
        Target : 'assignments/@UI.LineItem'
      }
    ],
    Identification : [
      { Value : PROJECT_CODE }
    ]
  }
) {
  PROJECT_CODE  @Common.Label : 'Project Code';
  PROJECT_NAME  @Common.Label : 'Project Name';
  DESCRIPTION   @Common.Label : 'Description';
  STATUS        @Common.Label : 'Status';
  BILLING_TYPE  @Common.Label : 'Billing Type';
  START_DATE    @Common.Label : 'Start Date';
  END_DATE      @Common.Label : 'End Date';
  PLANNED_HOURS @Common.Label : 'Planned Hours';
  client        @Common.Label : 'Client'
                @Common.Text  : client.CLIENT_NAME  @Common.TextArrangement : #TextOnly;
  client        @Common.ValueList : {
    CollectionPath : 'Clients',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : client_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'CLIENT_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'CLIENT_CODE' }
    ]
  };
  manager       @Common.Label : 'Project Manager'
                @Common.Text  : manager.FULL_NAME  @Common.TextArrangement : #TextOnly;
  manager       @Common.ValueList : {
    CollectionPath : 'Employees',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : manager_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'FULL_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'EMPLOYEE_CODE' }
    ]
  };
};


// ===========================================================================
// PROJECT ASSIGNMENTS (used as sub-table in Projects Object Page)
// ===========================================================================
annotate service.ProjectAssignments with @(
  UI : {
    HeaderInfo : {
      TypeName       : 'Assignment',
      TypeNamePlural : 'Assignments',
      Title          : { Value : ROLE_ON_PROJECT }
    },
    LineItem : [
      { Value : employee_ID,      Label : 'Employee', ![@Common.Text] : employee.FULL_NAME },
      { Value : ROLE_ON_PROJECT,   Label : 'Role on Project' },
      { Value : ASSIGNED_DATE,     Label : 'Assigned Date' }
    ]
  }
) {
  ROLE_ON_PROJECT @Common.Label : 'Role on Project';
  ASSIGNED_DATE   @Common.Label : 'Assigned Date';
  employee        @Common.Label : 'Employee'
                  @Common.Text  : employee.FULL_NAME  @Common.TextArrangement : #TextOnly;
  employee        @Common.ValueList : {
    CollectionPath : 'Employees',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : employee_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'FULL_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'EMPLOYEE_CODE' }
    ]
  };
  project         @Common.Label : 'Project'
                  @Common.Text  : project.PROJECT_NAME  @Common.TextArrangement : #TextOnly;
  project         @Common.ValueList : {
    CollectionPath : 'Projects',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : project_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_CODE' }
    ]
  };
};


// ===========================================================================
// BUDGETS
// ===========================================================================
annotate service.Budgets with @(
  UI : {
    HeaderInfo : {
      TypeName       : 'Budget',
      TypeNamePlural : 'Budgets',
      Title          : { Value : BUDGET_NAME },
      Description    : { Value : BUDGET_CODE }
    },
    SelectionFields : [
      BUDGET_CODE,
      STATUS,
      project_ID
    ],
    LineItem : [
      { Value : BUDGET_CODE,     Label : 'Budget Code' },
      { Value : BUDGET_NAME,     Label : 'Budget Name' },
      { Value : project_ID,      Label : 'Project', ![@Common.Text] : project.PROJECT_NAME },
      { Value : TOTAL_AMOUNT,    Label : 'Total Amount' },
      { Value : CONSUMED_AMOUNT, Label : 'Consumed Amount' },
      { Value : CURRENCY,        Label : 'Currency' },
      { Value : STATUS,          Label : 'Status' }
    ],
    FieldGroup #BudgetInfo : {
      Label : 'Budget Information',
      Data  : [
        { Value : BUDGET_CODE,    Label : 'Budget Code' },
        { Value : BUDGET_NAME,    Label : 'Budget Name' },
        { Value : project_ID,     Label : 'Project' },
        { Value : responsible_ID, Label : 'Responsible' },
        { Value : STATUS,         Label : 'Status' },
        { Value : PERIOD_START,   Label : 'Period Start' },
        { Value : PERIOD_END,     Label : 'Period End' }
      ]
    },
    FieldGroup #BudgetFinancialDetails : {
      Label : 'Financial Details',
      Data  : [
        { Value : TOTAL_AMOUNT,    Label : 'Total Amount' },
        { Value : CONSUMED_AMOUNT, Label : 'Consumed Amount' },
        { Value : CURRENCY,        Label : 'Currency' }
      ]
    },
    Facets : [
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'BudgetInfoFacet',
        Label  : 'Budget Information',
        Target : '@UI.FieldGroup#BudgetInfo'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'BudgetFinancialFacet',
        Label  : 'Financial Details',
        Target : '@UI.FieldGroup#BudgetFinancialDetails'
      }
    ],
    Identification : [
      { Value : BUDGET_CODE }
    ]
  }
) {
  BUDGET_CODE     @Common.Label : 'Budget Code';
  BUDGET_NAME     @Common.Label : 'Budget Name';
  TOTAL_AMOUNT    @Common.Label : 'Total Amount';
  CONSUMED_AMOUNT @Common.Label : 'Consumed Amount';
  CURRENCY        @Common.Label : 'Currency';
  STATUS          @Common.Label : 'Status';
  PERIOD_START    @Common.Label : 'Period Start';
  PERIOD_END      @Common.Label : 'Period End';
  project         @Common.Label : 'Project'
                  @Common.Text  : project.PROJECT_NAME  @Common.TextArrangement : #TextOnly;
  project         @Common.ValueList : {
    CollectionPath : 'Projects',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : project_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_CODE' }
    ]
  };
  responsible     @Common.Label : 'Responsible'
                  @Common.Text  : responsible.FULL_NAME  @Common.TextArrangement : #TextOnly;
  responsible     @Common.ValueList : {
    CollectionPath : 'Employees',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : responsible_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'FULL_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'EMPLOYEE_CODE' }
    ]
  };
};


// ===========================================================================
// TASKS
// ===========================================================================
annotate service.Tasks with @(
  UI : {
    HeaderInfo : {
      TypeName       : 'Task',
      TypeNamePlural : 'Tasks',
      Title          : { Value : TASK_TITLE },
      Description    : { Value : STATUS }
    },
    SelectionFields : [
      STATUS,
      PRIORITY,
      project_ID
    ],
    LineItem : [
      { Value : TASK_TITLE,    Label : 'Task Title' },
      { Value : project_ID,   Label : 'Project', ![@Common.Text] : project.PROJECT_NAME },
      { Value : assignedTo_ID, Label : 'Assigned To', ![@Common.Text] : assignedTo.FULL_NAME },
      { Value : STATUS,        Label : 'Status' },
      { Value : PRIORITY,      Label : 'Priority' },
      { Value : DUE_DATE,      Label : 'Due Date' }
    ],
    FieldGroup #TaskInfo : {
      Label : 'Task Information',
      Data  : [
        { Value : TASK_TITLE,      Label : 'Task Title' },
        { Value : DESCRIPTION,     Label : 'Description' },
        { Value : STATUS,          Label : 'Status' },
        { Value : PRIORITY,        Label : 'Priority' },
        { Value : DUE_DATE,        Label : 'Due Date' },
        { Value : ESTIMATED_HOURS, Label : 'Estimated Hours' },
        { Value : ACTUAL_HOURS,    Label : 'Actual Hours' }
      ]
    },
    FieldGroup #TaskAssignment : {
      Label : 'Assignment',
      Data  : [
        { Value : project_ID,    Label : 'Project' },
        { Value : assignedTo_ID, Label : 'Assigned To' }
      ]
    },
    Facets : [
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'TaskInfoFacet',
        Label  : 'Task Information',
        Target : '@UI.FieldGroup#TaskInfo'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'TaskAssignmentFacet',
        Label  : 'Assignment',
        Target : '@UI.FieldGroup#TaskAssignment'
      }
    ],
    Identification : [
      { Value : TASK_TITLE }
    ]
  }
) {
  TASK_TITLE      @Common.Label : 'Task Title';
  DESCRIPTION     @Common.Label : 'Description';
  STATUS          @Common.Label : 'Status';
  PRIORITY        @Common.Label : 'Priority';
  DUE_DATE        @Common.Label : 'Due Date';
  ESTIMATED_HOURS @Common.Label : 'Estimated Hours';
  ACTUAL_HOURS    @Common.Label : 'Actual Hours';
  project         @Common.Label : 'Project'
                  @Common.Text  : project.PROJECT_NAME  @Common.TextArrangement : #TextOnly;
  project         @Common.ValueList : {
    CollectionPath : 'Projects',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : project_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_CODE' }
    ]
  };
  assignedTo      @Common.Label : 'Assigned To'
                  @Common.Text  : assignedTo.FULL_NAME  @Common.TextArrangement : #TextOnly;
  assignedTo      @Common.ValueList : {
    CollectionPath : 'Employees',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : assignedTo_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'FULL_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'EMPLOYEE_CODE' }
    ]
  };
};


// ===========================================================================
// MILESTONES
// ===========================================================================
annotate service.Milestones with @(
  UI : {
    HeaderInfo : {
      TypeName       : 'Milestone',
      TypeNamePlural : 'Milestones',
      Title          : { Value : MILESTONE_NAME },
      Description    : { Value : STATUS }
    },
    SelectionFields : [
      STATUS,
      project_ID
    ],
    LineItem : [
      { Value : MILESTONE_NAME, Label : 'Milestone Name' },
      { Value : project_ID,     Label : 'Project', ![@Common.Text] : project.PROJECT_NAME },
      { Value : DUE_DATE,       Label : 'Due Date' },
      { Value : STATUS,         Label : 'Status' },
      { Value : COMPLETION_PCT, Label : 'Completion %' }
    ],
    FieldGroup #MilestoneInfo : {
      Label : 'Milestone Information',
      Data  : [
        { Value : MILESTONE_NAME, Label : 'Milestone Name' },
        { Value : DESCRIPTION,    Label : 'Description' },
        { Value : project_ID,     Label : 'Project' },
        { Value : responsible_ID, Label : 'Responsible' },
        { Value : DUE_DATE,       Label : 'Due Date' },
        { Value : STATUS,         Label : 'Status' },
        { Value : COMPLETION_PCT, Label : 'Completion %' },
        { Value : COMPLETED_DATE, Label : 'Completed Date' }
      ]
    },
    Facets : [
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'MilestoneInfoFacet',
        Label  : 'Milestone Information',
        Target : '@UI.FieldGroup#MilestoneInfo'
      }
    ],
    Identification : [
      { Value : MILESTONE_NAME }
    ]
  }
) {
  MILESTONE_NAME @Common.Label : 'Milestone Name';
  DESCRIPTION    @Common.Label : 'Description';
  DUE_DATE       @Common.Label : 'Due Date';
  STATUS         @Common.Label : 'Status';
  COMPLETION_PCT @Common.Label : 'Completion %';
  COMPLETED_DATE @Common.Label : 'Completed Date';
  project        @Common.Label : 'Project'
                 @Common.Text  : project.PROJECT_NAME  @Common.TextArrangement : #TextOnly;
  project        @Common.ValueList : {
    CollectionPath : 'Projects',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : project_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_CODE' }
    ]
  };
  responsible    @Common.Label : 'Responsible'
                 @Common.Text  : responsible.FULL_NAME  @Common.TextArrangement : #TextOnly;
  responsible    @Common.ValueList : {
    CollectionPath : 'Employees',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : responsible_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'FULL_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'EMPLOYEE_CODE' }
    ]
  };
};


// ===========================================================================
// TIMESHEETS
// ===========================================================================
annotate service.Timesheets with @(
  UI : {
    HeaderInfo : {
      TypeName       : 'Timesheet',
      TypeNamePlural : 'Timesheets',
      Title          : { Value : WEEK_START },
      Description    : { Value : STATUS }
    },
    SelectionFields : [
      STATUS,
      WEEK_START
    ],
    LineItem : [
      { Value : employee_ID,     Label : 'Employee', ![@Common.Text] : employee.FULL_NAME },
      { Value : WEEK_START,       Label : 'Week Start' },
      { Value : TOTAL_HOURS,      Label : 'Total Hours' },
      { Value : STATUS,           Label : 'Status' },
      { Value : SUBMISSION_DATE,  Label : 'Submission Date' }
    ],
    FieldGroup #TimesheetInfo : {
      Label : 'Timesheet Information',
      Data  : [
        { Value : employee_ID,      Label : 'Employee' },
        { Value : WEEK_START,        Label : 'Week Start' },
        { Value : TOTAL_HOURS,       Label : 'Total Hours' },
        { Value : STATUS,            Label : 'Status' },
        { Value : SUBMISSION_DATE,   Label : 'Submission Date' }
      ]
    },
    FieldGroup #ApprovalInfo : {
      Label : 'Approval Information',
      Data  : [
        { Value : approver_ID,      Label : 'Approver' },
        { Value : APPROVED_AT,       Label : 'Approved At' },
        { Value : REJECTED_AT,       Label : 'Rejected At' },
        { Value : REJECTION_REASON,  Label : 'Rejection Reason' }
      ]
    },
    Facets : [
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'TimesheetInfoFacet',
        Label  : 'Timesheet Information',
        Target : '@UI.FieldGroup#TimesheetInfo'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'ApprovalInfoFacet',
        Label  : 'Approval Information',
        Target : '@UI.FieldGroup#ApprovalInfo'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'TimesheetEntriesFacet',
        Label  : 'Entries',
        Target : 'entries/@UI.LineItem'
      }
    ],
    Identification : [
      { Value : WEEK_START }
    ]
  }
) {
  WEEK_START       @Common.Label : 'Week Start';
  SUBMISSION_DATE  @Common.Label : 'Submission Date';
  STATUS           @Common.Label : 'Status';
  TOTAL_HOURS      @Common.Label : 'Total Hours';
  REJECTION_REASON @Common.Label : 'Rejection Reason';
  APPROVED_AT      @Common.Label : 'Approved At';
  REJECTED_AT      @Common.Label : 'Rejected At';
  employee         @Common.Label : 'Employee'
                   @Common.Text  : employee.FULL_NAME  @Common.TextArrangement : #TextOnly;
  employee         @Common.ValueList : {
    CollectionPath : 'Employees',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : employee_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'FULL_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'EMPLOYEE_CODE' }
    ]
  };
  approver         @Common.Label : 'Approver'
                   @Common.Text  : approver.FULL_NAME  @Common.TextArrangement : #TextOnly;
  approver         @Common.ValueList : {
    CollectionPath : 'Employees',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : approver_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'FULL_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'EMPLOYEE_CODE' }
    ]
  };
};


// ===========================================================================
// TIMESHEET ENTRIES
// ===========================================================================
annotate service.TimesheetEntries with @(
  UI : {
    HeaderInfo : {
      TypeName       : 'Timesheet Entry',
      TypeNamePlural : 'Timesheet Entries',
      Title          : { Value : WORK_DATE },
      Description    : { Value : HOURS }
    },
    LineItem : [
      { Value : WORK_DATE,   Label : 'Work Date' },
      { Value : project_ID,  Label : 'Project', ![@Common.Text] : project.PROJECT_NAME },
      { Value : task_ID,     Label : 'Task', ![@Common.Text] : task.TASK_TITLE },
      { Value : HOURS,       Label : 'Hours' },
      { Value : DESCRIPTION, Label : 'Description' }
    ],
    FieldGroup #EntryInfo : {
      Label : 'Entry Details',
      Data  : [
        { Value : WORK_DATE,    Label : 'Work Date' },
        { Value : project_ID,   Label : 'Project' },
        { Value : task_ID,      Label : 'Task' },
        { Value : HOURS,        Label : 'Hours' },
        { Value : DESCRIPTION,  Label : 'Description' },
        { Value : timesheet_ID, Label : 'Timesheet' }
      ]
    },
    Facets : [
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'EntryInfoFacet',
        Label  : 'Entry Details',
        Target : '@UI.FieldGroup#EntryInfo'
      }
    ],
    Identification : [
      { Value : WORK_DATE }
    ]
  }
) {
  WORK_DATE   @Common.Label : 'Work Date';
  HOURS       @Common.Label : 'Hours';
  DESCRIPTION @Common.Label : 'Description';
  project     @Common.Label : 'Project'
              @Common.Text  : project.PROJECT_NAME  @Common.TextArrangement : #TextOnly;
  project     @Common.ValueList : {
    CollectionPath : 'Projects',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : project_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_CODE' }
    ]
  };
  task        @Common.Label : 'Task'
              @Common.Text  : task.TASK_TITLE  @Common.TextArrangement : #TextOnly;
  task        @Common.ValueList : {
    CollectionPath : 'Tasks',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : task_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'TASK_TITLE' }
    ]
  };
  timesheet   @Common.Label : 'Timesheet';
};


// ===========================================================================
// INVOICES
// ===========================================================================
annotate service.Invoices with @(
  UI : {
    HeaderInfo : {
      TypeName       : 'Invoice',
      TypeNamePlural : 'Invoices',
      Title          : { Value : INVOICE_NUMBER },
      Description    : { Value : STATUS }
    },
    SelectionFields : [
      STATUS,
      INVOICE_NUMBER,
      client_ID
    ],
    LineItem : [
      { Value : INVOICE_NUMBER,  Label : 'Invoice Number' },
      { Value : client_ID,       Label : 'Client', ![@Common.Text] : client.CLIENT_NAME },
      { Value : project_ID,      Label : 'Project', ![@Common.Text] : project.PROJECT_NAME },
      { Value : INVOICE_DATE,    Label : 'Invoice Date' },
      { Value : DUE_DATE,        Label : 'Due Date' },
      { Value : GROSS_AMOUNT,    Label : 'Gross Amount' },
      { Value : CURRENCY,        Label : 'Currency' },
      { Value : STATUS,          Label : 'Status' }
    ],
    FieldGroup #InvoiceInfo : {
      Label : 'Invoice Information',
      Data  : [
        { Value : INVOICE_NUMBER, Label : 'Invoice Number' },
        { Value : client_ID,      Label : 'Client' },
        { Value : project_ID,     Label : 'Project' },
        { Value : STATUS,         Label : 'Status' },
        { Value : INVOICE_DATE,   Label : 'Invoice Date' },
        { Value : DUE_DATE,       Label : 'Due Date' }
      ]
    },
    FieldGroup #InvoiceFinancial : {
      Label : 'Financial',
      Data  : [
        { Value : NET_AMOUNT,   Label : 'Net Amount' },
        { Value : TAX_AMOUNT,   Label : 'Tax Amount' },
        { Value : GROSS_AMOUNT, Label : 'Gross Amount' },
        { Value : PAID_AMOUNT,  Label : 'Paid Amount' },
        { Value : CURRENCY,     Label : 'Currency' }
      ]
    },
    FieldGroup #BillingPeriod : {
      Label : 'Billing Period',
      Data  : [
        { Value : BILLING_PERIOD_START, Label : 'Billing Period Start' },
        { Value : BILLING_PERIOD_END,   Label : 'Billing Period End' }
      ]
    },
    Facets : [
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'InvoiceInfoFacet',
        Label  : 'Invoice Information',
        Target : '@UI.FieldGroup#InvoiceInfo'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'InvoiceFinancialFacet',
        Label  : 'Financial',
        Target : '@UI.FieldGroup#InvoiceFinancial'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'BillingPeriodFacet',
        Label  : 'Billing Period',
        Target : '@UI.FieldGroup#BillingPeriod'
      }
    ],
    Identification : [
      { Value : INVOICE_NUMBER }
    ]
  }
) {
  INVOICE_NUMBER       @Common.Label : 'Invoice Number';
  INVOICE_DATE         @Common.Label : 'Invoice Date';
  DUE_DATE             @Common.Label : 'Due Date';
  STATUS               @Common.Label : 'Status';
  NET_AMOUNT           @Common.Label : 'Net Amount';
  TAX_AMOUNT           @Common.Label : 'Tax Amount';
  GROSS_AMOUNT         @Common.Label : 'Gross Amount';
  PAID_AMOUNT          @Common.Label : 'Paid Amount';
  CURRENCY             @Common.Label : 'Currency';
  BILLING_PERIOD_START @Common.Label : 'Billing Period Start';
  BILLING_PERIOD_END   @Common.Label : 'Billing Period End';
  client               @Common.Label : 'Client'
                       @Common.Text  : client.CLIENT_NAME  @Common.TextArrangement : #TextOnly;
  client               @Common.ValueList : {
    CollectionPath : 'Clients',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : client_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'CLIENT_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'CLIENT_CODE' }
    ]
  };
  project              @Common.Label : 'Project'
                       @Common.Text  : project.PROJECT_NAME  @Common.TextArrangement : #TextOnly;
  project              @Common.ValueList : {
    CollectionPath : 'Projects',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : project_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_CODE' }
    ]
  };
};


// ===========================================================================
// ALERTS
// ===========================================================================
annotate service.Alerts with @(
  UI : {
    HeaderInfo : {
      TypeName       : 'Alert',
      TypeNamePlural : 'Alerts',
      Title          : { Value : TITLE },
      Description    : { Value : ALERT_TYPE }
    },
    SelectionFields : [
      ALERT_TYPE,
      SEVERITY,
      IS_READ
    ],
    LineItem : [
      { Value : TITLE,       Label : 'Title' },
      { Value : ALERT_TYPE,  Label : 'Alert Type' },
      { Value : SEVERITY,    Label : 'Severity' },
      { Value : CREATED_ON,  Label : 'Created On' },
      { Value : IS_READ,     Label : 'Read' },
      { Value : IS_RESOLVED, Label : 'Resolved' }
    ],
    FieldGroup #AlertInfo : {
      Label : 'Alert Information',
      Data  : [
        { Value : TITLE,        Label : 'Title' },
        { Value : ALERT_TYPE,   Label : 'Alert Type' },
        { Value : SEVERITY,     Label : 'Severity' },
        { Value : MESSAGE,      Label : 'Message' },
        { Value : CREATED_ON,   Label : 'Created On' },
        { Value : IS_READ,      Label : 'Read' },
        { Value : recipient_ID, Label : 'Recipient' },
        { Value : project_ID,   Label : 'Project' }
      ]
    },
    FieldGroup #AlertResolution : {
      Label : 'Resolution',
      Data  : [
        { Value : IS_RESOLVED,  Label : 'Resolved' },
        { Value : RESOLVED_AT,  Label : 'Resolved At' }
      ]
    },
    Facets : [
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'AlertInfoFacet',
        Label  : 'Alert Information',
        Target : '@UI.FieldGroup#AlertInfo'
      },
      {
        $Type  : 'UI.ReferenceFacet',
        ID     : 'AlertResolutionFacet',
        Label  : 'Resolution',
        Target : '@UI.FieldGroup#AlertResolution'
      }
    ],
    Identification : [
      { Value : TITLE }
    ]
  }
) {
  TITLE        @Common.Label : 'Title';
  ALERT_TYPE   @Common.Label : 'Alert Type';
  SEVERITY     @Common.Label : 'Severity';
  MESSAGE      @Common.Label : 'Message';
  CREATED_ON   @Common.Label : 'Created On';
  IS_READ      @Common.Label : 'Read';
  IS_RESOLVED  @Common.Label : 'Resolved';
  RESOLVED_AT  @Common.Label : 'Resolved At';
  recipient    @Common.Label : 'Recipient'
               @Common.Text  : recipient.FULL_NAME  @Common.TextArrangement : #TextOnly;
  recipient    @Common.ValueList : {
    CollectionPath : 'Employees',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : recipient_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'FULL_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'EMPLOYEE_CODE' }
    ]
  };
  project      @Common.Label : 'Project'
               @Common.Text  : project.PROJECT_NAME  @Common.TextArrangement : #TextOnly;
  project      @Common.ValueList : {
    CollectionPath : 'Projects',
    Parameters     : [
      { $Type : 'Common.ValueListParameterInOut',    LocalDataProperty : project_ID,  ValueListProperty : 'ID' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_NAME' },
      { $Type : 'Common.ValueListParameterDisplayOnly', ValueListProperty : 'PROJECT_CODE' }
    ]
  };
};
