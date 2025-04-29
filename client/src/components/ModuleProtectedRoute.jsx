import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import ProtectedRoute from './ProtectedRoute';

const ModuleGuard = ({ module, children }) => {
  const { user } = useAuth();
  if (!user || user.modules?.[module] !== true) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const ModuleProtectedRoute = ({ module, children, allowedRoles }) => {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <ModuleGuard module={module}>
        {children}
      </ModuleGuard>
    </ProtectedRoute>
  );
};

export default ModuleProtectedRoute;
