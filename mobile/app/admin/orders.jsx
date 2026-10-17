import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  Alert, ScrollView, StatusBar, Linking, Modal, TextInput,
  Keyboard, KeyboardAvoidingView, Platform
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
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  // Cancel / Reject Modal State
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Dispatch & Rider Assignment Modal State
  const [selectedOrderToDispatch, setSelectedOrderToDispatch] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  // Fleet Management Modal State (Create Delivery Boy)
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [newBoyName, setNewBoyName] = useState('');
  const [newBoyPhone, setNewBoyPhone] = useState('');
  const [newBoyPassword, setNewBoyPassword] = useState('');
  const [newBoyVehicle, setNewBoyVehicle] = useState('bike');
  const [newBoyVehicleNo, setNewBoyVehicleNo] = useState('');
  const [savingBoy, setSavingBoy] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/orders`);
      const data = await res.json();
      if (data.success) setOrders(data.data);
    } catch (e) {}
  };

  const fetchDeliveryBoys = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/auth/admin/delivery-boys`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDeliveryBoys(data.data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchOrders();
    fetchDeliveryBoys();

    if (socket) {
      const handleNewOrder = (newOrder) => {
        setOrders(prev => [newOrder, ...prev.filter(o => o._id !== newOrder._id)]);
      };

      const handleStatusUpdate = (updatedOrder) => {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
        fetchDeliveryBoys();
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
    await Promise.all([fetchOrders(), fetchDeliveryBoys()]);
    setRefreshing(false);
  };

  const handleUpdateStatus = async (id, nextStatus, notes = '', riderName = '', riderPhone = '', deliveryBoyId = '') => {
    try {
      const payload = { status: nextStatus, notes };
      if (riderName) payload.riderName = riderName;
      if (riderPhone) payload.riderPhone = riderPhone;
      if (deliveryBoyId) payload.deliveryBoyId = deliveryBoyId;

      const res = await fetch(`${apiBaseUrl}/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOrders(prev => prev.map(o => o._id === id ? data.data : o));
        fetchDeliveryBoys();
        return true;
      } else {
        Alert.alert('Status Update Error', data.message || 'Status update failed.');
        return false;
      }
    } catch (e) {
      Alert.alert('Error', 'Status update failed: ' + e.message);
      return false;
    }
  };

  // Create New Delivery Boy Account (Store Owner Only)
  const handleCreateDeliveryBoy = async () => {
    if (!newBoyName.trim() || !newBoyPhone.trim() || !newBoyPassword.trim()) {
      Alert.alert('Required Fields', 'Please enter delivery partner name, 10-digit mobile number, and login password.');
      return;
    }

    if (newBoyPhone.trim().length !== 10) {
      Alert.alert('Invalid Mobile', 'Please provide a valid 10-digit mobile number.');
      return;
    }

    setSavingBoy(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/admin/delivery-boys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBoyName.trim(),
          mobile: newBoyPhone.trim(),
          password: newBoyPassword.trim(),
          vehicleType: newBoyVehicle,
          vehicleNumber: newBoyVehicleNo.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Fleet Member Created! 🛵', `Delivery Boy account for ${newBoyName} is ready. They can now login with their phone and password.`);
        setNewBoyName('');
        setNewBoyPhone('');
        setNewBoyPassword('');
        setNewBoyVehicleNo('');
        fetchDeliveryBoys();
      } else {
        Alert.alert('Creation Failed', data.message || 'Could not register delivery boy.');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Could not create delivery boy account.');
    } finally {
      setSavingBoy(false);
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
      <View className="px-5 pt-4 pb-3 flex-row justify-between items-center">
        <View>
          <Text className="text-3xl font-black text-[#1E3A8A]">Delivery Orders</Text>
          <Text className="text-xs text-slate-400 font-semibold mt-0.5">
            {orders.filter(o => o.status === 'PENDING').length} pending · Pull down to refresh
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowFleetModal(true)}
          activeOpacity={0.8}
          className="bg-slate-900 border border-[#F7C400] px-3.5 py-2 rounded-2xl flex-row items-center shadow-xs"
        >
          <Ionicons name="bicycle" size={15} color="#F7C400" style={{ marginRight: 6 }} />
          <Text className="text-xs font-black text-[#F7C400]">
            Fleet ({deliveryBoys.length})
          </Text>
        </TouchableOpacity>
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
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
            <View className="bg-white rounded-3xl p-4.5 mb-4 border border-slate-200 shadow-sm" style={{ padding: 18 }}>

              {/* Top Row: Order # and Status Badge */}
              <View className="flex-row justify-between items-center pb-3 border-b border-slate-100 mb-3">
                <View>
                  <Text className="text-base font-black text-[#1E3A8A]">#{item.orderNo}</Text>
                  <Text className="text-[10px] text-slate-400 font-semibold mt-0.5">
                    {new Date(item.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <View className={`px-3 py-1.5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                  <Text className={`text-[10px] font-black uppercase tracking-wide ${cfg.textColor}`}>{cfg.label}</Text>
                </View>
              </View>

              {/* Cancellation Reason Note if Cancelled */}
              {item.status === 'CANCELLED' && item.notes ? (
                <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex-row items-center">
                  <Ionicons name="information-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text className="text-xs text-red-700 font-bold flex-1">
                    Reason: {item.notes}
                  </Text>
                </View>
              ) : null}

              {/* Customer Info with 1-Tap Helpers */}
              <View className="bg-slate-50 rounded-2xl p-3.5 mb-3.5 border border-slate-200/80">
                <View className="flex-row items-center mb-2">
                  <View className="w-7 h-7 rounded-full bg-slate-200 items-center justify-center mr-2">
                    <Ionicons name="person" size={14} color="#64748B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-black text-[#1E3A8A]">{item.customerName}</Text>
                    <Text className="text-xs text-slate-500 font-semibold">+91 {item.phone}</Text>
                  </View>
                </View>

                {/* Address Row */}
                <View className="pt-2.5 border-t border-slate-200/70 mb-3">
                  <View className="flex-row items-start">
                    <Ionicons name="location" size={15} color="#D97706" style={{ marginRight: 6, marginTop: 1 }} />
                    <Text className="text-xs text-slate-600 font-medium flex-1 leading-snug">
                      {item.deliveryAddress}{item.pincode ? ` — ${item.pincode}` : ''}
                    </Text>
                  </View>

                  {/* GPS Landmark tag */}
                  {item.location?.landmark ? (
                    <Text className="text-[11px] text-slate-500 font-semibold ml-5 mt-1">
                      Landmark: {item.location.landmark}
                    </Text>
                  ) : null}
                </View>

                {/* 1-Tap Action Helpers Row */}
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => callCustomer(item.phone)}
                    activeOpacity={0.8}
                    className="flex-1 bg-emerald-100 border border-emerald-300 py-2 px-3 rounded-xl flex-row items-center justify-center"
                  >
                    <Ionicons name="call" size={13} color="#059669" style={{ marginRight: 5 }} />
                    <Text className="text-xs font-black text-emerald-800">Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigateAddress(item.deliveryAddress, item.pincode, item.location)}
                    activeOpacity={0.8}
                    className="flex-1 bg-blue-100 border border-blue-300 py-2 px-3 rounded-xl flex-row items-center justify-center"
                  >
                    <Ionicons name="navigate" size={13} color="#1E3A8A" style={{ marginRight: 5 }} />
                    <Text className="text-xs font-black text-[#1E3A8A]">
                      {item.location?.latitude ? 'GPS Map' : 'Map'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Customer Delivery OTP for Rider Handover */}
                {item.deliveryOtp && (
                  <View className="flex-row items-center mt-2.5 pt-2.5 border-t border-slate-200/70 justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="shield-checkmark" size={14} color="#D97706" style={{ marginRight: 5 }} />
                      <Text className="text-[11px] font-bold text-slate-500">
                        Delivery Handover OTP:
                      </Text>
                    </View>
                    <View className="bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md">
                      <Text className="text-xs font-black text-amber-900 tracking-wider">
                        {item.deliveryOtp}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Items Box */}
              <View className="bg-slate-50/70 rounded-2xl p-3 mb-3.5 border border-slate-200/60">
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  ORDER ITEMS ({item.items?.length || 0})
                </Text>
                {item.items.map((i, idx) => (
                  <View key={idx} className="flex-row justify-between py-1 border-b border-slate-100 last:border-b-0">
                    <Text className="text-xs text-slate-700 font-semibold flex-1 mr-2" numberOfLines={1}>
                      • {i.name} × {i.quantity} {i.unit || ''}
                    </Text>
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
                      onPress={() => {
                        if (cfg.nextStatus === 'OUT_FOR_DELIVERY') {
                          setSelectedOrderToDispatch(item);
                          setShowDispatchModal(true);
                        } else {
                          handleUpdateStatus(item._id, cfg.nextStatus);
                        }
                      }}
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
      <Modal
        visible={showCancelModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowCancelModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowCancelModal(false);
            }}
            className="flex-1 bg-slate-900/60 justify-end"
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={Keyboard.dismiss}
              className="bg-white rounded-t-3xl p-5"
            >
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
              onPress={() => {
                Keyboard.dismiss();
                setShowCancelModal(false);
              }}
              className="bg-slate-100 rounded-2xl py-3 items-center"
            >
              <Text className="text-slate-600 font-bold text-xs">Keep Order</Text>
            </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          DISPATCH & RIDER ASSIGNMENT MODAL (Enforces Single Active Delivery)
          ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showDispatchModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDispatchModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowDispatchModal(false)}
          className="flex-1 bg-black/60 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-white rounded-t-3xl p-5 max-h-[85%]"
          >
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-3" />

            <View className="flex-row justify-between items-center mb-2">
              <View>
                <Text className="text-xl font-black text-slate-900 tracking-tight">
                  Dispatch Delivery
                </Text>
                <Text className="text-xs font-bold text-slate-500 mt-0.5">
                  Order #{selectedOrderToDispatch?.orderNo} • {selectedOrderToDispatch?.customerName}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowDispatchModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Instruction Banner */}
            <View className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-3 flex-row items-center">
              <Ionicons name="information-circle" size={18} color="#1E3A8A" style={{ marginRight: 8 }} />
              <Text className="text-xs font-semibold text-blue-900 flex-1 leading-snug">
                Select an available delivery partner. Partners already out on delivery cannot be assigned new orders until they finish.
              </Text>
            </View>

            {/* Delivery Partners List */}
            <Text className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Select Delivery Partner ({deliveryBoys.filter(b => !b.isBusy).length} Available)
            </Text>

            <ScrollView className="max-h-64 mb-3" showsVerticalScrollIndicator={false}>
              {deliveryBoys.length === 0 ? (
                <View className="items-center py-6 bg-slate-50 rounded-2xl border border-slate-200/80 px-4">
                  <Ionicons name="bicycle-outline" size={32} color="#94A3B8" style={{ marginBottom: 6 }} />
                  <Text className="text-xs font-black text-slate-700 text-center">
                    No Delivery Partners Created Yet
                  </Text>
                  <Text className="text-[11px] font-medium text-slate-500 text-center mt-1">
                    Store owner must create delivery boy accounts first before dispatching.
                  </Text>
                </View>
              ) : (
                deliveryBoys.map((boy) => {
                  const isBusy = boy.isBusy;
                  return (
                    <TouchableOpacity
                      key={boy._id}
                      disabled={isBusy}
                      onPress={async () => {
                        const success = await handleUpdateStatus(
                          selectedOrderToDispatch._id,
                          'OUT_FOR_DELIVERY',
                          '',
                          boy.name,
                          boy.mobile,
                          boy._id
                        );
                        if (success) {
                          setShowDispatchModal(false);
                          setSelectedOrderToDispatch(null);
                        }
                      }}
                      activeOpacity={0.75}
                      className={`p-3.5 rounded-2xl mb-2.5 border flex-row items-center justify-between ${
                        isBusy
                          ? 'bg-slate-100/80 border-slate-200 opacity-60'
                          : 'bg-white border-slate-300 shadow-xs active:bg-blue-50'
                      }`}
                    >
                      <View className="flex-row items-center flex-1 mr-2">
                        <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
                          isBusy ? 'bg-slate-200' : 'bg-[#FEF3C7]'
                        }`}>
                          <Ionicons
                            name="bicycle"
                            size={20}
                            color={isBusy ? '#64748B' : '#D97706'}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs font-black text-slate-900">
                            {boy.name}
                          </Text>
                          <Text className="text-[10px] font-semibold text-slate-500 mt-0.5">
                            +91 {boy.mobile} • {boy.vehicleType || 'Bike'} {boy.vehicleNumber ? `(${boy.vehicleNumber})` : ''}
                          </Text>
                        </View>
                      </View>

                      {/* Status Chip */}
                      <View className={`px-2.5 py-1 rounded-full ${
                        isBusy ? 'bg-rose-100 border border-rose-300' : 'bg-emerald-100 border border-emerald-300'
                      }`}>
                        <Text className={`text-[10px] font-black uppercase ${
                          isBusy ? 'text-rose-800' : 'text-emerald-800'
                        }`}>
                          {isBusy ? `BUSY (#${boy.activeOrder?.orderNo || 'Delivering'})` : 'ASSIGN & DISPATCH ➔'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Quick Action: Open Fleet Manager */}
            <TouchableOpacity
              onPress={() => {
                setShowDispatchModal(false);
                setShowFleetModal(true);
              }}
              activeOpacity={0.8}
              className="w-full bg-slate-900 rounded-2xl py-3.5 items-center justify-center flex-row shadow-sm"
            >
              <Ionicons name="person-add-outline" size={16} color="#F7C400" style={{ marginRight: 6 }} />
              <Text className="text-[#F7C400] font-black text-xs">
                + Create / Manage Delivery Boy Accounts
              </Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          FLEET MANAGEMENT MODAL (Create & View Delivery Boys)
          ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showFleetModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowFleetModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setShowFleetModal(false);
            }}
            className="flex-1 bg-black/60 justify-end"
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={Keyboard.dismiss}
              className="bg-white rounded-t-3xl p-5 max-h-[90%]"
            >
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-3" />

            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-xl font-black text-[#1E3A8A] tracking-tight">
                  Delivery Fleet Manager
                </Text>
                <Text className="text-xs font-bold text-slate-400 mt-0.5">
                  Only Store Owners can create delivery boy accounts
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowFleetModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* ── 1. Create New Delivery Partner Form ── */}
              <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
                <Text className="text-xs font-black text-slate-900 uppercase tracking-wide mb-2.5">
                  + Add New Delivery Boy Account
                </Text>

                {/* Name */}
                <Text className="text-[11px] font-bold text-slate-600 mb-1">Full Name</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold mb-2.5 text-slate-900"
                  placeholder="e.g. Ramesh Kumar"
                  value={newBoyName}
                  onChangeText={setNewBoyName}
                />

                {/* Phone */}
                <Text className="text-[11px] font-bold text-slate-600 mb-1">Mobile Number (10 digits)</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black mb-2.5 text-slate-900"
                  placeholder="e.g. 9876500001"
                  keyboardType="numeric"
                  maxLength={10}
                  value={newBoyPhone}
                  onChangeText={setNewBoyPhone}
                />

                {/* Password */}
                <Text className="text-[11px] font-bold text-slate-600 mb-1">Login Password</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold mb-2.5 text-slate-900"
                  placeholder="Set rider app password"
                  secureTextEntry
                  value={newBoyPassword}
                  onChangeText={setNewBoyPassword}
                />

                {/* Vehicle No */}
                <Text className="text-[11px] font-bold text-slate-600 mb-1">Vehicle Plate No (Optional)</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold mb-3 text-slate-900"
                  placeholder="e.g. DL-01-AB-1234"
                  value={newBoyVehicleNo}
                  onChangeText={setNewBoyVehicleNo}
                />

                <TouchableOpacity
                  onPress={handleCreateDeliveryBoy}
                  disabled={savingBoy}
                  activeOpacity={0.85}
                  className="w-full bg-[#1E3A8A] rounded-xl py-3 items-center justify-center shadow-xs"
                >
                  {savingBoy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-black text-xs">
                      CREATE DELIVERY BOY ACCOUNT
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* ── 2. Existing Fleet Members ── */}
              <Text className="text-xs font-black text-slate-800 uppercase tracking-wide mb-2">
                Active Fleet ({deliveryBoys.length})
              </Text>

              {deliveryBoys.map(boy => (
                <View
                  key={boy._id}
                  className="bg-white border border-slate-200 rounded-2xl p-3 mb-2 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center mr-2.5">
                      <Ionicons name="person" size={16} color="#1E3A8A" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-black text-slate-900">{boy.name}</Text>
                      <Text className="text-[10px] font-semibold text-slate-500">
                        +91 {boy.mobile} • {boy.vehicleType || 'Bike'} {boy.vehicleNumber || ''}
                      </Text>
                    </View>
                  </View>

                  <View className={`px-2 py-0.5 rounded-full ${
                    boy.isBusy ? 'bg-rose-100' : 'bg-emerald-100'
                  }`}>
                    <Text className={`text-[9px] font-black uppercase ${
                      boy.isBusy ? 'text-rose-800' : 'text-emerald-800'
                    }`}>
                      {boy.isBusy ? `Delivering #${boy.activeOrder?.orderNo}` : 'Available'}
                    </Text>
                  </View>
                </View>
              ))}

            </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}
