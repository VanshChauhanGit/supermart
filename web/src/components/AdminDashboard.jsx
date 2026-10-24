import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calculator, Package, Truck, BookOpen, Tag, FolderOpen, 
  AlertCircle, ChevronRight, RefreshCw, Wallet, TrendingUp,
  CreditCard, Banknote, QrCode, ArrowUpRight, ShoppingBag
} from 'lucide-react';
import { io } from 'socket.io-client';

const StatCard = ({ icon: Icon, label, value, valueColor = 'text-slate-900', iconBg, iconColor, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-all duration-200 ${
      onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5' : ''
    }`}
  >
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${iconBg}`}>
      <Icon size={24} className={iconColor} />
    </div>
    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
    <div className={`text-2xl font-black ${valueColor}`}>{value}</div>
  </div>
);

const ActionRow = ({ icon: Icon, iconBg, iconColor, title, subtitle, onClick, badge }) => (
  <div
    onClick={onClick}
    className="bg-white rounded-2xl p-4.5 flex items-center justify-between border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer group"
  >
    <div className="flex items-center gap-3.5 flex-1 min-w-0">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${iconBg}`}>
        <Icon size={24} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-900 truncate">{title}</span>
          {badge && (
            <span className="bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider flex-shrink-0">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-slate-400 truncate mt-0.5">{subtitle}</p>
      </div>
    </div>
    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#28469E] group-hover:bg-[#28469E] group-hover:text-white transition-all flex-shrink-0">
      <ChevronRight size={16} />
    </div>
  </div>
);

export default function AdminDashboard({ products = [], customers = [], onRefresh }) {
  const navigate = useNavigate();
  const [salesTimeframe, setSalesTimeframe] = useState('TODAY'); // TODAY | WEEK | MONTH
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    paymentBreakdown: { CASH: 0, UPI: 0, UDHAR: 0 },
    totalProducts: 0,
    totalUdhar: 0,
    activeOrders: 0,
    lowStockCount: 0,
    lowStockItems: []
  });

  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      const [salesRes, prodRes, custRes, ordRes] = await Promise.all([
        fetch('/api/v1/sales/summary').catch(() => null),
        fetch('/api/v1/products').catch(() => null),
        fetch('/api/v1/customers').catch(() => null),
        fetch('/api/v1/orders').catch(() => null),
      ]);

      const salesData = salesRes ? await salesRes.json() : null;
      const prodData = prodRes ? await prodRes.json() : null;
      const custData = custRes ? await custRes.json() : null;
      const ordData = ordRes ? await ordRes.json() : null;

      const pList = prodData?.success ? prodData.data : (products || []);
      const lowStockList = pList.filter(p => p.stockQty <= (p.reorderLevel || 5));
      const cList = custData?.success ? custData.data : (customers || []);
      const oList = ordData?.success ? ordData.data : [];

      const totalUdhar = salesData?.data?.totalUdharDebt ??
        cList.reduce((acc, c) => acc + (c.creditBalance || 0), 0);
      const pendingOrders = oList.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length;

      setStats({
        todayRevenue: salesData?.data?.todayRevenue || 0,
        todayOrders: salesData?.data?.todayOrders || 0,
        weekRevenue: salesData?.data?.weekRevenue || (salesData?.data?.todayRevenue || 0),
        monthRevenue: salesData?.data?.monthRevenue || (salesData?.data?.todayRevenue || 0),
        paymentBreakdown: salesData?.data?.paymentBreakdown || { CASH: 0, UPI: 0, UDHAR: 0 },
        totalProducts: pList.length,
        totalUdhar,
        activeOrders: pendingOrders,
        lowStockCount: lowStockList.length,
        lowStockItems: lowStockList
      });
    } catch (e) {
      console.log('Error fetching dashboard metrics:', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const SOCKET_URL = window.location.origin;
    const socket = io(SOCKET_URL, { path: '/socket.io' });

    const handleRealtimeUpdate = () => {
      fetchDashboardData();
    };

    socket.on('orderStatusUpdate', handleRealtimeUpdate);
    socket.on('revenueUpdated', handleRealtimeUpdate);
    socket.on('salesSummaryUpdated', handleRealtimeUpdate);
    socket.on('newOrder', handleRealtimeUpdate);

    return () => {
      socket.off('orderStatusUpdate', handleRealtimeUpdate);
      socket.off('revenueUpdated', handleRealtimeUpdate);
      socket.off('salesSummaryUpdated', handleRealtimeUpdate);
      socket.off('newOrder', handleRealtimeUpdate);
      socket.disconnect();
    };
  }, []);

  const handleRefresh = async () => {
    await fetchDashboardData();
    if (onRefresh) onRefresh();
  };

  const currentRevenue = salesTimeframe === 'TODAY'
    ? stats.todayRevenue
    : salesTimeframe === 'WEEK'
      ? stats.weekRevenue
      : stats.monthRevenue;

  const currentRevenueLabel = salesTimeframe === 'TODAY'
    ? "TODAY'S REVENUE"
    : salesTimeframe === 'WEEK'
      ? "LAST 7 DAYS REVENUE"
      : "LAST 30 DAYS REVENUE";

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Store Overview</span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-0.5">Admin Portal</h2>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
            title="Refresh Metrics"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => navigate('/pos')}
            className="bg-[#1E3A8A] hover:bg-[#1E367D] text-white rounded-2xl px-5 py-2.5 flex items-center gap-2 font-bold text-sm shadow-md shadow-[#1E3A8A]/25 transition-all hover:-translate-y-0.5"
          >
            <Calculator size={18} />
            <span>POS Billing Desk</span>
          </button>
        </div>
      </div>

      {/* Hero Revenue Card with Timeframe Switch */}
      <div className="rounded-3xl overflow-hidden shadow-xl shadow-[#1E3A8A]/20 bg-[#1E3A8A] text-white p-6 sm:p-7 relative">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <span className="text-[#93C5FD] text-xs font-bold uppercase tracking-widest">
            {currentRevenueLabel}
          </span>
          {/* Timeframe Selector */}
          <div className="flex bg-white/10 rounded-xl p-1 border border-white/15">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'WEEK', label: '7D' },
              { id: 'MONTH', label: '30D' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setSalesTimeframe(t.id)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  salesTimeframe === t.id ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-blue-200 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-end gap-4">
          <div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight">
              ₹{currentRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-[#93C5FD] text-xs sm:text-sm font-semibold mt-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {salesTimeframe === 'TODAY' 
                ? `${stats.todayOrders} sales billed today` 
                : 'Live MongoDB Sales Engine connected'}
            </p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 border border-white/15 hidden sm:flex items-center justify-center">
            <Wallet size={32} className="text-white" />
          </div>
        </div>

        {/* Today Payment Breakdown Strip */}
        {salesTimeframe === 'TODAY' && (
          <div className="flex flex-wrap items-center justify-between border-t border-white/15 pt-4 mt-5 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-white/80 text-xs font-semibold">
                Cash: <strong className="text-white">₹{(stats.paymentBreakdown.CASH || 0).toLocaleString('en-IN')}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-300"></span>
              <span className="text-white/80 text-xs font-semibold">
                UPI: <strong className="text-white">₹{(stats.paymentBreakdown.UPI || 0).toLocaleString('en-IN')}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-white/80 text-xs font-semibold">
                Udhar (Credit): <strong className="text-white">₹{(stats.paymentBreakdown.UDHAR || 0).toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Morning Low Stock Summary Banner */}
      {stats.lowStockCount > 0 && (
        <div
          onClick={() => navigate('/inventory')}
          className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-red-100/70 transition-colors"
        >
          <div className="flex items-center gap-3.5 flex-1 mr-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-red-900">
                Morning Stock Alert: {stats.lowStockCount} Items Low in Stock
              </h4>
              <p className="text-xs text-red-600 font-medium truncate mt-0.5">
                {stats.lowStockItems.slice(0, 4).map(i => i.name).join(', ')}...
              </p>
            </div>
          </div>
          <div className="bg-red-200/80 text-red-800 text-[11px] font-black uppercase px-3 py-1.5 rounded-xl flex-shrink-0 flex items-center gap-1">
            <span>Restock</span>
            <ChevronRight size={14} />
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div>
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Metrics</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Package}
            iconColor="text-[#1E3A8A]"
            label="Total Products"
            value={stats.totalProducts}
            iconBg="bg-blue-50"
            onClick={() => navigate('/inventory')}
          />
          <StatCard
            icon={AlertCircle}
            iconColor="text-red-500"
            label="Low Stock Items"
            value={`${stats.lowStockCount} Items`}
            valueColor="text-red-600"
            iconBg="bg-red-50"
            onClick={() => navigate('/inventory')}
          />
          <StatCard
            icon={Truck}
            iconColor="text-[#1E3A8A]"
            label="Active Orders"
            value={`${stats.activeOrders} Orders`}
            valueColor="text-[#1E3A8A]"
            iconBg="bg-blue-50"
            onClick={() => navigate('/delivery')}
          />
          <StatCard
            icon={BookOpen}
            iconColor="text-amber-600"
            label="Udhar Pending"
            value={`₹${stats.totalUdhar.toLocaleString('en-IN')}`}
            valueColor="text-amber-600"
            iconBg="bg-amber-50"
            onClick={() => navigate('/udhar')}
          />
        </div>
      </div>

      {/* Store Actions Grid */}
      <div>
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Store Actions</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <ActionRow
            icon={Calculator}
            iconColor="text-[#1E3A8A]"
            iconBg="bg-blue-50"
            title="Quick POS Counter Billing"
            subtitle="Scan barcodes, calculate tax & bill walk-in customers"
            onClick={() => navigate('/pos')}
            badge="Fast POS"
          />
          <ActionRow
            icon={Package}
            iconColor="text-[#1E3A8A]"
            iconBg="bg-blue-50"
            title="Manage Catalog & Stock"
            subtitle="Add items, quick stepper restock, barcode scan"
            onClick={() => navigate('/inventory')}
          />
          <ActionRow
            icon={Truck}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            title="Fulfill Delivery Orders"
            subtitle="Accept incoming orders, call customer & dispatch delivery"
            onClick={() => navigate('/delivery')}
          />
          <ActionRow
            icon={BookOpen}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
            title="Udhar Khata (Digital Ledger)"
            subtitle="Customer passbook history & WhatsApp payment reminders"
            onClick={() => navigate('/udhar')}
          />
          <ActionRow
            icon={Tag}
            iconColor="text-fuchsia-600"
            iconBg="bg-fuchsia-50"
            title="Offers & Promo Codes"
            subtitle="Create discount coupons and customer promotional deals"
            onClick={() => navigate('/offers')}
          />
          <ActionRow
            icon={FolderOpen}
            iconColor="text-sky-600"
            iconBg="bg-sky-50"
            title="Manage Categories"
            subtitle="Add/edit product categories with image upload"
            onClick={() => navigate('/categories')}
          />
        </div>
      </div>
    </div>
  );
}
