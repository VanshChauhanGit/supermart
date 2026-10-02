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

const ActionRow = ({ icon, iconBg, iconColor, title, subtitle, onPress }) => (
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
        <Text className="text-sm font-black text-slate-900 mb-0.5">{title}</Text>
        <Text className="text-[11px] font-medium text-slate-400">{subtitle}</Text>
      </View>
    </View>
    <View className="w-8 h-8 rounded-xl bg-[#EFF6FF] items-center justify-center">
      <Ionicons name="chevron-forward" size={16} color="#28469E" />
    </View>
  </TouchableOpacity>
);

export default function AdminDashboardScreen() {
  const { apiBaseUrl, logoutAdmin } = useApp();

  const [stats, setStats] = useState({
    todaySales: 14850,
    totalProducts: 48,
    totalUdhar: 18500,
    activeOrders: 5,
    lowStockCount: 4
  });

  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const pRes = await fetch(`${apiBaseUrl}/products`);
      const pData = await pRes.json();
      const cRes = await fetch(`${apiBaseUrl}/customers`);
      const cData = await cRes.json();
      const oRes = await fetch(`${apiBaseUrl}/orders`);
      const oData = await oRes.json();

      let productsCount = pData.success ? pData.data.length : 48;
      let lowStock = pData.success ? pData.data.filter(p => p.stockQty <= (p.reorderLevel || 5)).length : 4;
      let totalMarketUdhar = cData.success ? cData.data.reduce((acc, c) => acc + (c.creditBalance || 0), 0) : 18500;
      let pendingOrders = oData.success ? oData.data.filter(o => o.status !== 'DELIVERED').length : 5;

      setStats({
        todaySales: 14850,
        totalProducts: productsCount,
        totalUdhar: totalMarketUdhar,
        activeOrders: pendingOrders,
        lowStockCount: lowStock
      });
    } catch (e) {}
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFF]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFF" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#28469E" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        {/* <View className="flex-row justify-between items-start mb-6">
          <View>
            <Text className="text-xs font-bold text-slate-400 tracking-wide">{greeting}</Text>
            <Text className="text-3xl font-black text-slate-900 mt-0.5">Store Dashboard</Text>
            <Text className="text-xs text-slate-400 font-semibold mt-1">
              Supermart POS · {now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { if (logoutAdmin) logoutAdmin(); }}
            className="bg-red-50 rounded-2xl p-2.5 border border-red-100"
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View> */}

        {/* Hero Revenue Card */}
        <View className="rounded-3xl mb-5 overflow-hidden shadow-xl shadow-[#1E3A8A]/30">
          <View className="bg-[#1E3A8A] p-4">
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-[#93C5FD] text-[10px] font-bold uppercase tracking-widest mb-2">TODAY'S REVENUE</Text>
                <Text className="text-white text-4xl font-semibold tracking-tight">₹{stats.todaySales.toLocaleString('en-IN')}</Text>
                {/* <View className="flex-row items-center mt-2.5">
                  <View className="w-2 h-2 rounded-full bg-green-400 mr-1.5" />
                  <Text className="text-[#93C5FD] text-xs font-semibold">Live MongoDB · All POS channels</Text>
                </View> */}
              </View>
              <View className="bg-white/10 rounded-2xl p-3 border border-white/15">
                <Ionicons name="wallet-outline" size={24} color="#fff" />
              </View>
            </View>
          </View>
        </View>

        {/* KPI Grid */}
        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Quick Metrics</Text>
        <View className="flex-row justify-between flex-wrap mb-2">
          <StatCard icon="cube-outline" iconColor="#1E3A8A" label="Total Products" value={stats.totalProducts} iconBg="bg-blue-50" onPress={() => router.push('/admin/inventory')} />
          <StatCard icon="alert-circle-outline" iconColor="#EF4444" label="Low Stock" value={`${stats.lowStockCount} Items`} valueColor="text-red-500" iconBg="bg-red-50" onPress={() => router.push('/admin/inventory')} />
          <StatCard icon="car-outline" iconColor="#1E3A8A" label="Active Orders" value={`${stats.activeOrders} Active`} valueColor="text-[#1E3A8A]" iconBg="bg-blue-50" onPress={() => router.push('/admin/orders')} />
          <StatCard icon="book-outline" iconColor="#D97706" label="Udhar Pending" value={`₹${stats.totalUdhar.toLocaleString('en-IN')}`} valueColor="text-amber-600" iconBg="bg-amber-50" onPress={() => router.push('/admin/udhar')} />
        </View>

        {/* Quick Actions */}
        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mt-2">Store Actions</Text>
        <ActionRow icon="cube-outline" iconColor="#1E3A8A" iconBg="bg-blue-50" title="Manage Catalog & Stock" subtitle="Add items, upload photos, set prices" onPress={() => router.push('/admin/inventory')} />
        <ActionRow icon="cart-outline" iconColor="#16A34A" iconBg="bg-green-50" title="Fulfill Delivery Orders" subtitle="Accept & dispatch 30-min orders" onPress={() => router.push('/admin/orders')} />
        <ActionRow icon="pricetag-outline" iconColor="#C026D3" iconBg="bg-fuchsia-50" title="Offers & Promo Codes" subtitle="Create discounts and free delivery codes" onPress={() => router.push('/admin/offers')} />
        <ActionRow icon="book-outline" iconColor="#D97706" iconBg="bg-amber-50" title="Udhar Khata (Ledger)" subtitle="Record payments, send WhatsApp reminders" onPress={() => router.push('/admin/udhar')} />
        <ActionRow icon="folder-open-outline" iconColor="#0EA5E9" iconBg="bg-sky-50" title="Manage Categories" subtitle="Add/edit product categories with images" onPress={() => router.push('/admin/categories')} />

      </ScrollView>
    </SafeAreaView>
  );
}
