import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import UdharPage from './pages/UdharPage';
import InventoryPage from './pages/InventoryPage';
import DeliveryPage from './pages/DeliveryPage';
import StorefrontPage from './pages/StorefrontPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ApiDocsPage from './pages/ApiDocsPage';

import WhatsAppNoticeModal from './components/WhatsAppNoticeModal';
import ThermalReceiptModal from './components/ThermalReceiptModal';

function AppContent() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [systemStats, setSystemStats] = useState({ todayRevenue: 0, totalUdharDebt: 0, todayOrders: 0 });

  // Admin Auth State
  const [adminUser, setAdminUser] = useState(() => {
    const saved = localStorage.getItem('supermart_admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Modals
  const [whatsAppNoticeData, setWhatsAppNoticeData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/v1/products');
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (e) {}
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/v1/customers');
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch (e) {}
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/v1/sales/summary');
      const data = await res.json();
      if (data.success) setSystemStats(data.data);
    } catch (e) {}
  };

  const refreshAll = () => {
    fetchProducts();
    fetchCustomers();
    fetchSummary();
  };

  useEffect(() => {
    if (adminUser) {
      refreshAll();
    }
  }, [adminUser]);

  const handleLoginSuccess = (user) => {
    setAdminUser(user);
    refreshAll();
  };

  const handleLogout = () => {
    localStorage.removeItem('supermart_admin_user');
    setAdminUser(null);
  };

  const handleSaleComplete = (sale, whatsAppNotice) => {
    setReceiptData(sale);
    if (whatsAppNotice) {
      setWhatsAppNoticeData(whatsAppNotice);
    }
    refreshAll();
  };

  return (
    <Routes>
      {/* Public Login Route */}
      <Route 
        path="/login" 
        element={<LoginPage onLoginSuccess={handleLoginSuccess} />} 
      />

      {/* Main Admin App Layout Wrapper */}
      <Route
        path="*"
        element={
          adminUser ? (
            <div className="flex min-h-screen bg-dark-bg text-slate-100 font-sans">
              <Sidebar adminUser={adminUser} onLogout={handleLogout} />
              
              <div className="flex-1 flex flex-col min-w-0">
                <Header systemStats={systemStats} customers={customers} onRefresh={refreshAll} adminUser={adminUser} onLogout={handleLogout} />
                
                <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
                  <Routes>
                    <Route 
                      path="/" 
                      element={
                        <ProtectedAdminRoute adminUser={adminUser}>
                          <POSPage
                            products={products}
                            customers={customers}
                            onRefreshProducts={fetchProducts}
                            onSaleComplete={handleSaleComplete}
                          />
                        </ProtectedAdminRoute>
                      } 
                    />
                    <Route 
                      path="/pos" 
                      element={
                        <ProtectedAdminRoute adminUser={adminUser}>
                          <POSPage
                            products={products}
                            customers={customers}
                            onRefreshProducts={fetchProducts}
                            onSaleComplete={handleSaleComplete}
                          />
                        </ProtectedAdminRoute>
                      } 
                    />
                    <Route 
                      path="/udhar" 
                      element={
                        <ProtectedAdminRoute adminUser={adminUser}>
                          <UdharPage
                            customers={customers}
                            onRefreshCustomers={fetchCustomers}
                            onOpenWhatsAppModal={(data) => setWhatsAppNoticeData(data)}
                          />
                        </ProtectedAdminRoute>
                      } 
                    />
                    <Route 
                      path="/inventory" 
                      element={
                        <ProtectedAdminRoute adminUser={adminUser}>
                          <InventoryPage
                            products={products}
                            onRefreshProducts={fetchProducts}
                          />
                        </ProtectedAdminRoute>
                      } 
                    />
                    <Route 
                      path="/delivery" 
                      element={
                        <ProtectedAdminRoute adminUser={adminUser}>
                          <DeliveryPage />
                        </ProtectedAdminRoute>
                      } 
                    />
                    <Route 
                      path="/storefront" 
                      element={<StorefrontPage products={products} />} 
                    />
                    <Route 
                      path="/analytics" 
                      element={
                        <ProtectedAdminRoute adminUser={adminUser}>
                          <AnalyticsPage customers={customers} />
                        </ProtectedAdminRoute>
                      } 
                    />
                    <Route 
                      path="/api-docs" 
                      element={<ApiDocsPage />} 
                    />
                    <Route path="*" element={<Navigate to="/pos" replace />} />
                  </Routes>
                </main>
              </div>

              {/* Shared Receipt & WhatsApp Modals */}
              <WhatsAppNoticeModal
                isOpen={!!whatsAppNoticeData}
                onClose={() => setWhatsAppNoticeData(null)}
                noticeData={whatsAppNoticeData}
              />

              <ThermalReceiptModal
                isOpen={!!receiptData}
                onClose={() => setReceiptData(null)}
                saleData={receiptData}
              />
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
