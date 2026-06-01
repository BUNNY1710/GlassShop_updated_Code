# Testing Guide

## Overview

This document provides a comprehensive guide to running and understanding the test suite for the Glass Shop Application.

## Test Structure

### Backend Tests (Spring Boot)

#### Unit Tests
- **Location**: `GlassShop/src/test/java/com/glassshop/ai/`
- **Controllers**: `controller/*Test.java`
- **Services**: `service/*Test.java`
- **Repositories**: Tested via integration tests

#### Integration Tests
- **Location**: `GlassShop/src/test/java/com/glassshop/ai/integration/`
- **AuthIntegrationTest**: Full authentication flow with database

#### Security Tests
- **Location**: `GlassShop/src/test/java/com/glassshop/ai/security/`
- **SecurityConfigTest**: Role-based access control
- **SecurityVulnerabilityTest**: SQL Injection, XSS, CSRF tests

#### Performance Tests
- **Location**: `GlassShop/src/test/java/com/glassshop/ai/performance/`
- **PerformanceTest**: Response time, concurrent requests, load tests

### Frontend Tests (React)

#### Unit Tests
- **Location**: `glass-ai-agent-frontend/src/**/__tests__/`
- **Components**: Component rendering and interaction tests
- **Pages**: Page-level functionality tests

#### E2E Tests (Cypress)
- **Location**: `glass-ai-agent-frontend/cypress/e2e/`
- **login.cy.js**: Login flow tests
- **dashboard.cy.js**: Dashboard functionality tests
- **stock-management.cy.js**: Stock management tests

## Running Tests

### Backend Tests

```bash
# Run all tests
cd GlassShop
mvn test

# Run specific test class
mvn test -Dtest=AuthControllerTest

# Run with coverage report
mvn test jacoco:report

# View coverage report
open GlassShop/target/site/jacoco/index.html
```

### Frontend Tests

```bash
# Run unit tests
cd glass-ai-agent-frontend
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests (Cypress)
npm run cypress:open    # Interactive mode
npm run cypress:run     # Headless mode
npm run test:e2e        # Alias for cypress:run
```

## Test Coverage Goals

- **Backend**: Minimum 70% code coverage
- **Frontend**: Minimum 60% code coverage
- **Critical Paths**: 100% coverage (authentication, stock management)

## Test Categories

### 1. Unit Tests
- **Purpose**: Test individual components in isolation
- **Tools**: JUnit 5, Mockito (Backend), Jest, React Testing Library (Frontend)
- **Coverage**: Controllers, Services, Components

### 2. Integration Tests
- **Purpose**: Test component interactions with database
- **Tools**: Spring Boot Test, H2 Database
- **Coverage**: Full authentication flow, API endpoints

### 3. Security Tests
- **Purpose**: Validate security configurations and vulnerability prevention
- **Coverage**: 
  - SQL Injection prevention
  - XSS prevention
  - CSRF protection
  - Role-based access control
  - JWT token validation

### 4. Performance Tests
- **Purpose**: Ensure acceptable response times and load handling
- **Coverage**:
  - Response time validation
  - Concurrent request handling
  - Load testing
  - Memory leak detection

### 5. E2E Tests
- **Purpose**: Test complete user workflows
- **Tools**: Cypress
- **Coverage**:
  - User login/logout
  - Dashboard navigation
  - Stock management operations

## Test Data

### Backend Test Data
- Uses H2 in-memory database for tests
- Test data is created in `@BeforeEach` methods
- Data is cleaned up after each test (`@Transactional`)

### Frontend Test Data
- Uses mocked API responses
- Test data defined in test files
- No actual API calls during unit tests

## Best Practices

1. **Isolation**: Each test should be independent
2. **Naming**: Use descriptive test names (`testMethodName_Scenario_ExpectedResult`)
3. **Arrange-Act-Assert**: Follow AAA pattern
4. **Mocking**: Mock external dependencies
5. **Cleanup**: Clean up test data after tests
6. **Coverage**: Aim for high coverage but focus on critical paths

## Troubleshooting

### Backend Tests Failing

1. **Check H2 Database**: Ensure H2 is properly configured in `application-test.properties`
2. **Security Context**: Verify `@WithMockUser` annotations are correct
3. **Dependencies**: Ensure all Maven dependencies are resolved

### Frontend Tests Failing

1. **Mock Setup**: Verify API mocks are properly configured
2. **Async Operations**: Use `waitFor` for async operations
3. **Router**: Ensure `BrowserRouter` wraps components in tests

### E2E Tests Failing

1. **Server Running**: Ensure backend and frontend servers are running
2. **Base URL**: Check `cypress.config.js` baseUrl configuration
3. **API Mocks**: Verify API intercepts are correctly set up

## Continuous Integration

Tests should be run automatically on:
- Pull requests
- Commits to main branch
- Before deployments

## Test Reports

### Backend Coverage Report
- **Location**: `GlassShop/target/site/jacoco/index.html`
- **Generated**: After running `mvn test jacoco:report`

### Frontend Coverage Report
- **Location**: `glass-ai-agent-frontend/coverage/`
- **Generated**: After running `npm run test:coverage`

### E2E Test Reports
- **Location**: `glass-ai-agent-frontend/cypress/videos/` and `cypress/screenshots/`
- **Generated**: After running Cypress tests

## Next Steps

1. Add more integration tests for complex workflows
2. Increase test coverage to meet goals
3. Add performance benchmarks
4. Set up CI/CD pipeline for automated testing
5. Add visual regression tests for UI components

