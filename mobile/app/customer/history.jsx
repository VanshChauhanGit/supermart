import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, StatusBar } from 'react-native';
import { useApp } from '../../context/AppContext';

export default function CustomerHistoryScreen() {
  const { customerUser, apiBaseUrl } = useApp();
  const [orders, setOrders] = useState([]);
  const [customerAccount, setCustomerAccount] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomerData = async () => {
    try {
      const oRes = await fetch(`${apiBaseUrl}/orders`);
      const oData = await oRes.json();
      if (oData.success) {
        const myOrders = oData.data.filter(o => 
          o.phone === customerUser?.phone || o.customerName === customerUser?.name
        );
        setOrders(myOrders);
      }

      const cRes = await fetch(`${apiBaseUrl}/customers`);
      const cData = await cRes.json();
      if (cData.success) {
        const found = cData.data.find(c => 
          c.phone === customerUser?.phone || c.name.toLowerCase() === customerUser?.name.toLowerCase()
        );
        if (found) {
          const dtRes = await fetch(`${apiBaseUrl}/customers/${found._id}`);
          const dtData = await dtRes.json();
          if (dtData.success) setCustomerAccount(dtData.data);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchCustomerData();
  }, [customerUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCustomerData();
    setRefreshing(false);
  };

  const udharBalance = customerAccount?.customer?.creditBalance || 0;
  const lifetimeSpent = customerAccount?.customer?.totalPurchases || 0;

  return (
    <ScrollView 
      className="flex-1 bg-[#F8FAFC]"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View className="p-4">
        
        {/* Customer Profile Card */}
        <View className="flex-row items-center bg-white rounded-3xl p-4 mb-4 border border-slate-200 shadow-sm">
          <View className="w-14 h-14 rounded-2xl bg-[#28469E] items-center justify-center mr-4 shadow-md shadow-[#28469E]/30">
            <Text className="text-[#CAE8E8] text-2xl font-black">
              {customerUser?.name ? customerUser.name.charAt(0) : 'C'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-lg font-black text-slate-900">{customerUser?.name || 'Customer'}</Text>
            {customerUser?.fatherName ? (
              <Text className="text-xs font-bold text-[#28469E] mt-0.5">S/O: {customerUser.fatherName}</Text>
            ) : null}
            <Text className="text-xs text-slate-500 font-medium mt-0.5">📞 +91-{customerUser?.phone || '9876543210'}</Text>
          </View>
        </View>

        {/* My Udhar Ledger Summary Box */}
        <View className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-5 shadow-sm">
          <Text className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-3">
            MY KIRYANA SHOP ACCOUNT & UDHAR LEDGER
          </Text>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-[10px] font-bold text-slate-500 mb-0.5">Pending Udhar Debt</Text>
              <Text className={`text-2xl font-black ${udharBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                ₹{udharBalance.toLocaleString('en-IN')}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] font-bold text-slate-500 mb-0.5">Lifetime Shop Spending</Text>
              <Text className="text-2xl font-black text-emerald-600">
                ₹{lifetimeSpent.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Active Delivery Orders */}
        <Text className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3">
          MY EXPRESS DELIVERY ORDERS ({orders.length})
        </Text>

        {orders.length === 0 ? (
          <View className="bg-white rounded-2xl p-5 items-center mb-5 border border-slate-200">
            <Text className="text-xs text-slate-500 font-medium">No active online delivery orders found.</Text>
          </View>
        ) : (
          orders.map(order => {
            const steps = ['PENDING', 'PROCESSING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
            const currentStepIdx = Math.max(0, steps.indexOf(order.status));

            return (
              <View key={order._id} className="bg-white rounded-3xl p-4 mb-3.5 border border-slate-200 shadow-sm">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className="text-sm font-black text-[#28469E]">Order #{order.orderNo}</Text>
                  <View className={`px-2.5 py-0.5 rounded-lg border ${
                    order.status === 'DELIVERED' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <Text className={`text-[10px] font-black uppercase ${
                      order.status === 'DELIVERED' ? 'text-emerald-800' : 'text-amber-800'
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
                <Text className="text-[11px] text-slate-400 font-medium mb-2.5">
                  Placed: {new Date(order.createdAt).toLocaleString()}
                </Text>

                {/* Progress Stepper */}
                <View className="flex-row items-center justify-between bg-slate-50 px-3 py-2 rounded-2xl mb-3 border border-slate-200">
                  <View className="items-center flex-1">
                    <Text className={`text-xs ${currentStepIdx >= 0 ? 'text-[#28469E] font-black' : 'text-slate-300'}`}>📝</Text>
                    <Text className="text-[9px] font-bold text-slate-600 mt-0.5">Placed</Text>
                  </View>
                  <Text className="text-slate-300 font-bold text-xs">→</Text>
                  <View className="items-center flex-1">
                    <Text className={`text-xs ${currentStepIdx >= 1 ? 'text-[#28469E] font-black' : 'text-slate-300'}`}>👨‍🍳</Text>
                    <Text className="text-[9px] font-bold text-slate-600 mt-0.5">Packing</Text>
                  </View>
                  <Text className="text-slate-300 font-bold text-xs">→</Text>
                  <View className="items-center flex-1">
                    <Text className={`text-xs ${currentStepIdx >= 2 ? 'text-[#28469E] font-black' : 'text-slate-300'}`}>🛵</Text>
                    <Text className="text-[9px] font-bold text-slate-600 mt-0.5">On Way</Text>
                  </View>
                  <Text className="text-slate-300 font-bold text-xs">→</Text>
                  <View className="items-center flex-1">
                    <Text className={`text-xs ${currentStepIdx >= 3 ? 'text-emerald-600 font-black' : 'text-slate-300'}`}>✅</Text>
                    <Text className="text-[9px] font-bold text-slate-600 mt-0.5">Delivered</Text>
                  </View>
                </View>

                <View className="bg-[#F8FAFC] rounded-2xl p-3 mb-2.5 border border-slate-200">
                  {order.items.map((i, idx) => (
                    <Text key={idx} className="text-xs font-semibold text-slate-700 mb-0.5">
                      • {i.name} x {i.quantity} — ₹{i.total || (i.price * i.quantity)}
                    </Text>
                  ))}
                </View>
                <View className="flex-row justify-between pt-2 border-t border-slate-100">
                  <Text className="text-xs text-slate-500 font-medium">Payment: {order.paymentMethod}</Text>
                  <Text className="text-sm font-black text-[#28469E]">Total: ₹{order.totalAmount}</Text>
                </View>
              </View>
            );
          })
        )}

        {/* Itemized Udhar Purchase History */}
        <Text className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3">
          ITEMIZED UDHAR BILL HISTORY
        </Text>

        {customerAccount?.transactions && customerAccount.transactions.length > 0 ? (
          customerAccount.transactions.map(tx => {
            const isCredit = tx.type === 'CREDIT_PURCHASE';
            return (
              <View key={tx._id} className="bg-white rounded-2xl p-3.5 mb-3 border border-slate-200 shadow-sm">
                <View className="flex-row justify-between items-center mb-2">
                  <View className={`px-2.5 py-1 rounded-lg border ${
                    isCredit ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <Text className={`text-[10px] font-black uppercase ${
                      isCredit ? 'text-amber-800' : 'text-emerald-800'
                    }`}>
                      {isCredit ? 'UDHAR PURCHASE' : 'PAYMENT RECEIVED'}
                    </Text>
                  </View>
                  <Text className={`text-base font-black ${isCredit ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {isCredit ? '+' : '-'}₹{tx.amount}
                  </Text>
                </View>

                {isCredit && tx.itemsSummary && (
                  <View className="bg-[#F8FAFC] rounded-xl p-2.5 my-1.5 border border-slate-200">
                    {tx.itemsSummary.map((item, idx) => (
                      <Text key={idx} className="text-xs font-medium text-slate-700 mb-0.5">
                        {item.name} x {item.quantity} — ₹{item.total || (item.price * item.quantity)}
                      </Text>
                    ))}
                  </View>
                )}

                <Text className="text-[11px] text-slate-400 font-medium mt-1">{tx.notes || 'Purchased at Supermart POS Counter'}</Text>
              </View>
            );
          })
        ) : (
          <View className="bg-white rounded-2xl p-5 items-center mb-6 border border-slate-200">
            <Text className="text-xs text-slate-500 font-medium">No past Udhar purchases recorded for your account.</Text>
          </View>
        )}

      </View>
    </ScrollView>
  );
}
