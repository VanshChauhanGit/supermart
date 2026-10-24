import React, { useState, useEffect } from 'react';
import CustomerStorefront from '../components/CustomerStorefront';

export default function StorefrontPage({ products: initialProducts }) {
  const [products, setProducts] = useState(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts || initialProducts.length === 0);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    fetch('/api/v1/products')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data?.success && Array.isArray(data.data)) {
          setProducts(data.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [initialProducts]);

  return <CustomerStorefront products={products} loading={loading} />;
}

