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
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';

// High-resolution fallback imagery for grocery categories & keywords
const FALLBACK_CATEGORY_IMAGES = {
  milk: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
  atta: 'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&w=400&q=80',
  bread: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
  fruits: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&q=80',
  snacks: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80',
  drinks: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
  spices: 'https://images.unsplash.com/photo-1596462502278-27bf85033e5a?auto=format&fit=crop&w=400&q=80',
  default: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'
};

const resolveItemImage = (item, catalogMap) => {
  if (item?.imageUrl && item.imageUrl.startsWith('http')) return item.imageUrl;
  if (item?.image && item.image.startsWith('http')) return item.image;

  if (item?.productId && catalogMap[item.productId]?.imageUrl) {
    return catalogMap[item.productId].imageUrl;
  }

  const nameKey = (item?.name || '').toLowerCase();
  if (catalogMap[nameKey]?.imageUrl) {
    return catalogMap[nameKey].imageUrl;
  }

  if (nameKey.includes('milk') || nameKey.includes('dairy') || nameKey.includes('paneer') || nameKey.includes('curd') || nameKey.includes('amul')) {
    return FALLBACK_CATEGORY_IMAGES.milk;
  }
  if (nameKey.includes('atta') || nameKey.includes('flour') || nameKey.includes('wheat') || nameKey.includes('maida')) {
    return FALLBACK_CATEGORY_IMAGES.atta;
  }
  if (nameKey.includes('bread') || nameKey.includes('bun') || nameKey.includes('toast') || nameKey.includes('pav')) {
    return FALLBACK_CATEGORY_IMAGES.bread;
  }
  if (nameKey.includes('chip') || nameKey.includes('snack') || nameKey.includes('biscuit') || nameKey.includes('cookie') || nameKey.includes('namkeen') || nameKey.includes('maggi') || nameKey.includes('noodle')) {
    return FALLBACK_CATEGORY_IMAGES.snacks;
  }
  if (nameKey.includes('juice') || nameKey.includes('coke') || nameKey.includes('drink') || nameKey.includes('soda') || nameKey.includes('water') || nameKey.includes('tea') || nameKey.includes('coffee')) {
    return FALLBACK_CATEGORY_IMAGES.drinks;
  }
  if (nameKey.includes('oil') || nameKey.includes('ghee') || nameKey.includes('masala') || nameKey.includes('rice') || nameKey.includes('dal') || nameKey.includes('sugar') || nameKey.includes('salt')) {
    return FALLBACK_CATEGORY_IMAGES.spices;
  }
  if (nameKey.includes('apple') || nameKey.includes('banana') || nameKey.includes('fruit') || nameKey.includes('onion') || nameKey.includes('potato') || nameKey.includes('tomato') || nameKey.includes('vegetable')) {
    return FALLBACK_CATEGORY_IMAGES.fruits;
  }

  return FALLBACK_CATEGORY_IMAGES.default;
};

// Clean formatted address without raw Google Plus Codes
const cleanFormattedAddress = (rawAddress) => {
  if (!rawAddress) return 'Doorstep Delivery';
  let cleaned = rawAddress.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,4},\s*/i, '');
  return cleaned.trim() || rawAddress;
};

// Order Status Visual Configuration
const STATUS_META = {
  PENDING: {
    label: 'Order Placed',
    subtext: 'Store is reviewing your order',
    textColor: '#92400E',
    badgeBg: '#FEF3C7',
    badgeBorder: '#FDE68A',
    icon: 'time-outline'
  },
  ACCEPTED: {
    label: 'Packing Items',
    subtext: 'Order is being prepared and packed',
    textColor: '#1E40AF',
    badgeBg: '#DBEAFE',
    badgeBorder: '#BFDBFE',
    icon: 'cube-outline'
  },
  OUT_FOR_DELIVERY: {
    label: 'Out for Delivery',
    subtext: 'Delivery partner is on the way (6-8 mins)',
    textColor: '#6B21A8',
    badgeBg: '#F3E8FF',
    badgeBorder: '#E9D5FF',
    icon: 'bicycle-outline'
  },
  DELIVERED: {
    label: 'Delivered',
    subtext: 'Delivered to your doorstep',
    textColor: '#047857',
    badgeBg: '#ECFDF5',
    badgeBorder: '#A7F3D0',
    icon: 'checkmark-circle'
  },
  CANCELLED: {
    label: 'Cancelled',
    subtext: 'This order was cancelled',
    textColor: '#BE123C',
    badgeBg: '#FFF1F2',
    badgeBorder: '#FECDD3',
    icon: 'close-circle'
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
  const [catalogMap, setCatalogMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'DELIVERED'
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());

  // Haptic Feedback helper
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_e) {}
  };

  // Fetch catalog products to supplement missing images in old orders
  const fetchCatalogMap = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/products`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const map = {};
        data.data.forEach(p => {
          if (p._id) map[p._id] = p;
          if (p.name) map[p.name.toLowerCase()] = p;
        });
        setCatalogMap(map);
      }
    } catch (_e) {
      // ignore
    }
  }, [apiBaseUrl]);

  const fetchLiveOrders = useCallback(async (isManual = false) => {
    const rawPhone = customerUser?.phone || customerUser?.mobile;
    if (!rawPhone) {
      setLoading(false);
      return;
    }
    if (isManual) setSyncing(true);
    try {
      let cleanPhone = String(rawPhone).replace(/\D/g, '');
      if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        cleanPhone = cleanPhone.slice(2);
      }
      const res = await fetch(`${apiBaseUrl}/orders/customer/${cleanPhone}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
      }
    } catch (_e) {
      // ignore
    } finally {
      if (isManual) setSyncing(false);
      setLoading(false);
    }
  }, [customerUser, apiBaseUrl]);

  // Refetch live orders automatically whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchLiveOrders();
      fetchCatalogMap();
    }, [fetchLiveOrders, fetchCatalogMap])
  );

  // Initial fetch and real-time socket events
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      await Promise.all([fetchLiveOrders(), fetchCatalogMap()]);
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
  }, [fetchLiveOrders, fetchCatalogMap, socket]);

  const onManualRefresh = async () => {
    setRefreshing(true);
    triggerHaptic();
    await Promise.all([fetchLiveOrders(), fetchCatalogMap()]);
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
      const catalogItem = catalogMap[item.productId] || catalogMap[item.name?.toLowerCase()];
      addToCart({
        _id: item.productId || `reorder_${Math.random()}`,
        name: item.name,
        sellingPrice: item.price,
        unit: item.unit || '1 pc',
        imageUrl: item.imageUrl || catalogItem?.imageUrl || resolveItemImage(item, catalogMap)
      });
    });

    Alert.alert(
      'Items Added to Basket! ⚡',
      `${order.items.length} items from Order #${order.orderNo} added to your cart.`,
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
      `Need assistance with your delivery?\n\nStore Helpline: +91 98765 43210\nOrder Status: ${order.status.replace(/_/g, ' ')}`,
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
          1. PREMIUM STICKY HEADER (Theme of Storefront)
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

        {/* ── Filter Tabs ── */}
        <View className="px-4 pb-2.5 pt-1">
          <View className="flex-row items-center">
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
                  className={`flex-row items-center px-3.5 py-1.5 rounded-full border mr-2 ${
                    isActive
                      ? 'bg-slate-900 border-slate-900 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text className={`text-xs ${isActive ? 'font-black text-[#F7C400]' : 'font-bold text-slate-600'}`}>
                    {tab.label}
                  </Text>
                  <View className={`ml-1.5 px-1.5 py-0.5 rounded-full ${
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
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F7C400" />
        </View>
      ) : filteredOrders.length === 0 ? (
        /* ── Empty Orders State ── */
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-24 h-24 rounded-full bg-[#FEF3C7] border-2 border-[#FDE68A] items-center justify-center mb-5 shadow-sm">
            <Ionicons name="receipt-outline" size={48} color="#D97706" />
          </View>
          <Text className="text-xl font-black text-slate-900 text-center tracking-tight">
            {activeTab === 'ACTIVE'
              ? 'No Live Orders Currently'
              : activeTab === 'DELIVERED'
              ? 'No Delivered Orders Yet'
              : 'No Orders Yet'}
          </Text>
          <Text className="text-xs font-medium text-slate-500 text-center mt-1.5 mb-6 max-w-[280px] leading-relaxed">
            {activeTab === 'ACTIVE'
              ? 'All your past orders have been completed or delivered. Place a new order to track live delivery!'
              : 'Order your daily groceries, fresh milk, fruits & snacks for 10-minute express doorstep delivery.'}
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
            paddingBottom: Math.max(insets.bottom, 16) + 115
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
            const isAccepted = ['ACCEPTED', 'PACKING', 'OUT_FOR_DELIVERY'].includes(order.status);
            const isRiderAssigned = Boolean(
              order.assignedDeliveryRider &&
              order.assignedDeliveryRider.trim() !== '' &&
              order.assignedDeliveryRider.toLowerCase() !== 'unassigned'
            );
            const statusConfig = STATUS_META[order.status] || STATUS_META.PENDING;

            // Tracking steps calculation
            const currentStepIdx = TRACKING_STEPS.findIndex(s => s.key === order.status);
            const effectiveStepIdx = currentStepIdx === -1 ? 0 : currentStepIdx;

            const isExpanded = expandedOrderIds.has(order._id);
            const orderItems = order.items || [];
            const totalItemCount = orderItems.reduce((acc, i) => acc + (i.quantity || 1), 0);

            // Names summary: e.g. "Amul Milk, Aashirvaad Atta + 1 more"
            const firstItemNames = orderItems.slice(0, 2).map(i => i.name).join(', ');
            const remainingItemNamesCount = orderItems.length > 2 ? orderItems.length - 2 : 0;
            const itemsTextSummary = firstItemNames
              ? `${firstItemNames}${remainingItemNamesCount > 0 ? ` +${remainingItemNamesCount} more` : ''}`
              : `${totalItemCount} items`;

            const displayAddress = cleanFormattedAddress(order.deliveryAddress || order.location?.formattedAddress);

            return (
              <View
                key={order._id}
                className="bg-white rounded-2xl p-4 mb-4 border border-slate-200/80 shadow-sm"
              >
                {/* ── Order Top Bar: Store Brand Icon, Number & Status Badge ── */}
                <View className="flex-row items-start justify-between pb-3 border-b border-slate-100">
                  <View className="flex-row items-center flex-1 mr-2">
                    <View className="w-9 h-9 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] items-center justify-center mr-2.5 shadow-xs">
                      <Ionicons name="bag-handle" size={16} color="#D97706" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-sm font-black text-slate-900 tracking-tight">
                          Order #{order.orderNo}
                        </Text>
                      </View>
                      <View className="flex-row items-center mt-0.5">
                        <Ionicons name="time-outline" size={11} color="#94A3B8" style={{ marginRight: 3 }} />
                        <Text className="text-[11px] font-semibold text-slate-400">
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
                    </View>
                  </View>

                  {/* Status Badge */}
                  <View
                    className="flex-row items-center px-2.5 py-1 rounded-full border"
                    style={{
                      backgroundColor: statusConfig.badgeBg,
                      borderColor: statusConfig.badgeBorder
                    }}
                  >
                    <Ionicons
                      name={statusConfig.icon}
                      size={12}
                      color={statusConfig.textColor}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      className="text-[11px] font-black uppercase tracking-wide"
                      style={{ color: statusConfig.textColor }}
                    >
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                {/* ── 1. Live Active Delivery Banner (Only when order is ACCEPTED) ── */}
                {isAccepted && (
                  <View className="mt-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-3.5">
                    <View className="flex-row items-center justify-between mb-2.5">
                      <View className="flex-row items-center flex-1 mr-2">
                        <View className="w-9 h-9 rounded-xl bg-[#F7C400] items-center justify-center mr-2.5 shadow-sm">
                          <Ionicons
                            name={order.status === 'OUT_FOR_DELIVERY' ? 'bicycle' : 'cube'}
                            size={18}
                            color="#0F172A"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs font-black text-slate-900 tracking-tight">
                            {order.status === 'OUT_FOR_DELIVERY'
                              ? 'Arriving in ~6 to 8 mins ⚡'
                              : 'Packing fresh items • ~12 mins'}
                          </Text>
                          <Text className="text-[10px] font-bold text-amber-800 mt-0.5">
                            {order.status === 'OUT_FOR_DELIVERY'
                              ? 'Delivery rider is on the way to your doorstep'
                              : 'Store team is packing the order'}
                          </Text>
                        </View>
                      </View>

                      {/* Live Pulse Badge */}
                      <View className="flex-row items-center bg-white px-2 py-0.5 rounded-full border border-amber-200 shadow-xs">
                        <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                        <Text className="text-[9px] font-black text-slate-800 uppercase tracking-wider">
                          LIVE
                        </Text>
                      </View>
                    </View>

                    {/* Rider Details & Direct Call (Only if Rider is Assigned) */}
                    <View className="pt-2 border-t border-amber-200/70 flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1 mr-2">
                        <Ionicons name="person-circle" size={17} color="#D97706" style={{ marginRight: 5 }} />
                        <Text numberOfLines={1} className="text-xs font-bold text-slate-700">
                          Rider:{' '}
                          <Text className={isRiderAssigned ? "font-black text-slate-900" : "font-semibold text-slate-500"}>
                            {isRiderAssigned ? order.assignedDeliveryRider : 'Assigning partner...'}
                          </Text>
                        </Text>
                      </View>

                      {isRiderAssigned && order.riderPhone ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(`tel:${order.riderPhone}`).catch(() => {})}
                          activeOpacity={0.8}
                          className="bg-slate-900 px-3 py-1.5 rounded-xl flex-row items-center shadow-xs active:bg-slate-800"
                        >
                          <Ionicons name="call" size={11} color="#F7C400" style={{ marginRight: 4 }} />
                          <Text className="text-[11px] font-black text-[#F7C400]">Call Rider</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* ── 2. Delivery Confirmation OTP Card (Only for Active / Non-Delivered Orders) ── */}
                {!isDelivered && !isCancelled && order.deliveryOtp && (
                  <View className="mt-3 bg-slate-900 rounded-2xl p-3 border border-slate-800 shadow-sm">
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

                    <View className="flex-row items-center justify-between bg-slate-800/90 rounded-xl p-2.5 border border-slate-700">
                      <View className="flex-row items-center">
                        {String(order.deliveryOtp).split('').map((digit, dIdx) => (
                          <View
                            key={dIdx}
                            className="w-8 h-8 rounded-lg bg-slate-950 border border-[#F7C400]/50 items-center justify-center mr-1.5"
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

                {/* ── 3. Progress Stepper (Only for Active / Non-Delivered Orders) ── */}
                {!isCancelled && !isDelivered ? (
                  <View className="my-3 bg-[#F8FAFC] p-3 rounded-2xl border border-slate-200/80">
                    <View className="flex-row items-center justify-between mb-2.5">
                      <Text className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        DELIVERY STATUS
                      </Text>
                      <Text className="text-[10px] font-bold text-amber-700">
                        Step {effectiveStepIdx + 1} of 4
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between px-1">
                      {TRACKING_STEPS.map((step, idx) => {
                        const isDone = effectiveStepIdx >= idx;
                        const isCurrent = effectiveStepIdx === idx;

                        return (
                          <React.Fragment key={step.key}>
                            {/* Step Node */}
                            <View className="items-center" style={{ width: 56 }}>
                              <View
                                className={`w-7 h-7 rounded-full items-center justify-center mb-1.5 ${
                                  isCurrent
                                    ? 'bg-slate-900 border-2 border-[#F7C400] shadow-xs'
                                    : isDone
                                    ? 'bg-slate-900 shadow-xs'
                                    : 'bg-slate-200'
                                }`}
                              >
                                <Ionicons
                                  name={isDone && idx < effectiveStepIdx ? 'checkmark' : step.icon}
                                  size={13}
                                  color={isDone ? '#F7C400' : '#64748B'}
                                />
                              </View>
                              <Text
                                numberOfLines={1}
                                className={`text-[10px] text-center ${
                                  isCurrent
                                    ? 'font-black text-slate-900'
                                    : isDone
                                    ? 'font-bold text-slate-700'
                                    : 'font-semibold text-slate-400'
                                }`}
                                style={{ width: 56 }}
                              >
                                {step.label}
                              </Text>
                            </View>

                            {/* Connecting Line */}
                            {idx < TRACKING_STEPS.length - 1 && (
                              <View
                                className={`h-1 flex-1 mb-4 rounded-full ${
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
                ) : isCancelled ? (
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
                ) : null}

                {/* ── 4. Premium Product Preview Strip (Quick-Commerce Hallmark) ── */}
                <View className="my-2 bg-[#F8FAFC] rounded-2xl p-3 border border-slate-200/70">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1 mr-2">
                      <Ionicons name="cart" size={13} color="#64748B" style={{ marginRight: 5 }} />
                      <Text numberOfLines={1} className="text-xs font-black text-slate-800">
                        {totalItemCount} {totalItemCount === 1 ? 'Item' : 'Items'} •{' '}
                        <Text className="font-semibold text-slate-600">{itemsTextSummary}</Text>
                      </Text>
                    </View>
                  </View>

                  {/* Horizontal Thumbnail Row */}
                  <View className="flex-row items-center mt-1">
                    <View className="flex-row items-center flex-1">
                      {orderItems.slice(0, 4).map((item, idx) => {
                        const imgUrl = resolveItemImage(item, catalogMap);
                        return (
                          <View
                            key={idx}
                            className="w-12 h-12 rounded-xl bg-white border border-slate-200/80 mr-2 overflow-hidden shadow-xs relative"
                          >
                            <Image
                              source={{ uri: imgUrl }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                            {/* Quantity badge */}
                            <View className="absolute bottom-0 right-0 bg-slate-900/80 px-1 py-0.2 rounded-tl-md">
                              <Text className="text-[9px] font-black text-white">
                                {item.quantity || 1}x
                              </Text>
                            </View>
                          </View>
                        );
                      })}

                      {/* Extra Items Counter Chip if > 4 items */}
                      {orderItems.length > 4 && (
                        <View className="w-12 h-12 rounded-xl bg-slate-200 border border-slate-300 items-center justify-center">
                          <Text className="text-xs font-black text-slate-800">
                            +{orderItems.length - 4}
                          </Text>
                          <Text className="text-[8px] font-bold text-slate-500">
                            more
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* View Details Toggle */}
                    <TouchableOpacity
                      onPress={() => toggleOrderExpand(order._id)}
                      activeOpacity={0.7}
                      className="bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl flex-row items-center shadow-xs ml-1"
                    >
                      <Text className="text-[11px] font-black text-slate-700 mr-1">
                        {isExpanded ? 'Hide Bill' : 'View Bill'}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={12}
                        color="#475569"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* ── Expanded Full Breakdown Drawer ── */}
                  {isExpanded && (
                    <View className="mt-3 pt-3 border-t border-slate-200">
                      <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                        ITEMIZED RECEIPT
                      </Text>

                      {orderItems.map((item, idx) => {
                        const itemImg = resolveItemImage(item, catalogMap);
                        return (
                          <View
                            key={idx}
                            className="flex-row items-center justify-between py-2 border-b border-slate-100 last:border-b-0"
                          >
                            <View className="flex-row items-center flex-1 mr-2">
                              <Image
                                source={{ uri: itemImg }}
                                className="w-9 h-9 rounded-lg bg-white border border-slate-200/70 mr-2.5"
                                resizeMode="cover"
                              />
                              <View className="flex-1">
                                <Text className="text-xs font-bold text-slate-800">
                                  {item.name}
                                </Text>
                                <Text className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                  Qty: {item.quantity} {item.unit ? `• ${item.unit}` : ''}
                                </Text>
                              </View>
                            </View>
                            <Text className="text-xs font-black text-slate-900">
                              ₹{item.total || (item.price * item.quantity)}
                            </Text>
                          </View>
                        );
                      })}

                      {/* Detailed Bill Summary Card */}
                      <View className="mt-2.5 pt-2.5 border-t border-dashed border-slate-300">
                        <View className="flex-row justify-between py-1">
                          <Text className="text-[11px] font-medium text-slate-500">Items Subtotal</Text>
                          <Text className="text-[11px] font-bold text-slate-800">₹{order.subtotal || order.totalAmount}</Text>
                        </View>
                        <View className="flex-row justify-between py-1">
                          <Text className="text-[11px] font-medium text-slate-500">Delivery Fee</Text>
                          <Text className="text-[11px] font-bold text-slate-800">
                            {order.deliveryFee === 0 ? (
                              <Text className="text-emerald-600 font-bold">FREE</Text>
                            ) : (
                              `₹${order.deliveryFee || 0}`
                            )}
                          </Text>
                        </View>
                        {order.discountAmount > 0 && (
                          <View className="flex-row justify-between py-1">
                            <Text className="text-[11px] font-bold text-emerald-600">
                              Promo Discount {order.discountCode ? `(${order.discountCode})` : ''}
                            </Text>
                            <Text className="text-[11px] font-bold text-emerald-600">
                              -₹{order.discountAmount}
                            </Text>
                          </View>
                        )}
                        <View className="flex-row justify-between pt-2 mt-1 border-t border-slate-200">
                          <Text className="text-xs font-black text-slate-900">Grand Total</Text>
                          <Text className="text-sm font-black text-slate-900">₹{order.totalAmount}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* ── 5. Delivery Address Row ── */}
                <View className="py-2.5 px-3 mb-3 bg-slate-50 rounded-xl border border-slate-100">
                  <View className="flex-row items-center">
                    <Ionicons name="location" size={14} color="#D97706" style={{ marginRight: 6 }} />
                    <Text numberOfLines={1} className="text-xs font-semibold text-slate-600 flex-1">
                      Delivered to: <Text className="font-bold text-slate-900">{displayAddress}</Text>
                    </Text>
                  </View>

                  {order.location?.latitude && (
                    <View className="flex-row items-center mt-1 ml-5">
                      <View className="bg-emerald-100 px-1.5 py-0.5 rounded-md flex-row items-center mr-2">
                        <Ionicons name="pin" size={9} color="#065F46" />
                        <Text className="text-[9px] font-bold text-emerald-800 ml-0.5">
                          GPS Doorstep Verified
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

                {/* ── 6. Order Footer: Payment Method & High-Contrast CTAs ── */}
                <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
                  <View>
                    <View className="flex-row items-center">
                      <Ionicons
                        name={order.paymentMethod === 'PAYTM' || order.paymentMethod === 'ONLINE_UPI' ? 'flash' : 'cash-outline'}
                        size={12}
                        color={order.paymentMethod === 'PAYTM' || order.paymentMethod === 'ONLINE_UPI' ? '#0284C7' : '#64748B'}
                        style={{ marginRight: 4 }}
                      />
                      <Text className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        {order.paymentMethod === 'PAYTM' || order.paymentMethod === 'ONLINE_UPI' ? 'Paid Online' : 'Cash on Delivery'}
                      </Text>
                    </View>
                    <Text className="text-lg font-black text-slate-900 mt-0.5">
                      ₹{order.totalAmount}
                    </Text>
                  </View>

                  {/* Actions: Reorder & Help */}
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => handleSupport(order)}
                      activeOpacity={0.7}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white mr-2.5 flex-row items-center shadow-xs active:bg-slate-100"
                    >
                      <Ionicons name="headset-outline" size={14} color="#0F172A" style={{ marginRight: 4 }} />
                      <Text className="text-xs font-bold text-slate-700">Help</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleReorder(order)}
                      activeOpacity={0.85}
                      className="px-4 py-2 rounded-xl bg-slate-900 border border-[#F7C400] flex-row items-center shadow-sm active:bg-slate-800"
                    >
                      <Ionicons name="repeat" size={14} color="#F7C400" style={{ marginRight: 5 }} />
                      <Text className="text-xs font-black text-[#F7C400]">Reorder</Text>
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
