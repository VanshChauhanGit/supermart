import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../../context/AppContext';
import AllInOneSDKManager from 'paytm_allinone_react-native';

export default function CustomerCartScreen() {
  const insets = useSafeAreaInsets();
  const { cart, updateCartQty, clearCart, customerUser, apiBaseUrl } = useApp();

  const [address, setAddress] = useState(customerUser?.address || 'House No 42, Green Park Main');
  const [pincode, setPincode] = useState(customerUser?.pincode || '110016');
  const [landmark, setLandmark] = useState('');
  const [addressType, setAddressType] = useState('Home'); // 'Home' | 'Work' | 'Other'
  const [coords, setCoords] = useState(null); // { latitude: Number, longitude: Number }
  const [isLocating, setIsLocating] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedSavedId, setSelectedSavedId] = useState(null);
  const [saveThisAddress, setSaveThisAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [submitting, setSubmitting] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [availableOffers, setAvailableOffers] = useState([]);

  // Safe Haptic feedback helper
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_e) {}
  };

  // Fetch active store offers for quick-apply chips
  useEffect(() => {
    let active = true;
    fetch(`${apiBaseUrl}/offers`)
      .then(r => r.json())
      .then(res => {
        if (active && res?.success && Array.isArray(res.data)) {
          setAvailableOffers(res.data.filter(o => o.isActive));
        }
      })
      .catch(() => {});

    return () => { active = false; };
  }, [apiBaseUrl]);

  // Load saved customer addresses from storage and backend
  useEffect(() => {
    const loadSavedAddresses = async () => {
      try {
        const local = await AsyncStorage.getItem('supermart_saved_addresses');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedAddresses(parsed);
          }
        }
        if (customerUser?.phone) {
          const cleanPhone = customerUser.phone.replace(/\D/g, '');
          const res = await fetch(`${apiBaseUrl}/customers/${cleanPhone}/addresses`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setSavedAddresses(data.data);
            await AsyncStorage.setItem('supermart_saved_addresses', JSON.stringify(data.data));
          }
        }
      } catch (_e) {}
    };
    loadSavedAddresses();
  }, [customerUser, apiBaseUrl]);

  // GPS Auto-Location Detection with Reverse Geocoding
  const handleDetectLocation = async () => {
    try {
      setIsLocating(true);
      triggerHaptic();

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Needed',
          'Please allow Supermart to access your device location to pin your doorstep for 10-minute delivery.'
        );
        setIsLocating(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      setCoords({ latitude, longitude });

      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo) {
        const street = geo.streetNumber ? `${geo.streetNumber}, ${geo.street || ''}` : geo.street || '';
        const namePart = geo.name && geo.name !== geo.street ? `${geo.name}, ` : '';
        const subregion = geo.subregion || geo.district || '';
        const city = geo.city || '';
        const postCode = geo.postalCode || '';

        const autoAddress = `${namePart}${street ? street + ', ' : ''}${subregion ? subregion + ', ' : ''}${city}`.replace(/,\s*,/g, ',').trim();
        if (autoAddress) setAddress(autoAddress);
        if (postCode) setPincode(postCode);
      }

      setSelectedSavedId(null);
      Alert.alert('📍 GPS Pinned!', 'Your live coordinates have been locked for accurate delivery partner navigation.');
    } catch (e) {
      Alert.alert('Location Error', 'Unable to fetch current GPS coordinates. Please ensure GPS is enabled on your device.');
    } finally {
      setIsLocating(false);
    }
  };

  // 1-Tap Saved Address Selector
  const handleSelectSavedAddress = (saved) => {
    triggerHaptic();
    setSelectedSavedId(saved.id);
    if (saved.address) setAddress(saved.address);
    if (saved.pincode) setPincode(saved.pincode);
    if (saved.landmark) setLandmark(saved.landmark);
    if (saved.type) setAddressType(saved.type);
    if (saved.latitude && saved.longitude) {
      setCoords({ latitude: saved.latitude, longitude: saved.longitude });
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, i) => acc + (i.sellingPrice * i.quantity), 0);
  const totalMrp = cart.reduce((acc, i) => acc + ((i.mrp || i.sellingPrice) * i.quantity), 0);
  const mrpSavings = Math.max(0, totalMrp - subtotal);
  const cartTotalCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const FREE_DELIVERY_THRESHOLD = 300;
  const isFreeDeliveryQualified = subtotal >= FREE_DELIVERY_THRESHOLD;
  const baseDeliveryFee = isFreeDeliveryQualified ? 0 : 30;

  const currentDeliveryFee = appliedPromo && appliedPromo.deliveryFee !== undefined
    ? appliedPromo.deliveryFee
    : baseDeliveryFee;

  const grandTotal = Math.max(0, subtotal + currentDeliveryFee - discountAmount);
  const totalSavings = mrpSavings + discountAmount + (isFreeDeliveryQualified ? 30 : 0);

  const handleApplyPromo = async (codeToApply) => {
    const targetCode = (typeof codeToApply === 'string' ? codeToApply : promoCode).trim();
    if (!targetCode) {
      Alert.alert('Coupon Code Required', 'Please enter or select a promo code to apply.');
      return;
    }

    setValidatingPromo(true);
    triggerHaptic();

    try {
      const res = await fetch(`${apiBaseUrl}/offers/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: targetCode, subtotal })
      });
      const data = await res.json();
      if (data.success) {
        setAppliedPromo(data.data);
        setDiscountAmount(data.data.discount || 0);
        setPromoCode(targetCode.toUpperCase());
        Alert.alert('Promo Applied! 🎉', data.data.message || `You saved ₹${data.data.discount}!`);
      } else {
        setAppliedPromo(null);
        setDiscountAmount(0);
        Alert.alert('Promo Unsuccessful', data.message || 'This coupon code could not be applied.');
      }
    } catch (_e) {
      Alert.alert('Network Error', 'Failed to connect to offers server.');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    triggerHaptic();
    setPromoCode('');
    setAppliedPromo(null);
    setDiscountAmount(0);
  };

  const handleClearCart = () => {
    triggerHaptic();
    Alert.alert(
      'Clear Your Cart',
      'Are you sure you want to remove all items from your shopping basket?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearCart();
            handleRemovePromo();
          }
        }
      ]
    );
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Basket', 'Please add products to your cart before proceeding.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Delivery Address Required', 'Please provide your full delivery address.');
      return;
    }

    triggerHaptic();
    setSubmitting(true);

    try {
      const payload = {
        customerName: customerUser ? customerUser.name : 'Walk-in Customer',
        phone: customerUser ? customerUser.phone : '9876543210',
        deliveryAddress: `${addressType ? `[${addressType}] ` : ''}${address}`,
        pincode,
        location: {
          latitude: coords?.latitude || null,
          longitude: coords?.longitude || null,
          formattedAddress: address,
          landmark: landmark || ''
        },
        items: cart.map(i => ({
          productId: i._id,
          name: i.name,
          price: i.sellingPrice,
          quantity: i.quantity,
          unit: i.unit,
          total: i.sellingPrice * i.quantity
        })),
        subtotal,
        deliveryFee: currentDeliveryFee,
        discountCode: appliedPromo ? appliedPromo.code : null,
        discountAmount,
        totalAmount: grandTotal,
        paymentMethod
      };

      // Optionally save address for future 1-tap checkout
      if (saveThisAddress && address.trim()) {
        const newAddr = {
          id: selectedSavedId || ('addr_' + Date.now()),
          type: addressType,
          tag: addressType,
          address,
          landmark,
          pincode,
          latitude: coords?.latitude || null,
          longitude: coords?.longitude || null,
          isDefault: false
        };
        const updated = [newAddr, ...savedAddresses.filter(a => a.id !== newAddr.id)];
        setSavedAddresses(updated);
        AsyncStorage.setItem('supermart_saved_addresses', JSON.stringify(updated)).catch(() => {});
        if (customerUser?.phone) {
          const cleanPhone = customerUser.phone.replace(/\D/g, '');
          fetch(`${apiBaseUrl}/customers/${cleanPhone}/addresses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAddr)
          }).catch(() => {});
        }
      }

      const res = await fetch(`${apiBaseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        if (paymentMethod === 'PAYTM') {
          try {
            const tokenRes = await fetch(`${apiBaseUrl}/paytm/generate-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: data.data.orderNo, amount: grandTotal })
            });
            const tokenData = await tokenRes.json();

            if (tokenData.success) {
              const mid = "YOUR_PRODUCTION_MID_HERE";
              const callbackUrl = `https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=${data.data.orderNo}`;

              if (!AllInOneSDKManager) {
                Alert.alert(
                  'Expo Go Notice',
                  'Paytm SDK requires native build. Order created with Cash/UPI on Delivery status.'
                );
                clearCart();
                router.replace('/customer/orders');
                return;
              }

              AllInOneSDKManager.startTransaction(
                data.data.orderNo,
                mid,
                tokenData.txnToken,
                grandTotal.toString(),
                callbackUrl,
                true,
                false
              ).then(() => {
                clearCart();
                Alert.alert('Payment Successful! 🚀', `Your order #${data.data.orderNo} is confirmed for 10-minute express delivery!`);
                router.replace('/customer/orders');
              }).catch((err) => {
                Alert.alert('Payment Incomplete', err.message || "Transaction incomplete. Order logged as Pending.");
                clearCart();
                router.replace('/customer/orders');
              });
            } else {
              Alert.alert('Payment Initialization Failed', tokenData.message || 'Could not start payment gateway');
            }
          } catch (e) {
            Alert.alert('Payment Gateway Error', 'Could not connect: ' + e.message);
          }
        } else {
          clearCart();
          Alert.alert(
            'Order Placed! 🚀',
            `Order #${data.data.orderNo} confirmed! Your fresh groceries will arrive in 10-15 minutes.`
          );
          router.replace('/customer/orders');
        }
      } else {
        Alert.alert('Order Failed', data.message || 'Error creating order');
      }
    } catch (e) {
      Alert.alert('Connection Error', 'Failed to place order: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

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
                  My Cart
                </Text>
                <View className="bg-[#FEF08A] px-2 py-0.5 rounded-md flex-row items-center">
                  <Ionicons name="flash" size={10} color="#854D0E" />
                  <Text className="text-[10px] font-black text-[#854D0E] ml-0.5">10 MINS</Text>
                </View>
              </View>
              <Text className="text-[11px] font-semibold text-slate-500">
                {cartTotalCount > 0
                  ? `${cartTotalCount} ${cartTotalCount === 1 ? 'item' : 'items'} in basket`
                  : 'Your basket is empty'}
              </Text>
            </View>
          </View>

          {/* Right Action: Clear Basket */}
          {cart.length > 0 && (
            <TouchableOpacity
              onPress={handleClearCart}
              activeOpacity={0.7}
              className="flex-row items-center bg-rose-50 border border-rose-200/70 px-2.5 py-1.5 rounded-full"
            >
              <Ionicons name="trash-outline" size={13} color="#E11D48" style={{ marginRight: 3 }} />
              <Text className="text-[11px] font-bold text-rose-600">Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Express Delivery Progress Strip ── */}
        {cart.length > 0 && (
          <View className="px-4 pb-2.5 pt-1">
            {isFreeDeliveryQualified ? (
              <View className="flex-row items-center bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl">
                <Ionicons name="checkmark-circle" size={15} color="#059669" style={{ marginRight: 6 }} />
                <Text className="text-[11px] font-black text-emerald-800 flex-1">
                  Yay! Free Express Delivery unlocked on this order 🎉
                </Text>
              </View>
            ) : (
              <View className="bg-amber-50 border border-amber-200/80 p-2.5 rounded-xl">
                <View className="flex-row items-center justify-between mb-1.5">
                  <View className="flex-row items-center">
                    <Ionicons name="bicycle" size={14} color="#D97706" style={{ marginRight: 5 }} />
                    <Text className="text-[11px] font-bold text-slate-800">
                      Add <Text className="font-black text-[#D97706]">₹{FREE_DELIVERY_THRESHOLD - subtotal}</Text> more for <Text className="font-black text-emerald-700">FREE Delivery</Text>
                    </Text>
                  </View>
                  <Text className="text-[10px] font-black text-slate-500">
                    {Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%
                  </Text>
                </View>

                {/* Progress Bar */}
                <View className="h-1.5 w-full bg-amber-200/70 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-[#F7C400] rounded-full"
                    style={{ width: `${Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100))}%` }}
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ══════════════════════════════════════════════════════
          2. SCROLLABLE CART CONTENT
          ══════════════════════════════════════════════════════ */}
      {cart.length === 0 ? (
        /* ── Empty Cart State Matching Home Screen Theme ── */
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-24 h-24 rounded-full bg-[#FEF3C7] border-2 border-[#FDE68A] items-center justify-center mb-5 shadow-sm">
            <Ionicons name="basket-outline" size={48} color="#D97706" />
          </View>
          <Text className="text-xl font-black text-slate-900 text-center tracking-tight">
            Your Cart is Empty
          </Text>
          <Text className="text-xs font-medium text-slate-500 text-center mt-1.5 mb-6 max-w-[280px] leading-relaxed">
            Fill your basket with fresh fruits, dairy, snacks, cold beverages, and daily essentials delivered in 10 minutes.
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
            paddingBottom: Math.max(insets.bottom, 8) + 160
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Section A: Items in Cart Card ── */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-slate-200/90 shadow-xs">
            <View className="flex-row items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <View className="flex-row items-center">
                <View className="w-7 h-7 rounded-lg bg-[#FEF3C7] items-center justify-center mr-2">
                  <Ionicons name="bag-handle" size={15} color="#D97706" />
                </View>
                <Text className="text-sm font-black text-slate-900 tracking-tight">
                  Basket Items ({cart.length})
                </Text>
              </View>
              <Text className="text-[11px] font-bold text-emerald-700">
                ⚡ 10-Min Express
              </Text>
            </View>

            {cart.map((item, index) => {
              const itemDiscount = item.mrp && item.mrp > item.sellingPrice
                ? Math.round(((item.mrp - item.sellingPrice) / item.mrp) * 100)
                : 0;

              return (
                <View
                  key={item._id}
                  className={`flex-row items-center py-3 ${index !== cart.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  {/* Thumbnail Image */}
                  <View className="w-[60px] h-[60px] rounded-2xl bg-slate-100 border border-slate-200/70 overflow-hidden mr-3">
                    <Image
                      source={{
                        uri: item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'
                      }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>

                  {/* Title & Unit Details */}
                  <View className="flex-1 mr-2">
                    <Text numberOfLines={2} className="text-xs font-black text-slate-900 leading-snug">
                      {item.name}
                    </Text>

                    <View className="flex-row items-center mt-0.5">
                      <View className="bg-slate-100 px-1.5 py-0.5 rounded-md mr-1.5">
                        <Text className="text-[9px] font-bold text-slate-600">
                          {item.unit || '1 pc'}
                        </Text>
                      </View>

                      {itemDiscount > 0 && (
                        <Text className="text-[10px] font-black text-emerald-600">
                          {itemDiscount}% OFF
                        </Text>
                      )}
                    </View>

                    {/* Price Row */}
                    <View className="flex-row items-baseline mt-1">
                      <Text className="text-xs font-black text-slate-900">
                        ₹{item.sellingPrice}
                      </Text>
                      {item.mrp > item.sellingPrice && (
                        <Text className="text-[10px] font-semibold text-slate-400 line-through ml-1.5">
                          ₹{item.mrp}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Stepper & Line Total Column */}
                  <View className="items-end">
                    {/* Stepper with Home Screen Theme */}
                    <View className="flex-row items-center bg-[#F7C400] rounded-xl px-1.5 py-1 border border-[#FACC15] shadow-xs">
                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic();
                          updateCartQty(item._id, -1);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        className="px-1.5"
                      >
                        {item.quantity === 1 ? (
                          <Ionicons name="trash-outline" size={13} color="#0F172A" />
                        ) : (
                          <Text className="text-slate-900 font-black text-xs leading-none">-</Text>
                        )}
                      </TouchableOpacity>

                      <Text className="text-slate-900 font-black text-xs px-2">
                        {item.quantity}
                      </Text>

                      <TouchableOpacity
                        onPress={() => {
                          triggerHaptic();
                          updateCartQty(item._id, 1);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        className="px-1.5"
                      >
                        <Text className="text-slate-900 font-black text-xs leading-none">+</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Total for item */}
                    <Text className="text-xs font-black text-slate-900 mt-1.5">
                      ₹{item.sellingPrice * item.quantity}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Quick Link: Add More Items */}
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                router.push('/customer');
              }}
              activeOpacity={0.7}
              className="mt-2.5 pt-3 border-t border-dashed border-slate-200 flex-row items-center justify-center"
            >
              <Ionicons name="add-circle-outline" size={16} color="#D97706" style={{ marginRight: 5 }} />
              <Text className="text-xs font-black text-[#D97706]">
                Add more items from catalog
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Section B: Delivery Address & Live GPS Location Manager ── */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-slate-200/90 shadow-xs">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-7 h-7 rounded-lg bg-[#FEF3C7] items-center justify-center mr-2">
                  <Ionicons name="location-sharp" size={15} color="#D97706" />
                </View>
                <Text className="text-sm font-black text-slate-900 tracking-tight">
                  Delivery Location
                </Text>
              </View>

              {/* Tag Selection: Home / Work / Other */}
              <View className="flex-row bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {['Home', 'Work', 'Other'].map(type => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => {
                      triggerHaptic();
                      setAddressType(type);
                    }}
                    className={`px-2 py-0.5 rounded-md ${addressType === type ? 'bg-white shadow-xs' : ''}`}
                  >
                    <Text className={`text-[10px] ${addressType === type ? 'font-black text-slate-900' : 'font-semibold text-slate-500'}`}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── 1. GPS Auto-Detect Button ── */}
            <TouchableOpacity
              onPress={handleDetectLocation}
              disabled={isLocating}
              activeOpacity={0.8}
              className={`mb-3 py-2.5 px-3 rounded-2xl border flex-row items-center justify-between ${
                coords?.latitude
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-amber-50 border-amber-300'
              }`}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className={`w-7 h-7 rounded-full items-center justify-center mr-2.5 ${
                  coords?.latitude ? 'bg-emerald-500' : 'bg-[#F7C400]'
                }`}>
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#0F172A" />
                  ) : (
                    <Ionicons
                      name={coords?.latitude ? 'checkmark-circle' : 'navigate'}
                      size={15}
                      color={coords?.latitude ? '#FFFFFF' : '#0F172A'}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-black text-slate-900">
                    {isLocating
                      ? 'Acquiring GPS Satellite Lock...'
                      : coords?.latitude
                      ? 'GPS Location Pinned ✓'
                      : 'Auto-Detect Current GPS Location'}
                  </Text>
                  <Text className="text-[10px] font-semibold text-slate-500 mt-0.5" numberOfLines={1}>
                    {coords?.latitude
                      ? `Lat: ${coords.latitude.toFixed(4)}, Lng: ${coords.longitude.toFixed(4)}`
                      : 'Reverse-geocodes your doorstep for rider navigation'}
                  </Text>
                </View>
              </View>

              <View className="bg-white/80 px-2 py-1 rounded-lg border border-slate-200">
                <Text className="text-[10px] font-bold text-slate-700">
                  {coords?.latitude ? 'Re-pin 📍' : 'Locate ⚡'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* ── 2. Saved Addresses Carousel (If available) ── */}
            {savedAddresses.length > 0 && (
              <View className="mb-3">
                <Text className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Saved Addresses (1-Tap Select)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  {savedAddresses.map((item) => {
                    const isSelected = selectedSavedId === item.id || address === item.address;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleSelectSavedAddress(item)}
                        activeOpacity={0.75}
                        className={`mr-2.5 p-2.5 rounded-2xl border min-w-[130px] max-w-[170px] ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 shadow-sm'
                            : 'bg-[#F8FAFC] border-slate-200'
                        }`}
                      >
                        <View className="flex-row items-center mb-1">
                          <Ionicons
                            name={item.type === 'Work' ? 'briefcase' : item.type === 'Other' ? 'location' : 'home'}
                            size={12}
                            color={isSelected ? '#F7C400' : '#475569'}
                            style={{ marginRight: 4 }}
                          />
                          <Text className={`text-[10px] font-black uppercase ${
                            isSelected ? 'text-[#F7C400]' : 'text-slate-700'
                          }`}>
                            {item.tag || item.type || 'Home'}
                          </Text>
                        </View>
                        <Text numberOfLines={1} className={`text-[11px] font-semibold ${
                          isSelected ? 'text-white' : 'text-slate-800'
                        }`}>
                          {item.address}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* ── 3. House & Street Input ── */}
            <View className="mb-2.5">
              <Text className="text-[11px] font-bold text-slate-600 mb-1">
                House & Street Details
              </Text>
              <View className="flex-row items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3 py-2.5">
                <Ionicons name="home-outline" size={15} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  className="flex-1 text-xs font-semibold text-slate-900 py-0"
                  value={address}
                  onChangeText={(val) => {
                    setAddress(val);
                    setSelectedSavedId(null);
                  }}
                  placeholder="House No, Apartment, Street Name"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* ── 4. Landmark Input (Crucial for delivery boy navigation) ── */}
            <View className="mb-2.5">
              <Text className="text-[11px] font-bold text-slate-600 mb-1">
                Landmark / Floor / Gate No. (Optional)
              </Text>
              <View className="flex-row items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3 py-2.5">
                <Ionicons name="flag-outline" size={15} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  className="flex-1 text-xs font-semibold text-slate-900 py-0"
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholder="e.g. Near Apollo Pharmacy, 3rd Floor"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* ── 5. Pincode & Recipient Info ── */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-1 mr-2">
                <Text className="text-[11px] font-bold text-slate-600 mb-1">
                  Pincode
                </Text>
                <View className="flex-row items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3 py-2.5">
                  <Ionicons name="navigate-outline" size={15} color="#64748B" style={{ marginRight: 6 }} />
                  <TextInput
                    className="flex-1 text-xs font-black text-slate-900 py-0"
                    value={pincode}
                    onChangeText={setPincode}
                    placeholder="Pincode"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View className="flex-1 ml-2">
                <Text className="text-[11px] font-bold text-slate-600 mb-1">
                  Recipient
                </Text>
                <View className="bg-slate-100 border border-slate-200 rounded-2xl px-3 py-2.5 justify-center">
                  <Text numberOfLines={1} className="text-xs font-black text-slate-800">
                    {customerUser?.name || 'Walk-in Customer'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── 6. Save Address Toggle ── */}
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                setSaveThisAddress(!saveThisAddress);
              }}
              activeOpacity={0.7}
              className="flex-row items-center pt-2"
            >
              <Ionicons
                name={saveThisAddress ? 'checkbox' : 'square-outline'}
                size={16}
                color={saveThisAddress ? '#1E3A8A' : '#94A3B8'}
                style={{ marginRight: 6 }}
              />
              <Text className="text-xs font-semibold text-slate-700">
                Save this address for fast 1-tap checkout next time
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Section C: Coupons & Promo Offers ── */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-slate-200/90 shadow-xs">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-7 h-7 rounded-lg bg-[#FEF3C7] items-center justify-center mr-2">
                  <Ionicons name="ticket" size={15} color="#D97706" />
                </View>
                <Text className="text-sm font-black text-slate-900 tracking-tight">
                  Coupons & Offers
                </Text>
              </View>

              {appliedPromo && (
                <View className="bg-emerald-100 px-2 py-0.5 rounded-full flex-row items-center">
                  <Ionicons name="checkmark-circle" size={11} color="#059669" />
                  <Text className="text-[10px] font-black text-emerald-800 ml-1">APPLIED</Text>
                </View>
              )}
            </View>

            {/* Input & Apply Button Row */}
            <View className="flex-row items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl p-1.5 pl-3">
              <Ionicons name="pricetag-outline" size={16} color="#64748B" style={{ marginRight: 8 }} />
              <TextInput
                className="flex-1 text-xs font-black text-slate-900 py-1"
                value={promoCode}
                onChangeText={(val) => {
                  setPromoCode(val);
                  if (appliedPromo) {
                    setAppliedPromo(null);
                    setDiscountAmount(0);
                  }
                }}
                placeholder="Enter Promo Code (e.g. SUPER50)"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                editable={!appliedPromo && !validatingPromo}
              />

              {appliedPromo ? (
                <TouchableOpacity
                  onPress={handleRemovePromo}
                  className="bg-rose-100 px-3 py-2 rounded-xl border border-rose-200 active:bg-rose-200"
                >
                  <Text className="text-xs font-bold text-rose-700">Remove</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => handleApplyPromo(promoCode)}
                  disabled={validatingPromo || !promoCode.trim()}
                  className={`px-4 py-2 rounded-xl ${
                    promoCode.trim() ? 'bg-slate-900 active:bg-slate-800' : 'bg-slate-200'
                  }`}
                >
                  {validatingPromo ? (
                    <ActivityIndicator size="small" color="#F7C400" />
                  ) : (
                    <Text className={`text-xs font-black ${promoCode.trim() ? 'text-[#F7C400]' : 'text-slate-400'}`}>
                      Apply
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Select Offer Chips */}
            {!appliedPromo && (
              <View className="mt-3">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Suggested Coupons:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(availableOffers.length > 0
                    ? availableOffers
                    : [
                        { _id: '1', code: 'SUPER50', description: 'Flat ₹50 OFF on orders' },
                        { _id: '2', code: 'FREEDEL', description: 'Free Express Delivery' },
                        { _id: '3', code: 'WELCOME10', description: '10% Discount' }
                      ]
                  ).map(offer => (
                    <TouchableOpacity
                      key={offer._id || offer.code}
                      onPress={() => handleApplyPromo(offer.code)}
                      activeOpacity={0.7}
                      className="bg-amber-50 border border-dashed border-amber-300 rounded-xl px-2.5 py-1.5 mr-2 flex-row items-center"
                    >
                      <Ionicons name="sparkles" size={11} color="#D97706" style={{ marginRight: 4 }} />
                      <View>
                        <Text className="text-[11px] font-black text-slate-900">{offer.code}</Text>
                        {offer.description && (
                          <Text numberOfLines={1} className="text-[9px] font-semibold text-amber-800">
                            {offer.description}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Applied Promo Celebration Banner */}
            {appliedPromo && (
              <View className="mt-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons name="gift" size={17} color="#059669" style={{ marginRight: 8 }} />
                  <View className="flex-1">
                    <Text className="text-xs font-black text-emerald-900">
                      Code &apos;{appliedPromo.code}&apos; Active
                    </Text>
                    <Text className="text-[10px] font-semibold text-emerald-700">
                      {appliedPromo.message || `Savings of ₹${discountAmount} applied to cart`}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs font-black text-emerald-700">
                  -₹{discountAmount}
                </Text>
              </View>
            )}
          </View>

          {/* ── Section D: Bill Summary Card ── */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-slate-200/90 shadow-xs">
            <View className="flex-row items-center mb-3">
              <View className="w-7 h-7 rounded-lg bg-[#FEF3C7] items-center justify-center mr-2">
                <Ionicons name="receipt-outline" size={15} color="#D97706" />
              </View>
              <Text className="text-sm font-black text-slate-900 tracking-tight">
                Bill Summary
              </Text>
            </View>

            <View className="space-y-2">
              {/* Item Total */}
              <View className="flex-row justify-between items-center py-1">
                <Text className="text-xs font-medium text-slate-600">Items Subtotal</Text>
                <Text className="text-xs font-bold text-slate-900">₹{subtotal}</Text>
              </View>

              {/* Delivery Partner Fee */}
              <View className="flex-row justify-between items-center py-1">
                <View className="flex-row items-center">
                  <Text className="text-xs font-medium text-slate-600 mr-1.5">Delivery Fee</Text>
                  <View className="bg-slate-100 px-1.5 py-0.2 rounded">
                    <Text className="text-[9px] font-bold text-slate-500">10 mins</Text>
                  </View>
                </View>
                {currentDeliveryFee === 0 ? (
                  <View className="flex-row items-center">
                    <Text className="text-xs font-semibold text-slate-400 line-through mr-1.5">₹30</Text>
                    <Text className="text-xs font-black text-emerald-600">FREE</Text>
                  </View>
                ) : (
                  <Text className="text-xs font-bold text-slate-900">₹{currentDeliveryFee}</Text>
                )}
              </View>

              {/* Handling Fee */}
              <View className="flex-row justify-between items-center py-1">
                <Text className="text-xs font-medium text-slate-600">Handling & Bag</Text>
                <Text className="text-xs font-black text-emerald-600">FREE</Text>
              </View>

              {/* Promo Discount */}
              {discountAmount > 0 && (
                <View className="flex-row justify-between items-center py-1">
                  <Text className="text-xs font-black text-emerald-600">Promo Discount</Text>
                  <Text className="text-xs font-black text-emerald-600">-₹{discountAmount}</Text>
                </View>
              )}

              {/* Divider */}
              <View className="h-[1px] bg-slate-200/80 my-2" />

              {/* Grand Total */}
              <View className="flex-row justify-between items-center pt-0.5">
                <View>
                  <Text className="text-sm font-black text-slate-900">To Pay</Text>
                  <Text className="text-[10px] font-semibold text-slate-400">Inclusive of all taxes</Text>
                </View>
                <Text className="text-xl font-black text-slate-900">
                  ₹{grandTotal}
                </Text>
              </View>
            </View>

            {/* Savings Banner */}
            {totalSavings > 0 && (
              <View className="mt-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl p-2.5 flex-row items-center justify-center">
                <Text className="text-xs font-black text-emerald-800 text-center">
                  🎉 You are saving ₹{totalSavings} on this order!
                </Text>
              </View>
            )}
          </View>

          {/* ── Section E: Payment Method Selection ── */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-slate-200/90 shadow-xs">
            <View className="flex-row items-center mb-3">
              <View className="w-7 h-7 rounded-lg bg-[#FEF3C7] items-center justify-center mr-2">
                <Ionicons name="card-outline" size={15} color="#D97706" />
              </View>
              <Text className="text-sm font-black text-slate-900 tracking-tight">
                Payment Method
              </Text>
            </View>

            {/* COD Option */}
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                setPaymentMethod('COD');
              }}
              activeOpacity={0.8}
              className={`flex-row items-center p-3 rounded-2xl border mb-2.5 ${
                paymentMethod === 'COD'
                  ? 'border-slate-900 bg-amber-50/40'
                  : 'border-slate-200 bg-[#F8FAFC]'
              }`}
            >
              <View className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center mr-3">
                <Ionicons name="cash-outline" size={19} color="#059669" />
              </View>

              <View className="flex-1">
                <Text className="text-xs font-black text-slate-900">
                  Cash on Delivery
                </Text>
                <Text className="text-[10px] font-medium text-slate-500">
                  Pay cash or UPI upon delivery arrival
                </Text>
              </View>

              <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                paymentMethod === 'COD' ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
              }`}>
                {paymentMethod === 'COD' && (
                  <Ionicons name="checkmark" size={12} color="#F7C400" />
                )}
              </View>
            </TouchableOpacity>

            {/* Paytm / UPI Option */}
            <TouchableOpacity
              onPress={() => {
                triggerHaptic();
                setPaymentMethod('PAYTM');
              }}
              activeOpacity={0.8}
              className={`flex-row items-center p-3 rounded-2xl border ${
                paymentMethod === 'PAYTM'
                  ? 'border-slate-900 bg-amber-50/40'
                  : 'border-slate-200 bg-[#F8FAFC]'
              }`}
            >
              <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center mr-3">
                <Ionicons name="flash" size={19} color="#2563EB" />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-xs font-black text-slate-900 mr-2">
                    Paytm / UPI / Cards
                  </Text>
                  <View className="bg-amber-100 px-1.5 py-0.2 rounded">
                    <Text className="text-[9px] font-black text-amber-800">INSTANT</Text>
                  </View>
                </View>
                <Text className="text-[10px] font-medium text-slate-500">
                  GPay, PhonePe, Paytm UPI & Cards
                </Text>
              </View>

              <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                paymentMethod === 'PAYTM' ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white'
              }`}>
                {paymentMethod === 'PAYTM' && (
                  <Ionicons name="checkmark" size={12} color="#F7C400" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* ── Section F: Quick Commerce Trust Guarantees ── */}
          <View className="flex-row justify-between items-center py-2 px-1 mb-2">
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark" size={14} color="#059669" style={{ marginRight: 4 }} />
              <Text className="text-[10px] font-bold text-slate-500">100% Genuine</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="flash" size={14} color="#D97706" style={{ marginRight: 4 }} />
              <Text className="text-[10px] font-bold text-slate-500">10-Min Arrival</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="cube-outline" size={14} color="#2563EB" style={{ marginRight: 4 }} />
              <Text className="text-[10px] font-bold text-slate-500">Hygienic Packing</Text>
            </View>
          </View>

        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════
          3. FLOATING STICKY CHECKOUT BAR (Matches Home Screen Pill)
          ══════════════════════════════════════════════════════ */}
      {cart.length > 0 && (
        <View
          pointerEvents="box-none"
          className="absolute left-4 right-4 z-50"
          style={{ bottom: Math.max(insets.bottom, 8) + 74 }}
        >
          <TouchableOpacity
            onPress={handlePlaceOrder}
            disabled={submitting}
            activeOpacity={0.92}
            className="bg-slate-900 rounded-2xl py-3.5 px-4 flex-row items-center justify-between border-[1.5px] border-[#F7C400] shadow-xl"
          >
            {/* Left: Total Amount & Items */}
            <View className="flex-row items-center">
              <View className="w-[42px] h-[42px] rounded-xl bg-[#F7C400] items-center justify-center mr-3 shadow-xs">
                <Ionicons name="bag-check" size={22} color="#0F172A" />
              </View>

              <View>
                <Text className="text-white text-base font-black tracking-tight">
                  ₹{grandTotal}
                </Text>
                <Text className="text-slate-300 text-[11px] font-semibold">
                  {cartTotalCount} {cartTotalCount === 1 ? 'item' : 'items'} • {paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paytm / UPI'}
                </Text>
              </View>
            </View>

            {/* Right: Place Order CTA */}
            <View className="flex-row items-center bg-[#F7C400] px-4 py-2 rounded-xl">
              {submitting ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#0F172A" />
                  <Text className="text-slate-900 text-xs font-black ml-1.5">Processing...</Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-slate-900 text-xs font-black mr-1">
                    Place Order
                  </Text>
                  <Ionicons name="flash" size={14} color="#0F172A" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      )}

    </SafeAreaView>
  );
}
