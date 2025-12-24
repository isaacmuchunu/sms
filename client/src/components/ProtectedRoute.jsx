import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';
import api from '../services/api';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const validateSession = async () => {
      const token = localStorage.getItem('sms_token');
      if (!token) {
        setIsValid(false);
        setChecking(false);
        return;
      }

      try {
        await api.get('/auth/me');
        if (!cancelled) {
          setIsValid(true);
        }
      } catch {
        // Token is invalid or expired; clear local session
        localStorage.removeItem('sms_token');
        localStorage.removeItem('sms_user');
        if (!cancelled) {
          setIsValid(false);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    validateSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || checking) {
    return <LoadingSpinner fullScreen />;
  }

  if (!isAuthenticated || !isValid) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
