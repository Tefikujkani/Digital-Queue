import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Zap } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false, requireSuperAdmin = false }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireSuperAdmin && user?.role !== 'superadmin') {
    return <Navigate to="/dashboard/citizen" replace />;
  }

  if (requireAdmin && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <Navigate to="/dashboard/citizen" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
