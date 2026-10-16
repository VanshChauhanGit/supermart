import React from 'react';
import StoreProfile from '../components/StoreProfile';

export default function ProfilePage({ adminUser, onLogout }) {
  return (
    <StoreProfile 
      adminUser={adminUser} 
      onLogout={onLogout} 
    />
  );
}
