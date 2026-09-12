import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { readSavedUser, useAuth } from '../contexts/AuthContext';
import { Zap } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false, requireSuperAdmin = false }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const sessionUser = user || readSavedUser();

  if (!isAuthenticated && !sessionUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireSuperAdmin && sessionUser?.role !== 'superadmin') {
    return <Navigate to="/dashboard/citizen" replace />;
  }

  if (requireAdmin && sessionUser?.role !== 'admin' && sessionUser?.role !== 'superadmin') {
    return <Navigate to="/dashboard/citizen" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
