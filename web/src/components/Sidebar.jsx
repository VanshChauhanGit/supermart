import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShoppingCart, MessageSquare, Package, Truck, Store, 
  BarChart3, Smartphone, ShieldCheck, LogOut 
} from 'lucide-react';

export default function Sidebar({ adminUser, onLogout }) {
  const navItems = [
    { path: '/pos', label: 'POS Billing Desk', icon: ShoppingCart },
    { path: '/udhar', label: 'Udhar Khata Ledger', icon: MessageSquare, isWhatsapp: true },
    { path: '/inventory', label: 'Catalog & Stock', icon: Package },
    { path: '/delivery', label: 'Delivery Orders', icon: Truck },
    { path: '/storefront', label: 'Customer Storefront', icon: Store, isOcean: true },
    { path: '/analytics', label: 'Sales Analytics', icon: BarChart3 },
    { path: '/api-docs', label: 'Mobile APIs', icon: Smartphone }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between p-4 sticky top-0 h-screen no-print z-50 shadow-sm">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-100">
          <div className="w-11 h-11 rounded-xl bg-[#28469E] border border-[#CAE8E8] flex items-center justify-center text-[#CAE8E8] font-black text-xl shadow-md">
            S
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              SUPERMART <span className="badge badge-ocean text-[10px]">ERP</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Kiryana POS & Udhar</p>
          </div>
        </div>

        {/* Navigation Link Items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200
                  ${isActive 
                    ? item.isWhatsapp 
                      ? 'bg-[#25D366] text-white shadow-md' 
                      : item.isOcean 
                        ? 'bg-[#CAE8E8] text-[#1E367D] shadow-sm' 
                        : 'bg-[#28469E] text-white shadow-md' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                `}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Admin Profile Footer */}
      {adminUser && (
        <div className="pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#28469E] flex items-center justify-center text-[#CAE8E8] font-bold text-xs">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">{adminUser.name}</div>
                <div className="text-[10px] font-semibold text-[#28469E]">Super Admin</div>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full btn btn-secondary text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-xs py-2"
          >
            <LogOut size={14} /> Logout Session
          </button>
        </div>
      )}
    </aside>
  );
}
