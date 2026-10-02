import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedAdminRoute({ adminUser, children }) {
  if (!adminUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
