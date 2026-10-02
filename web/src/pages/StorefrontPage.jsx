import React from 'react';
import CustomerStorefront from '../components/CustomerStorefront';

export default function StorefrontPage({ products }) {
  return <CustomerStorefront products={products} />;
}
