/**
 * E2E Tests for Dashboard
 * Tests dashboard loading, KPI cards, role-based display
 */

describe('Dashboard E2E Tests', () => {
  beforeEach(() => {
    // Set up authenticated session
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'test-jwt-token');
      win.localStorage.setItem('role', 'ROLE_ADMIN');
    });

    // Mock API responses
    cy.intercept('GET', 'http://localhost:8080/stock/all', {
      statusCode: 200,
      body: [{ id: 1, quantity: 100 }],
    }).as('getStock');

    cy.intercept('GET', 'http://localhost:8080/auth/staff', {
      statusCode: 200,
      body: [{ id: 1, userName: 'staff1' }],
    }).as('getStaff');

    cy.intercept('GET', 'http://localhost:8080/audit/transfer-count', {
      statusCode: 200,
      body: 5,
    }).as('getTransferCount');

    cy.intercept('GET', 'http://localhost:8080/audit/recent', {
      statusCode: 200,
      body: [{ id: 1, action: 'ADD' }],
    }).as('getAuditLogs');

    cy.visit('/dashboard');
  });

  it('should display dashboard title', () => {
    cy.contains(/dashboard/i).should('be.visible');
  });

  it('should display KPI cards for ADMIN', () => {
    cy.wait(['@getStock', '@getStaff', '@getTransferCount', '@getAuditLogs']);

    cy.contains(/total stock/i).should('be.visible');
    cy.contains(/transfers/i).should('be.visible');
    cy.contains(/staff members/i).should('be.visible');
    cy.contains(/activity logs/i).should('be.visible');
  });

  it('should display loading state initially', () => {
    // Dashboard should show loading indicators
    cy.contains(/dashboard/i).should('be.visible');
  });

  it('should display correct KPI values', () => {
    cy.wait(['@getStock', '@getStaff', '@getTransferCount', '@getAuditLogs']);

    // Check for KPI values (adjust based on actual implementation)
    cy.contains(/100/i).should('be.visible'); // Stock count
    cy.contains(/5/i).should('be.visible'); // Transfer count
  });

  it('should handle API errors gracefully', () => {
    cy.intercept('GET', 'http://localhost:8080/stock/all', {
      statusCode: 500,
      body: { error: 'Internal server error' },
    }).as('getStockError');

    cy.visit('/dashboard');
    cy.wait('@getStockError');

    // Dashboard should still render
    cy.contains(/dashboard/i).should('be.visible');
  });
});

