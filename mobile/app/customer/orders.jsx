import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';

export default function CustomerOrdersScreen() {
  const { customerUser, apiBaseUrl, socket } = useApp();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  const fetchLiveOrders = React.useCallback(async () => {
    if (!customerUser?.phone) return;
    try {
      const cleanPhone = customerUser.phone.replace(/\D/g, '');
      const res = await fetch(`${apiBaseUrl}/orders/customer/${cleanPhone}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
        setLastSyncTime(new Date());
      }
    } catch (e) {
      // ignore
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
    await fetchLiveOrders();
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }} 
        className="px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} />}
      >
        
        {/* Live Sync Banner */}
        <View className="bg-[#28469E] rounded-3xl p-4 mb-4 shadow-md shadow-[#28469E]/20 flex-row items-center justify-between">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center mb-0.5">
              <View className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
              <Text className="text-[#CAE8E8] text-[10px] font-black uppercase tracking-widest">REAL-TIME AUTO SYNC</Text>
            </View>
            <Text className="text-white text-base font-black">Live Delivery Tracking</Text>
            <Text className="text-slate-200 text-[11px] font-medium mt-0.5">
              Updates automatically when store accepts or dispatches your order
            </Text>
          </View>
          <View className="bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/20 items-end">
            <Text className="text-white text-[10px] font-bold">Updated</Text>
            <Text className="text-[#CAE8E8] text-[10px] font-black">
              {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
          </View>
        </View>

        {/* Orders Header */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-xs font-black text-slate-700 uppercase tracking-widest">
            MY DELIVERY ORDERS ({orders.length})
          </Text>
          <TouchableOpacity onPress={fetchLiveOrders} className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
            <Text className="text-[10px] font-bold text-[#28469E]">🔄 Sync Now</Text>
          </TouchableOpacity>
        </View>

        {orders.length === 0 ? (
          <View className="bg-white rounded-3xl p-8 items-center justify-center my-auto border border-slate-200 shadow-sm">
            <Text className="text-4xl mb-2">🚚</Text>
            <Text className="text-base font-black text-slate-800 text-center">No Active Delivery Orders</Text>
            <Text className="text-xs text-slate-500 text-center mt-1 max-w-xs">
              Add Kiryana products to your cart and place an order to track live delivery progress here.
            </Text>
          </View>
        ) : (
          orders.map(order => {
            const steps = ['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
            const currentStepIdx = Math.max(0, steps.indexOf(order.status));
            const isDelivered = order.status === 'DELIVERED';

            return (
              <View key={order._id} className="bg-white rounded-3xl p-5 mb-4 border border-slate-200 shadow-md shadow-slate-200/50">
                
                {/* Header info */}
                <View className="flex-row justify-between items-center mb-2">
                  <View>
                    <Text className="text-base font-black text-[#28469E]">Order #{order.orderNo}</Text>
                    <Text className="text-[11px] text-slate-400 font-semibold">
                      Placed: {new Date(order.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full border ${
                    isDelivered ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'
                  }`}>
                    <Text className={`text-xs font-black uppercase ${
                      isDelivered ? 'text-emerald-800' : 'text-amber-800'
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>

                {/* Live Progress Stepper Bar */}
                <View className="bg-slate-50 p-3 rounded-2xl border border-slate-200 my-3">
                  <Text className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2.5">
                    LIVE STATUS PROGRESS
                  </Text>

                  <View className="flex-row items-center justify-between">
                    {/* Step 1: Placed */}
                    <View className="items-center flex-1">
                      <View className={`w-8 h-8 rounded-full items-center justify-center mb-1 ${
                        currentStepIdx >= 0 ? 'bg-[#28469E]' : 'bg-slate-200'
                      }`}>
                        <Text className="text-xs">📝</Text>
                      </View>
                      <Text className={`text-[10px] font-bold ${currentStepIdx >= 0 ? 'text-[#28469E]' : 'text-slate-400'}`}>
                        Order Placed
                      </Text>
                    </View>

                    <View className={`h-0.5 flex-1 mb-4 ${currentStepIdx >= 1 ? 'bg-[#28469E]' : 'bg-slate-200'}`} />

                    {/* Step 2: Processing */}
                    <View className="items-center flex-1">
                      <View className={`w-8 h-8 rounded-full items-center justify-center mb-1 ${
                        currentStepIdx >= 1 ? 'bg-[#28469E]' : 'bg-slate-200'
                      }`}>
                        <Text className="text-xs">👨‍🍳</Text>
                      </View>
                      <Text className={`text-[10px] font-bold ${currentStepIdx >= 1 ? 'text-[#28469E]' : 'text-slate-400'}`}>
                        Packing
                      </Text>
                    </View>

                    <View className={`h-0.5 flex-1 mb-4 ${currentStepIdx >= 2 ? 'bg-[#28469E]' : 'bg-slate-200'}`} />

                    {/* Step 3: Out for Delivery */}
                    <View className="items-center flex-1">
                      <View className={`w-8 h-8 rounded-full items-center justify-center mb-1 ${
                        currentStepIdx >= 2 ? 'bg-[#28469E]' : 'bg-slate-200'
                      }`}>
                        <Text className="text-xs">🛵</Text>
                      </View>
                      <Text className={`text-[10px] font-bold ${currentStepIdx >= 2 ? 'text-[#28469E]' : 'text-slate-400'}`}>
                        On The Way
                      </Text>
                    </View>

                    <View className={`h-0.5 flex-1 mb-4 ${currentStepIdx >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />

                    {/* Step 4: Delivered */}
                    <View className="items-center flex-1">
                      <View className={`w-8 h-8 rounded-full items-center justify-center mb-1 ${
                        currentStepIdx >= 3 ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}>
                        <Text className="text-xs">✅</Text>
                      </View>
                      <Text className={`text-[10px] font-bold ${currentStepIdx >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        Delivered
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Item Summary */}
                <View className="bg-[#F8FAFC] rounded-2xl p-3 mb-3 border border-slate-200">
                  <Text className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    ITEMS PURCHASED:
                  </Text>
                  {order.items.map((item, idx) => (
                    <View key={idx} className="flex-row justify-between py-1 border-b border-slate-100 last:border-b-0">
                      <Text className="text-xs font-bold text-slate-800">
                        • {item.name} <Text className="text-slate-500">x{item.quantity}</Text>
                      </Text>
                      <Text className="text-xs font-black text-slate-900">
                        ₹{item.total || (item.price * item.quantity)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Delivery details & total */}
                <View className="flex-row justify-between items-center pt-2 border-t border-slate-100">
                  <View>
                    <Text className="text-[10px] font-bold text-slate-400 uppercase">Payment Mode</Text>
                    <Text className="text-xs font-black text-slate-800">{order.paymentMethod}</Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase">Total Paid</Text>
                    <Text className="text-base font-black text-[#28469E]">₹{order.totalAmount}</Text>
                  </View>
                </View>

              </View>
            );
          })
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
