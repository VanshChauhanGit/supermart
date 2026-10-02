import React from 'react';
import POSBilling from '../components/POSBilling';

export default function POSPage({ products, customers, onRefreshProducts, onSaleComplete }) {
  return (
    <POSBilling
      products={products}
      customers={customers}
      onRefreshProducts={onRefreshProducts}
      onSaleComplete={onSaleComplete}
    />
  );
}
