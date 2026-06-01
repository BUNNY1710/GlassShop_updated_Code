/**
 * ProfileMenu Component Tests
 * Tests dropdown menu, profile display, change password modal
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfileMenu from '../ProfileMenu';
import * as api from '../../api/api';

// Mock the API module
jest.mock('../../api/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('ProfileMenu Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('ROLE_ADMIN');
  });

  const renderProfileMenu = () => {
    return render(
      <BrowserRouter>
        <ProfileMenu />
      </BrowserRouter>
    );
  };

  test('renders profile icon', () => {
    api.get.mockResolvedValue({
      data: {
        username: 'testuser',
        role: 'ROLE_ADMIN',
        shopName: 'Test Shop',
      },
    });
    renderProfileMenu();
    // Profile icon should be rendered (check for icon or button)
    expect(screen.getByRole('button') || screen.getByTestId('profile-icon')).toBeTruthy();
  });

  test('opens dropdown on icon click', async () => {
    api.get.mockResolvedValue({
      data: {
        username: 'testuser',
        role: 'ROLE_ADMIN',
        shopName: 'Test Shop',
      },
    });
    renderProfileMenu();

    const profileButton = screen.getByRole('button');
    fireEvent.click(profileButton);

    await waitFor(() => {
      expect(screen.getByText(/testuser/i)).toBeInTheDocument();
    });
  });

  test('displays user profile information', async () => {
    api.get.mockResolvedValue({
      data: {
        username: 'testuser',
        role: 'ROLE_ADMIN',
        shopName: 'Test Shop',
      },
    });
    renderProfileMenu();

    const profileButton = screen.getByRole('button');
    fireEvent.click(profileButton);

    await waitFor(() => {
      expect(screen.getByText(/testuser/i)).toBeInTheDocument();
      expect(screen.getByText(/test shop/i)).toBeInTheDocument();
    });
  });

  test('opens change password modal', async () => {
    api.get.mockResolvedValue({
      data: {
        username: 'testuser',
        role: 'ROLE_ADMIN',
        shopName: 'Test Shop',
      },
    });
    renderProfileMenu();

    const profileButton = screen.getByRole('button');
    fireEvent.click(profileButton);

    await waitFor(() => {
      const changePasswordButton = screen.getByText(/change password/i);
      fireEvent.click(changePasswordButton);
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/old password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });
  });

  test('handles logout', async () => {
    api.get.mockResolvedValue({
      data: {
        username: 'testuser',
        role: 'ROLE_ADMIN',
        shopName: 'Test Shop',
      },
    });
    renderProfileMenu();

    const profileButton = screen.getByRole('button');
    fireEvent.click(profileButton);

    await waitFor(() => {
      const logoutButton = screen.getByText(/logout/i);
      fireEvent.click(logoutButton);
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('role');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('closes dropdown on outside click', async () => {
    api.get.mockResolvedValue({
      data: {
        username: 'testuser',
        role: 'ROLE_ADMIN',
        shopName: 'Test Shop',
      },
    });
    renderProfileMenu();

    const profileButton = screen.getByRole('button');
    fireEvent.click(profileButton);

    await waitFor(() => {
      expect(screen.getByText(/testuser/i)).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText(/testuser/i)).not.toBeInTheDocument();
    });
  });
});

