import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

const STATUS_CONFIG = {
  PENDING:          { label: 'Pending',          textColor: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', nextLabel: 'Accept Order →',      nextStatus: 'ACCEPTED',         nextBtnBg: 'bg-[#1E3A8A]' },
  ACCEPTED:         { label: 'Accepted',         textColor: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  nextLabel: 'Dispatch Delivery', nextStatus: 'OUT_FOR_DELIVERY', nextBtnBg: 'bg-violet-600' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', textColor: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200',nextLabel: 'Mark Delivered',    nextStatus: 'DELIVERED',        nextBtnBg: 'bg-emerald-600' },
  DELIVERED:        { label: 'Delivered',        textColor: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200',nextLabel: null },
  CANCELLED:        { label: 'Cancelled',        textColor: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',   nextLabel: null },
};

export default function AdminOrdersScreen() {
  const { apiBaseUrl, socket } = useApp();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/orders`);
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchOrders();

    if (socket) {
      const handleNewOrder = (newOrder) => {
        setOrders(prev => [newOrder, ...prev]);
      };

      const handleStatusUpdate = (updatedOrder) => {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      };

      socket.on('newOrder', handleNewOrder);
      socket.on('orderStatusUpdate', handleStatusUpdate);

      return () => {
        socket.off('newOrder', handleNewOrder);
        socket.off('orderStatusUpdate', handleStatusUpdate);
      };
    }
  }, [socket]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (id, nextStatus) => {
    try {
      const res = await fetch(`${apiBaseUrl}/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOrders(prev => prev.map(o => o._id === id ? data.data : o));
      } else {
        // Fallback if data is missing
        fetchOrders();
      }
    } catch (e) {
      Alert.alert('Error', 'Status update failed');
    }
  };

  const filteredOrders = orders.filter(o => activeTab === 'ALL' || o.status === activeTab);

  const tabs = [
    { id: 'ALL', label: 'All', count: orders.length },
    { id: 'PENDING', label: 'Pending', count: orders.filter(o => o.status === 'PENDING').length },
    { id: 'ACCEPTED', label: 'Accepted', count: orders.filter(o => o.status === 'ACCEPTED').length },
    { id: 'OUT_FOR_DELIVERY', label: 'On Way', count: orders.filter(o => o.status === 'OUT_FOR_DELIVERY').length },
    { id: 'DELIVERED', label: 'Delivered', count: orders.filter(o => o.status === 'DELIVERED').length },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFF]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFF" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-3xl font-black text-[#1E3A8A]">Delivery Orders</Text>
        <Text className="text-xs text-slate-400 font-semibold mt-0.5">
          {orders.filter(o => o.status === 'PENDING').length} pending · Pull down to refresh
        </Text>
      </View>

      {/* Filter Tabs */}
      <View className="px-5 mb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                className={`flex-row items-center px-3.5 py-2 rounded-xl mr-2 border ${
                  isActive ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>{tab.label}</Text>
                {tab.count > 0 && (
                  <View className={`ml-1.5 rounded-lg px-1.5 py-0.5 ${isActive ? 'bg-white/20' : 'bg-blue-50'}`}>
                    <Text className={`text-[10px] font-black ${isActive ? 'text-white' : 'text-[#1E3A8A]'}`}>{tab.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={item => item._id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#28469E" />}
        ListEmptyComponent={() => (
          <View className="items-center pt-16">
            <Ionicons name="mail-unread-outline" size={64} color="#CBD5E1" className="mb-3" />
            <Text className="text-base font-black text-[#1E3A8A]">No Orders Yet</Text>
            <Text className="text-xs text-slate-400 mt-1">Pull down to refresh</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
          return (
            <View className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm">

              {/* Top Row */}
              <View className="flex-row justify-between items-center mb-3">
                <View>
                  <Text className="text-base font-black text-[#1E3A8A]">#{item.orderNo}</Text>
                  <Text className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {new Date(item.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <View className={`px-2.5 py-1.5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                  <Text className={`text-[10px] font-black uppercase ${cfg.textColor}`}>{cfg.label}</Text>
                </View>
              </View>

              {/* Customer Info */}
              <View className="bg-slate-50 rounded-xl p-3 mb-3">
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="person-circle-outline" size={15} color="#64748B" style={{ marginRight: 6 }} />
                  <Text className="text-sm font-black text-[#1E3A8A]">{item.customerName}</Text>
                </View>
                <View className="flex-row items-center mb-1.5">
                  <Ionicons name="call-outline" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                  <Text className="text-xs text-slate-500 font-semibold">+91-{item.phone}</Text>
                </View>
                <View className="flex-row items-start">
                  <Ionicons name="location-outline" size={13} color="#94A3B8" style={{ marginRight: 6, marginTop: 1 }} />
                  <Text className="text-xs text-slate-500 font-semibold flex-1">{item.deliveryAddress}{item.pincode ? ` — ${item.pincode}` : ''}</Text>
                </View>
              </View>

              {/* Items */}
              <View className="mb-3">
                {item.items.map((i, idx) => (
                  <View key={idx} className="flex-row justify-between py-1">
                    <Text className="text-xs text-slate-500 font-semibold flex-1">· {i.name} × {i.quantity}</Text>
                    <Text className="text-xs font-bold text-[#1E3A8A]">₹{i.total || (i.price * i.quantity)}</Text>
                  </View>
                ))}
              </View>

              {/* Footer */}
              <View className="flex-row justify-between items-center border-t border-slate-100 pt-3">
                <View>
                  <Text className="text-[10px] text-slate-400 font-bold uppercase">{item.paymentMethod}</Text>
                  <Text className="text-lg font-black text-[#1E3A8A]">₹{item.totalAmount}</Text>
                </View>
                {cfg.nextLabel && (
                  <TouchableOpacity
                    onPress={() => handleUpdateStatus(item._id, cfg.nextStatus)}
                    className={`${cfg.nextBtnBg} rounded-xl px-4 py-2.5`}
                  >
                    <Text className="text-white font-bold text-xs">{cfg.nextLabel}</Text>
                  </TouchableOpacity>
                )}
                {!cfg.nextLabel && item.status === 'DELIVERED' && (
                  <View className="bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-200 flex-row items-center">
                    <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginRight: 4 }} />
                    <Text className="text-emerald-700 font-black text-xs">Delivered</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
