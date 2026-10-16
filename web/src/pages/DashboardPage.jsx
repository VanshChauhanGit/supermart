import React from 'react';
import AdminDashboard from '../components/AdminDashboard';

export default function DashboardPage({ products, customers, onRefresh }) {
  return (
    <AdminDashboard 
      products={products} 
      customers={customers} 
      onRefresh={onRefresh} 
    />
  );
}
