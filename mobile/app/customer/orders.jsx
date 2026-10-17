import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';

// Order Status Visual Configuration
const STATUS_META = {
  PENDING: {
    label: 'Order Placed',
    subtext: 'Store is reviewing your order',
    textColor: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
    icon: 'time-outline'
  },
  ACCEPTED: {
    label: 'Packing Items',
    subtext: 'Order is being prepared and packed',
    textColor: 'text-blue-800',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badgeBg: '#DBEAFE',
    badgeText: '#1E40AF',
    icon: 'cube-outline'
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    subtext: 'Delivery partner is on the way (10-15 mins)',
    textColor: 'text-purple-800',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badgeBg: '#F3E8FF',
    badgeText: '#6B21A8',
    icon: 'bicycle-outline'
  },
  DELIVERED: {
    label: 'Delivered',
    subtext: 'Delivered to your doorstep',
    textColor: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badgeBg: '#DCFCE7',
    badgeText: '#166534',
    icon: 'checkmark-done-circle'
  },
  CANCELLED: {
    label: 'Cancelled',
    subtext: 'This order was cancelled',
    textColor: 'text-rose-800',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    badgeBg: '#FFE4E6',
    badgeText: '#9F1239',
    icon: 'close-circle-outline'
  }
};

const TRACKING_STEPS = [
  { key: 'PENDING', label: 'Placed', icon: 'receipt-outline' },
  { key: 'ACCEPTED', label: 'Packing', icon: 'cube-outline' },
  { key: 'OUT_FOR_DELIVERY', label: 'On Way', icon: 'bicycle-outline' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'checkmark-circle-outline' }
];

export default function CustomerOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { customerUser, apiBaseUrl, socket, addToCart } = useApp();

  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DELIVERED'
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Haptic Feedback helper
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_e) {}
  };

  const fetchLiveOrders = useCallback(async (isManual = false) => {
    if (!customerUser?.phone) return;
    if (isManual) setSyncing(true);
    try {
      const cleanPhone = customerUser.phone.replace(/\D/g, '');
      const res = await fetch(`${apiBaseUrl}/orders/customer/${cleanPhone}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
        setLastSyncTime(new Date());
      }
    } catch (_e) {
      // ignore
    } finally {
      if (isManual) setSyncing(false);
    }
  }, [customerUser, apiBaseUrl]);

  // Initial fetch and real-time socket events
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) await fetchLiveOrders();
    };
    loadData();

    if (socket) {
      const handleSocketUpdate = () => {
        if (isMounted) fetchLiveOrders();
      };

      socket.on('orderStatusUpdate', handleSocketUpdate);
      socket.on('newOrder', handleSocketUpdate);

      return () => {
        isMounted = false;
        socket.off('orderStatusUpdate', handleSocketUpdate);
        socket.off('newOrder', handleSocketUpdate);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [fetchLiveOrders, socket]);

  const onManualRefresh = async () => {
    setRefreshing(true);
    triggerHaptic();
    await fetchLiveOrders();
    setRefreshing(false);
  };

  // Toggle Order item expansion
  const toggleOrderExpand = (id) => {
    triggerHaptic();
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Reorder all items in an order
  const handleReorder = (order) => {
    triggerHaptic();
    if (!order.items || order.items.length === 0) return;

    order.items.forEach(item => {
      addToCart({
        _id: item.productId || `reorder_${Math.random()}`,
        name: item.name,
        sellingPrice: item.price,
        unit: item.unit || '1 pc'
      });
    });

    Alert.alert(
      'Items Added to Basket! ⚡',
      `${order.items.length} items from Order #${order.orderNo} have been added to your cart.`,
      [
        { text: 'Keep Browsing', style: 'cancel' },
        {
          text: 'View Cart ➔',
          onPress: () => router.push('/customer/cart')
        }
      ]
    );
  };

  // Help & Support dialog
  const handleSupport = (order) => {
    triggerHaptic();
    Alert.alert(
      `Support for Order #${order.orderNo}`,
      `Need help with your 10-minute delivery?\n\nStore Helpline: +91 98765 43210\nOrder Status: ${order.status.replace(/_/g, ' ')}`,
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Call Helpline',
          onPress: () => Linking.openURL('tel:9876543210').catch(() => {})
        }
      ]
    );
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (activeTab === 'ACTIVE') {
      return orders.filter(o => ['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.status));
    }
    if (activeTab === 'DELIVERED') {
      return orders.filter(o => o.status === 'DELIVERED');
    }
    return orders;
  }, [orders, activeTab]);

  const activeOrdersCount = orders.filter(o =>
    ['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.status)
  ).length;

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ══════════════════════════════════════════════════════
          1. PREMIUM STICKY HEADER (Theme of Home Screen)
          ══════════════════════════════════════════════════════ */}
      <View
        className="bg-white border-b border-slate-200/80 shadow-xs z-30"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          {/* Back & Title Section */}
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.push('/customer');
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/80 items-center justify-center mr-3 active:bg-slate-200"
            >
              <Ionicons name="arrow-back" size={20} color="#0F172A" />
            </TouchableOpacity>

            <View>
              <View className="flex-row items-center">
                <Text className="text-lg font-black text-slate-900 tracking-tight mr-2">
                  My Orders
                </Text>
                {/* <View className="bg-[#FEF08A] px-2 py-0.5 rounded-md flex-row items-center">
                  <Ionicons name="flash" size={10} color="#854D0E" />
                  <Text className="text-[10px] font-black text-[#854D0E] ml-0.5">LIVE TRACK</Text>
                </View> */}
              </View>
              <Text className="text-[11px] font-semibold text-slate-500">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'} placed
              </Text>
            </View>
          </View>

          {/* Sync Button */}
          <TouchableOpacity
            onPress={() => {
              triggerHaptic();
              fetchLiveOrders(true);
            }}
            disabled={syncing}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200/80 items-center justify-center active:bg-slate-200"
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Ionicons name="sync-outline" size={18} color="#0F172A" />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Real-Time Status & Filter Tabs ── */}
        <View className="px-4 pb-2.5 pt-1">
          {/* Live Auto-Sync Status Bar */}
          {/* <View className="flex-row items-center justify-between bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl mb-2.5">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
              <Text className="text-[10px] font-black text-slate-700 tracking-wide uppercase">
                Instant Socket Sync
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={11} color="#64748B" style={{ marginRight: 3 }} />
              <Text className="text-[10px] font-bold text-slate-500">
                Updated {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            </View>
          </View> */}

          {/* Filter Pills */}
          <View className="flex-row items-center space-x-2">
            {[
              { id: 'ALL', label: 'All Orders', count: orders.length },
              { id: 'ACTIVE', label: 'Live Active', count: activeOrdersCount },
              { id: 'DELIVERED', label: 'Delivered', count: orders.filter(o => o.status === 'DELIVERED').length }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => {
                    triggerHaptic();
                    setActiveTab(tab.id);
                  }}
                  activeOpacity={0.7}
                  className={`flex-row items-center px-3 py-1.5 rounded-full border mr-2 ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text className={`text-xs ${isActive ? 'font-black text-[#F7C400]' : 'font-bold text-slate-600'}`}>
                    {tab.label}
                  </Text>
                  <View className={`ml-1.5 px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-slate-800' : 'bg-slate-100'
                  }`}>
                    <Text className={`text-[10px] ${isActive ? 'font-black text-white' : 'font-bold text-slate-500'}`}>
                      {tab.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════
          2. SCROLLABLE ORDERS CONTENT
          ══════════════════════════════════════════════════════ */}
      {filteredOrders.length === 0 ? (
        /* ── Empty Orders State (Theme of Home Screen) ── */
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-24 h-24 rounded-full bg-[#FEF3C7] border-2 border-[#FDE68A] items-center justify-center mb-5 shadow-sm">
            <Ionicons name="receipt-outline" size={48} color="#D97706" />
          </View>
          <Text className="text-xl font-black text-slate-900 text-center tracking-tight">
            {activeTab === 'ACTIVE'
              ? 'No Live Orders Currently'
              : activeTab === 'DELIVERED'
              ? 'No Delivered Orders Yet'
              : 'No Delivery Orders Yet'}
          </Text>
          <Text className="text-xs font-medium text-slate-500 text-center mt-1.5 mb-6 max-w-[280px] leading-relaxed">
            {activeTab === 'ACTIVE'
              ? 'All your past orders have been completed or delivered. Place a new 10-minute delivery to track live progress!'
              : 'Order your daily groceries, fresh milk, vegetables & household snacks for 10-minute express doorstep delivery.'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic();
              router.push('/customer');
            }}
            activeOpacity={0.88}
            className="bg-slate-900 border border-[#F7C400] px-6 py-3.5 rounded-2xl flex-row items-center shadow-md active:bg-slate-800"
          >
            <Ionicons name="storefront-outline" size={17} color="#F7C400" style={{ marginRight: 8 }} />
            <Text className="text-[#F7C400] font-black text-sm">
              Explore Store Catalog ➔
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: Math.max(insets.bottom, 8) + 90
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onManualRefresh}
              colors={['#F7C400', '#0F172A']}
              tintColor="#F7C400"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredOrders.map(order => {
            const isCancelled = order.status === 'CANCELLED';
            const isDelivered = order.status === 'DELIVERED';
            const isActiveOrder = ['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(order.status);
            const statusConfig = STATUS_META[order.status] || STATUS_META.PENDING;

            // Tracking steps calculation
            const currentStepIdx = TRACKING_STEPS.findIndex(s => s.key === order.status);
            const effectiveStepIdx = currentStepIdx === -1 ? 0 : currentStepIdx;

            const isExpanded = expandedOrderIds.has(order._id);
            const totalItemCount = (order.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0);

            return (
              <View
                key={order._id}
                className="bg-white rounded-2xl p-3 mb-4 border border-slate-200/90 shadow-xs"
              >
                {/* ── Order Top Bar: Number & Status Badge ── */}
                <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center">
                      <View className="w-7 h-7 rounded-lg bg-[#FEF3C7] items-center justify-center mr-2">
                        <Ionicons name="bag-handle" size={14} color="#D97706" />
                      </View>
                      <Text className="text-md font-black text-slate-900 tracking-tight">
                        Order #{order.orderNo}
                      </Text>
                    </View>
                    <Text className="text-[11px] font-semibold text-slate-400 ml-9">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Recent Order'}
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View
                    className="flex-row items-center px-3 py-1 rounded-full border border-slate-200/60"
                    style={{ backgroundColor: statusConfig.badgeBg }}
                  >
                    <Ionicons
                      name={statusConfig.icon}
                      size={12}
                      color={statusConfig.badgeText}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      className="text-[11px] font-black uppercase tracking-wide"
                      style={{ color: statusConfig.badgeText }}
                    >
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                {/* ── 1. Dynamic ETA Countdown & Live Active Delivery Banner ── */}
                {isActiveOrder ? (
                  <View className="mt-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-3.5">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center flex-1 mr-2">
                        <View className="w-9 h-9 rounded-xl bg-[#F7C400] items-center justify-center mr-2.5 shadow-sm">
                          <Ionicons
                            name={order.status === 'OUT_FOR_DELIVERY' ? 'bicycle' : order.status === 'ACCEPTED' ? 'cube' : 'time'}
                            size={19}
                            color="#0F172A"
                          />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="text-xs font-black text-slate-900 tracking-tight">
                              {order.status === 'OUT_FOR_DELIVERY'
                                ? 'Arriving in ~6 to 8 mins ⚡'
                                : order.status === 'ACCEPTED'
                                ? 'Packing fresh items • ~12 mins'
                                : 'Order Confirmed • ~15 mins'}
                            </Text>
                          </View>
                          <Text className="text-[10px] font-bold text-amber-800 mt-0.5">
                            {order.status === 'OUT_FOR_DELIVERY'
                              ? 'Delivery partner is on the way to your doorstep'
                              : order.status === 'ACCEPTED'
                              ? 'Store team is packing fresh groceries'
                              : 'Store has accepted your order'}
                          </Text>
                        </View>
                      </View>

                      {/* Live Status Pulse Dot */}
                      <View className="flex-row items-center bg-white/90 px-2.5 py-1 rounded-full border border-amber-200">
                        <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                        <Text className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                          LIVE
                        </Text>
                      </View>
                    </View>

                    {/* Rider Details & Direct Call (If Assigned) */}
                    <View className="pt-2 border-t border-amber-200/60 flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1 mr-2">
                        <Ionicons name="person-circle-outline" size={16} color="#D97706" style={{ marginRight: 5 }} />
                        <Text numberOfLines={1} className="text-xs font-bold text-slate-700">
                          Rider: <Text className="font-black text-slate-900">{order.assignedDeliveryRider || 'Supermart Express Rider'}</Text>
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${order.riderPhone || '9876543210'}`).catch(() => {})}
                        activeOpacity={0.8}
                        className="bg-slate-900 px-3 py-1.5 rounded-xl flex-row items-center"
                      >
                        <Ionicons name="call" size={11} color="#F7C400" style={{ marginRight: 4 }} />
                        <Text className="text-[11px] font-black text-[#F7C400]">Call Rider</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : isDelivered ? (
                  <View className="mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-8 h-8 rounded-xl bg-emerald-500 items-center justify-center mr-2.5">
                        <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text className="text-xs font-black text-emerald-900">
                          Delivered Successfully!
                        </Text>
                        <Text className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                          {order.statusTimestamps?.deliveredAt
                            ? `Completed at ${new Date(order.statusTimestamps.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Package handed over at your doorstep'}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-emerald-100 px-2.5 py-1 rounded-full">
                      <Text className="text-[10px] font-black text-emerald-800">COMPLETED</Text>
                    </View>
                  </View>
                ) : null}

                {/* ── 2. Delivery Confirmation OTP Card (Prominent Security PIN) ── */}
                {isActiveOrder && order.deliveryOtp && (
                  <View className="mt-3 bg-slate-900 rounded-2xl p-3.5 border border-slate-800 shadow-xs">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <Ionicons name="shield-checkmark" size={14} color="#F7C400" style={{ marginRight: 6 }} />
                        <Text className="text-xs font-black text-white tracking-tight">
                          Delivery Confirmation OTP
                        </Text>
                      </View>
                      <Text className="text-[10px] font-bold text-slate-400">
                        Share upon handover
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/80">
                      <View className="flex-row items-center space-x-2">
                        {String(order.deliveryOtp).split('').map((digit, dIdx) => (
                          <View
                            key={dIdx}
                            className="w-8 h-9 rounded-lg bg-slate-900 border border-[#F7C400]/40 items-center justify-center mr-1.5"
                          >
                            <Text className="text-base font-black text-[#F7C400]">
                              {digit}
                            </Text>
                          </View>
                        ))}
                      </View>

                      <View className="flex-1 ml-3">
                        <Text className="text-[10px] font-bold text-slate-300 leading-tight">
                          Provide this 4-digit code to the rider to verify your parcel.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* ── 3. Progress Stepper with Vector Icons ── */}
                {!isCancelled ? (
                  <View className="my-3.5 bg-[#F8FAFC] p-3.5 rounded-2xl border border-slate-200/80">
                    <Text className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">
                      DELIVERY PROGRESS
                    </Text>

                    <View className="flex-row items-center justify-between">
                      {TRACKING_STEPS.map((step, idx) => {
                        const isDone = effectiveStepIdx >= idx;
                        const isCurrent = effectiveStepIdx === idx;

                        return (
                          <React.Fragment key={step.key}>
                            {/* Step Node */}
                            <View className="items-center flex-1">
                              <View
                                className={`w-8 h-8 rounded-full items-center justify-center mb-1.5 ${
                                  isDone
                                    ? isDelivered && idx === 3
                                      ? 'bg-emerald-600 shadow-xs'
                                      : 'bg-slate-900 shadow-xs'
                                    : 'bg-slate-200'
                                }`}
                              >
                                <Ionicons
                                  name={isDone && idx < effectiveStepIdx ? 'checkmark' : step.icon}
                                  size={14}
                                  color={isDone ? '#F7C400' : '#64748B'}
                                />
                              </View>
                              <Text
                                className={`text-[10px] text-center ${
                                  isCurrent
                                    ? 'font-black text-slate-900'
                                    : isDone
                                    ? 'font-bold text-slate-700'
                                    : 'font-semibold text-slate-400'
                                }`}
                              >
                                {step.label}
                              </Text>
                            </View>

                            {/* Connecting Line */}
                            {idx < TRACKING_STEPS.length - 1 && (
                              <View
                                className={`h-1 flex-1 mb-5 rounded-full ${
                                  effectiveStepIdx > idx
                                    ? 'bg-slate-900'
                                    : 'bg-slate-200'
                                }`}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  /* Cancelled Notice */
                  <View className="my-3 bg-rose-50 border border-rose-200 rounded-2xl p-3 flex-row items-center">
                    <Ionicons name="alert-circle" size={18} color="#E11D48" style={{ marginRight: 8 }} />
                    <View className="flex-1">
                      <Text className="text-xs font-black text-rose-900">
                        Order was Cancelled
                      </Text>
                      <Text className="text-[10px] font-semibold text-rose-700 mt-0.5">
                        {order.notes || 'This order was cancelled by the store or customer.'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* ── 4. Delivery Address & GPS Coordinates Badge ── */}
                {order.deliveryAddress && (
                  <View className="py-2 mb-1 bg-slate-50/70 rounded-xl px-2.5 border border-slate-100">
                    <View className="flex-row items-center">
                      <Ionicons name="location-sharp" size={14} color="#D97706" style={{ marginRight: 6 }} />
                      <Text numberOfLines={1} className="text-xs font-semibold text-slate-600 flex-1">
                        Delivering to: <Text className="font-bold text-slate-800">{order.deliveryAddress}</Text>
                      </Text>
                    </View>

                    {order.location?.latitude && (
                      <View className="flex-row items-center mt-1 ml-5">
                        <View className="bg-emerald-100 px-1.5 py-0.5 rounded-md flex-row items-center mr-2">
                          <Ionicons name="pin" size={9} color="#065F46" />
                          <Text className="text-[9px] font-bold text-emerald-800 ml-0.5">
                            GPS Doorstep Pinned ({order.location.latitude.toFixed(3)}, {order.location.longitude.toFixed(3)})
                          </Text>
                        </View>
                        {order.location.landmark ? (
                          <Text numberOfLines={1} className="text-[10px] font-medium text-slate-500 flex-1">
                            Ref: {order.location.landmark}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                )}

                {/* ── Items Summary (Collapsible / Expandable) ── */}
                <View className="bg-[#F8FAFC] rounded-2xl p-3 mb-3 border border-slate-200/80">
                  <TouchableOpacity
                    onPress={() => toggleOrderExpand(order._id)}
                    activeOpacity={0.7}
                    className="flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="cart-outline" size={14} color="#64748B" style={{ marginRight: 6 }} />
                      <Text className="text-xs font-black text-slate-800">
                        {totalItemCount} {totalItemCount === 1 ? 'Item' : 'Items'} in Order
                      </Text>
                    </View>

                    <View className="flex-row items-center">
                      <Text className="text-[11px] font-bold text-slate-500 mr-1">
                        {isExpanded ? 'Hide Details' : 'View Items'}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color="#64748B"
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Items List */}
                  {isExpanded && (
                    <View className="mt-2.5 pt-2.5 border-t border-slate-200/70">
                      {(order.items || []).map((item, idx) => (
                        <View
                          key={idx}
                          className="flex-row justify-between items-center py-1.5 border-b border-slate-100 last:border-b-0"
                        >
                          <View className="flex-1 mr-2">
                            <Text className="text-xs font-bold text-slate-800">
                              {item.name}
                            </Text>
                            <Text className="text-[10px] font-semibold text-slate-400">
                              Qty: {item.quantity} {item.unit ? `• ${item.unit}` : ''}
                            </Text>
                          </View>
                          <Text className="text-xs font-black text-slate-900">
                            ₹{item.total || (item.price * item.quantity)}
                          </Text>
                        </View>
                      ))}

                      {/* Line Breakdown */}
                      <View className="mt-2 pt-2 border-t border-dashed border-slate-200">
                        <View className="flex-row justify-between py-0.5">
                          <Text className="text-[11px] font-medium text-slate-500">Items Subtotal</Text>
                          <Text className="text-[11px] font-bold text-slate-800">₹{order.subtotal || order.totalAmount}</Text>
                        </View>
                        <View className="flex-row justify-between py-0.5">
                          <Text className="text-[11px] font-medium text-slate-500">Delivery Fee</Text>
                          <Text className="text-[11px] font-bold text-slate-800">
                            {order.deliveryFee === 0 ? <Text className="text-emerald-600 font-bold">FREE</Text> : `₹${order.deliveryFee || 0}`}
                          </Text>
                        </View>
                        {order.discountAmount > 0 && (
                          <View className="flex-row justify-between py-0.5">
                            <Text className="text-[11px] font-bold text-emerald-600">
                              Promo Discount {order.discountCode ? `(${order.discountCode})` : ''}
                            </Text>
                            <Text className="text-[11px] font-bold text-emerald-600">-₹{order.discountAmount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>

                {/* ── Order Footer: Payment & Actions ── */}
                <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
                  <View>
                    <View className="flex-row items-center">
                      <Ionicons
                        name={order.paymentMethod === 'PAYTM' ? 'flash' : 'cash-outline'}
                        size={12}
                        color="#64748B"
                        style={{ marginRight: 4 }}
                      />
                      <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {order.paymentMethod === 'PAYTM' ? 'Online / Paytm' : 'Cash on Delivery'}
                      </Text>
                    </View>
                    <Text className="text-base font-black text-slate-900 mt-0.5">
                      ₹{order.totalAmount}
                    </Text>
                  </View>

                  {/* Actions: Reorder & Help */}
                  <View className="flex-row items-center space-x-2">
                    <TouchableOpacity
                      onPress={() => handleSupport(order)}
                      activeOpacity={0.7}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white mr-2 flex-row items-center"
                    >
                      <Ionicons name="help-buoy-outline" size={13} color="#0F172A" style={{ marginRight: 4 }} />
                      <Text className="text-[11px] font-bold text-slate-700">Help</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleReorder(order)}
                      activeOpacity={0.85}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-[#F7C400] flex-row items-center shadow-xs"
                    >
                      <Ionicons name="repeat" size={13} color="#F7C400" style={{ marginRight: 4 }} />
                      <Text className="text-[11px] font-black text-[#F7C400]">Reorder</Text>
                    </TouchableOpacity>
                  </View>
                </View>

              </View>
            );
          })}
        </ScrollView>
      )}

    </SafeAreaView>
  );
}
