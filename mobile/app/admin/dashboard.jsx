import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

const StatCard = ({ icon, label, value, valueColor = 'text-slate-900', iconBg, iconColor, onPress }) => (
  <TouchableOpacity
    activeOpacity={onPress ? 0.75 : 1}
    onPress={onPress}
    className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm"
    style={{ width: '48%' }}
  >
    <View className={`w-11 h-11 rounded-2xl items-center justify-center mb-2.5 ${iconBg}`}>
      <Ionicons name={icon} size={24} color={iconColor} />
    </View>
    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</Text>
    <Text className={`text-xl font-black ${valueColor}`}>{value}</Text>
  </TouchableOpacity>
);

const ActionRow = ({ icon, iconBg, iconColor, title, subtitle, onPress, badge }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    className="bg-white rounded-2xl p-4 flex-row items-center justify-between mb-2.5 border border-slate-100 shadow-sm"
  >
    <View className="flex-row items-center flex-1">
      <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-3.5 ${iconBg}`}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-sm font-black text-slate-900 mb-0.5">{title}</Text>
          {badge && (
            <View className="ml-2 bg-amber-100 rounded-full px-2 py-0.5">
              <Text className="text-[9px] font-black text-amber-800 uppercase">{badge}</Text>
            </View>
          )}
        </View>
        <Text className="text-[11px] font-medium text-slate-400">{subtitle}</Text>
      </View>
    </View>
    <View className="w-8 h-8 rounded-xl bg-[#EFF6FF] items-center justify-center">
      <Ionicons name="chevron-forward" size={16} color="#28469E" />
    </View>
  </TouchableOpacity>
);

export default function AdminDashboardScreen() {
  const { apiBaseUrl, socket } = useApp();

  const [salesTimeframe, setSalesTimeframe] = useState('TODAY'); // TODAY | WEEK | MONTH

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

  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [salesRes, prodRes, custRes, ordRes] = await Promise.all([
        fetch(`${apiBaseUrl}/sales/summary`).catch(() => null),
        fetch(`${apiBaseUrl}/products`).catch(() => null),
        fetch(`${apiBaseUrl}/customers`).catch(() => null),
        fetch(`${apiBaseUrl}/orders`).catch(() => null)
      ]);

      const salesData = salesRes ? await salesRes.json() : null;
      const prodData = prodRes ? await prodRes.json() : null;
      const custData = custRes ? await custRes.json() : null;
      const ordData = ordRes ? await ordRes.json() : null;

      const pList = prodData?.success ? prodData.data : [];
      const lowStockList = pList.filter(p => p.stockQty <= (p.reorderLevel || 5));
      const cList = custData?.success ? custData.data : [];
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
    }
  };

  useEffect(() => {
    fetchDashboardData();

    if (socket) {
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
      };
    }
  }, [socket]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
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
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFF]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFF" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#28469E" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-xs font-bold text-slate-400 tracking-wide uppercase">Store Overview</Text>
            <Text className="text-3xl font-black text-slate-900 mt-0.5">Admin Portal</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/admin/pos')}
            className="bg-[#1E3A8A] rounded-2xl px-3.5 py-2.5 flex-row items-center shadow-md shadow-[#1E3A8A]/30"
          >
            <Ionicons name="calculator" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text className="text-white text-xs font-black">POS Bill</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Revenue Card with Timeframe Switch */}
        <View className="rounded-3xl mb-4 overflow-hidden shadow-xl shadow-[#1E3A8A]/30 bg-[#1E3A8A] p-5">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#93C5FD] text-[10px] font-bold uppercase tracking-widest">
              {currentRevenueLabel}
            </Text>
            {/* Timeframe Selector */}
            <View className="flex-row bg-white/10 rounded-xl p-0.5 border border-white/15">
              {[
                { id: 'TODAY', label: 'Today' },
                { id: 'WEEK', label: '7D' },
                { id: 'MONTH', label: '30D' }
              ].map(t => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setSalesTimeframe(t.id)}
                  className={`px-2 py-1 rounded-lg ${salesTimeframe === t.id ? 'bg-white' : ''}`}
                >
                  <Text className={`text-[10px] font-black ${salesTimeframe === t.id ? 'text-[#1E3A8A]' : 'text-blue-200'}`}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white text-4xl font-black tracking-tight">
                ₹{currentRevenue.toLocaleString('en-IN')}
              </Text>
              <Text className="text-[#93C5FD] text-xs font-semibold mt-1">
                {salesTimeframe === 'TODAY' ? `${stats.todayOrders} sales billed today` : 'Live MongoDB Sales Engine'}
              </Text>
            </View>
            <View className="bg-white/10 rounded-2xl p-3 border border-white/15">
              <Ionicons name="wallet-outline" size={26} color="#fff" />
            </View>
          </View>

          {/* Today Payment Breakdown Strip */}
          {salesTimeframe === 'TODAY' && (
            <View className="flex-row justify-between items-center border-t border-white/15 pt-3 mt-4">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
                <Text className="text-white/80 text-[11px] font-semibold">
                  Cash: <Text className="text-white font-bold">₹{stats.paymentBreakdown.CASH || 0}</Text>
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-blue-300 mr-1.5" />
                <Text className="text-white/80 text-[11px] font-semibold">
                  UPI: <Text className="text-white font-bold">₹{stats.paymentBreakdown.UPI || 0}</Text>
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-amber-400 mr-1.5" />
                <Text className="text-white/80 text-[11px] font-semibold">
                  Udhar: <Text className="text-white font-bold">₹{stats.paymentBreakdown.UDHAR || 0}</Text>
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Morning Low Stock Summary Banner */}
        {stats.lowStockCount > 0 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/admin/inventory')}
            className="bg-red-50 border border-red-200 rounded-2xl p-3.5 mb-4 flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-10 h-10 rounded-xl bg-red-100 items-center justify-center mr-3">
                <Ionicons name="alert-circle" size={22} color="#EF4444" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-black text-red-900">
                  Morning Stock Alert: {stats.lowStockCount} Items Low
                </Text>
                <Text className="text-[11px] text-red-600 font-medium mt-0.5" numberOfLines={1}>
                  {stats.lowStockItems.slice(0, 3).map(i => i.name).join(', ')}...
                </Text>
              </View>
            </View>
            <View className="bg-red-200/60 rounded-xl px-2.5 py-1.5">
              <Text className="text-red-800 text-[10px] font-black uppercase">Restock →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* KPI Grid */}
        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Metrics</Text>
        <View className="flex-row justify-between flex-wrap mb-2">
          <StatCard
            icon="cube-outline"
            iconColor="#1E3A8A"
            label="Total Products"
            value={stats.totalProducts}
            iconBg="bg-blue-50"
            onPress={() => router.push('/admin/inventory')}
          />
          <StatCard
            icon="alert-circle-outline"
            iconColor="#EF4444"
            label="Low Stock Items"
            value={`${stats.lowStockCount} Items`}
            valueColor="text-red-500"
            iconBg="bg-red-50"
            onPress={() => router.push('/admin/inventory')}
          />
          <StatCard
            icon="bicycle-outline"
            iconColor="#1E3A8A"
            label="Active Orders"
            value={`${stats.activeOrders} Orders`}
            valueColor="text-[#1E3A8A]"
            iconBg="bg-blue-50"
            onPress={() => router.push('/admin/orders')}
          />
          <StatCard
            icon="receipt-outline"
            iconColor="#10B981"
            label="Today's Orders"
            value={`${stats.todayOrders} Billed`}
            valueColor="text-emerald-600"
            iconBg="bg-emerald-50"
            onPress={() => router.push('/admin/pos')}
          />
        </View>

        {/* Quick Actions */}
        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mt-2">Store Actions</Text>
        <ActionRow
          icon="calculator-outline"
          iconColor="#1E3A8A"
          iconBg="bg-blue-50"
          title="Quick POS Counter Billing"
          subtitle="Scan barcodes & bill walk-in customers"
          onPress={() => router.push('/admin/pos')}
          badge="Fast POS"
        />
        <ActionRow
          icon="cube-outline"
          iconColor="#1E3A8A"
          iconBg="bg-blue-50"
          title="Manage Catalog & Stock"
          subtitle="Add items, quick stepper restock, barcode scan"
          onPress={() => router.push('/admin/inventory')}
        />
        <ActionRow
          icon="bicycle-outline"
          iconColor="#16A34A"
          iconBg="bg-green-50"
          title="Fulfill Delivery Orders"
          subtitle="Accept, call customer & map route dispatch"
          onPress={() => router.push('/admin/orders')}
        />
        <ActionRow
          icon="pricetag-outline"
          iconColor="#C026D3"
          iconBg="bg-fuchsia-50"
          title="Offers & Promo Codes"
          subtitle="Create discounts and free delivery codes"
          onPress={() => router.push('/admin/offers')}
        />
        <ActionRow
          icon="folder-open-outline"
          iconColor="#0EA5E9"
          iconBg="bg-sky-50"
          title="Manage Categories"
          subtitle="Add/edit product categories with camera upload"
          onPress={() => router.push('/admin/categories')}
        />

      </ScrollView>
    </SafeAreaView>
  );
}
