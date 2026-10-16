import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';

export default function DeliveryBoyScreen() {
  const insets = useSafeAreaInsets();
  const { apiBaseUrl, socket } = useApp();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ACTIVE'); // 'ACTIVE' | 'COMPLETED'
  const [riderName, setRiderName] = useState('Ramesh (Express Delivery)');

  // OTP Verification Modal State
  const [selectedOrderForOtp, setSelectedOrderForOtp] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style);
    } catch (_e) {}
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/orders`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
      }
    } catch (e) {
      console.warn('Error fetching delivery orders:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchOrders();

    if (socket) {
      const handleNewOrder = (newOrder) => {
        setOrders(prev => [newOrder, ...prev.filter(o => o._id !== newOrder._id)]);
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
  }, [fetchOrders, socket]);

  const onRefresh = async () => {
    setRefreshing(true);
    triggerHaptic();
    await fetchOrders();
  };

  // Start delivery (Dispatch / Out for delivery)
  const handleStartDelivery = async (order) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${apiBaseUrl}/orders/${order._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'OUT_FOR_DELIVERY',
          riderName,
          riderPhone: '9876543210'
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('🛵 Out for Delivery', `Order #${order.orderNo} dispatched. Navigate to customer doorstep.`);
        fetchOrders();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not update order status.');
    }
  };

  // Open OTP Modal
  const handleOpenOtpModal = (order) => {
    triggerHaptic();
    setSelectedOrderForOtp(order);
    setEnteredOtp('');
    setOtpError('');
  };

  // Submit OTP Verification
  const handleVerifyOtp = async () => {
    if (!selectedOrderForOtp) return;
    if (!enteredOtp || enteredOtp.trim().length < 4) {
      setOtpError('Please enter full 4-digit OTP provided by customer');
      return;
    }

    setVerifyingOtp(true);
    setOtpError('');

    try {
      const res = await fetch(`${apiBaseUrl}/orders/${selectedOrderForOtp._id}/verify-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp: enteredOtp.trim(),
          riderName
        })
      });

      const data = await res.json();
      if (data.success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_e) {}

        setSelectedOrderForOtp(null);
        Alert.alert(
          '🎉 Delivery Confirmed!',
          `Order #${selectedOrderForOtp.orderNo} successfully delivered and verified with OTP!`
        );
        fetchOrders();
      } else {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (_e) {}
        setOtpError(data.message || 'Incorrect OTP code. Ask customer to verify.');
      }
    } catch (e) {
      setOtpError('Connection error. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 1-Tap Google Maps Navigation (Prioritizes GPS Coordinates)
  const openNavigation = (order) => {
    triggerHaptic();
    let url = '';
    if (order.location?.latitude && order.location?.longitude) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${order.location.latitude},${order.location.longitude}`;
    } else {
      const dest = encodeURIComponent(`${order.deliveryAddress} ${order.pincode || ''}`);
      url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Maps Error', 'Could not launch Google Maps navigation.');
    });
  };

  // 1-Tap Customer Call
  const callCustomer = (phone) => {
    triggerHaptic();
    if (!phone) return;
    Linking.openURL(`tel:+91${phone.replace(/\D/g, '')}`).catch(() => {
      Alert.alert('Calling Error', 'Could not open phone dialer.');
    });
  };

  // Filter orders
  const activeOrders = orders.filter(o => ['ACCEPTED', 'OUT_FOR_DELIVERY', 'PENDING'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'DELIVERED');
  const displayedOrders = activeTab === 'ACTIVE' ? activeOrders : completedOrders;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Rider Top Header Bar ── */}
      <View className="bg-white border-b border-slate-200 px-5 pt-3 pb-4 shadow-xs">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                if (router.canGoBack()) router.back();
                else router.replace('/');
              }}
              className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 items-center justify-center mr-3 active:bg-slate-200"
            >
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
            </TouchableOpacity>

            <View>
              <View className="flex-row items-center">
                <Text className="text-xl font-black text-slate-900 tracking-tight mr-2">
                  Delivery Partner
                </Text>
                <View className="bg-emerald-100 px-2 py-0.5 rounded-full flex-row items-center">
                  <View className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1" />
                  <Text className="text-[10px] font-black text-emerald-800">ONLINE</Text>
                </View>
              </View>
              <Text className="text-xs font-bold text-slate-500">
                {riderName} • Express 10m Fleet
              </Text>
            </View>
          </View>

          {/* Quick Refresh */}
          <TouchableOpacity
            onPress={onRefresh}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="refresh" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* ── Active vs Completed Tabs ── */}
        <View className="flex-row mt-4 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <TouchableOpacity
            onPress={() => {
              triggerHaptic();
              setActiveTab('ACTIVE');
            }}
            activeOpacity={0.8}
            className={`flex-1 py-2 rounded-xl items-center flex-row justify-center ${
              activeTab === 'ACTIVE' ? 'bg-slate-900 shadow-sm' : ''
            }`}
          >
            <Ionicons
              name="bicycle"
              size={15}
              color={activeTab === 'ACTIVE' ? '#F7C400' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text className={`text-xs font-black ${
              activeTab === 'ACTIVE' ? 'text-white' : 'text-slate-600'
            }`}>
              Active Deliveries ({activeOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              triggerHaptic();
              setActiveTab('COMPLETED');
            }}
            activeOpacity={0.8}
            className={`flex-1 py-2 rounded-xl items-center flex-row justify-center ${
              activeTab === 'COMPLETED' ? 'bg-slate-900 shadow-sm' : ''
            }`}
          >
            <Ionicons
              name="checkmark-circle"
              size={15}
              color={activeTab === 'COMPLETED' ? '#F7C400' : '#64748B'}
              style={{ marginRight: 6 }}
            />
            <Text className={`text-xs font-black ${
              activeTab === 'COMPLETED' ? 'text-white' : 'text-slate-600'
            }`}>
              Completed ({completedOrders.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Deliveries List ── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0F172A" />
          <Text className="text-xs font-bold text-slate-500 mt-2">Loading deliveries...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedOrders}
          keyExtractor={item => item._id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 16) + 40
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#F7C400"
            />
          }
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-20 px-6">
              <View className="w-20 h-20 rounded-full bg-slate-200 items-center justify-center mb-4">
                <Ionicons name="cube-outline" size={36} color="#64748B" />
              </View>
              <Text className="text-base font-black text-slate-800 text-center">
                {activeTab === 'ACTIVE' ? 'No Active Deliveries Right Now' : 'No Completed Deliveries Yet'}
              </Text>
              <Text className="text-xs font-medium text-slate-500 text-center mt-1 max-w-[260px]">
                {activeTab === 'ACTIVE'
                  ? 'All assigned orders are completed. New online orders from customers will appear here in real time.'
                  : 'Delivered orders verified with OTP will be logged here.'}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isOutForDelivery = item.status === 'OUT_FOR_DELIVERY';
            const isAccepted = item.status === 'ACCEPTED';
            const isDelivered = item.status === 'DELIVERED';
            const isPending = item.status === 'PENDING';
            const isCod = item.paymentMethod === 'COD';

            return (
              <View className="bg-white rounded-3xl p-4.5 mb-4 border border-slate-200/90 shadow-sm">
                
                {/* ── Card Header: Order # & Status Badge ── */}
                <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <View>
                    <View className="flex-row items-center">
                      <Text className="text-base font-black text-slate-900 mr-2">
                        #{item.orderNo}
                      </Text>
                      {item.location?.latitude && (
                        <View className="bg-emerald-100 px-2 py-0.5 rounded-md flex-row items-center">
                          <Ionicons name="pin" size={10} color="#065F46" />
                          <Text className="text-[10px] font-black text-emerald-800 ml-0.5">GPS PINNED</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-[10px] font-semibold text-slate-400 mt-0.5">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.items?.length || 0} items
                    </Text>
                  </View>

                  {/* Cash or Online Badge */}
                  <View className={`px-2.5 py-1 rounded-xl border ${
                    isCod ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'
                  }`}>
                    <Text className={`text-[10px] font-black uppercase ${
                      isCod ? 'text-amber-900' : 'text-emerald-800'
                    }`}>
                      {isCod ? `💵 COLLECT ₹${item.totalAmount}` : `✅ PAID ONLINE`}
                    </Text>
                  </View>
                </View>

                {/* ── Customer Info Box ── */}
                <View className="bg-[#F8FAFC] rounded-2xl p-3 my-3 border border-slate-200/80">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1 mr-2">
                      <Ionicons name="person-circle" size={18} color="#0F172A" style={{ marginRight: 6 }} />
                      <Text className="text-sm font-black text-slate-900" numberOfLines={1}>
                        {item.customerName}
                      </Text>
                    </View>

                    {/* 1-Tap Phone Call */}
                    <TouchableOpacity
                      onPress={() => callCustomer(item.phone)}
                      activeOpacity={0.8}
                      className="bg-emerald-600 px-3 py-1.5 rounded-xl flex-row items-center"
                    >
                      <Ionicons name="call" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text className="text-[11px] font-black text-white">Call</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Address with 1-Tap Google Map Navigation */}
                  <View className="pt-2 border-t border-slate-200/60 flex-row items-start justify-between">
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-start">
                        <Ionicons name="location" size={14} color="#D97706" style={{ marginRight: 5, marginTop: 1 }} />
                        <Text className="text-xs font-semibold text-slate-700 flex-1 leading-snug">
                          {item.deliveryAddress} {item.pincode ? `(${item.pincode})` : ''}
                        </Text>
                      </View>

                      {item.location?.landmark ? (
                        <Text className="text-[10px] font-bold text-slate-500 ml-5 mt-1">
                          Landmark: {item.location.landmark}
                        </Text>
                      ) : null}
                    </View>

                    {/* Open in Google Maps Navigation Button */}
                    <TouchableOpacity
                      onPress={() => openNavigation(item)}
                      activeOpacity={0.8}
                      className="bg-blue-600 px-3 py-2 rounded-xl flex-row items-center shadow-xs"
                    >
                      <Ionicons name="navigate" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text className="text-[11px] font-black text-white">Navigate</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ── Items Summary ── */}
                <View className="mb-3 px-1">
                  <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    ORDER ITEMS
                  </Text>
                  {item.items?.map((prod, pIdx) => (
                    <Text key={pIdx} className="text-xs font-bold text-slate-700 py-0.5">
                      • {prod.name} ({prod.quantity} {prod.unit || 'pc'})
                    </Text>
                  ))}
                </View>

                {/* ── Status Actions ── */}
                {isPending && (
                  <View className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    <Text className="text-xs font-bold text-amber-800 text-center">
                      Store is currently packing this order.
                    </Text>
                  </View>
                )}

                {isAccepted && (
                  <TouchableOpacity
                    onPress={() => handleStartDelivery(item)}
                    activeOpacity={0.85}
                    className="bg-violet-600 rounded-2xl py-3.5 items-center justify-center flex-row shadow-md"
                  >
                    <Ionicons name="bicycle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text className="text-white font-black text-sm">
                      PICK UP & START DELIVERY ➔
                    </Text>
                  </TouchableOpacity>
                )}

                {isOutForDelivery && (
                  <TouchableOpacity
                    onPress={() => handleOpenOtpModal(item)}
                    activeOpacity={0.85}
                    className="bg-emerald-600 rounded-2xl py-3.5 items-center justify-center flex-row shadow-md"
                  >
                    <Ionicons name="key" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text className="text-white font-black text-sm">
                      ENTER CUSTOMER OTP TO CONFIRM DELIVERY
                    </Text>
                  </TouchableOpacity>
                )}

                {isDelivered && (
                  <View className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 6 }} />
                      <Text className="text-xs font-black text-emerald-900">
                        Handed Over & Verified
                      </Text>
                    </View>
                    <Text className="text-[10px] font-bold text-emerald-700">
                      OTP Confirmed
                    </Text>
                  </View>
                )}

              </View>
            );
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════
          OTP VERIFICATION MODAL
          ══════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedOrderForOtp}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedOrderForOtp(null)}
      >
        <View className="flex-1 bg-black/75 justify-center items-center px-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200">
            
            <View className="items-center mb-3">
              <View className="w-14 h-14 rounded-full bg-emerald-100 items-center justify-center mb-2">
                <Ionicons name="shield-checkmark" size={28} color="#059669" />
              </View>
              <Text className="text-xl font-black text-slate-900">
                Confirm Delivery
              </Text>
              <Text className="text-xs font-bold text-slate-500 text-center mt-1">
                Order #{selectedOrderForOtp?.orderNo} • Ask customer for the 4-digit OTP shown in their app.
              </Text>
            </View>

            {/* OTP Input */}
            <View className="my-3">
              <TextInput
                className="bg-slate-50 border-2 border-slate-300 focus:border-emerald-500 rounded-2xl py-3 px-4 text-center text-2xl font-black tracking-widest text-slate-900"
                keyboardType="numeric"
                maxLength={4}
                placeholder="• • • •"
                placeholderTextColor="#94A3B8"
                value={enteredOtp}
                onChangeText={(val) => {
                  setEnteredOtp(val);
                  setOtpError('');
                }}
                autoFocus
              />

              {otpError ? (
                <Text className="text-xs font-bold text-rose-600 text-center mt-2">
                  {otpError}
                </Text>
              ) : null}
            </View>

            {/* If Cash on Delivery, remind rider */}
            {selectedOrderForOtp?.paymentMethod === 'COD' && (
              <View className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3 flex-row items-center">
                <Ionicons name="cash-outline" size={16} color="#D97706" style={{ marginRight: 6 }} />
                <Text className="text-xs font-black text-amber-900 flex-1">
                  Collect ₹{selectedOrderForOtp.totalAmount} in Cash from customer.
                </Text>
              </View>
            )}

            {/* Actions */}
            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={verifyingOtp}
              activeOpacity={0.85}
              className="w-full bg-emerald-600 rounded-2xl py-3.5 items-center justify-center mb-2 shadow-md"
            >
              {verifyingOtp ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-black text-sm">
                  VERIFY OTP & COMPLETE DELIVERY
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedOrderForOtp(null)}
              className="w-full bg-slate-100 rounded-xl py-2.5 items-center"
            >
              <Text className="text-slate-600 font-bold text-xs">Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
