import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Modal, Alert, Linking, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

export default function AdminUdharScreen() {
  const { apiBaseUrl } = useApp();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/customers`);
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch (e) {}
  };

  useEffect(() => { fetchCustomers(); }, []);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.fatherName && c.fatherName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    c.phone.includes(searchTerm)
  );

  const totalOutstanding = customers.reduce((acc, c) => acc + (c.creditBalance || 0), 0);
  const debtors = customers.filter(c => c.creditBalance > 0).length;

  const handleRecordPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/customers/${selectedCustomer._id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(payAmount), paymentMethod: 'UPI', notes: 'Recorded via Mobile Admin App' })
      });
      const data = await res.json();
      if (data.success) {
        setShowPayModal(false);
        setPayAmount('');
        fetchCustomers();
        Alert.alert('Payment Recorded!', `Successfully received ₹${payAmount} from ${selectedCustomer.name}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Payment recording failed: ' + e.message);
    }
  };

  const handleWhatsApp = (c) => {
    const cleanPhone = c.phone.replace(/\D/g, '');
    const fatherText = c.fatherName ? ` (S/O ${c.fatherName})` : '';
    const text = `*SUPERMART Udhar Statement*\n----------------------------------\nCustomer: *${c.name}*${fatherText}\n*Total Pending Udhar Balance: ₹${c.creditBalance}*\nLifetime Spent: ₹${c.totalPurchases || 0}\n----------------------------------\nPlease clear at your convenience via UPI/Cash. Thank you!`;
    const url = `whatsapp://send?phone=91${cleanPhone}&text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => Alert.alert('WhatsApp Error', 'Could not launch WhatsApp app.'));
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFF]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFF" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-3xl font-black text-slate-900">Udhar Khata</Text>
        <Text className="text-xs text-slate-400 font-semibold mt-0.5">Market credit ledger & repayment tracker</Text>
      </View>

      {/* Summary Hero */}
      <View className="mx-5 mb-4 bg-amber-50 rounded-2xl p-5 border-2 border-amber-200 shadow-sm shadow-amber-200/40">
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <Text className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1.5">TOTAL OUTSTANDING DEBT</Text>
            <Text className="text-4xl font-black text-amber-600 tracking-tight">₹{totalOutstanding.toLocaleString('en-IN')}</Text>
            <Text className="text-xs text-amber-900 font-semibold mt-2">{debtors} active borrowers · {customers.length} total customers</Text>
          </View>
          <View className="bg-amber-100 rounded-2xl p-3 border border-amber-200">
            <Ionicons name="book-outline" size={28} color="#D97706" />
          </View>
        </View>
      </View>

      {/* Search */}
      <View className="mx-5 mb-3">
        <View className="bg-white rounded-2xl px-3.5 py-3 flex-row items-center border border-slate-200 shadow-sm">
          <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-sm font-semibold text-slate-900"
            placeholder="Search name, S/O father, phone..."
            placeholderTextColor="#94A3B8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Customer Ledger List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        ListEmptyComponent={() => (
          <View className="items-center pt-16">
            <Ionicons name="people-outline" size={64} color="#CBD5E1" className="mb-3" />
            <Text className="text-base font-black text-slate-900">No Customers Found</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const hasDebt = item.creditBalance > 0;
          return (
            <View className={`bg-white rounded-2xl p-4 mb-2.5 border shadow-sm ${hasDebt ? 'border-amber-200' : 'border-slate-100'}`}>
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1">
                  <Text className="text-base font-black text-slate-900">{item.name}</Text>
                  {item.fatherName ? (
                    <Text className="text-xs font-bold text-[#28469E] mt-0.5">S/O {item.fatherName}</Text>
                  ) : null}
                  <Text className="text-xs text-slate-400 font-semibold mt-0.5"><Ionicons name="call-outline" size={12} color="#94A3B8" /> +91-{item.phone}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Pending Debt</Text>
                  <Text className={`text-2xl font-black ${hasDebt ? 'text-amber-600' : 'text-emerald-600'}`}>
                    ₹{(item.creditBalance || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center border-t border-slate-100 pt-3">
                <Text className="text-xs text-slate-400 font-semibold">
                  Lifetime: <Text className="text-emerald-600 font-bold">₹{(item.totalPurchases || 0).toLocaleString('en-IN')}</Text>
                </Text>
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => { setSelectedCustomer(item); setShowPayModal(true); }}
                    className="bg-[#1E3A8A] rounded-xl px-3.5 py-2 mr-2 flex-row items-center"
                  >
                    <Ionicons name="card-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
                    <Text className="text-white text-xs font-black">Record Pay</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleWhatsApp(item)}
                    className="bg-green-50 rounded-xl px-3 py-2 border border-green-200 flex-row items-center"
                  >
                    <Ionicons name="logo-whatsapp" size={13} color="#16A34A" style={{ marginRight: 4 }} />
                    <Text className="text-green-700 text-xs font-black">WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Payment Modal */}
      <Modal visible={showPayModal} animationType="slide" transparent>
        <View className="flex-1 bg-slate-900/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-9">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />
            <Text className="text-xl font-black text-slate-900 mb-1">Record Payment</Text>
            {selectedCustomer && (
              <Text className="text-xs font-bold text-[#1E3A8A] mb-5">
                {selectedCustomer.name}{selectedCustomer.fatherName ? ` (S/O ${selectedCustomer.fatherName})` : ''} · Balance: ₹{selectedCustomer.creditBalance}
              </Text>
            )}
            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount Received (₹)</Text>
            <TextInput
              className="bg-[#F8FAFF] border border-slate-200 rounded-2xl px-4 py-4 text-3xl font-black text-slate-900 mb-5"
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={payAmount}
              onChangeText={setPayAmount}
              autoFocus
            />
            <TouchableOpacity
              onPress={handleRecordPayment}
              className="bg-[#1E3A8A] rounded-2xl py-4 items-center mb-2.5 shadow-lg shadow-[#1E3A8A]/30"
            >
              <Text className="text-white font-black text-base">CONFIRM PAYMENT RECEIVED</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowPayModal(false); setPayAmount(''); }}
              className="bg-slate-100 rounded-2xl py-3.5 items-center"
            >
              <Text className="text-slate-500 font-bold text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
