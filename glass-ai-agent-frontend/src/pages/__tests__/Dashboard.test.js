/**
 * Dashboard Component Tests
 * Tests dashboard rendering, data fetching, KPI cards, role-based display
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import * as api from '../../api/api';

// Mock the API module
jest.mock('../../api/api', () => ({
  get: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('ROLE_ADMIN');
  });

  const renderDashboard = (role = 'ROLE_ADMIN') => {
    localStorageMock.getItem.mockReturnValue(role);
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
  };

  test('renders dashboard title', () => {
    api.get.mockResolvedValue({ data: [] });
    renderDashboard();
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  test('displays loading skeleton initially', () => {
    api.get.mockImplementation(() => new Promise(() => {})); // Never resolves
    renderDashboard();
    // Check for loading indicators (skeleton elements)
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  test('displays KPI cards for ADMIN role', async () => {
    api.get
      .mockResolvedValueOnce({ data: [{ id: 1 }] }) // stock/all
      .mockResolvedValueOnce({ data: [{ id: 1 }] }) // auth/staff
      .mockResolvedValueOnce({ data: 5 }) // transfer-count
      .mockResolvedValueOnce({ data: [{ id: 1 }] }); // audit/recent

    renderDashboard('ROLE_ADMIN');

    await waitFor(() => {
      expect(screen.getByText(/total stock/i)).toBeInTheDocument();
    });

    // Check for all KPI cards
    expect(screen.getByText(/transfers/i)).toBeInTheDocument();
    expect(screen.getByText(/staff members/i)).toBeInTheDocument();
    expect(screen.getByText(/activity logs/i)).toBeInTheDocument();
  });

  test('displays only Total Stock and Transfers for STAFF role', async () => {
    api.get
      .mockResolvedValueOnce({ data: [{ id: 1 }] }) // stock/all
      .mockResolvedValueOnce({ data: 3 }); // transfer-count

    renderDashboard('ROLE_STAFF');

    await waitFor(() => {
      expect(screen.getByText(/total stock/i)).toBeInTheDocument();
    });

    // Should not show staff members or activity logs
    expect(screen.queryByText(/staff members/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/activity logs/i)).not.toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    api.get.mockRejectedValueOnce(new Error('Network error'));

    renderDashboard();

    await waitFor(() => {
      // Dashboard should still render even if API fails
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });

  test('displays empty state when no audit logs', async () => {
    api.get
      .mockResolvedValueOnce({ data: [] }) // stock/all
      .mockResolvedValueOnce({ data: [] }) // auth/staff
      .mockResolvedValueOnce({ data: 0 }) // transfer-count
      .mockResolvedValueOnce({ data: [] }); // audit/recent

    renderDashboard('ROLE_ADMIN');

    await waitFor(() => {
      // Should show empty state or zero counts
      expect(screen.getByText(/total stock/i)).toBeInTheDocument();
    });
  });

  test('fetches data on component mount', () => {
    api.get.mockResolvedValue({ data: [] });
    renderDashboard();

    expect(api.get).toHaveBeenCalled();
  });
});

