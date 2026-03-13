'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserInfo } from '@/types/api';
import { authApi } from '@/lib/api';
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
  logout: () => void;
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

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [impersonatedAgencyId, setImpersonatedAgencyId] = useState<string | null>(null);
  const [impersonatedAgencyName, setImpersonatedAgencyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (you could check localStorage or make a verify endpoint)
    const checkAuth = async () => {
      try {
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

  const login = async (email: string, password: string, rememberMe: boolean = false): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authApi.login({
        email,
        password,
        IsWebClient: true,
        RememberMe: rememberMe
      });

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

  const logout = () => {
    setUser(null);
    setIsSuperAdmin(false);
    setImpersonatedAgencyId(null);
    setImpersonatedAgencyName(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('meta');
    localStorage.removeItem('impersonatedAgencyId');
    localStorage.removeItem('impersonatedAgencyName');
  };

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

  const handleAuthTimeout = () => {
    console.log('Authentication timeout detected, redirecting to login...');
    logout();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

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
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};




