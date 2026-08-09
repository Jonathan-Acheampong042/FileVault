import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { User, UserRole } from '@workspace/api-client-react';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('dtcms_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('dtcms_token');
  });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      localStorage.setItem('dtcms_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('dtcms_user');
    }
    if (token) {
      localStorage.setItem('dtcms_token', token);
    } else {
      localStorage.removeItem('dtcms_token');
    }
  }, [user, token]);

  const login = (newUser: User, newToken: string) => {
    // Write synchronously so that any component mounting on the next navigation
    // frame reads the correct user from localStorage before the useEffect fires.
    localStorage.setItem('dtcms_user', JSON.stringify(newUser));
    localStorage.setItem('dtcms_token', newToken);
    setUser(newUser);
    setToken(newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setLocation('/login');
  };

  const isAdmin = () => user?.role === UserRole.ADMIN;
  const isSecretary = () => user?.role === UserRole.SECRETARY;
  const isTreasurer = () => user?.role === UserRole.TREASURER;
  const isClientManager = () => user?.role === UserRole.CLIENT_MANAGER;
  const isDriver = () => user?.role === UserRole.DRIVER;
  const isCommittee = () => user?.role === UserRole.COMMITTEE;

  const hasAdminAccess = () => Boolean(
    user && (
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SECRETARY ||
      user.role === UserRole.TREASURER ||
      user.role === UserRole.CLIENT_MANAGER ||
      user.role === UserRole.COMMITTEE
    )
  );

  return {
    user,
    token,
    login,
    logout,
    isAdmin,
    isSecretary,
    isTreasurer,
    isClientManager,
    isDriver,
    isCommittee,
    hasAdminAccess
  };
}