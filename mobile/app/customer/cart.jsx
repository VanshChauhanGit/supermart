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
import { useApp } from '../../context/AppContext';
import AllInOneSDKManager from 'paytm_allinone_react-native';

export default function CustomerCartScreen() {
  const insets = useSafeAreaInsets();
  const { cart, updateCartQty, clearCart, customerUser, apiBaseUrl } = useApp();

  const [address, setAddress] = useState(customerUser?.address || '');
  const [pincode, setPincode] = useState(customerUser?.pincode || '');
  const [landmark, setLandmark] = useState('');
  const [coords, setCoords] = useState(null); // { latitude: Number, longitude: Number }
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState(null);
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

  // Live GPS Auto-Detection & Reverse Geocoding
  const handleDetectLocation = async (isManual = false) => {
    try {
      setIsLocating(true);
      setLocationError(null);
      if (isManual) triggerHaptic();

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission needed');
        if (isManual) {
          Alert.alert(
            'Location Permission Needed',
            'Please allow Mandhaur Supermart to access your device location to pin your doorstep for 10-minute delivery.'
          );
        }
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

        const autoAddress = `${namePart}${street ? street + ', ' : ''}${subregion ? subregion + ', ' : ''}${city}`.replace(/,\s*,/g, ',').replace(/^,\s*/, '').trim();
        if (autoAddress) setAddress(autoAddress);
        if (postCode) setPincode(postCode);
      }
    } catch (e) {
      setLocationError('Unable to detect GPS position');
      if (isManual) {
        Alert.alert('Location Error', 'Unable to fetch current GPS coordinates. Please ensure GPS is enabled on your device.');
      }
    } finally {
      setIsLocating(false);
    }
  };

  // Automatically fetch live GPS location on component mount
  useEffect(() => {
    handleDetectLocation(false);
  }, []);

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
    if (!coords?.latitude || !coords?.longitude) {
      Alert.alert(
        'Live Location Required',
        'Live GPS location is required to place your order for 10-minute delivery. Please allow location access.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Detect Location', onPress: () => handleDetectLocation(true) }
        ]
      );
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
        deliveryAddress: address.trim(),
        pincode: pincode.trim(),
        location: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          formattedAddress: address.trim(),
          landmark: landmark.trim() || ''
        },
        items: cart.map(i => ({
          productId: i._id,
          variantId: i.variantId || null,
          variantLabel: i.variantLabel || '',
          name: i.variantLabel ? `${i.name} (${i.variantLabel})` : i.name,
          price: i.sellingPrice,
          quantity: i.quantity,
          unit: i.variantLabel || i.unit,
          total: i.sellingPrice * i.quantity,
          imageUrl: i.imageUrl || i.image || ''
        })),
        subtotal,
        deliveryFee: currentDeliveryFee,
        discountCode: appliedPromo ? appliedPromo.code : null,
        discountAmount,
        totalAmount: grandTotal,
        paymentMethod
      };

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
            paddingBottom: Math.max(insets.bottom, 8) + 80
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
                  key={item.cartItemId || item._id}
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
                          {item.variantLabel || item.unit || '1 pc'}
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
                    {(() => {
                      const maxStock = (item.stockQty !== undefined && item.stockQty !== null) ? Number(item.stockQty) : Infinity;
                      const isMaxStockReached = item.quantity >= maxStock;

                      return (
                        <>
                          <View className="flex-row items-center bg-[#F7C400] rounded-xl px-1.5 py-1 border border-[#FACC15] shadow-xs">
                            <TouchableOpacity
                              onPress={() => {
                                triggerHaptic();
                                updateCartQty(item.cartItemId || item._id, -1);
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
                              disabled={isMaxStockReached}
                              onPress={() => {
                                if (isMaxStockReached) {
                                  triggerHaptic();
                                  return;
                                }
                                triggerHaptic();
                                updateCartQty(item.cartItemId || item._id, 1, maxStock);
                              }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              className="px-1.5"
                              style={{ opacity: isMaxStockReached ? 0.35 : 1 }}
                            >
                              <Text className="text-slate-900 font-black text-xs leading-none">+</Text>
                            </TouchableOpacity>
                          </View>

                          {isMaxStockReached && (
                            <Text className="text-[9px] font-bold text-rose-500 mt-0.5">
                              Max stock ({maxStock})
                            </Text>
                          )}
                        </>
                      );
                    })()}

                    {/* Total for item */}
                    <Text className="text-xs font-black text-slate-900 mt-1">
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

          {/* ── Section B: Delivery Address (Live GPS Auto-Filled) ── */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-slate-200/90 shadow-xs">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="w-7 h-7 rounded-lg bg-[#FEF3C7] items-center justify-center mr-2">
                  <Ionicons name="location-sharp" size={15} color="#D97706" />
                </View>
                <Text className="text-sm font-black text-slate-900 tracking-tight">
                  Delivery Address
                </Text>
              </View>

              {/* Live Location Status Indicator / Refresh */}
              {isLocating ? (
                <View className="flex-row items-center bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80">
                  <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 4 }} />
                  <Text className="text-[10px] font-bold text-amber-800">Detecting...</Text>
                </View>
              ) : coords?.latitude ? (
                <TouchableOpacity
                  onPress={() => handleDetectLocation(true)}
                  activeOpacity={0.7}
                  className="flex-row items-center bg-emerald-50 border border-emerald-200/90 px-2.5 py-1 rounded-full"
                >
                  <Ionicons name="navigate" size={11} color="#059669" style={{ marginRight: 3 }} />
                  <Text className="text-[10px] font-black text-emerald-800">Live GPS</Text>
                  <Ionicons name="refresh" size={10} color="#059669" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => handleDetectLocation(true)}
                  activeOpacity={0.7}
                  className="flex-row items-center bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full"
                >
                  <Ionicons name="locate" size={12} color="#D97706" style={{ marginRight: 3 }} />
                  <Text className="text-[10px] font-black text-amber-900">Get Live GPS</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Error / Permission Banner if not fetched */}
            {locationError && !coords?.latitude && !isLocating && (
              <View className="mb-3 bg-rose-50 border border-rose-200 rounded-2xl p-3 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons name="alert-circle" size={17} color="#E11D48" style={{ marginRight: 6 }} />
                  <Text className="text-xs font-semibold text-rose-900 flex-1">
                    Live location required for 10-minute delivery
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDetectLocation(true)}
                  className="bg-rose-500 px-2.5 py-1 rounded-xl active:bg-rose-600"
                >
                  <Text className="text-[11px] font-black text-white">Enable</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── House & Street Details Input (Auto-filled via Live GPS) ── */}
            <View className="mb-2.5">
              <Text className="text-[11px] font-bold text-slate-600 mb-1">
                House / Flat & Street Details
              </Text>
              <View className="flex-row items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3 py-2.5">
                <Ionicons name="home-outline" size={15} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  className="flex-1 text-xs font-semibold text-slate-900 py-0"
                  value={address}
                  onChangeText={setAddress}
                  placeholder={isLocating ? 'Detecting live GPS address...' : 'House / Flat No, Apartment, Street Name'}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* ── Landmark Input ── */}
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

            {/* ── Pincode & Recipient Info ── */}
            <View className="flex-row items-center justify-between">
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
          <View className="flex-row justify-between items-center py-2 px-1 mb-3">
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

          {/* ── Section G: Place Order Card (Bottom of page below payment) ── */}
          <View className="bg-white rounded-3xl p-4 mb-4 border border-slate-200/90 shadow-xs">
            {/* Amount & Items Row */}
            <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
              <View>
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Total Payable
                </Text>
                <View className="flex-row items-baseline mt-0.5">
                  <Text className="text-2xl font-black text-slate-900 tracking-tight">
                    ₹{grandTotal}
                  </Text>
                  <Text className="text-xs font-semibold text-slate-500 ml-2">
                    ({cartTotalCount} {cartTotalCount === 1 ? 'item' : 'items'})
                  </Text>
                </View>
              </View>

              <View className="bg-amber-50 border border-amber-200/80 px-2.5 py-1.5 rounded-xl flex-row items-center">
                <Ionicons
                  name={paymentMethod === 'COD' ? 'cash-outline' : 'flash'}
                  size={14}
                  color="#D97706"
                  style={{ marginRight: 4 }}
                />
                <Text className="text-xs font-black text-slate-800">
                  {paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paytm / UPI'}
                </Text>
              </View>
            </View>

            {/* Live Location Alert / Warning if not fetched */}
            {!coords?.latitude && (
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 mb-3 flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 6 }} />
                  ) : (
                    <Ionicons name="location" size={15} color="#D97706" style={{ marginRight: 6 }} />
                  )}
                  <Text className="text-xs font-bold text-amber-900 flex-1">
                    {isLocating ? 'Detecting your live location...' : 'Live GPS location is required to place order'}
                  </Text>
                </View>
                {!isLocating && (
                  <TouchableOpacity
                    onPress={() => handleDetectLocation(true)}
                    className="bg-[#F7C400] px-2.5 py-1 rounded-lg border border-[#FACC15]"
                  >
                    <Text className="text-[11px] font-black text-slate-900">Locate</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Place Order CTA Button */}
            <TouchableOpacity
              onPress={handlePlaceOrder}
              disabled={submitting || isLocating || !coords?.latitude}
              activeOpacity={0.88}
              className={`w-full py-3.5 px-4 rounded-2xl flex-row items-center justify-between shadow-xs ${
                !coords?.latitude || isLocating
                  ? 'bg-slate-100 border border-slate-200'
                  : 'bg-[#F7C400] active:bg-[#eab308] border border-[#facc15]'
              }`}
            >
              <View className="flex-row items-center">
                <View className={`w-8 h-8 rounded-xl items-center justify-center mr-2.5 ${
                  !coords?.latitude || isLocating ? 'bg-slate-200' : 'bg-white/40'
                }`}>
                  <Ionicons
                    name="bag-check"
                    size={18}
                    color={!coords?.latitude || isLocating ? '#94A3B8' : '#0F172A'}
                  />
                </View>
                <Text className={`text-base font-black tracking-tight ${
                  !coords?.latitude || isLocating ? 'text-slate-400' : 'text-slate-900'
                }`}>
                  {submitting
                    ? 'Placing Order...'
                    : isLocating
                    ? 'Detecting Location...'
                    : !coords?.latitude
                    ? 'Location Required'
                    : 'Place Order'}
                </Text>
              </View>

              {submitting || isLocating ? (
                <ActivityIndicator size="small" color={!coords?.latitude || isLocating ? '#64748B' : '#0F172A'} />
              ) : (
                <View className={`flex-row items-center px-3 py-1.5 rounded-xl ${
                  !coords?.latitude ? 'bg-slate-200' : 'bg-slate-900'
                }`}>
                  <Text className={`text-xs font-black mr-1 ${
                    !coords?.latitude ? 'text-slate-500' : 'text-[#F7C400]'
                  }`}>
                    {coords?.latitude ? `₹${grandTotal}` : 'Disabled'}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={13}
                    color={!coords?.latitude ? '#94A3B8' : '#F7C400'}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}

    </SafeAreaView>
  );
}
