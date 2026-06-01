/**
 * E2E Tests for Stock Management
 * Tests stock viewing, adding, removing, transferring
 */

describe('Stock Management E2E Tests', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'test-jwt-token');
      win.localStorage.setItem('role', 'ROLE_ADMIN');
    });

    cy.intercept('GET', 'http://localhost:8080/stock/all', {
      statusCode: 200,
      body: [
        {
          id: 1,
          glass: { type: '5MM' },
          standNo: 1,
          quantity: 100,
          minQuantity: 10,
        },
      ],
    }).as('getStock');

    cy.visit('/stock');
  });

  it('should display stock table', () => {
    cy.wait('@getStock');
    cy.contains(/glass type/i).should('be.visible');
    cy.contains(/stand/i).should('be.visible');
    cy.contains(/quantity/i).should('be.visible');
  });

  it('should filter stock by glass type', () => {
    cy.wait('@getStock');
    cy.get('input[placeholder*="filter"]').type('5MM');
    cy.contains('5MM').should('be.visible');
  });

  it('should open add/remove modal', () => {
    cy.wait('@getStock');
    cy.contains(/add.*remove/i).first().click();
    cy.contains(/quantity/i).should('be.visible');
    cy.contains(/add/i).should('be.visible');
    cy.contains(/remove/i).should('be.visible');
  });

  it('should add stock successfully', () => {
    cy.intercept('POST', 'http://localhost:8080/stock/update', {
      statusCode: 200,
      body: '✅ Stock updated successfully',
    }).as('updateStock');

    cy.wait('@getStock');
    cy.contains(/add.*remove/i).first().click();
    cy.get('input[type="number"]').type('50');
    cy.contains(/add/i).click();
    cy.contains(/ok/i).click();

    cy.wait('@updateStock');
    cy.contains(/successfully/i).should('be.visible');
  });

  it('should open transfer modal', () => {
    cy.wait('@getStock');
    cy.contains(/transfer/i).first().click();
    cy.contains(/from stand/i).should('be.visible');
    cy.contains(/to stand/i).should('be.visible');
  });
});

