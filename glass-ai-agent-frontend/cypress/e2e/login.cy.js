/**
 * E2E Tests for Login Flow
 * Tests user login, authentication, navigation
 */

describe('Login E2E Tests', () => {
  beforeEach(() => {
    // Clear localStorage and cookies
    cy.clearLocalStorage();
    cy.clearCookies();
    cy.visit('/login');
  });

  it('should display login form', () => {
    cy.get('input[type="text"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button').contains(/login/i).should('be.visible');
  });

  it('should login successfully with valid credentials', () => {
    // Mock API response
    cy.intercept('POST', 'http://localhost:8080/auth/login', {
      statusCode: 200,
      body: {
        token: 'test-jwt-token',
        role: 'ROLE_ADMIN',
      },
    }).as('loginRequest');

    cy.get('input[type="text"]').type('admin');
    cy.get('input[type="password"]').type('password123');
    cy.get('button').contains(/login/i).click();

    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
    cy.window().its('localStorage.token').should('exist');
  });

  it('should display error message on invalid credentials', () => {
    cy.intercept('POST', 'http://localhost:8080/auth/login', {
      statusCode: 401,
      body: 'Invalid username or password',
    }).as('loginRequest');

    cy.get('input[type="text"]').type('invaliduser');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button').contains(/login/i).click();

    cy.wait('@loginRequest');
    cy.contains(/invalid username or password/i).should('be.visible');
    cy.url().should('include', '/login');
  });

  it('should prevent login with empty fields', () => {
    cy.get('button').contains(/login/i).click();
    // Form validation should prevent submission
    cy.url().should('include', '/login');
  });

  it('should navigate to dashboard after successful login', () => {
    cy.intercept('POST', 'http://localhost:8080/auth/login', {
      statusCode: 200,
      body: {
        token: 'test-jwt-token',
        role: 'ROLE_ADMIN',
      },
    }).as('loginRequest');

    cy.intercept('GET', 'http://localhost:8080/stock/all', {
      statusCode: 200,
      body: [],
    }).as('getStock');

    cy.intercept('GET', 'http://localhost:8080/auth/staff', {
      statusCode: 200,
      body: [],
    }).as('getStaff');

    cy.intercept('GET', 'http://localhost:8080/audit/transfer-count', {
      statusCode: 200,
      body: 0,
    }).as('getTransferCount');

    cy.intercept('GET', 'http://localhost:8080/audit/recent', {
      statusCode: 200,
      body: [],
    }).as('getAuditLogs');

    cy.get('input[type="text"]').type('admin');
    cy.get('input[type="password"]').type('password123');
    cy.get('button').contains(/login/i).click();

    cy.wait('@loginRequest');
    cy.url().should('include', '/dashboard');
    cy.contains(/dashboard/i).should('be.visible');
  });
});

