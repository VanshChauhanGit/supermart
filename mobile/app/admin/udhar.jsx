import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Modal, Alert, Linking, StatusBar, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

export default function AdminUdharScreen() {
  const { apiBaseUrl } = useApp();
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Pay Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI'); // UPI | CASH

  // Passbook Modal State
  const [showPassbookModal, setShowPassbookModal] = useState(false);
  const [passbookCustomer, setPassbookCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingPassbook, setLoadingPassbook] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/customers`);
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

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
        body: JSON.stringify({
          amount: Number(payAmount),
          paymentMethod: payMethod,
          notes: `Recorded via Mobile Admin App`
        })
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

  // Open Passbook & Fetch Transaction History
  const openPassbook = async (customer) => {
    setPassbookCustomer(customer);
    setShowPassbookModal(true);
    setLoadingPassbook(true);
    try {
      const res = await fetch(`${apiBaseUrl}/customers/${customer._id}`);
      const data = await res.json();
      if (data.success && data.data?.transactions) {
        setTransactions(data.data.transactions);
      } else {
        setTransactions([]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not load passbook transactions: ' + e.message);
    } finally {
      setLoadingPassbook(false);
    }
  };

  // 1-Click WhatsApp Reminder
  const handleWhatsApp = (c) => {
    const cleanPhone = c.phone.replace(/\D/g, '');
    const fatherText = c.fatherName ? ` (S/O ${c.fatherName})` : '';
    const text = `*MANDHAUR SUPERMART Udhar Statement*\n----------------------------------\nCustomer: *${c.name}*${fatherText}\n*Total Pending Udhar Balance: ₹${c.creditBalance}*\nLifetime Spent: ₹${c.totalPurchases || 0}\n----------------------------------\nPlease clear at your convenience via UPI/Cash. Thank you!`;
    const url = `whatsapp://send?phone=91${cleanPhone}&text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => Alert.alert('WhatsApp Error', 'Could not launch WhatsApp app.'));
  };

  // Share Full Passbook Statement via WhatsApp
  const sharePassbookWhatsApp = (customer, txs) => {
    if (!customer) return;
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const fatherText = customer.fatherName ? ` (S/O ${customer.fatherName})` : '';

    let txLog = '';
    if (txs && txs.length > 0) {
      txLog = txs.slice(0, 5).map(t => {
        const d = new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const sign = t.type === 'CREDIT_PURCHASE' ? '+' : '-';
        return `• ${d}: ${sign}₹${t.amount} (${t.type === 'CREDIT_PURCHASE' ? 'Billed' : 'Paid'}) -> Bal ₹${t.newBalance}`;
      }).join('\n');
    } else {
      txLog = '• No recent ledger transactions recorded.';
    }

    const statementMsg = `📖 *MANDHAUR SUPERMART - DIGITAL KHATA PASSBOOK*
----------------------------------
Customer: *${customer.name}*${fatherText}
Mobile: +91-${customer.phone}
*CURRENT OUTSTANDING BALANCE: ₹${customer.creditBalance}*
Lifetime Purchases: ₹${customer.totalPurchases || 0}
----------------------------------
*Recent Passbook Transactions:*
${txLog}
----------------------------------
Please clear outstanding balance via UPI or Cash. Thank you for your continued business!`;

    const url = `whatsapp://send?phone=91${cleanPhone}&text=${encodeURIComponent(statementMsg)}`;
    Linking.openURL(url).catch(() => Alert.alert('WhatsApp Error', 'Could not open WhatsApp app.'));
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFF]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFF" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-3xl font-black text-slate-900">Udhar Khata</Text>
        <Text className="text-xs text-slate-400 font-semibold mt-0.5">Market credit ledger & digital passbook</Text>
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
                  <Text className="text-xs text-slate-400 font-semibold mt-0.5">
                    <Ionicons name="call-outline" size={12} color="#94A3B8" /> +91-{item.phone}
                  </Text>
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

                <View className="flex-row items-center gap-1.5">
                  {/* Passbook History Trigger Button */}
                  <TouchableOpacity
                    onPress={() => openPassbook(item)}
                    className="bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-1.5 flex-row items-center"
                  >
                    <Ionicons name="newspaper-outline" size={13} color="#1E3A8A" style={{ marginRight: 3 }} />
                    <Text className="text-[#1E3A8A] text-xs font-bold">Passbook</Text>
                  </TouchableOpacity>

                  {/* Record Payment Trigger Button */}
                  <TouchableOpacity
                    onPress={() => { setSelectedCustomer(item); setShowPayModal(true); }}
                    className="bg-[#1E3A8A] rounded-xl px-3 py-1.5 flex-row items-center"
                  >
                    <Ionicons name="card-outline" size={13} color="#fff" style={{ marginRight: 3 }} />
                    <Text className="text-white text-xs font-black">Pay</Text>
                  </TouchableOpacity>

                  {/* 1-Click WhatsApp Button */}
                  <TouchableOpacity
                    onPress={() => handleWhatsApp(item)}
                    className="bg-green-50 rounded-xl px-2.5 py-1.5 border border-green-200 flex-row items-center"
                  >
                    <Ionicons name="logo-whatsapp" size={13} color="#16A34A" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ─── Record Payment Modal ──────────────────────────── */}
      <Modal visible={showPayModal} animationType="slide" transparent>
        <View className="flex-1 bg-slate-900/60 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-9">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />
            <Text className="text-xl font-black text-slate-900 mb-1">Record Udhar Payment</Text>
            {selectedCustomer && (
              <Text className="text-xs font-bold text-[#1E3A8A] mb-4">
                {selectedCustomer.name}{selectedCustomer.fatherName ? ` (S/O ${selectedCustomer.fatherName})` : ''} · Balance: ₹{selectedCustomer.creditBalance}
              </Text>
            )}

            {/* Payment Method Selector */}
            <View className="flex-row mb-4 bg-slate-100 p-1 rounded-2xl">
              {['UPI', 'CASH'].map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setPayMethod(m)}
                  className={`flex-1 py-2 rounded-xl items-center ${payMethod === m ? 'bg-white shadow-xs' : ''}`}
                >
                  <Text className={`text-xs font-black ${payMethod === m ? 'text-[#1E3A8A]' : 'text-slate-500'}`}>
                    {m === 'UPI' ? 'UPI / Online' : 'Cash Received'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount Received (₹)</Text>
            <TextInput
              className="bg-[#F8FAFF] border border-slate-200 rounded-2xl px-4 py-3.5 text-3xl font-black text-slate-900 mb-5"
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

      {/* ─── Customer Passbook / Transaction History Modal ── */}
      <Modal visible={showPassbookModal} animationType="slide" transparent>
        <View className="flex-1 bg-slate-900/60 justify-end">
          <View className="bg-white rounded-t-3xl p-5 max-h-[88%]">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-3" />

            {/* Passbook Header */}
            <View className="flex-row justify-between items-start mb-3 pb-3 border-b border-slate-100">
              <View className="flex-1 mr-2">
                <Text className="text-lg font-black text-slate-900">Digital Khata Passbook</Text>
                {passbookCustomer && (
                  <Text className="text-xs font-bold text-[#1E3A8A] mt-0.5">
                    {passbookCustomer.name} {passbookCustomer.fatherName ? `(S/O ${passbookCustomer.fatherName})` : ''} · +91-{passbookCustomer.phone}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowPassbookModal(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Customer Debt Card */}
            {passbookCustomer && (
              <View className="bg-amber-50 rounded-2xl p-4 mb-4 border border-amber-200 flex-row justify-between items-center">
                <View>
                  <Text className="text-[10px] font-bold text-amber-800 uppercase">Current Pending Debt</Text>
                  <Text className="text-2xl font-black text-amber-600">₹{passbookCustomer.creditBalance || 0}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => sharePassbookWhatsApp(passbookCustomer, transactions)}
                  className="bg-[#16A34A] rounded-xl px-3 py-2 flex-row items-center shadow-sm"
                >
                  <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text className="text-white font-black text-[11px]">Share Statement</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Passbook History ({transactions.length} entries)
            </Text>

            {loadingPassbook ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#1E3A8A" />
                <Text className="text-xs text-slate-400 font-bold mt-2">Loading customer ledger...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {transactions.length === 0 ? (
                  <View className="py-12 items-center">
                    <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
                    <Text className="text-slate-700 font-bold text-sm mt-2">No Transactions Found</Text>
                    <Text className="text-slate-400 text-xs">Customer has not had credit purchases yet.</Text>
                  </View>
                ) : (
                  transactions.map((tx, idx) => {
                    const isPurchase = tx.type === 'CREDIT_PURCHASE';
                    return (
                      <View key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-2.5">
                        <View className="flex-row justify-between items-center mb-1.5">
                          <View className="flex-row items-center">
                            <View className={`w-2 h-2 rounded-full mr-2 ${isPurchase ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            <Text className={`text-xs font-black uppercase ${isPurchase ? 'text-red-700' : 'text-emerald-700'}`}>
                              {isPurchase ? 'Credit Purchase' : 'Payment Received'}
                            </Text>
                          </View>
                          <Text className="text-[10px] text-slate-400 font-semibold">
                            {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </Text>
                        </View>

                        {/* Amount & Running Balance */}
                        <View className="flex-row justify-between items-center my-1">
                          <Text className={`text-base font-black ${isPurchase ? 'text-red-600' : 'text-emerald-600'}`}>
                            {isPurchase ? '+' : '-'}₹{tx.amount}
                          </Text>
                          <Text className="text-xs font-bold text-slate-600">
                            Balance: ₹{tx.newBalance}
                          </Text>
                        </View>

                        {/* Items Purchased on Credit */}
                        {tx.itemsSummary && tx.itemsSummary.length > 0 && (
                          <View className="bg-white rounded-xl p-2 mt-1 border border-slate-100">
                            <Text className="text-[10px] font-bold text-slate-400 uppercase mb-1">Items in this Bill:</Text>
                            {tx.itemsSummary.map((item, i) => (
                              <Text key={i} className="text-[11px] text-slate-700 font-medium">
                                • {item.name} ({item.quantity} {item.unit || 'pcs'}) = ₹{item.total || (item.price * item.quantity)}
                              </Text>
                            ))}
                          </View>
                        )}

                        {tx.notes ? (
                          <Text className="text-[10px] text-slate-400 font-medium mt-1">Note: {tx.notes}</Text>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
