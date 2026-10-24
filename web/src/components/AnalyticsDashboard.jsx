import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Users, ShoppingBag, 
  ArrowUpRight, ArrowDownRight, Calendar, Layers, RefreshCw 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';
import { io } from 'socket.io-client';

export default function AnalyticsDashboard({ customers = [] }) {
  const [salesData, setSalesData] = useState([]);
  const [summary, setSummary] = useState({ 
    todayRevenue: 0, 
    todayOrders: 0, 
    totalUdharDebt: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    onlineTodayRevenue: 0,
    posTodayRevenue: 0,
    onlineDeliveredCount: 0,
    posSalesCount: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, sumRes] = await Promise.all([
        fetch('/api/v1/sales'),
        fetch('/api/v1/sales/summary')
      ]);
      const data = await res.json();
      if (data.success) setSalesData(data.data);

      const sumData = await sumRes.json();
      if (sumData.success) setSummary(sumData.data);
    } catch (e) {
      console.error('Error fetching analytics data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const SOCKET_URL = window.location.origin;
    const socket = io(SOCKET_URL, { path: '/socket.io' });

    const handleUpdate = () => {
      fetchData();
    };

    socket.on('revenueUpdated', handleUpdate);
    socket.on('salesSummaryUpdated', handleUpdate);
    socket.on('orderStatusUpdate', handleUpdate);

    return () => {
      socket.off('revenueUpdated', handleUpdate);
      socket.off('salesSummaryUpdated', handleUpdate);
      socket.off('orderStatusUpdate', handleUpdate);
      socket.disconnect();
    };
  }, []);

  const totalUdharDebt = (customers || []).reduce((acc, c) => acc + (c.creditBalance || 0), 0);

  // Compute 7-day revenue trend dynamically from combined sales records
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7DaysMap = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dayLabel = daysOfWeek[d.getDay()];
    last7DaysMap.push({
      dateStr: d.toISOString().slice(0, 10),
      day: i === 0 ? 'Today' : dayLabel,
      revenue: 0
    });
  }

  salesData.forEach(sale => {
    const saleDateStr = new Date(sale.createdAt).toISOString().slice(0, 10);
    const dayEntry = last7DaysMap.find(d => d.dateStr === saleDateStr);
    if (dayEntry) {
      dayEntry.revenue += (sale.totalAmount || 0);
    }
  });

  const salesByDay = last7DaysMap.map(({ day, revenue }) => ({ day, revenue }));

  // Average bill calculation
  const totalCompletedBills = salesData.length;
  const avgBillSize = totalCompletedBills > 0 
    ? Math.round(salesData.reduce((acc, s) => acc + (s.totalAmount || 0), 0) / totalCompletedBills) 
    : 0;

  const categoryChartData = [
    { name: 'Grocery & Atta', value: 45, color: '#28469E' },
    { name: 'Dairy & Fresh', value: 20, color: '#10b981' },
    { name: 'Snacks & Drinks', value: 15, color: '#f59e0b' },
    { name: 'Household', value: 12, color: '#8b5cf6' },
    { name: 'Stationery & Other', value: 8, color: '#ec4899' }
  ];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="glass-panel p-5 bg-white border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500 font-semibold">Today's Total Revenue</span>
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-200">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{(summary.todayRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium flex items-center justify-between">
            <span>POS: ₹{(summary.posTodayRevenue || 0).toLocaleString('en-IN')}</span>
            <span className="text-blue-600 font-semibold">Online: ₹{(summary.onlineTodayRevenue || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500 font-semibold">Market Udhar Debt</span>
            <div className="bg-amber-50 p-2 rounded-xl text-amber-600 border border-amber-200">
              <Users size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            ₹{totalUdharDebt.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Active borrower accounts: {(customers || []).filter(c => (c.creditBalance || 0) > 0).length}
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500 font-semibold">Completed Orders & Bills</span>
            <div className="bg-blue-50 p-2 rounded-xl text-[#28469E] border border-blue-200">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {salesData.length} Orders
          </div>
          <div className="text-xs text-blue-600 font-semibold mt-1">
            Average order size: ₹{avgBillSize.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500 font-semibold">7-Day Revenue</span>
            <div className="bg-purple-50 p-2 rounded-xl text-purple-600 border border-purple-200">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700">
            ₹{(summary.weekRevenue || summary.todayRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-emerald-600 font-bold mt-1">
            30-Day: ₹{(summary.monthRevenue || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        
        {/* Weekly Revenue Bar Chart */}
        <div className="glass-panel p-5 bg-white border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="text-[#28469E]" /> Weekly Revenue Trend (₹)
            </h3>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 transition"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesByDay}>
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', color: '#0f172a' }} />
                <Bar dataKey="revenue" fill="#28469E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Distribution */}
        <div className="glass-panel p-5 bg-white border border-slate-200 flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="text-[#28469E]" /> Sales Share by Department
          </h3>
          <div className="flex-1 flex flex-col justify-center gap-3">
            {categoryChartData.map(cat => (
              <div key={cat.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">{cat.name}</span>
                  <span className="font-bold" style={{ color: cat.color }}>{cat.value}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div style={{ width: `${cat.value}%`, background: cat.color, height: '100%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="glass-panel p-5 bg-white border border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Recent Sales & Delivered Orders</h3>
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
              <th className="py-2.5 px-3">Invoice / Order</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3">Payment</th>
              <th className="py-2.5 px-3 text-right">Total Amount</th>
              <th className="py-2.5 px-3 text-center">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {salesData.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No sales or delivered orders recorded yet
                </td>
              </tr>
            ) : (
              salesData.map(s => (
                <tr key={s._id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono text-xs text-[#28469E] font-bold">
                    #{s.invoiceNo}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.isOnlineOrder ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {s.isOnlineOrder ? 'Online Delivery' : 'In-Store POS'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{s.customerName}</td>
                  <td className="py-2.5 px-3">
                    <span className={`badge ${s.paymentMode === 'UDHAR' ? 'badge-amber' : 'badge-emerald'}`}>
                      {s.paymentMode}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-[#28469E]">
                    ₹{(s.totalAmount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-center text-xs text-slate-500">
                    {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
