// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Set up authentication helper
Cypress.Commands.add('login', (username, password) => {
  cy.intercept('POST', 'http://localhost:8080/auth/login', {
    statusCode: 200,
    body: {
      token: 'test-jwt-token',
      role: 'ROLE_ADMIN',
    },
  }).as('loginRequest');

  cy.visit('/login');
  cy.get('input[type="text"]').type(username);
  cy.get('input[type="password"]').type(password);
  cy.get('button').contains(/login/i).click();
  cy.wait('@loginRequest');
});

// Set up authenticated session
Cypress.Commands.add('setAuth', (role = 'ROLE_ADMIN') => {
  cy.window().then((win) => {
    win.localStorage.setItem('token', 'test-jwt-token');
    win.localStorage.setItem('role', role);
  });
});

