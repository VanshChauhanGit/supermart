import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Modal, Image, ScrollView, Alert, StatusBar, ActivityIndicator,
  Vibration, Linking, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';

export default function AdminPOSScreen() {
  const { apiBaseUrl } = useApp();

  // Catalog State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Cart State
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);

  // Customer & Payment State
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null); // null means Walk-in Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState('CASH'); // CASH, UPI, UDHAR
  const [discountAmount, setDiscountAmount] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Modal State
  const [completedSale, setCompletedSale] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Camera Barcode Scanner State
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const lastScannedTime = useRef(0);

  // Fetch Products & Customers
  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, custRes, catRes] = await Promise.all([
        fetch(`${apiBaseUrl}/products`),
        fetch(`${apiBaseUrl}/customers`),
        fetch(`${apiBaseUrl}/categories`)
      ]);
      const prodData = await prodRes.json();
      const custData = await custRes.json();
      const catData = await catRes.json();

      if (prodData.success) setProducts(prodData.data);
      if (custData.success) setCustomers(custData.data);
      if (catData.success) {
        const catNames = catData.data.filter(c => c.isActive).map(c => c.name);
        setCategories(['All', ...catNames]);
      }
    } catch (e) {
      console.log('POS Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery.trim()));
    return matchesCategory && matchesSearch;
  });

  // Cart Calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const parsedDiscount = Math.min(cartSubtotal, Math.max(0, Number(discountAmount) || 0));
  const cartTotal = Math.max(0, cartSubtotal - parsedDiscount);
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Add Item to Cart
  const addToCart = (product) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}

    setCart(prev => {
      const idx = prev.findIndex(item => item.productId === product._id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        updated[idx].total = updated[idx].quantity * updated[idx].price;
        return updated;
      } else {
        return [...prev, {
          productId: product._id,
          name: product.name,
          price: product.sellingPrice,
          unit: product.unit || 'pcs',
          quantity: 1,
          total: product.sellingPrice,
          imageUrl: product.imageUrl,
          stockQty: product.stockQty
        }];
      }
    });
  };

  // Decrement Item in Cart
  const decrementCartItem = (productId) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (!existing) return prev;
      if (existing.quantity === 1) {
        return prev.filter(item => item.productId !== productId);
      } else {
        return prev.map(item =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1, total: (item.quantity - 1) * item.price }
            : item
        );
      }
    });
  };

  // Remove Item from Cart
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  // Barcode Scan Handler
  const handleBarcodeScanned = ({ data }) => {
    const now = Date.now();
    if (now - lastScannedTime.current < 1500) return; // Debounce 1.5s
    lastScannedTime.current = now;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate(80);
    } catch (e) {}

    const scannedCode = String(data).trim();
    const matched = products.find(p => p.barcode && String(p.barcode).trim() === scannedCode);

    if (matched) {
      addToCart(matched);
      Alert.alert('Item Added to Bill!', `Added 1x ${matched.name} (₹${matched.sellingPrice})`, [
        { text: 'Keep Scanning' },
        { text: 'View Cart', onPress: () => { setScannerVisible(false); setShowCartModal(true); } }
      ]);
    } else {
      Alert.alert('Barcode Not Found', `No item registered with barcode: ${scannedCode}`, [
        { text: 'OK' }
      ]);
    }
  };

  // Launch Camera Scanner
  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Camera Permission Needed', 'Please allow camera access to scan product barcodes.');
        return;
      }
    }
    setScannerVisible(true);
  };

  // Process Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to bill before checking out.');
      return;
    }

    if (paymentMode === 'UDHAR' && !selectedCustomer) {
      Alert.alert('Select Customer', 'Udhar (Credit) sales require selecting an account holder.');
      setShowCustomerModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomer ? selectedCustomer._id : null,
        customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
        customerPhone: selectedCustomer ? selectedCustomer.phone : '',
        items: cart.map(i => ({
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          price: i.price,
          total: i.total
        })),
        subtotal: cartSubtotal,
        discount: parsedDiscount,
        tax: 0,
        totalAmount: cartTotal,
        paymentMode: paymentMode,
        notes: `Mobile POS Sale`
      };

      const res = await fetch(`${apiBaseUrl}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Vibration.vibrate([0, 100, 50, 100]);
        } catch (e) {}

        setCompletedSale({
          ...data.data,
          items: cart,
          whatsAppNotice: data.whatsAppNotice
        });
        setCart([]);
        setDiscountAmount('0');
        setSelectedCustomer(null);
        setShowCartModal(false);
        setShowReceiptModal(true);

        // Reload products for stock decrement
        loadData();
      } else {
        Alert.alert('Checkout Failed', data.message || 'Error recording sale');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Failed to connect to billing server: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Share Receipt on WhatsApp
  const shareReceiptWhatsApp = (sale) => {
    if (!sale) return;
    const phone = sale.customerPhone || (selectedCustomer ? selectedCustomer.phone : '');
    const dateStr = new Date(sale.createdAt || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const itemsText = sale.items.map(i => `• ${i.name} x${i.quantity} = ₹${i.total || i.price * i.quantity}`).join('\n');

    const msg = `🧾 *MANDHAUR SUPERMART RETAIL INVOICE*
----------------------------------
Invoice: *#${sale.invoiceNo}*
Date: ${dateStr}
Customer: *${sale.customerName}*
Payment Mode: *${sale.paymentMode}*
----------------------------------
${itemsText}
----------------------------------
Subtotal: ₹${sale.subtotal}
${sale.discount > 0 ? `Discount: -₹${sale.discount}\n` : ''}*GRAND TOTAL: ₹${sale.totalAmount}*
----------------------------------
Thank you for shopping at Mandhaur Supermart! Visit again.`;

    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const url = cleanPhone
      ? `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `whatsapp://send?text=${encodeURIComponent(msg)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp app.');
    });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFF]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFF" />

      {/* Header */}
      <View className="px-5 pt-3 pb-2 flex-row justify-between items-center">
        <View>
          <Text className="text-3xl font-black text-[#1E3A8A]">Quick POS</Text>
          <Text className="text-xs text-slate-400 font-semibold mt-0.5">Counter billing & instant barcode checkout</Text>
        </View>

        <View className="flex-row items-center gap-2">
          {/* Barcode Scanner Button */}
          <TouchableOpacity
            onPress={handleOpenScanner}
            className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 justify-center items-center shadow-sm"
          >
            <Ionicons name="barcode-outline" size={24} color="#1E3A8A" />
          </TouchableOpacity>

          {/* Cart Trigger Button */}
          <TouchableOpacity
            onPress={() => setShowCartModal(true)}
            className="h-11 px-3.5 rounded-2xl bg-[#1E3A8A] flex-row items-center shadow-md shadow-[#1E3A8A]/30"
          >
            <Ionicons name="cart" size={20} color="#FFFFFF" />
            {cartItemCount > 0 && (
              <View className="ml-1.5 bg-[#F59E0B] rounded-full px-2 py-0.5">
                <Text className="text-[11px] font-black text-white">{cartItemCount}</Text>
              </View>
            )}
            <Text className="ml-2 font-bold text-white text-xs">₹{cartTotal}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-5 py-2">
        <View className="bg-white rounded-2xl px-3.5 py-2.5 flex-row items-center border border-slate-200 shadow-sm">
          <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            className="flex-1 text-sm font-semibold text-slate-900"
            placeholder="Search items by name or scan barcode..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View className="px-5 py-1">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-1">
          {categories.map((cat, idx) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl mr-2 border ${
                  isSelected ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'bg-white border-slate-200'
                }`}
              >
                <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item._id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 6 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View className="items-center justify-center pt-20">
            <Ionicons name="cube-outline" size={56} color="#CBD5E1" />
            <Text className="text-slate-700 font-bold text-base mt-2">No Products Matching</Text>
            <Text className="text-slate-400 text-xs mt-1">Try another keyword or scan barcode</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const inCartItem = cart.find(c => c.productId === item._id);
          const isLow = item.stockQty <= (item.reorderLevel || 5);

          return (
            <View className="bg-white rounded-2xl p-3 mb-3 border border-slate-200 shadow-sm" style={{ width: '48.5%' }}>
              <Image
                source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80' }}
                className="w-full h-24 rounded-xl bg-slate-100 mb-2"
                resizeMode="cover"
              />
              <Text className="text-xs font-bold text-slate-900 leading-snug" numberOfLines={2}>{item.name}</Text>
              <Text className="text-[10px] text-slate-400 font-medium mt-0.5">{item.unit || 'pcs'} · Stock: {item.stockQty}</Text>

              <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-slate-100">
                <View>
                  <Text className="text-sm font-black text-[#1E3A8A]">₹{item.sellingPrice}</Text>
                  {item.mrp > item.sellingPrice && (
                    <Text className="text-[10px] text-slate-400 line-through">₹{item.mrp}</Text>
                  )}
                </View>

                {inCartItem ? (
                  <View className="flex-row items-center bg-blue-50 rounded-xl border border-blue-200 px-1 py-0.5">
                    <TouchableOpacity onPress={() => decrementCartItem(item._id)} className="w-6 h-6 justify-center items-center">
                      <Ionicons name="remove" size={14} color="#1E3A8A" />
                    </TouchableOpacity>
                    <Text className="px-1.5 text-xs font-black text-[#1E3A8A]">{inCartItem.quantity}</Text>
                    <TouchableOpacity onPress={() => addToCart(item)} className="w-6 h-6 justify-center items-center">
                      <Ionicons name="add" size={14} color="#1E3A8A" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => addToCart(item)}
                    className="bg-[#1E3A8A] rounded-xl px-2.5 py-1.5 flex-row items-center shadow-sm"
                  >
                    <Ionicons name="add" size={14} color="#FFFFFF" style={{ marginRight: 2 }} />
                    <Text className="text-white text-[11px] font-bold">Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && (
        <View className="absolute bottom-5 left-5 right-5 bg-[#1E3A8A] rounded-2xl p-3.5 flex-row justify-between items-center shadow-xl shadow-[#1E3A8A]/40">
          <View>
            <Text className="text-[10px] text-blue-200 font-bold uppercase">{cartItemCount} ITEMS IN BILL</Text>
            <Text className="text-xl font-black text-white">₹{cartTotal}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCartModal(true)}
            className="bg-[#F59E0B] rounded-xl px-4 py-2.5 flex-row items-center shadow-sm"
          >
            <Text className="text-slate-900 font-black text-xs mr-1.5">CHECKOUT & BILL</Text>
            <Ionicons name="arrow-forward" size={15} color="#0F172A" />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Cart & Checkout Slide-up Modal ─────────────────── */}
      <Modal visible={showCartModal} animationType="slide" transparent>
        <View className="flex-1 bg-slate-900/60 justify-end">
          <View className="bg-white rounded-t-3xl p-5 max-h-[88%]">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-3" />

            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-3 pb-2 border-b border-slate-100">
              <View>
                <Text className="text-xl font-black text-slate-900">Current Counter Bill</Text>
                <Text className="text-xs text-slate-400 font-medium">{cartItemCount} items ready to charge</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCartModal(false)} className="p-1">
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Customer Selection Banner */}
              <TouchableOpacity
                onPress={() => setShowCustomerModal(true)}
                className="bg-blue-50/70 rounded-2xl p-3 mb-4 flex-row justify-between items-center border border-blue-100"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center mr-2.5">
                    <Ionicons name="person" size={18} color="#1E3A8A" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-black text-[#1E3A8A]">
                      {selectedCustomer ? selectedCustomer.name : 'Walk-in Cash Customer'}
                    </Text>
                    <Text className="text-[10px] text-slate-500 font-semibold">
                      {selectedCustomer
                        ? `Balance Udhar: ₹${selectedCustomer.creditBalance || 0} · +91-${selectedCustomer.phone}`
                        : 'Tap to assign customer for Udhar ledger'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#1E3A8A" />
              </TouchableOpacity>

              {/* Cart Items List */}
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Itemized Bill</Text>
              {cart.map((item, idx) => (
                <View key={idx} className="flex-row justify-between items-center py-2.5 border-b border-slate-100">
                  <View className="flex-1 mr-2">
                    <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-[10px] text-slate-400 font-medium">₹{item.price} each</Text>
                  </View>

                  <View className="flex-row items-center bg-slate-100 rounded-xl px-2 py-1 mr-3">
                    <TouchableOpacity onPress={() => decrementCartItem(item.productId)}>
                      <Ionicons name="remove" size={14} color="#1E293B" />
                    </TouchableOpacity>
                    <Text className="px-2 font-black text-xs text-slate-900">{item.quantity}</Text>
                    <TouchableOpacity onPress={() => addToCart({ _id: item.productId, sellingPrice: item.price, name: item.name, unit: item.unit })}>
                      <Ionicons name="add" size={14} color="#1E293B" />
                    </TouchableOpacity>
                  </View>

                  <Text className="text-xs font-black text-slate-900 w-16 text-right">₹{item.total}</Text>
                </View>
              ))}

              {/* Payment Mode Selector */}
              <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 mb-2">Payment Method</Text>
              <View className="flex-row justify-between mb-4">
                {[
                  { id: 'CASH', label: 'Cash', icon: 'cash-outline', color: '#16A34A' },
                  { id: 'UPI', label: 'UPI / QR', icon: 'qr-code-outline', color: '#2563EB' },
                  { id: 'UDHAR', label: 'Udhar Khata', icon: 'book-outline', color: '#D97706' }
                ].map((mode) => {
                  const isSelected = paymentMode === mode.id;
                  return (
                    <TouchableOpacity
                      key={mode.id}
                      onPress={() => {
                        setPaymentMode(mode.id);
                        if (mode.id === 'UDHAR' && !selectedCustomer) {
                          setShowCustomerModal(true);
                        }
                      }}
                      className={`flex-1 p-2.5 mx-1 rounded-2xl items-center border ${
                        isSelected ? 'bg-blue-50 border-[#1E3A8A]' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Ionicons name={mode.icon} size={20} color={isSelected ? '#1E3A8A' : '#64748B'} />
                      <Text className={`text-[11px] font-black mt-1 ${isSelected ? 'text-[#1E3A8A]' : 'text-slate-600'}`}>
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Discount Input */}
              <View className="flex-row justify-between items-center bg-slate-50 rounded-2xl p-3 mb-4 border border-slate-200">
                <Text className="text-xs font-bold text-slate-700">Special Discount (₹)</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-right w-24 text-slate-900"
                  keyboardType="numeric"
                  value={discountAmount}
                  onChangeText={setDiscountAmount}
                  placeholder="0"
                />
              </View>

              {/* Summary Calculations */}
              <View className="bg-slate-50 rounded-2xl p-3.5 mb-5 border border-slate-100">
                <View className="flex-row justify-between mb-1.5">
                  <Text className="text-xs text-slate-500 font-medium">Subtotal</Text>
                  <Text className="text-xs font-bold text-slate-800">₹{cartSubtotal}</Text>
                </View>
                {parsedDiscount > 0 && (
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-xs text-emerald-600 font-medium">Discount</Text>
                    <Text className="text-xs font-bold text-emerald-600">-₹{parsedDiscount}</Text>
                  </View>
                )}
                <View className="flex-row justify-between pt-2 border-t border-slate-200">
                  <Text className="text-sm font-black text-slate-900">Total Payable</Text>
                  <Text className="text-lg font-black text-[#1E3A8A]">₹{cartTotal}</Text>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleCheckout}
                disabled={isSubmitting}
                className="bg-[#1E3A8A] rounded-2xl py-4 items-center mb-3 shadow-lg shadow-[#1E3A8A]/30"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-black text-base">
                    CONFIRM & COMPLETE SALE (₹{cartTotal})
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Customer Selection Modal ──────────────────────── */}
      <Modal visible={showCustomerModal} animationType="fade" transparent>
        <View className="flex-1 bg-slate-900/60 justify-center p-5">
          <View className="bg-white rounded-3xl p-5 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-black text-slate-900">Select Account Holder</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-semibold mb-3"
              placeholder="Search by customer name or phone..."
              value={customerSearch}
              onChangeText={setCustomerSearch}
            />

            <TouchableOpacity
              onPress={() => {
                setSelectedCustomer(null);
                setShowCustomerModal(false);
              }}
              className="p-3 bg-slate-100 rounded-2xl mb-2 flex-row items-center"
            >
              <Ionicons name="person-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
              <Text className="text-xs font-bold text-slate-800">Walk-in Customer (No Udhar)</Text>
            </TouchableOpacity>

            <ScrollView className="max-h-80">
              {customers
                .filter(c =>
                  c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                  c.phone.includes(customerSearch)
                )
                .map((cust, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setSelectedCustomer(cust);
                      setShowCustomerModal(false);
                    }}
                    className="p-3 border-b border-slate-100 flex-row justify-between items-center"
                  >
                    <View>
                      <Text className="text-xs font-bold text-slate-900">{cust.name} {cust.fatherName ? `(S/O ${cust.fatherName})` : ''}</Text>
                      <Text className="text-[10px] text-slate-400">+91-{cust.phone}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[10px] text-slate-400">Udhar Debt</Text>
                      <Text className={`text-xs font-black ${cust.creditBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        ₹{cust.creditBalance || 0}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── Barcode Camera Scanner Modal ──────────────────── */}
      <Modal visible={scannerVisible} animationType="slide">
        <SafeAreaView className="flex-1 bg-black">
          <View className="px-5 py-3 flex-row justify-between items-center">
            <Text className="text-white font-black text-lg">Barcode Scanner</Text>
            <TouchableOpacity
              onPress={() => setScannerVisible(false)}
              className="w-9 h-9 rounded-full bg-white/20 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 justify-center items-center overflow-hidden">
            <CameraView
              style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.7 }}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr']
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            {/* Target Reticle Overlay */}
            <View className="absolute border-2 border-green-400 rounded-3xl w-72 h-44 bg-transparent justify-center items-center">
              <View className="w-full h-0.5 bg-green-400/80" />
            </View>
          </View>

          <View className="p-5 items-center">
            <Text className="text-white text-xs font-semibold text-center mb-3">
              Point camera at product barcode. Scanned item will be added to bill automatically.
            </Text>
            <TouchableOpacity
              onPress={() => { setScannerVisible(false); setShowCartModal(true); }}
              className="bg-[#1E3A8A] rounded-2xl px-6 py-3"
            >
              <Text className="text-white font-bold text-xs">View Bill ({cartItemCount} items)</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ─── Digital Thermal Receipt & WhatsApp Modal ──────── */}
      <Modal visible={showReceiptModal} animationType="slide" transparent>
        <View className="flex-1 bg-slate-900/60 justify-center p-5">
          <View className="bg-white rounded-3xl p-6 shadow-2xl">
            <View className="w-12 h-12 bg-emerald-100 rounded-full items-center justify-center self-center mb-3">
              <Ionicons name="checkmark-circle" size={32} color="#059669" />
            </View>

            <Text className="text-xl font-black text-center text-slate-900">Sale Recorded Successfully!</Text>
            {completedSale && (
              <Text className="text-xs text-slate-400 text-center font-semibold mt-0.5">
                Invoice #{completedSale.invoiceNo} · ₹{completedSale.totalAmount}
              </Text>
            )}

            {/* Thermal Receipt Summary Card */}
            <View className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4 my-4">
              <Text className="text-center font-black text-xs text-slate-900 uppercase">MANDHAUR SUPERMART CONVENIENCE</Text>
              <Text className="text-center text-[10px] text-slate-400 mb-2">Market Plaza, Sec-12</Text>

              <View className="border-t border-b border-slate-200 py-2 my-1">
                {completedSale?.items?.map((item, idx) => (
                  <View key={idx} className="flex-row justify-between py-0.5">
                    <Text className="text-xs text-slate-700 flex-1" numberOfLines={1}>{item.name} ×{item.quantity}</Text>
                    <Text className="text-xs font-bold text-slate-900">₹{item.total || (item.price * item.quantity)}</Text>
                  </View>
                ))}
              </View>

              <View className="flex-row justify-between pt-1">
                <Text className="text-xs font-bold text-slate-500">Payment: {completedSale?.paymentMode}</Text>
                <Text className="text-sm font-black text-[#1E3A8A]">Total: ₹{completedSale?.totalAmount}</Text>
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              onPress={() => shareReceiptWhatsApp(completedSale)}
              className="bg-[#16A34A] rounded-2xl py-3.5 flex-row justify-center items-center mb-2.5 shadow-md shadow-green-600/30"
            >
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text className="text-white font-black text-sm">SHARE RECEIPT ON WHATSAPP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowReceiptModal(false);
                setCompletedSale(null);
              }}
              className="bg-slate-100 rounded-2xl py-3 items-center"
            >
              <Text className="text-slate-700 font-bold text-xs">Start Next Bill</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
