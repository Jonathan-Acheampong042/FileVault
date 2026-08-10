'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

const AuthContext = createContext(undefined);

// BUG-097: useAuth() used to be a plain hook every component called
// independently — Navbar, Sidebar, RoleGuard, and every protected page
// each did their own separate Supabase session fetch and /auth/me call,
// each with its own out-of-sync loading state. That caused the Sidebar to
// visibly flash on every navigation into /admin/* (it remounts fresh, so
// its own useAuth() call restarted from loading=true every time) and is
// the likely source of the "Invalid or expired token" race — two
// near-simultaneous /auth/me calls firing on every mount. This makes
// there be exactly one session subscription and one /auth/me fetch for
// the whole app; everything else now reads the same resolved state.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async (session) => {
      if (!session) {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const result = await api.get('/auth/me');
        if (isMounted) {
          setUser(result?.data?.user ?? result?.data ?? null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // onAuthStateChange fires immediately with the current session as soon
    // as you subscribe — a separate getSession() call isn't needed and was
    // causing two near-simultaneous /auth/me calls on every mount.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    user,
    loading,
    isAdmin: () => user?.role === 'ADMIN',
    isTreasurer: () => user?.role === 'TREASURER',
    isClientManager: () => user?.role === 'CLIENT_MANAGER',
    isSecretary: () => user?.role === 'SECRETARY',
    isDriver: () => user?.role === 'DRIVER',
    isCommittee: () => user?.role === 'COMMITTEE',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}