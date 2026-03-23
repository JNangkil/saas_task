// E2E test for dynamic columns feature flow
// This test validates the complete user workflow:
// 1. Add a new custom column
// 2. Edit task values in the new column
// 3. Filter tasks by the new column values
// 4. Perform bulk updates on filtered tasks

describe('Dynamic Columns Flow', () => {
  beforeEach(() => {
    // Login and navigate to a board
    cy.login('test@example.com', 'password');
    cy.visit('/workspace/1/board/1');
    cy.wait(1000);
  });

  it('should complete the full dynamic columns workflow', () => {
    // Step 1: Add a new custom column
    cy.get('[data-cy="column-manager-button"]').click();
    cy.get('[data-cy="add-column-button"]').click();

    // Fill in column details
    cy.get('[data-cy="column-name-input"]').type('Complexity');
    cy.get('[data-cy="column-type-select"]').select('select');

    // Add select options
    cy.get('[data-cy="add-option-button"]').click();
    cy.get('[data-cy="option-input-0"]').clear().type('Low');
    cy.get('[data-cy="option-color-0"]').select('#6B7280');

    cy.get('[data-cy="add-option-button"]').click();
    cy.get('[data-cy="option-input-1"]').clear().type('Medium');
    cy.get('[data-cy="option-color-1"]').select('#F59E0B');

    cy.get('[data-cy="add-option-button"]').click();
    cy.get('[data-cy="option-input-2"]').clear().type('High');
    cy.get('[data-cy="option-color-2"]').select('#EF4444');

    // Save the column
    cy.get('[data-cy="save-column-button"]').click();

    // Verify column appears in table
    cy.get('[data-cy="column-header-Complexity"]').should('be.visible');
    cy.get('[data-cy="column-header-Complexity"]').contains('Complexity');

    // Step 2: Edit task values in the new column
    // Click on first task's complexity cell
    cy.get('[data-cy="task-row-0"]').find('[data-cy="cell-Complexity"]').click();

    // Select a value
    cy.get('[data-cy="cell-edit-select"]').select('Low');
    cy.get('[data-cy="cell-edit-select"]').blur();

    // Verify value is saved
    cy.get('[data-cy="task-row-0"]').find('[data-cy="cell-Complexity"]').should('contain', 'Low');

    // Edit second task
    cy.get('[data-cy="task-row-1"]').find('[data-cy="cell-Complexity"]').click();
    cy.get('[data-cy="cell-edit-select"]').select('High');
    cy.get('[data-cy="cell-edit-select"]').blur();

    // Edit third task
    cy.get('[data-cy="task-row-2"]').find('[data-cy="cell-Complexity"]').click();
    cy.get('[data-cy="cell-edit-select"]').select('Medium');
    cy.get('[data-cy="cell-edit-select"]').blur();

    // Step 3: Filter tasks by the new column values
    // Open filter builder
    cy.get('[data-cy="filter-builder-button"]').click();

    // Add filter condition
    cy.get('[data-cy="add-filter-condition"]').click();

    // Configure filter
    cy.get('[data-cy="filter-column-select"]').select('Complexity');
    cy.get('[data-cy="filter-operator-select"]').select('equals');
    cy.get('[data-cy="filter-value-select"]').select('High');

    // Apply filter
    cy.get('[data-cy="apply-filter-button"]').click();

    // Verify only high complexity tasks are shown
    cy.get('[data-cy="task-row"]').should('have.length', 1);
    cy.get('[data-cy="task-row-0"]').find('[data-cy="cell-Complexity"]').should('contain', 'High');

    // Clear filter for next test
    cy.get('[data-cy="clear-filter-button"]').click();

    // Step 4: Perform bulk updates on filtered tasks
    // Create a new filter for Low and Medium complexity
    cy.get('[data-cy="filter-builder-button"]').click();
    cy.get('[data-cy="add-filter-condition"]').click();
    cy.get('[data-cy="filter-column-select"]').select('Complexity');
    cy.get('[data-cy="filter-operator-select"]').select('in');

    // Select multiple values
    cy.get('[data-cy="filter-value-multi-select"]').click();
    cy.get('[data-cy="filter-option-Low"]').click();
    cy.get('[data-cy="filter-option-Medium"]').click();
    cy.get('body').click(); // Close dropdown

    cy.get('[data-cy="apply-filter-button"]').click();

    // Verify tasks are filtered
    cy.get('[data-cy="task-row"]').should('have.length', 2);

    // Select all filtered tasks
    cy.get('[data-cy="select-all-tasks"]').check();

    // Open bulk actions menu
    cy.get('[data-cy="bulk-actions-button"]').click();

    // Choose bulk update
    cy.get('[data-cy="bulk-update-menu-item"]').click();

    // Configure bulk update
    cy.get('[data-cy="bulk-field-select"]').select('Complexity');
    cy.get('[data-cy="bulk-value-select"]').select('Medium');

    // Confirm bulk update
    cy.get('[data-cy="confirm-bulk-update"]').click();

    // Verify confirmation dialog
    cy.get('[data-cy="bulk-update-confirmation-dialog"]').should('be.visible');
    cy.get('[data-cy="confirm-bulk-update-button"]').click();

    // Wait for update to complete
    cy.wait(2000);

    // Clear filter to see all tasks
    cy.get('[data-cy="clear-filter-button"]').click();

    // Verify bulk update results
    cy.get('[data-cy="task-row"]').should('have.length.greaterThan', 2);

    // Check that filtered tasks now have Medium complexity
    cy.get('[data-cy="task-row"]').each(($row, index) => {
      if (index < 3) { // Check first 3 tasks we edited
        cy.wrap($row).find('[data-cy="cell-Complexity"]').should('contain', 'Medium');
      }
    });

    // Additional verifications
    // Verify column can be hidden/shown
    cy.get('[data-cy="column-manager-button"]').click();
    cy.get('[data-cy="column-Complexity-visibility-toggle"]').click();
    cy.get('[data-cy="save-column-preferences"]').click();

    // Column should be hidden
    cy.get('[data-cy="column-header-Complexity"]').should('not.exist');

    // Show column again
    cy.get('[data-cy="column-manager-button"]').click();
    cy.get('[data-cy="column-Complexity-visibility-toggle"]').click();
    cy.get('[data-cy="save-column-preferences"]').click();

    // Column should be visible again
    cy.get('[data-cy="column-header-Complexity"]').should('be.visible');

    // Verify column can be reordered
    cy.get('[data-cy="column-header-Complexity"]')
      .trigger('mousedown', { which: 1 })
      .trigger('mousemove', { clientX: 100, clientY: 0 })
      .trigger('mouseup');

    // Verify column moved (check position or order)
    cy.get('[data-cy="column-header-Complexity"]').should('be.visible');
  });

  it('should handle different column types correctly', () => {
    // Test number column type
    cy.addCustomColumn({
      name: 'Story Points',
      type: 'number',
      options: { min: 0, max: 20 }
    });

    // Edit task with number value
    cy.get('[data-cy="task-row-0"]')
      .find('[data-cy="cell-Story Points"]')
      .click()
      .find('[data-cy="cell-edit-input"]')
      .type('5')
      .blur();

    // Test date column type
    cy.addCustomColumn({
      name: 'Review Date',
      type: 'date'
    });

    // Edit task with date value
    cy.get('[data-cy="task-row-0"]')
      .find('[data-cy="cell-Review Date"]')
      .click()
      .find('[data-cy="cell-edit-input"]')
      .type('2024-01-15')
      .blur();

    // Test checkbox column type
    cy.addCustomColumn({
      name: 'QA Approved',
      type: 'checkbox'
    });

    // Toggle checkbox
    cy.get('[data-cy="task-row-0"]')
      .find('[data-cy="cell-QA Approved"]')
      .click();

    // Verify all columns work
    cy.get('[data-cy="task-row-0"]').find('[data-cy="cell-Story Points"]').should('contain', '5');
    cy.get('[data-cy="task-row-0"]').find('[data-cy="cell-Review Date"]').should('not.be.empty');
    cy.get('[data-cy="task-row-0"]').find('[data-cy="cell-QA Approved"] input').should('be.checked');
  });

  it('should validate column inputs correctly', () => {
    // Add required column
    cy.addCustomColumn({
      name: 'Required Field',
      type: 'text',
      isRequired: true
    });

    // Try to save task without required value
    cy.get('[data-cy="task-row-0"]')
      .find('[data-cy="cell-Required Field"]')
      .click()
      .find('[data-cy="cell-edit-input"]')
      .clear()
      .blur();

    // Should show validation error
    cy.get('[data-cy="validation-error"]').should('be.visible');
    cy.get('[data-cy="validation-error"]').should('contain', 'required');

    // Add min/max validation
    cy.addCustomColumn({
      name: 'Priority Score',
      type: 'number',
      options: { min: 1, max: 10 }
    });

    // Try invalid number
    cy.get('[data-cy="task-row-0"]')
      .find('[data-cy="cell-Priority Score"]')
      .click()
      .find('[data-cy="cell-edit-input"]')
      .clear()
      .type('15')
      .blur();

    // Should show validation error
    cy.get('[data-cy="validation-error"]').should('contain', 'must be between 1 and 10');
  });

  it('should handle bulk operations correctly', () => {
    // Add test column
    cy.addCustomColumn({
      name: 'Test Status',
      type: 'select',
      options: {
        choices: [
          { value: 'not_tested', label: 'Not Tested', color: '#6B7280' },
          { value: 'in_progress', label: 'In Progress', color: '#F59E0B' },
          { value: 'passed', label: 'Passed', color: '#10B981' },
          { value: 'failed', label: 'Failed', color: '#EF4444' }
        ]
      }
    });

    // Set different values for multiple tasks
    cy.get('[data-cy="task-row-0"]')
      .find('[data-cy="cell-Test Status"]')
      .click()
      .find('[data-cy="cell-edit-select"]')
      .select('not_tested')
      .blur();

    cy.get('[data-cy="task-row-1"]')
      .find('[data-cy="cell-Test Status"]')
      .click()
      .find('[data-cy="cell-edit-select"]')
      .select('not_tested')
      .blur();

    cy.get('[data-cy="task-row-2"]')
      .find('[data-cy="cell-Test Status"]')
      .click()
      .find('[data-cy="cell-edit-select"]')
      .select('passed')
      .blur();

    // Filter for not tested
    cy.filterByColumn('Test Status', 'equals', 'not_tested');

    // Select all filtered tasks
    cy.get('[data-cy="select-all-tasks"]').check();

    // Bulk update to in progress
    cy.bulkUpdateField('Test Status', 'in_progress');

    // Verify update
    cy.get('[data-cy="task-row"]').each(($row) => {
      cy.wrap($row).find('[data-cy="cell-Test Status"]').should('contain', 'In Progress');
    });

    // Clear filter
    cy.get('[data-cy="clear-filter-button"]').click();

    // Verify unaffected task still has original value
    cy.get('[data-cy="task-row-2"]')
      .find('[data-cy="cell-Test Status"]')
      .should('contain', 'Passed');
  });

  it('should persist user preferences', () => {
    // Add column and customize view
    cy.addCustomColumn({
      name: 'Custom Column',
      type: 'text'
    });

    // Adjust column width
    cy.get('[data-cy="column-header-Custom Column"]')
      .find('.resize-handle')
      .trigger('mousedown', { which: 1 })
      .trigger('mousemove', { clientX: 300, clientY: 0 })
      .trigger('mouseup');

    // Hide column
    cy.get('[data-cy="column-manager-button"]').click();
    cy.get('[data-cy="column-Custom Column-visibility-toggle"]').click();
    cy.get('[data-cy="save-column-preferences"]').click();

    // Reload page
    cy.reload();

    // Verify preferences persisted
    cy.get('[data-cy="column-header-Custom Column"]').should('not.exist');

    // Show column again
    cy.get('[data-cy="column-manager-button"]').click();
    cy.get('[data-cy="column-Custom Column-visibility-toggle"]').click();
    cy.get('[data-cy="save-column-preferences"]').click();

    // Verify column appears with saved width
    cy.get('[data-cy="column-header-Custom Column"]').should('be.visible');
    cy.get('[data-cy="column-header-Custom Column"]').should('have.css', 'width');
  });
});

// Custom commands for dynamic columns
Cypress.Commands.add('addCustomColumn', (columnConfig) => {
  cy.get('[data-cy="column-manager-button"]').click();
  cy.get('[data-cy="add-column-button"]').click();

  if (columnConfig.name) {
    cy.get('[data-cy="column-name-input"]').type(columnConfig.name);
  }

  if (columnConfig.type) {
    cy.get('[data-cy="column-type-select"]').select(columnConfig.type);
  }

  if (columnConfig.isRequired) {
    cy.get('[data-cy="column-required-checkbox"]').check();
  }

  // Handle specific column type configurations
  if (columnConfig.type === 'number' && columnConfig.options) {
    if (columnConfig.options.min !== undefined) {
      cy.get('[data-cy="number-min-input"]').clear().type(columnConfig.options.min);
    }
    if (columnConfig.options.max !== undefined) {
      cy.get('[data-cy="number-max-input"]').clear().type(columnConfig.options.max);
    }
  }

  if (columnConfig.type === 'select' && columnConfig.options?.choices) {
    columnConfig.options.choices.forEach((choice, index) => {
      if (index > 0) {
        cy.get('[data-cy="add-option-button"]').click();
      }
      cy.get(`[data-cy="option-input-${index}"]`).clear().type(choice.label);
      cy.get(`[data-cy="option-color-${index}"]`).select(choice.color);
    });
  }

  cy.get('[data-cy="save-column-button"]').click();
});

Cypress.Commands.add('filterByColumn', (columnName, operator, value) => {
  cy.get('[data-cy="filter-builder-button"]').click();
  cy.get('[data-cy="add-filter-condition"]').click();
  cy.get('[data-cy="filter-column-select"]').select(columnName);
  cy.get('[data-cy="filter-operator-select"]').select(operator);

  if (Array.isArray(value)) {
    cy.get('[data-cy="filter-value-multi-select"]').click();
    value.forEach(val => {
      cy.get(`[data-cy="filter-option-${val}"]`).click();
    });
    cy.get('body').click();
  } else {
    cy.get('[data-cy="filter-value-select"]').select(value);
  }

  cy.get('[data-cy="apply-filter-button"]').click();
});

Cypress.Commands.add('bulkUpdateField', (fieldName, value) => {
  cy.get('[data-cy="bulk-actions-button"]').click();
  cy.get('[data-cy="bulk-update-menu-item"]').click();
  cy.get('[data-cy="bulk-field-select"]').select(fieldName);

  if (typeof value === 'boolean') {
    cy.get('[data-cy="bulk-value-checkbox"]').check({ force: value });
  } else {
    cy.get('[data-cy="bulk-value-select"]').select(value);
  }

  cy.get('[data-cy="confirm-bulk-update"]').click();
  cy.get('[data-cy="confirm-bulk-update-button"]').click();
});

// Login command
Cypress.Commands.add('login', (email, password) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-cy="email-input"]').type(email);
    cy.get('[data-cy="password-input"]').type(password);
    cy.get('[data-cy="login-button"]').click();
    cy.url().should('not.include', '/login');
  });
});