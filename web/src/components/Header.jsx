import React from 'react';
import { Database, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';

export default function Header({ systemStats, customers, onRefresh, adminUser, onLogout }) {
  const totalUdhar = customers ? customers.reduce((acc, c) => acc + (c.creditBalance || 0), 0) : 0;

  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 sticky top-0 z-40 no-print shadow-sm">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        
        {/* Left Status Pulse */}
        <div className="flex items-center gap-3">
          <span className="badge badge-emerald text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Express & MongoDB Connected
          </span>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Supermart Kiryana POS Engine v1.0.4
          </span>
        </div>

        {/* Right Live KPI Indicators & Profile */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-[11px] text-slate-500 font-semibold">Today's Revenue</div>
            <div className="text-sm font-extrabold text-emerald-600">
              ₹{(systemStats?.todayRevenue || 0).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="text-right pl-5 border-l border-slate-200">
            <div className="text-[11px] text-slate-500 font-semibold">Market Udhar Debt</div>
            <div className="text-sm font-extrabold text-amber-600">
              ₹{totalUdhar.toLocaleString('en-IN')}
            </div>
          </div>

          {adminUser && (
            <div className="flex items-center gap-2 pl-5 border-l border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-[#28469E] text-[#CAE8E8] font-black text-xs flex items-center justify-center shadow-sm">
                <ShieldCheck size={16} />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-800 line-clamp-1">{adminUser.name}</div>
                <div className="text-[10px] font-semibold text-[#28469E]">Super Admin</div>
              </div>
            </div>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={16} />
            </button>
          )}

          {onLogout && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to log out of Supermart Admin?')) {
                  onLogout();
                }
              }}
              className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors"
              title="Logout Session"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
