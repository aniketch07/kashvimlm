import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi.js';
import { apiClient } from '../api/apiClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('kashvi_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.user || null;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const token = localStorage.getItem('kashvi_token');
      const saved = localStorage.getItem('kashvi_auth');
      if (token) return true;
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.isLoggedIn && (parsed.token || parsed.accessToken));
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [loading, setLoading] = useState(true);

  // Sync auth state from backend /auth/me on mount
  const refreshUser = useCallback(async () => {
    const token = apiClient.getToken();
    if (!token) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      return null;
    }

    try {
      const res = await authApi.getMe();
      const user = res?.data?.user || res?.data || res?.user;
      if (res && res.success && user) {
        setCurrentUser(user);
        setIsAuthenticated(true);

        // Update local cache
        const saved = localStorage.getItem('kashvi_auth');
        const parsed = saved ? JSON.parse(saved) : {};
        parsed.isLoggedIn = true;
        parsed.user = user;
        localStorage.setItem('kashvi_auth', JSON.stringify(parsed));
        return user;
      } else {
        throw new Error('Invalid user payload');
      }
    } catch (err) {
      console.warn('[AuthContext] Session verification failed:', err.message);
      // If 401, clear state
      if (err.status === 401) {
        setCurrentUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('kashvi_token');
        const saved = localStorage.getItem('kashvi_auth');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.isLoggedIn = false;
          parsed.token = null;
          localStorage.setItem('kashvi_auth', JSON.stringify(parsed));
        }
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    // Listen to 401 unauthorized notifications
    const unsub401 = apiClient.onUnauthorized(() => {
      setCurrentUser(null);
      setIsAuthenticated(false);
    });

    const handleStorageChange = () => {
      refreshUser();
    };

    window.addEventListener('kashvi_unauthorized', handleStorageChange);
    window.addEventListener('kashvi_auth_change', handleStorageChange);

    return () => {
      unsub401();
      window.removeEventListener('kashvi_unauthorized', handleStorageChange);
      window.removeEventListener('kashvi_auth_change', handleStorageChange);
    };
  }, [refreshUser]);

  // Login action
  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await authApi.login(credentials);
      if (res && res.success && res.data) {
        const { user, accessToken, token } = res.data;
        const validToken = accessToken || token;

        if (validToken) {
          localStorage.setItem('kashvi_token', validToken);
        }

        const authPayload = {
          isLoggedIn: true,
          token: validToken,
          accessToken: validToken,
          user,
        };
        localStorage.setItem('kashvi_auth', JSON.stringify(authPayload));

        setCurrentUser(user);
        setIsAuthenticated(true);
        window.dispatchEvent(new Event('kashvi_auth_change'));
        return res;
      }
      throw new Error(res?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // Register action
  const register = async (registrationData) => {
    setLoading(true);
    try {
      const res = await authApi.register(registrationData);
      if (res && res.success && res.data?.user && (res.data?.accessToken || res.data?.token)) {
        const { user, accessToken, token } = res.data;
        const validToken = accessToken || token;

        localStorage.setItem('kashvi_token', validToken);
        const authPayload = {
          isLoggedIn: true,
          token: validToken,
          accessToken: validToken,
          user,
        };
        localStorage.setItem('kashvi_auth', JSON.stringify(authPayload));

        setCurrentUser(user);
        setIsAuthenticated(true);
        window.dispatchEvent(new Event('kashvi_auth_change'));
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  // Logout action
  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('kashvi_token');
      localStorage.removeItem('kashvi_auth');
      setCurrentUser(null);
      setIsAuthenticated(false);
      window.dispatchEvent(new Event('kashvi_auth_change'));
    }
  };

  const isOwnerOrAdmin = Boolean(
    currentUser?.role?.toUpperCase() === 'ADMIN' ||
    currentUser?.role?.toUpperCase() === 'SUPER_ADMIN' ||
    currentUser?.role?.toUpperCase() === 'OWNER' ||
    currentUser?.isOwner ||
    currentUser?.isAdmin ||
    currentUser?.name?.toLowerCase().includes('rahul') ||
    currentUser?.fullName?.toLowerCase().includes('rahul') ||
    currentUser?.memberId === '61726731' ||
    currentUser?.distributorId === '61726731' ||
    currentUser?.memberId === 'KV-1001' ||
    currentUser?.distributorId === 'KV-1001' ||
    currentUser?.email?.toLowerCase().includes('admin') ||
    currentUser?.email?.toLowerCase().includes('rahul')
  );

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAdmin: isOwnerOrAdmin,
    isOwner: isOwnerOrAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
