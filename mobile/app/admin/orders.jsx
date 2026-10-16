import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  Alert, ScrollView, StatusBar, Linking, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';

const STATUS_CONFIG = {
  PENDING:          { label: 'Pending',          textColor: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', nextLabel: 'Accept Order →',      nextStatus: 'ACCEPTED',         nextBtnBg: 'bg-[#1E3A8A]' },
  ACCEPTED:         { label: 'Accepted',         textColor: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200',  nextLabel: 'Dispatch Delivery', nextStatus: 'OUT_FOR_DELIVERY', nextBtnBg: 'bg-violet-600' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', textColor: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200',nextLabel: 'Mark Delivered',    nextStatus: 'DELIVERED',        nextBtnBg: 'bg-emerald-600' },
  DELIVERED:        { label: 'Delivered',        textColor: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200',nextLabel: null },
  CANCELLED:        { label: 'Cancelled',        textColor: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',   nextLabel: null },
};

const CANCELLATION_REASONS = [
  'Items out of stock',
  'Store closing / High order rush',
  'Customer requested cancellation',
  'Delivery address outside serviceable radius',
  'Customer unreachable / Invalid phone'
];

export default function AdminOrdersScreen() {
  const { apiBaseUrl, socket } = useApp();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  // Cancel / Reject Modal State
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Incoming Order Audio & Visual Alert Modal State
  const [incomingAlertOrder, setIncomingAlertOrder] = useState(null);
  const hapticIntervalRef = useRef(null);

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
        setIncomingAlertOrder(newOrder);

        // Trigger persistent haptic notification pulse pattern
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (_e) {}

        if (hapticIntervalRef.current) clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = setInterval(() => {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch (_e) {}
        }, 2200);
      };

      const handleStatusUpdate = (updatedOrder) => {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      };

      socket.on('newOrder', handleNewOrder);
      socket.on('orderStatusUpdate', handleStatusUpdate);

      return () => {
        if (hapticIntervalRef.current) clearInterval(hapticIntervalRef.current);
        socket.off('newOrder', handleNewOrder);
        socket.off('orderStatusUpdate', handleStatusUpdate);
      };
    }
  }, [socket]);

  const silenceMobileAlert = () => {
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
    setIncomingAlertOrder(null);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (id, nextStatus, notes = '') => {
    try {
      const res = await fetch(`${apiBaseUrl}/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, notes })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOrders(prev => prev.map(o => o._id === id ? data.data : o));
      } else {
        fetchOrders();
      }
    } catch (e) {
      Alert.alert('Error', 'Status update failed: ' + e.message);
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedOrderToCancel) return;
    const finalReason = customReason.trim() ? customReason.trim() : cancelReason;

    await handleUpdateStatus(selectedOrderToCancel._id, 'CANCELLED', finalReason);
    setShowCancelModal(false);
    setSelectedOrderToCancel(null);
    setCustomReason('');
    Alert.alert('Order Cancelled', `Order #${selectedOrderToCancel.orderNo} marked as cancelled.`);
  };

  // 1-Tap Call Customer
  const callCustomer = (phone) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`tel:+91${cleanPhone}`).catch(() => {
      Alert.alert('Calling Error', 'Could not initiate phone call.');
    });
  };

  // 1-Tap Google / Apple Map Navigation (with GPS Coordinates Support)
  const navigateAddress = (address, pincode, location) => {
    let url = '';
    if (location && location.latitude && location.longitude) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    } else {
      const query = encodeURIComponent(`${address || ''} ${pincode || ''}`);
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Maps Error', 'Could not open map navigation app.');
    });
  };

  const filteredOrders = orders.filter(o => activeTab === 'ALL' || o.status === activeTab);

  const tabs = [
    { id: 'ALL', label: 'All', count: orders.length },
    { id: 'PENDING', label: 'Pending', count: orders.filter(o => o.status === 'PENDING').length },
    { id: 'ACCEPTED', label: 'Accepted', count: orders.filter(o => o.status === 'ACCEPTED').length },
    { id: 'OUT_FOR_DELIVERY', label: 'On Way', count: orders.filter(o => o.status === 'OUT_FOR_DELIVERY').length },
    { id: 'DELIVERED', label: 'Delivered', count: orders.filter(o => o.status === 'DELIVERED').length },
    { id: 'CANCELLED', label: 'Cancelled', count: orders.filter(o => o.status === 'CANCELLED').length },
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
            <Text className="text-base font-black text-[#1E3A8A]">No Orders Found</Text>
            <Text className="text-xs text-slate-400 mt-1">Pull down to refresh</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
          const isActionable = item.status === 'PENDING' || item.status === 'ACCEPTED';

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

              {/* Cancellation Reason Note if Cancelled */}
              {item.status === 'CANCELLED' && item.notes ? (
                <View className="bg-red-50 border border-red-200 rounded-xl p-2.5 mb-3 flex-row items-center">
                  <Ionicons name="information-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text className="text-xs text-red-700 font-bold flex-1">
                    Reason: {item.notes}
                  </Text>
                </View>
              ) : null}

              {/* Customer Info with 1-Tap Helpers */}
              <View className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                <View className="flex-row justify-between items-center mb-2">
                  <View className="flex-row items-center flex-1">
                    <Ionicons name="person-circle-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <Text className="text-sm font-black text-[#1E3A8A]">{item.customerName}</Text>
                  </View>

                  {/* 1-Tap Call Customer Button */}
                  <TouchableOpacity
                    onPress={() => callCustomer(item.phone)}
                    className="bg-emerald-100 px-3 py-1.5 rounded-xl flex-row items-center"
                  >
                    <Ionicons name="call" size={13} color="#059669" style={{ marginRight: 4 }} />
                    <Text className="text-[11px] font-black text-emerald-800">Call Now</Text>
                  </TouchableOpacity>
                </View>

                <View className="flex-row items-center mb-2">
                  <Ionicons name="phone-portrait-outline" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                  <Text className="text-xs text-slate-500 font-semibold">+91-{item.phone}</Text>
                </View>

                {/* Address Row with 1-Tap Map Navigation */}
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-start flex-1 mr-2">
                    <Ionicons name="location-outline" size={14} color="#94A3B8" style={{ marginRight: 6, marginTop: 1 }} />
                    <Text className="text-xs text-slate-600 font-medium flex-1">
                      {item.deliveryAddress}{item.pincode ? ` — ${item.pincode}` : ''}
                    </Text>
                  </View>

                  {/* 1-Tap Google Map Navigation with GPS */}
                  <TouchableOpacity
                    onPress={() => navigateAddress(item.deliveryAddress, item.pincode, item.location)}
                    className="bg-blue-100 px-2.5 py-1.5 rounded-xl flex-row items-center"
                  >
                    <Ionicons name="navigate" size={12} color="#1E3A8A" style={{ marginRight: 4 }} />
                    <Text className="text-[11px] font-black text-[#1E3A8A]">
                      {item.location?.latitude ? 'GPS Map' : 'Map'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* GPS Coordinates Badge if captured */}
                {item.location?.latitude ? (
                  <View className="flex-row items-center mt-2 ml-5">
                    <View className="bg-emerald-100 px-2 py-0.5 rounded-md flex-row items-center mr-2">
                      <Ionicons name="pin" size={10} color="#065F46" />
                      <Text className="text-[10px] font-black text-emerald-800 ml-0.5">
                        GPS Locked ({item.location.latitude.toFixed(3)}, {item.location.longitude.toFixed(3)})
                      </Text>
                    </View>
                    {item.location.landmark ? (
                      <Text numberOfLines={1} className="text-[10px] text-slate-500 font-semibold flex-1">
                        Landmark: {item.location.landmark}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {/* Customer Delivery OTP for Rider Handover */}
                {item.deliveryOtp && (
                  <View className="flex-row items-center mt-2 pt-2 border-t border-slate-200/60 justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="shield-checkmark" size={13} color="#D97706" style={{ marginRight: 4 }} />
                      <Text className="text-[11px] font-bold text-slate-500">
                        Delivery Handover OTP:
                      </Text>
                    </View>
                    <View className="bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">
                      <Text className="text-xs font-black text-amber-900 tracking-wider">
                        {item.deliveryOtp}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Items */}
              <View className="mb-3">
                {item.items.map((i, idx) => (
                  <View key={idx} className="flex-row justify-between py-1 border-b border-slate-50">
                    <Text className="text-xs text-slate-600 font-semibold flex-1">· {i.name} × {i.quantity} {i.unit || ''}</Text>
                    <Text className="text-xs font-bold text-[#1E3A8A]">₹{i.total || (i.price * i.quantity)}</Text>
                  </View>
                ))}
              </View>

              {/* Footer */}
              <View className="flex-row justify-between items-center border-t border-slate-100 pt-3">
                <View>
                  <Text className="text-[10px] text-slate-400 font-bold uppercase">{item.paymentMethod || 'COD'}</Text>
                  <Text className="text-lg font-black text-[#1E3A8A]">₹{item.totalAmount}</Text>
                </View>

                <View className="flex-row items-center gap-2">
                  {/* Rejection / Cancellation Option for Pending/Accepted Orders */}
                  {isActionable && (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedOrderToCancel(item);
                        setShowCancelModal(true);
                      }}
                      className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5"
                    >
                      <Text className="text-red-600 font-bold text-xs">Reject</Text>
                    </TouchableOpacity>
                  )}

                  {/* Forward Status Button */}
                  {cfg.nextLabel && (
                    <TouchableOpacity
                      onPress={() => handleUpdateStatus(item._id, cfg.nextStatus)}
                      className={`${cfg.nextBtnBg} rounded-xl px-4 py-2.5 shadow-sm`}
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
            </View>
          );
        }}
      />

      {/* ─── Order Rejection / Cancellation Modal ─────────── */}
      <Modal visible={showCancelModal} animationType="slide" transparent>
        <View className="flex-1 bg-slate-900/60 justify-end">
          <View className="bg-white rounded-t-3xl p-5">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-3" />

            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-lg font-black text-red-600">Reject Delivery Order</Text>
                {selectedOrderToCancel && (
                  <Text className="text-xs text-slate-500 font-medium">
                    Order #{selectedOrderToCancel.orderNo} ({selectedOrderToCancel.customerName})
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Reason</Text>
            {CANCELLATION_REASONS.map((reason, idx) => {
              const isSelected = cancelReason === reason;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => { setCancelReason(reason); setCustomReason(''); }}
                  className={`p-3 rounded-2xl mb-2 border flex-row items-center ${
                    isSelected ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Ionicons
                    name={isSelected ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={isSelected ? "#DC2626" : "#94A3B8"}
                    style={{ marginRight: 8 }}
                  />
                  <Text className={`text-xs font-bold ${isSelected ? 'text-red-900' : 'text-slate-700'}`}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 mb-1.5">
              Custom Reason (Optional)
            </Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-semibold mb-4 text-slate-900"
              placeholder="Type specific explanation for customer..."
              value={customReason}
              onChangeText={setCustomReason}
            />

            <TouchableOpacity
              onPress={handleConfirmCancel}
              className="bg-red-600 rounded-2xl py-3.5 items-center mb-2 shadow-md shadow-red-600/30"
            >
              <Text className="text-white font-black text-sm">CONFIRM CANCELLATION</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowCancelModal(false)}
              className="bg-slate-100 rounded-2xl py-3 items-center"
            >
              <Text className="text-slate-600 font-bold text-xs">Keep Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          INCOMING ORDER HIGH-PRIORITY ALERT MODAL (Zomato-Style)
          ══════════════════════════════════════════════════════ */}
      <Modal
        visible={!!incomingAlertOrder}
        transparent
        animationType="slide"
        onRequestClose={silenceMobileAlert}
      >
        <View className="flex-1 bg-black/75 justify-center items-center px-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border-4 border-[#F7C400] shadow-2xl items-center">
            
            {/* Animated Pulsing Bell Beacon */}
            <View className="w-18 h-18 rounded-full bg-amber-100 border-4 border-amber-300 items-center justify-center mb-3">
              <Ionicons name="notifications" size={34} color="#D97706" />
            </View>

            <View className="bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-1.5">
              <Text className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                ⚡ LIVE EXPRESS DELIVERY ORDER
              </Text>
            </View>

            <Text className="text-2xl font-black text-slate-900 tracking-tight text-center">
              NEW ORDER RECEIVED!
            </Text>
            <Text className="text-sm font-extrabold text-[#1E3A8A] mt-0.5">
              #{incomingAlertOrder?.orderNo}
            </Text>

            {/* Quick Summary Box */}
            <View className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 my-4">
              <View className="flex-row justify-between items-center pb-2 border-b border-slate-200/80">
                <Text className="text-xs text-slate-500 font-bold">Customer:</Text>
                <Text className="text-xs font-black text-slate-900">{incomingAlertOrder?.customerName}</Text>
              </View>
              <View className="flex-row justify-between items-center py-2 border-b border-slate-200/80">
                <Text className="text-xs text-slate-500 font-bold">Phone:</Text>
                <Text className="text-xs font-bold text-slate-800">+91 {incomingAlertOrder?.phone}</Text>
              </View>
              <View className="flex-row justify-between items-center py-2 border-b border-slate-200/80">
                <Text className="text-xs text-slate-500 font-bold">Payment:</Text>
                <Text className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {incomingAlertOrder?.paymentMethod}
                </Text>
              </View>
              <View className="flex-row justify-between items-center pt-2">
                <Text className="text-xs text-slate-700 font-bold">Bill Total:</Text>
                <Text className="text-lg font-black text-[#1E3A8A]">₹{incomingAlertOrder?.totalAmount}</Text>
              </View>
            </View>

            {/* Accept & Silence Action Button */}
            <TouchableOpacity
              onPress={async () => {
                if (incomingAlertOrder?._id) {
                  await handleUpdateStatus(incomingAlertOrder._id, 'ACCEPTED');
                }
                silenceMobileAlert();
              }}
              activeOpacity={0.85}
              className="w-full bg-emerald-600 rounded-2xl py-3.5 items-center justify-center mb-2 shadow-lg flex-row"
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text className="text-white font-black text-sm">
                ACCEPT & SILENCE ALARM
              </Text>
            </TouchableOpacity>

            {/* Dismiss Button */}
            <TouchableOpacity
              onPress={silenceMobileAlert}
              className="w-full bg-slate-100 rounded-xl py-2.5 items-center"
            >
              <Text className="text-slate-600 font-bold text-xs">Dismiss / Keep Pending</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
