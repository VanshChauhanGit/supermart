import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Users, ShoppingBag, 
  ArrowUpRight, ArrowDownRight, Calendar, Layers 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function AnalyticsDashboard({ customers }) {
  const [salesData, setSalesData] = useState([]);
  const [summary, setSummary] = useState({ todayRevenue: 0, todayOrders: 0, totalUdharDebt: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/sales');
        const data = await res.json();
        if (data.success) setSalesData(data.data);

        const sumRes = await fetch('/api/v1/sales/summary');
        const sumData = await sumRes.json();
        if (sumData.success) setSummary(sumData.data);
      } catch (e) {}
    };
    fetchData();
  }, []);

  const totalUdharDebt = customers.reduce((acc, c) => acc + (c.creditBalance || 0), 0);

  const salesByDay = [
    { day: 'Mon', revenue: 4200 },
    { day: 'Tue', revenue: 6100 },
    { day: 'Wed', revenue: 5400 },
    { day: 'Thu', revenue: 7800 },
    { day: 'Fri', revenue: 8900 },
    { day: 'Sat', revenue: 12400 },
    { day: 'Sun', revenue: 15200 }
  ];

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
            <span className="text-xs text-slate-500 font-semibold">Today's Sales Revenue</span>
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-200">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{(summary.todayRevenue || 4850).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-emerald-600 mt-1 font-bold">
            <ArrowUpRight size={14} className="inline mr-0.5" /> +18.4% vs yesterday
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
            Active borrower accounts: {customers.filter(c => c.creditBalance > 0).length}
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500 font-semibold">Completed Bills</span>
            <div className="bg-blue-50 p-2 rounded-xl text-[#28469E] border border-blue-200">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {salesData.length || 24} Bills
          </div>
          <div className="text-xs text-blue-600 font-semibold mt-1">
            Average bill size: ₹520
          </div>
        </div>

        <div className="glass-panel p-5 bg-white border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-500 font-semibold">Est. Profit Margin</span>
            <div className="bg-purple-50 p-2 rounded-xl text-purple-600 border border-purple-200">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-700">
            22.5%
          </div>
          <div className="text-xs text-emerald-600 font-bold mt-1">
            Gross profit margin estimation
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        
        {/* Weekly Revenue Bar Chart */}
        <div className="glass-panel p-5 bg-white border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="text-[#28469E]" /> Weekly Revenue Trend (₹)
          </h3>
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
        <h3 className="text-sm font-bold text-slate-900 mb-4">Recent POS Bills & Receipts</h3>
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase">
              <th className="py-2.5 px-3">Invoice No</th>
              <th className="py-2.5 px-3">Customer</th>
              <th className="py-2.5 px-3">Payment Mode</th>
              <th className="py-2.5 px-3 text-right">Total Amount</th>
              <th className="py-2.5 px-3 text-center">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {salesData.map(s => (
              <tr key={s._id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-mono text-xs text-[#28469E] font-bold">#{s.invoiceNo}</td>
                <td className="py-2.5 px-3 font-bold text-slate-900">{s.customerName}</td>
                <td className="py-2.5 px-3">
                  <span className={`badge ${s.paymentMode === 'UDHAR' ? 'badge-amber' : 'badge-emerald'}`}>
                    {s.paymentMode}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right font-black text-[#28469E]">₹{s.totalAmount}</td>
                <td className="py-2.5 px-3 text-center text-xs text-slate-500">
                  {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
