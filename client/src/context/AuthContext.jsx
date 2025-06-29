import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

export const AuthContext = createContext(null);

const SESSION_IDLE_TIMEOUT_MS = Number(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MS) || 15 * 60 * 1000;
const SESSION_WARNING_MS = Math.max(60 * 1000, SESSION_IDLE_TIMEOUT_MS - 60 * 1000);

const clearStoredSession = () => {
  localStorage.removeItem('sms_token');
  localStorage.removeItem('sms_user');
};

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('sms_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const warningToastRef = useRef(null);
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);

  const isAuthenticated = useMemo(() => !!user, [user]);

  const resetIdleTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (warningToastRef.current) {
      toast.dismiss(warningToastRef.current);
      warningToastRef.current = null;
    }

    if (!isAuthenticated || !user) return;

    warningTimerRef.current = setTimeout(() => {
      warningToastRef.current = toast.error(
        'You have been idle. You will be logged out in 1 minute.',
        { duration: 60000 }
      );
    }, SESSION_WARNING_MS);

    idleTimerRef.current = setTimeout(() => {
      clearStoredSession();
      setUser(null);
      setSessionExpired(true);
      toast.error('Session expired due to inactivity. Please log in again.');
      navigate('/login', { replace: true });
    }, SESSION_IDLE_TIMEOUT_MS);
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handler = () => resetIdleTimers();

    events.forEach((event) => window.addEventListener(event, handler, { passive: true }));
    resetIdleTimers();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [isAuthenticated, resetIdleTimers]);

  // Prevent authenticated pages from appearing after logout via browser Back/Forward
  useEffect(() => {
    const handlePopState = () => {
      if (!isAuthenticated && window.location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated, navigate]);

  const login = useCallback(
    async (credentials) => {
      setIsLoading(true);
      try {
        const response = await api.post('/auth/login', credentials);
        const { user: userData, token } = response.data.data;

        localStorage.setItem('sms_token', token);
        localStorage.setItem('sms_user', JSON.stringify(userData));
        setUser(userData);
        setSessionExpired(false);

        toast.success(`Welcome back, ${userData.firstName || userData.name}!`);
        const homePath =
          userData.role === 'parent' ? '/parent' : userData.role === 'super_admin' ? '/schools' : '/dashboard';
        navigate(homePath, { replace: true });
        return { success: true };
      } catch (error) {
        const message =
          error.response?.data?.message || 'Login failed. Please try again.';
        toast.error(message);
        return { success: false, message };
      } finally {
        setIsLoading(false);
      }
    },
    [navigate]
  );

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data?.data?.user;
      if (userData) {
        localStorage.setItem('sms_user', JSON.stringify(userData));
        setUser(userData);
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to refresh user' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Local logout should still complete if the server session is already gone.
    }
    clearStoredSession();
    setUser(null);
    setSessionExpired(false);
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });

    // Clear history state so Back cannot return to authenticated pages
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '/login');
    }
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      sessionExpired,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, isAuthenticated, sessionExpired, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
