'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { UserInfo } from '@/types/api';
import { authApi } from '@/lib/api/auth';
import { setAuthTimeoutHandler } from '@/lib/api/http';

interface AuthContextType {
  user: UserInfo | null;
  isSuperAdmin: boolean;
  impersonatedAgencyId: string | null;
  impersonatedAgencyName: string | null;
  /** The agency ID to use for agency-scoped API calls.
   *  Returns impersonatedAgencyId when impersonating, otherwise user's own agencyId. */
  effectiveAgencyId: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  impersonateAgency: (agencyId: string, name: string) => void;
  stopImpersonating: () => void;
  handleAuthTimeout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Decode a JWT and check whether it is still valid (not expired).
 * Returns true if the token exists and has not expired.
 */
const isTokenValid = (): boolean => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;

    // JWT: header.payload.signature
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return false;

    // Base64url decode
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    // exp is in seconds since epoch
    const exp = payload.exp;
    if (!exp) return true; // no expiry claim — treat as valid

    const nowSeconds = Math.floor(Date.now() / 1000);
    return exp > nowSeconds;
  } catch {
    // If we can't decode the token, treat it as invalid
    return false;
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [impersonatedAgencyId, setImpersonatedAgencyId] = useState<string | null>(null);
  const [impersonatedAgencyName, setImpersonatedAgencyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const expiryCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Check if user is already logged in — validate token expiry before restoring state
    const checkAuth = async () => {
      try {
        const tokenValid = isTokenValid();

        if (tokenValid) {
          const savedUser = localStorage.getItem('user');
          const savedImpersonatedId = localStorage.getItem('impersonatedAgencyId');
          const savedImpersonatedName = localStorage.getItem('impersonatedAgencyName');

          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            setIsSuperAdmin(parsedUser.isSuperAdmin || false);
          }

          if (savedImpersonatedId) {
            setImpersonatedAgencyId(savedImpersonatedId);
          }
          if (savedImpersonatedName) {
            setImpersonatedAgencyName(savedImpersonatedName);
          }
        } else {
          // Token expired or missing — clean up stale localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('meta');
          localStorage.removeItem('impersonatedAgencyId');
          localStorage.removeItem('impersonatedAgencyName');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Register the auth timeout handler with the HTTP client
  useEffect(() => {
    setAuthTimeoutHandler(handleAuthTimeout);
  }, []);

  // Proactive token expiry check — every 60 seconds, clear state if token expired
  useEffect(() => {
    expiryCheckInterval.current = setInterval(() => {
      if (!isTokenValid()) {
        console.log('Token expired — logging out proactively');
        // Fire-and-forget: clear local state (no redirect needed if already on login page)
        setUser(null);
        setIsSuperAdmin(false);
        setImpersonatedAgencyId(null);
        setImpersonatedAgencyName(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('meta');
        localStorage.removeItem('impersonatedAgencyId');
        localStorage.removeItem('impersonatedAgencyName');
      }
    }, 60_000);

    return () => {
      if (expiryCheckInterval.current) {
        clearInterval(expiryCheckInterval.current);
      }
    };
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response: any = await authApi.login({ email, password, IsWebClient: true, RememberMe: rememberMe } as any);

      if (response.success) {
        const { token, user } = response.data;

        setUser(user);
        setIsSuperAdmin(user.isSuperAdmin || false);

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    // Call backend logout to sign out the Identity cookie
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://ec2-54-66-59-41.ap-southeast-2.compute.amazonaws.com:8080/api'}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
      }
    } catch {
      // Backend logout is best-effort — proceed with local cleanup even if it fails
      console.warn('Backend logout call failed, continuing with local cleanup');
    }

    setUser(null);
    setIsSuperAdmin(false);
    setImpersonatedAgencyId(null);
    setImpersonatedAgencyName(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('meta');
    localStorage.removeItem('impersonatedAgencyId');
    localStorage.removeItem('impersonatedAgencyName');
  }, []);

  const impersonateAgency = (agencyId: string, name: string) => {
    setImpersonatedAgencyId(agencyId);
    setImpersonatedAgencyName(name);
    localStorage.setItem('impersonatedAgencyId', String(agencyId));
    localStorage.setItem('impersonatedAgencyName', name);
  };

  const stopImpersonating = () => {
    setImpersonatedAgencyId(null);
    setImpersonatedAgencyName(null);
    localStorage.removeItem('impersonatedAgencyId');
    localStorage.removeItem('impersonatedAgencyName');
  };

  const handleAuthTimeout = useCallback(() => {
    console.log('Authentication timeout detected, redirecting to login...');
    // Fire-and-forget the async logout; redirect immediately
    logout().finally(() => {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    });
  }, [logout]);

  const effectiveAgencyId = impersonatedAgencyId ?? user?.agencyId ?? null;

  const value: AuthContextType = {
    user,
    isSuperAdmin,
    impersonatedAgencyId,
    impersonatedAgencyName,
    effectiveAgencyId,
    login,
    logout,
    impersonateAgency,
    stopImpersonating,
    handleAuthTimeout,
    isLoading,
    isAuthenticated: !!user && isTokenValid(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
