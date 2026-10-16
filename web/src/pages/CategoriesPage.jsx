import React from 'react';
import CategoriesManager from '../components/CategoriesManager';

export default function CategoriesPage({ products, onRefreshProducts }) {
  return (
    <CategoriesManager 
      products={products} 
      onRefreshProducts={onRefreshProducts} 
    />
  );
}
