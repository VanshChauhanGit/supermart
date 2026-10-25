import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';
import { registerDeliveryBoyPushNotificationsAsync, triggerForegroundDeliveryAssignedNotification } from '../../services/notifications';
import OrderChimeSound from '../../components/OrderChimeSound';

export default function DeliveryBoyScreen() {
  const insets = useSafeAreaInsets();
  const { apiBaseUrl, socket, deliveryUser, logoutDelivery, isAuthLoaded, storeSettings } = useApp();

  // Navigation: Only 2 main tabs for delivery partner: 'ORDERS' and 'PROFILE'
  const [mainTab, setMainTab] = useState('ORDERS'); // 'ORDERS' | 'PROFILE'

  // Orders State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordersSubTab, setOrdersSubTab] = useState('ACTIVE'); // 'ACTIVE' | 'COMPLETED'
  const riderName = deliveryUser?.name || 'Delivery Partner';

  // QR Code Modal State (Store UPI QR Scanner)
  const [selectedOrderForQr, setSelectedOrderForQr] = useState(null);

  // OTP Verification Modal State
  const [selectedOrderForOtp, setSelectedOrderForOtp] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Live Incoming Assignment Alert & Sound State
  const [incomingAssignedOrder, setIncomingAssignedOrder] = useState(null);
  const [isPlayingChime, setIsPlayingChime] = useState(false);

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    try {
      Haptics.impactAsync(style);
    } catch (_e) { }
  };

  // Auth Guard: Delivery boy only screen
  useEffect(() => {
    if (isAuthLoaded && !deliveryUser) {
      router.replace('/');
    }
  }, [isAuthLoaded, deliveryUser]);

  // Hardware Back Button: Prevent leaving delivery mode without explicit logout
  useEffect(() => {
    const onBackPress = () => {
      if (mainTab === 'PROFILE') {
        setMainTab('ORDERS');
        return true;
      }
      Alert.alert(
        'Exit Delivery Shift',
        'Do you want to end your shift and log out?',
        [
          { text: 'Stay Online', style: 'cancel' },
          {
            text: 'Logout Shift',
            style: 'destructive',
            onPress: async () => {
              await logoutDelivery();
              router.replace('/');
            }
          }
        ]
      );
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [mainTab, logoutDelivery]);

  const fetchOrders = useCallback(async () => {
    try {
      const url = deliveryUser?.mobile
        ? `${apiBaseUrl}/orders/rider/${deliveryUser.mobile}`
        : `${apiBaseUrl}/orders`;
      const res = await fetch(url);
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
  }, [apiBaseUrl, deliveryUser]);

  // Register push token for delivery alerts (background & closed app)
  useEffect(() => {
    if (deliveryUser && apiBaseUrl) {
      registerDeliveryBoyPushNotificationsAsync(apiBaseUrl, deliveryUser).catch(() => { });
    }
  }, [deliveryUser, apiBaseUrl]);

  // Handle incoming delivery dispatch alert
  const notifyIncomingAssignment = useCallback((order) => {
    if (!order) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 650);
    } catch (_e) { }

    setIsPlayingChime(true);
    setIncomingAssignedOrder(order);
    triggerForegroundDeliveryAssignedNotification(order);
    setMainTab('ORDERS');
    setOrdersSubTab('ACTIVE');
    fetchOrders();
  }, [fetchOrders]);

  const handleDismissIncoming = () => {
    setIsPlayingChime(false);
    setIncomingAssignedOrder(null);
  };

  const handleAcceptIncoming = () => {
    setIsPlayingChime(false);
    setIncomingAssignedOrder(null);
    setMainTab('ORDERS');
    setOrdersSubTab('ACTIVE');
  };

  useEffect(() => {
    fetchOrders();

    if (socket) {
      const isMyOrder = (o) => {
        if (!o || !deliveryUser) return false;
        const myId = String(deliveryUser._id || '');
        const myPhone = String(deliveryUser.mobile || '').replace(/\D/g, '').slice(-10);
        const orderRiderId = String(o.deliveryBoyId || '');
        const orderPhone = String(o.riderPhone || '').replace(/\D/g, '').slice(-10);
        return (orderRiderId && orderRiderId === myId) || (orderPhone && myPhone && orderPhone === myPhone);
      };

      const handleNewOrder = (newOrder) => {
        setOrders(prev => [newOrder, ...prev.filter(o => o._id !== newOrder._id)]);
        if (newOrder.status === 'OUT_FOR_DELIVERY' && isMyOrder(newOrder)) {
          notifyIncomingAssignment(newOrder);
        }
      };

      const handleStatusUpdate = (updatedOrder) => {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
        if (updatedOrder.status === 'OUT_FOR_DELIVERY' && isMyOrder(updatedOrder)) {
          notifyIncomingAssignment(updatedOrder);
        }
      };

      const handleDeliveryAssigned = (data) => {
        const assignedOrder = data?.order || data;
        if (isMyOrder(assignedOrder)) {
          notifyIncomingAssignment(assignedOrder);
        }
      };

      socket.on('newOrder', handleNewOrder);
      socket.on('orderStatusUpdate', handleStatusUpdate);
      socket.on('deliveryAssigned', handleDeliveryAssigned);

      return () => {
        socket.off('newOrder', handleNewOrder);
        socket.off('orderStatusUpdate', handleStatusUpdate);
        socket.off('deliveryAssigned', handleDeliveryAssigned);
      };
    }
  }, [fetchOrders, socket, deliveryUser, notifyIncomingAssignment]);

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
          riderName: deliveryUser?.name || 'Store Rider',
          riderPhone: deliveryUser?.mobile || '',
          deliveryBoyId: deliveryUser?._id || ''
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('🛵 Out for Delivery', `Order #${order.orderNo} dispatched. Navigate to customer doorstep.`);
        fetchOrders();
      } else {
        Alert.alert('Cannot Start Delivery', data.message || 'Status update failed.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not update order status.');
    }
  };

  // Open Store Payment QR Modal
  const handleOpenQrModal = (order) => {
    triggerHaptic();
    setSelectedOrderForQr(order);
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
        } catch (_e) { }

        setSelectedOrderForOtp(null);
        Alert.alert(
          '🎉 Delivery Confirmed!',
          `Order #${selectedOrderForOtp.orderNo} successfully delivered and verified with OTP!`
        );
        fetchOrders();
      } else {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (_e) { }
        setOtpError(data.message || 'Incorrect OTP code. Ask customer to verify.');
      }
    } catch (e) {
      setOtpError('Connection error. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // 1-Tap Google Maps Navigation
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
  const displayedOrders = ordersSubTab === 'ACTIVE' ? activeOrders : completedOrders;

  // Confirm shift logout
  const handleShiftLogout = () => {
    triggerHaptic();
    Alert.alert(
      'End Delivery Shift',
      'Are you sure you want to clock out and log out of the delivery portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Shift & Logout',
          style: 'destructive',
          onPress: async () => {
            await logoutDelivery();
            router.replace('/');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Header Bar (No Back Button - Dedicated Delivery Portal) ── */}
      <View className="bg-white border-b border-slate-200 px-5 pt-3 pb-3.5 shadow-xs">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 items-center justify-center mr-3 shadow-xs">
              <Ionicons
                name={mainTab === 'ORDERS' ? 'bicycle' : 'person'}
                size={22}
                color="#B45309"
              />
            </View>

            <View>
              <View className="flex-row items-center">
                <Text className="text-lg font-black text-slate-900 tracking-tight mr-2">
                  {mainTab === 'ORDERS' ? 'My Deliveries' : 'Rider Profile'}
                </Text>
                {/* <View className="bg-emerald-100 px-2 py-0.5 rounded-full flex-row items-center">
                  <View className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1" />
                  <Text className="text-[10px] font-black text-emerald-800">ON DUTY</Text>
                </View> */}
              </View>
              <Text className="text-xs font-bold text-slate-500">
                {riderName} • Mandhaur Supermart
              </Text>
            </View>
          </View>

          {/* Top Right Quick Actions */}
          <View className="flex-row items-center gap-2">
            {mainTab === 'ORDERS' && (
              <TouchableOpacity
                onPress={onRefresh}
                className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
                title="Refresh"
              >
                <Ionicons name="refresh" size={17} color="#0F172A" />
              </TouchableOpacity>
            )}

            {/* <TouchableOpacity
              onPress={handleShiftLogout}
              className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 items-center justify-center active:bg-rose-100"
              title="Logout Shift"
            >
              <Ionicons name="log-out-outline" size={17} color="#E11D48" />
            </TouchableOpacity> */}
          </View>
        </View>

        {/* ── If on ORDERS tab: Show Active vs Completed sub-tabs ── */}
        {mainTab === 'ORDERS' && (
          <View className="flex-row mt-3 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                setOrdersSubTab('ACTIVE');
              }}
              activeOpacity={0.8}
              className={`flex-1 py-2 rounded-xl items-center flex-row justify-center ${ordersSubTab === 'ACTIVE' ? 'bg-slate-900 shadow-sm' : ''
                }`}
            >
              <Ionicons
                name="bicycle"
                size={14}
                color={ordersSubTab === 'ACTIVE' ? '#F7C400' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text className={`text-xs font-black ${ordersSubTab === 'ACTIVE' ? 'text-white' : 'text-slate-600'
                }`}>
                Active ({activeOrders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                setOrdersSubTab('COMPLETED');
              }}
              activeOpacity={0.8}
              className={`flex-1 py-2 rounded-xl items-center flex-row justify-center ${ordersSubTab === 'COMPLETED' ? 'bg-slate-900 shadow-sm' : ''
                }`}
            >
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={ordersSubTab === 'COMPLETED' ? '#F7C400' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text className={`text-xs font-black ${ordersSubTab === 'COMPLETED' ? 'text-white' : 'text-slate-600'
                }`}>
                Delivered ({completedOrders.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════
          BODY: ORDERS SCREEN OR PROFILE SCREEN ONLY
          ══════════════════════════════════════════════════════ */}
      {mainTab === 'ORDERS' ? (
        /* ── 1. ORDERS VIEW ── */
        loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0F172A" />
            <Text className="text-xs font-bold text-slate-500 mt-2">Loading deliveries...</Text>
          </View>
        ) : (
          <FlatList
            data={displayedOrders}
            keyExtractor={item => item._id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 16) + 75
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
                  {ordersSubTab === 'ACTIVE' ? 'No Active Deliveries' : 'No Completed Deliveries'}
                </Text>
                <Text className="text-xs font-medium text-slate-500 text-center mt-1 max-w-[260px]">
                  {ordersSubTab === 'ACTIVE'
                    ? 'Orders dispatched by the store owner will appear here in real time.'
                    : 'Delivered orders verified with OTP will be listed here.'}
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
                <View className="bg-white rounded-3xl p-3 mb-4 border border-slate-200 shadow-sm">

                  {/* Card Header: Order # & Status Badge */}
                  <View className="flex-row items-center justify-between pb-3.5 border-b border-slate-100">
                    <View>
                      <View className="flex-row items-center">
                        <Text className="text-lg font-black text-slate-900 mr-2">
                          #{item.orderNo}
                        </Text>
                        {item.location?.latitude ? (
                          <View className="bg-emerald-100 px-2.5 py-0.5 rounded-full flex-row items-center">
                            <Ionicons name="location" size={11} color="#065F46" />
                            <Text className="text-[10px] font-black text-emerald-800 ml-1">GPS PINNED</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-[11px] font-semibold text-slate-400 mt-1">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.items?.length || 0} item{(item.items?.length || 0) === 1 ? '' : 's'}
                      </Text>
                    </View>

                    {/* Cash or Online Badge */}
                    <View className={`px-3 py-1.5 rounded-xl border ${isCod ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'
                      }`}>
                      <Text className={`text-[11px] font-black uppercase ${isCod ? 'text-amber-900' : 'text-emerald-800'
                        }`}>
                        {isCod ? `💵 COLLECT ₹${item.totalAmount}` : `✅ PAID ONLINE`}
                      </Text>
                    </View>
                  </View>

                  {/* Customer Info Box */}
                  <View className="bg-slate-50 rounded-2xl p-4 my-3.5 border border-slate-200/80">
                    {/* Customer Name & Phone */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center flex-1 mr-2">
                        <View className="w-8 h-8 rounded-full bg-slate-200 items-center justify-center mr-2.5">
                          <Ionicons name="person" size={16} color="#0F172A" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-black text-slate-900" numberOfLines={1}>
                            {item.customerName}
                          </Text>
                          <Text className="text-[11px] font-semibold text-slate-500">
                            +91 {item.phone}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Delivery Address */}
                    <View className="pt-2.5 border-t border-slate-200/70 mb-3.5">
                      <View className="flex-row items-start">
                        <Ionicons name="navigate-circle" size={18} color="#D97706" style={{ marginRight: 6, marginTop: 1 }} />
                        <Text className="text-xs font-semibold text-slate-700 flex-1 leading-relaxed">
                          {item.deliveryAddress} {item.pincode ? `(${item.pincode})` : ''}
                        </Text>
                      </View>

                      {item.location?.landmark ? (
                        <View className="flex-row items-center mt-1.5 ml-6">
                          <Ionicons name="flag-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                          <Text className="text-[11px] font-bold text-slate-500">
                            Landmark: {item.location.landmark}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Dedicated Quick Action Buttons Bar: Call & Navigation */}
                    <View className="flex-row gap-2.5">
                      <TouchableOpacity
                        onPress={() => callCustomer(item.phone)}
                        activeOpacity={0.8}
                        className="flex-1 bg-emerald-600 py-2.5 px-3 rounded-xl flex-row items-center justify-center shadow-xs"
                      >
                        <Ionicons name="call" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text className="text-xs font-black text-white">Call Customer</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => openNavigation(item)}
                        activeOpacity={0.8}
                        className="flex-1 bg-blue-600 py-2.5 px-3 rounded-xl flex-row items-center justify-center shadow-xs"
                      >
                        <Ionicons name="navigate" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text className="text-xs font-black text-white">Open in Maps</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Order Items Summary Box */}
                  <View className="bg-slate-50/70 rounded-2xl p-3.5 mb-3.5 border border-slate-200/60">
                    <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      ORDER ITEMS ({item.items?.length || 0})
                    </Text>
                    {item.items?.map((prod, pIdx) => (
                      <View key={pIdx} className="flex-row items-center justify-between py-1 border-b border-slate-100 last:border-b-0">
                        <Text className="text-xs font-bold text-slate-800 flex-1 mr-2" numberOfLines={1}>
                          • {prod.name}
                        </Text>
                        <View className="bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                          <Text className="text-[10px] font-black text-slate-600">
                            {prod.quantity} {prod.unit || 'pc'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Status Actions */}
                  {isPending && (
                    <View className="bg-amber-50 p-3 rounded-2xl border border-amber-200">
                      <Text className="text-xs font-bold text-amber-800 text-center">
                        Store is currently packing this order.
                      </Text>
                    </View>
                  )}

                  {isAccepted && (
                    <View className="gap-2">
                      <TouchableOpacity
                        onPress={() => handleOpenQrModal(item)}
                        activeOpacity={0.85}
                        className="bg-amber-50 border border-amber-300 rounded-2xl py-2.5 px-4 items-center justify-center flex-row"
                      >
                        <Ionicons name="qr-code" size={16} color="#B45309" style={{ marginRight: 6 }} />
                        <Text className="text-amber-900 font-black text-xs uppercase tracking-wider">
                          View Store Payment QR
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleStartDelivery(item)}
                        activeOpacity={0.85}
                        className="bg-violet-600 rounded-2xl py-3.5 px-4 items-center justify-center flex-row shadow-md"
                      >
                        <Ionicons name="bicycle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text className="text-white font-black text-sm">
                          PICK UP & START DELIVERY ➔
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isOutForDelivery && (
                    <View className="gap-2.5">
                      <TouchableOpacity
                        onPress={() => handleOpenQrModal(item)}
                        activeOpacity={0.85}
                        className="bg-amber-500 rounded-2xl py-3.5 px-4 items-center justify-center flex-row shadow-sm"
                      >
                        <Ionicons name="qr-code" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text className="text-white font-black text-sm uppercase tracking-wide">
                          Show Store Payment QR
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleOpenOtpModal(item)}
                        activeOpacity={0.85}
                        className="bg-emerald-600 rounded-2xl py-3.5 px-4 items-center justify-center flex-row shadow-md"
                      >
                        <Ionicons name="key" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text className="text-white font-bold text-md">
                          ENTER CUSTOMER OTP
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isDelivered && (
                    <View className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle" size={18} color="#059669" style={{ marginRight: 6 }} />
                        <Text className="text-xs font-black text-emerald-900">
                          Handed Over & Verified
                        </Text>
                      </View>
                      <View className="bg-emerald-100 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-black text-emerald-800 uppercase">
                          OTP Confirmed
                        </Text>
                      </View>
                    </View>
                  )}

                </View>
              );
            }}
          />
        )
      ) : (
        /* ── 2. PROFILE VIEW ── */
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 16) + 80
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Profile Card */}
          <View className="bg-white rounded-3xl p-6 mb-4 border border-slate-200 shadow-sm items-center">
            <View className="w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-200 items-center justify-center mb-3 shadow-inner">
              <Ionicons name="person" size={40} color="#B45309" />
            </View>

            <Text className="text-xl font-black text-slate-900 text-center">
              {deliveryUser?.name || 'Delivery Partner'}
            </Text>

            <Text className="text-xs font-bold text-slate-500 text-center mt-1">
              +91 {deliveryUser?.mobile || 'N/A'}
            </Text>

            <View className="mt-3 flex-row items-center gap-2">
              <View className="bg-violet-100 px-3 py-1 rounded-full flex-row items-center border border-violet-200">
                <Ionicons name="shield-checkmark" size={12} color="#6D28D9" style={{ marginRight: 4 }} />
                <Text className="text-[11px] font-black text-violet-800">
                  Authorized Delivery Partner
                </Text>
              </View>

              <View className="bg-emerald-100 px-3 py-1 rounded-full flex-row items-center border border-emerald-200">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5" />
                <Text className="text-[11px] font-black text-emerald-800">
                  Online
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Metrics */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm items-center justify-center">
              <Text className="text-2xl font-black text-emerald-600">
                {completedOrders.length}
              </Text>
              <Text className="text-[11px] font-bold text-slate-500 mt-1">
                Delivered
              </Text>
            </View>

            <View className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm items-center justify-center">
              <Text className="text-2xl font-black text-amber-600">
                {activeOrders.length}
              </Text>
              <Text className="text-[11px] font-bold text-slate-500 mt-1">
                Active Now
              </Text>
            </View>

            <View className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm items-center justify-center">
              <Text className="text-2xl font-black text-blue-600">
                100%
              </Text>
              <Text className="text-[11px] font-bold text-slate-500 mt-1">
                OTP Verified
              </Text>
            </View>
          </View>

          {/* Vehicle & Shift Details Card */}
          <View className="bg-white rounded-3xl p-5 mb-4 border border-slate-200 shadow-sm">
            <Text className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
              Shift & Vehicle Info
            </Text>


            <View className="flex-row items-center justify-between py-2.5 border-b border-slate-100">
              <View className="flex-row items-center">
                <Ionicons name="card-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                <Text className="text-xs font-bold text-slate-700">Vehicle Number</Text>
              </View>
              <Text className="text-xs font-black text-slate-900 uppercase">
                {deliveryUser?.vehicleNumber || 'Store Fleet'}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2.5 border-b border-slate-100">
              <View className="flex-row items-center">
                <Ionicons name="business-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                <Text className="text-xs font-bold text-slate-700">Store Assigned</Text>
              </View>
              <Text className="text-xs font-black text-slate-900">
                Mandhaur Supermart Main Store
              </Text>
            </View>

            <View className="flex-row items-center justify-between pt-2.5">
              <View className="flex-row items-center">
                <Ionicons name="key-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                <Text className="text-xs font-bold text-slate-700">Partner ID</Text>
              </View>
              <Text className="text-xs font-mono font-black text-slate-900">
                #RIDER-{(deliveryUser?._id || '0000').slice(-6).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Delivery Safety & Policy */}
          <View className="bg-blue-50 border border-blue-200 rounded-3xl p-4 mb-4 flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#1D4ED8" style={{ marginRight: 8, marginTop: 2 }} />
            <View className="flex-1">
              <Text className="text-xs font-black text-blue-900">
                Delivery Instructions
              </Text>
              <Text className="text-[11px] font-medium text-blue-800 mt-0.5 leading-relaxed">
                Always collect the 4-digit OTP from the customer before completing handoff. For COD orders, confirm exact cash collected before OTP submission.
              </Text>
            </View>
          </View>

          {/* Shift End / Logout Button */}
          <TouchableOpacity
            onPress={handleShiftLogout}
            activeOpacity={0.85}
            className="bg-rose-50 border border-rose-200 rounded-3xl py-4 px-5 flex-row items-center justify-center shadow-xs active:bg-rose-100"
          >
            <Ionicons name="log-out" size={20} color="#E11D48" style={{ marginRight: 8 }} />
            <Text className="text-rose-600 font-black text-sm">
              End Shift & Log Out
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════
          BOTTOM NAVIGATION BAR (ONLY ORDERS & PROFILE)
          ══════════════════════════════════════════════════════ */}
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 10) }}
        className="bg-white border-t border-slate-200 px-6 pt-2 flex-row items-center justify-around shadow-lg"
      >
        {/* Tab 1: Orders */}
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            setMainTab('ORDERS');
          }}
          activeOpacity={0.8}
          className="items-center py-1 flex-1 relative"
        >
          <View className="relative">
            <Ionicons
              name={mainTab === 'ORDERS' ? 'bicycle' : 'bicycle-outline'}
              size={24}
              color={mainTab === 'ORDERS' ? '#0F172A' : '#94A3B8'}
            />
            {activeOrders.length > 0 && (
              <View className="absolute -top-1.5 -right-3 bg-amber-500 rounded-full w-4 h-4 items-center justify-center border-2 border-white">
                <Text className="text-[9px] font-black text-white">
                  {activeOrders.length}
                </Text>
              </View>
            )}
          </View>
          <Text className={`text-[11px] mt-1 font-black ${mainTab === 'ORDERS' ? 'text-slate-900' : 'text-slate-400'
            }`}>
            Orders
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Profile */}
        <TouchableOpacity
          onPress={() => {
            triggerHaptic();
            setMainTab('PROFILE');
          }}
          activeOpacity={0.8}
          className="items-center py-1 flex-1 relative"
        >
          <View className="relative">
            <Ionicons
              name={mainTab === 'PROFILE' ? 'person' : 'person-outline'}
              size={23}
              color={mainTab === 'PROFILE' ? '#0F172A' : '#94A3B8'}
            />
            <View className="absolute -top-0.5 -right-1 bg-emerald-500 rounded-full w-2 h-2 border border-white" />
          </View>
          <Text className={`text-[11px] mt-1 font-black ${mainTab === 'PROFILE' ? 'text-slate-900' : 'text-slate-400'
            }`}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════════
          STORE UPI PAYMENT QR MODAL
          ══════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedOrderForQr}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedOrderForQr(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedOrderForQr(null)}
          className="flex-1 bg-black/80 justify-center items-center px-5"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 relative items-center"
          >
            {/* Top-Right Quick Close (X) Button */}
            <TouchableOpacity
              onPress={() => setSelectedOrderForQr(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 items-center justify-center z-10"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>

            {/* Header Badge */}
            <View className="w-14 h-14 rounded-2xl bg-amber-100 items-center justify-center mb-2 shadow-xs">
              <Ionicons name="qr-code" size={30} color="#B45309" />
            </View>

            <Text className="text-xl font-black text-slate-900 text-center">
              Scan & Pay via UPI
            </Text>
            <Text className="text-xs font-semibold text-slate-400 text-center mt-0.5">
              Mandhaur Supermart Store QR
            </Text>

            {/* Order Amount To Collect Box */}
            <View className="bg-emerald-50 border border-emerald-200 rounded-2xl py-2.5 px-4 my-3 w-full items-center">
              <Text className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                AMOUNT TO COLLECT
              </Text>
              <Text className="text-2xl font-black text-emerald-800 mt-0.5">
                ₹{selectedOrderForQr?.totalAmount}
              </Text>
              <Text className="text-[11px] font-bold text-slate-500 mt-0.5">
                Order #{selectedOrderForQr?.orderNo} • {selectedOrderForQr?.customerName}
              </Text>
            </View>

            {/* QR Scanner Display or Fallback */}
            {storeSettings?.paymentQrUrl ? (
              <View className="items-center my-1 w-full">
                <View className="p-3.5 bg-white border-2 border-slate-200 rounded-3xl shadow-sm mb-2 items-center justify-center">
                  <Image
                    source={{ uri: storeSettings.paymentQrUrl }}
                    style={{ width: 200, height: 200, borderRadius: 14 }}
                    resizeMode="contain"
                  />
                </View>

                {storeSettings?.upiId ? (
                  <View className="bg-slate-100 px-3.5 py-1.5 rounded-full flex-row items-center border border-slate-200 mt-1 mb-2">
                    <Ionicons name="at" size={13} color="#1E3A8A" style={{ marginRight: 4 }} />
                    <Text className="text-xs font-mono font-black text-slate-800">
                      {storeSettings.upiId}
                    </Text>
                  </View>
                ) : null}

                <Text className="text-[11px] font-medium text-slate-400 text-center mt-1 mb-3">
                  Ask customer to scan using Google Pay, PhonePe, Paytm, or any UPI app.
                </Text>
              </View>
            ) : (
              <View className="w-full py-6 px-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/60 items-center justify-center my-2">
                <Ionicons name="alert-circle-outline" size={32} color="#D97706" style={{ marginBottom: 6 }} />
                <Text className="text-xs font-black text-amber-900 text-center">
                  Store QR Not Uploaded Yet
                </Text>
                <Text className="text-[11px] font-medium text-amber-800 text-center mt-1">
                  The store owner has not uploaded a UPI QR code yet. Please collect ₹{selectedOrderForQr?.totalAmount} in cash or ask the store admin to upload their QR in store settings.
                </Text>
              </View>
            )}

            {/* If Order is Out for Delivery, option to switch straight to OTP */}
            {selectedOrderForQr?.status === 'OUT_FOR_DELIVERY' && (
              <TouchableOpacity
                onPress={() => {
                  const ord = selectedOrderForQr;
                  setSelectedOrderForQr(null);
                  handleOpenOtpModal(ord);
                }}
                activeOpacity={0.85}
                className="w-full bg-emerald-600 rounded-2xl py-3.5 items-center justify-center mb-2 shadow-sm"
              >
                <Text className="text-white font-black text-sm">
                  PROCEED TO OTP VERIFICATION ➔
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setSelectedOrderForQr(null)}
              className="w-full bg-slate-100 rounded-xl py-2.5 items-center"
            >
              <Text className="text-slate-600 font-bold text-xs">Close</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          OTP VERIFICATION MODAL
          ══════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedOrderForOtp}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setSelectedOrderForOtp(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Tapping outside the card dismisses keyboard and closes the popup */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setSelectedOrderForOtp(null);
            }}
            className="flex-1 bg-black/75 justify-center items-center px-5"
          >
            {/* Modal Card: Tapping empty area inside card dismisses keyboard but preserves modal */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={Keyboard.dismiss}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-200 relative"
            >
              {/* Top-Right Quick Close (X) Button */}
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setSelectedOrderForOtp(null);
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 items-center justify-center z-10"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>

              <View className="items-center mb-3">
                <View className="w-14 h-14 rounded-full bg-emerald-100 items-center justify-center mb-2">
                  <Ionicons name="shield-checkmark" size={28} color="#059669" />
                </View>
                <Text className="text-xl font-black text-slate-900">
                  Confirm Delivery
                </Text>
                <Text className="text-xs font-bold text-slate-500 text-center mt-1 pr-6 pl-6">
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
                className="w-full bg-emerald-600 rounded-2xl py-3.5 items-center justify-center mb-2 shadow-sm"
              >
                {verifyingOtp ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-md">
                    VERIFY OTP & COMPLETE DELIVERY
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setSelectedOrderForOtp(null);
                }}
                className="w-full bg-slate-100 rounded-xl py-2.5 items-center"
              >
                <Text className="text-slate-600 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>

            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          LIVE INCOMING ASSIGNMENT ALERT MODAL & AUDIBLE CHIME
          ══════════════════════════════════════════════════════ */}
      <OrderChimeSound isPlaying={isPlayingChime} />

      <Modal
        visible={Boolean(incomingAssignedOrder)}
        transparent
        animationType="slide"
        onRequestClose={handleDismissIncoming}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleDismissIncoming}
          className="flex-1 bg-black/80 justify-center items-center px-5"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-2 border-emerald-400 relative items-center"
          >
            {/* Animated Bike Icon Badge */}
            <View className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-300 items-center justify-center mb-3 shadow-inner">
              <Ionicons name="bicycle" size={42} color="#059669" />
            </View>

            <View className="bg-emerald-600 px-3.5 py-1 rounded-full mb-2">
              <Text className="text-[11px] font-black text-white tracking-widest uppercase">
                🚨 NEW DELIVERY ASSIGNED
              </Text>
            </View>

            <Text className="text-2xl font-black text-slate-900 text-center">
              Order #{incomingAssignedOrder?.orderNo}
            </Text>

            <Text className="text-xs font-bold text-slate-500 text-center mt-1 mb-4">
              The store owner has dispatched this delivery to you!
            </Text>

            {/* Customer & Address Details Card */}
            <View className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="person" size={15} color="#475569" style={{ marginRight: 8 }} />
                <Text className="text-sm font-black text-slate-900 flex-1">
                  {incomingAssignedOrder?.customerName || 'Customer'}
                </Text>
              </View>

              <View className="flex-row items-start mb-2">
                <Ionicons name="location" size={16} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
                <Text className="text-xs font-semibold text-slate-700 flex-1" numberOfLines={2}>
                  {incomingAssignedOrder?.deliveryAddress || 'Address not specified'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between pt-2 border-t border-slate-200 mt-1">
                <Text className="text-xs font-bold text-slate-500">Collect Amount:</Text>
                <Text className="text-sm font-black text-emerald-700">
                  ₹{incomingAssignedOrder?.totalAmount} ({incomingAssignedOrder?.paymentMethod || 'COD'})
                </Text>
              </View>
            </View>

            {/* Chime Sounding Indicator */}
            {isPlayingChime && (
              <View className="flex-row items-center mb-3 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                <Ionicons name="volume-high" size={14} color="#D97706" style={{ marginRight: 5 }} />
                <Text className="text-[10px] font-extrabold text-amber-800">
                  Ringing Order Bell • Tap Accept to Stop
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={handleAcceptIncoming}
              activeOpacity={0.85}
              className="w-full bg-emerald-600 rounded-2xl py-3.5 items-center justify-center mb-2 shadow-lg shadow-emerald-600/30"
            >
              <Text className="text-white font-black text-sm tracking-wide">
                ACCEPT & VIEW ORDER ➔
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDismissIncoming}
              className="w-full bg-slate-100 rounded-xl py-2.5 items-center"
            >
              <Text className="text-slate-600 font-bold text-xs">Dismiss Alert</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}
