import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, MessageSquare, Package, Truck, 
  Store, BarChart3, Smartphone, ShieldCheck, LogOut, Tag, 
  FolderOpen, UserCheck, Settings, ExternalLink 
} from 'lucide-react';

export default function Sidebar({ adminUser, onLogout }) {
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  useEffect(() => {
    const fetchOrdersCount = async () => {
      try {
        const res = await fetch('/api/v1/orders');
        const data = await res.json();
        if (data.success && data.data) {
          const pendingOrActive = data.data.filter(
            o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
          ).length;
          setActiveOrdersCount(pendingOrActive);
        }
      } catch (e) {}
    };

    fetchOrdersCount();
    const interval = setInterval(fetchOrdersCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const primaryNavItems = [
    { path: '/dashboard', label: 'Store Overview', icon: LayoutDashboard },
    { path: '/pos', label: 'POS Billing Desk', icon: ShoppingCart },
    { path: '/delivery', label: 'Delivery Orders', icon: Truck, badge: activeOrdersCount > 0 ? activeOrdersCount : null },
    { path: '/inventory', label: 'Catalog & Stock', icon: Package },
    { path: '/categories', label: 'Categories', icon: FolderOpen },
    { path: '/offers', label: 'Offers & Coupons', icon: Tag },
    { path: '/udhar', label: 'Udhar Khata Ledger', icon: MessageSquare, isUdhar: true },
    { path: '/analytics', label: 'Sales Analytics', icon: BarChart3 },
    { path: '/profile', label: 'Store & Profile', icon: Settings },
  ];

  const secondaryNavItems = [
    { path: '/storefront', label: 'Customer Storefront', icon: Store, isExternalPreview: true },
    { path: '/api-docs', label: 'Mobile App APIs', icon: Smartphone }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between p-4 sticky top-0 h-screen no-print z-50 shadow-sm overflow-y-auto">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-5 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-[#1E3A8A] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#1E3A8A]/20">
            S
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              SUPERMART <span className="bg-[#EFF6FF] text-[#1E3A8A] border border-blue-200 text-[10px] font-black px-1.5 py-0.5 rounded-md">ADMIN</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-semibold">Store Management Portal</p>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2">
          Store Operations
        </div>
        <nav className="flex flex-col gap-1 mb-5">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200
                  ${isActive 
                    ? item.isUdhar 
                      ? 'bg-[#1E3A8A] text-white shadow-md shadow-[#1E3A8A]/20' 
                      : 'bg-[#1E3A8A] text-white shadow-md shadow-[#1E3A8A]/20' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={17} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Secondary Links */}
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2">
          Customer & Developers
        </div>
        <nav className="flex flex-col gap-1">
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-50 text-[#1E3A8A]' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}
                `}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Admin Profile Footer */}
      {adminUser && (
        <div className="pt-4 border-t border-slate-100 mt-4">
          <NavLink
            to="/profile"
            className="bg-slate-50 hover:bg-slate-100/80 p-3 rounded-2xl border border-slate-200/70 flex items-center justify-between mb-2 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#1E3A8A] flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-800 truncate">{adminUser.name || adminUser.username || 'Admin'}</div>
                <div className="text-[10px] font-semibold text-[#1E3A8A]">Store Owner</div>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          </NavLink>

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to log out of Supermart Admin?')) {
                onLogout();
              }
            }}
            className="w-full btn btn-secondary text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs py-2 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            <span>Logout Session</span>
          </button>
        </div>
      )}
    </aside>
  );
}
