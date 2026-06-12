import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('sms_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = useMemo(() => !!user, [user]);

  const login = useCallback(
    async (credentials) => {
      setIsLoading(true);
      try {
        const response = await api.post('/auth/login', credentials);
        const { user: userData, token } = response.data.data;

        localStorage.setItem('sms_token', token);
        localStorage.setItem('sms_user', JSON.stringify(userData));
        setUser(userData);

        toast.success(`Welcome back, ${userData.firstName || userData.name}!`);
        navigate('/dashboard');
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

  const logout = useCallback(() => {
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/login');
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      login,
      logout,
    }),
    [user, isLoading, isAuthenticated, login, logout]
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
