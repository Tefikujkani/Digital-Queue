import React from 'react';
import { createBrowserRouter } from 'react-router';
import RootLayout from './layouts/RootLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import InstitutionsPage from './pages/InstitutionsPage';
import QueuePage from './pages/QueuePage';
import CitizenDashboard from './pages/CitizenDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AppointmentsPage from './pages/AppointmentsPage';
import CitiesPage from './pages/CitiesPage';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'institutions', element: <InstitutionsPage /> },
      { path: 'cities', element: <CitiesPage /> },
      { path: 'queue/:institutionId', element: <QueuePage /> },
      { 
        path: 'appointments', 
        element: <ProtectedRoute><AppointmentsPage /></ProtectedRoute> 
      },
      { 
        path: 'dashboard/citizen', 
        element: <ProtectedRoute><CitizenDashboard /></ProtectedRoute> 
      },
      { 
        path: 'dashboard/admin', 
        element: <ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute> 
      },
      { 
        path: 'dashboard/superadmin', 
        element: <ProtectedRoute requireSuperAdmin><SuperAdminDashboard /></ProtectedRoute> 
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);