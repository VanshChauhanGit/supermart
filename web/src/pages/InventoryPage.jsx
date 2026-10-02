import React from 'react';
import InventoryManager from '../components/InventoryManager';

export default function InventoryPage({ products, onRefreshProducts }) {
  return (
    <InventoryManager
      products={products}
      onRefreshProducts={onRefreshProducts}
    />
  );
}
