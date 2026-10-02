import React from 'react';
import UdharManager from '../components/UdharManager';

export default function UdharPage({ customers, onRefreshCustomers, onOpenWhatsAppModal }) {
  return (
    <UdharManager
      customers={customers}
      onRefreshCustomers={onRefreshCustomers}
      onOpenWhatsAppModal={onOpenWhatsAppModal}
    />
  );
}
