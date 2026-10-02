import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import AllInOneSDKManager from 'paytm_allinone_react-native';

export default function CustomerCartScreen() {
  const { cart, updateCartQty, clearCart, customerUser, apiBaseUrl } = useApp();

  const [address, setAddress] = useState('House No 42, Green Park Main');
  const [pincode, setPincode] = useState('110016');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [submitting, setSubmitting] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const subtotal = cart.reduce((acc, i) => acc + (i.sellingPrice * i.quantity), 0);
  const baseDeliveryFee = subtotal > 300 ? 0 : 30;
  
  const currentDeliveryFee = appliedPromo && appliedPromo.deliveryFee !== undefined 
    ? appliedPromo.deliveryFee 
    : baseDeliveryFee;

  const grandTotal = subtotal + currentDeliveryFee - discountAmount;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    try {
      const res = await fetch(`${apiBaseUrl}/offers/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, subtotal })
      });
      const data = await res.json();
      if (data.success) {
        setAppliedPromo(data.data);
        setDiscountAmount(data.data.discount);
        Alert.alert('Promo Applied!', data.data.message);
      } else {
        setAppliedPromo(null);
        setDiscountAmount(0);
        Alert.alert('Invalid Promo', data.message || 'Promo code failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to apply promo code');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setAppliedPromo(null);
    setDiscountAmount(0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add products to cart before checkout.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Required Address', 'Please enter your delivery address');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerName: customerUser ? customerUser.name : 'Walk-in Customer',
        phone: customerUser ? customerUser.phone : '9876543210',
        deliveryAddress: address,
        pincode,
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

      const res = await fetch(`${apiBaseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        // If payment method is Paytm, initialize SDK
        if (paymentMethod === 'PAYTM') {
          try {
            // Generate token
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
                  'Expo Go Limitation', 
                  'Paytm SDK requires custom native code. It cannot run inside Expo Go. Please create a development build (EAS Build) or use prebuild to test payments natively.'
                );
                // Clear cart to proceed anyway for demo purposes
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
                true, // isStaging (true for testing)
                false // restrictAppInvoke
              ).then((result) => {
                clearCart();
                Alert.alert('Payment & Order Successful! 🚀', `Your order #${data.data.orderNo} has been submitted for 30-min express delivery!`);
                router.replace('/customer/orders');
              }).catch((err) => {
                Alert.alert('Payment Failed', err.message || "Transaction failed. You can pay via COD upon delivery.");
                // We still clear cart and go to orders since order was created (in PENDING state)
                clearCart();
                router.replace('/customer/orders');
              });
            } else {
              Alert.alert('Payment Initialization Failed', tokenData.message || 'Could not start payment');
            }
          } catch (e) {
            Alert.alert('Payment Error', 'Could not connect to payment gateway: ' + e.message);
          }
        } else {
          clearCart();
          Alert.alert('Order Placed! 🚀', `Your order #${data.data.orderNo} has been submitted for 30-min express delivery! Track live progress in My Orders.`);
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
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView className="flex-1">
      <View className="p-4">

        <Text className="text-xl font-black text-slate-900 mb-3.5">My Express Delivery Cart ({cart.length})</Text>

        {cart.length === 0 ? (
          <View className="bg-white rounded-3xl p-8 items-center mb-5 border border-slate-200 shadow-sm">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Text className="text-3xl">🛒</Text>
            </View>
            <Text className="text-base font-black text-slate-900">Your Cart is Empty</Text>
            <Text className="text-xs text-slate-500 font-medium mt-1 mb-5 text-center">Add fresh groceries & staples from the catalog</Text>
            <TouchableOpacity 
              onPress={() => router.push('/customer')}
              className="bg-[#28469E] px-5 py-3 rounded-2xl shadow-md shadow-[#28469E]/30"
            >
              <Text className="text-white font-extrabold text-xs">EXPLORE SHOP CATALOG ➔</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-white rounded-3xl p-4 mb-5 border border-slate-200 shadow-sm">
            {cart.map(item => (
              <View key={item._id} className="flex-row items-center py-3 border-b border-slate-100">
                <View className="flex-1">
                  <Text className="text-sm font-black text-slate-900">{item.name}</Text>
                  <Text className="text-xs text-slate-500 font-medium">₹{item.sellingPrice} / {item.unit}</Text>
                </View>

                <View className="flex-row items-center bg-[#F8FAFC] rounded-xl p-1 mx-3 border border-slate-200">
                  <TouchableOpacity onPress={() => updateCartQty(item._id, -1)} className="px-2.5 py-1">
                    <Text className="font-black text-base text-[#28469E]">-</Text>
                  </TouchableOpacity>
                  <Text className="text-xs font-black px-2 text-slate-900">{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateCartQty(item._id, 1)} className="px-2.5 py-1">
                    <Text className="font-black text-base text-[#28469E]">+</Text>
                  </TouchableOpacity>
                </View>

                <Text className="text-sm font-black text-[#28469E]">₹{item.sellingPrice * item.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Delivery Details */}
        <Text className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3">DELIVERY ADDRESS & LOCATION</Text>

        <View className="bg-white rounded-3xl p-4 mb-4 border border-slate-200 shadow-sm">
          <View className="mb-3">
            <Text className="text-xs font-bold text-slate-700 mb-1">House & Street Address:</Text>
            <TextInput
              className="bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-semibold text-slate-900"
              value={address}
              onChangeText={setAddress}
              placeholder="House No, Street, Landmark"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View className="mb-1">
            <Text className="text-xs font-bold text-slate-700 mb-1">Pincode:</Text>
            <TextInput
              className="bg-[#F8FAFC] border border-slate-200 rounded-2xl px-3.5 py-3 text-xs font-semibold text-slate-900"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Offers & Promo */}
        <Text className="text-xs font-black text-slate-700 uppercase tracking-widest mt-2 mb-3">OFFERS & PROMO</Text>
        <View className="bg-white rounded-3xl p-4 mb-4 border border-slate-200 shadow-sm flex-row items-center">
          <View className="w-10 h-10 rounded-xl bg-fuchsia-100 items-center justify-center mr-3 border border-fuchsia-200">
            <Text className="text-lg">🎁</Text>
          </View>
          <View className="flex-1">
            <TextInput
              className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
              value={promoCode}
              onChangeText={(val) => { setPromoCode(val); if (appliedPromo) handleRemovePromo(); }}
              placeholder="Enter Promo Code"
              autoCapitalize="characters"
              editable={!appliedPromo}
            />
          </View>
          {appliedPromo ? (
            <TouchableOpacity onPress={handleRemovePromo} className="ml-3 bg-rose-100 px-3 py-2 rounded-xl border border-rose-200">
              <Text className="text-xs font-bold text-rose-600">Remove</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleApplyPromo} className="ml-3 bg-emerald-100 px-4 py-2 rounded-xl border border-emerald-200">
              <Text className="text-xs font-bold text-emerald-800">{validatingPromo ? '...' : 'Apply'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Summary Card */}
        <View className="bg-white rounded-3xl p-4 my-2 border border-slate-200 shadow-sm">
          <View className="flex-row justify-between mb-2">
            <Text className="text-xs text-slate-500 font-medium">Subtotal:</Text>
            <Text className="text-xs font-bold text-slate-900">₹{subtotal}</Text>
          </View>
          {discountAmount > 0 && (
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs text-emerald-600 font-bold">Promo Discount:</Text>
              <Text className="text-xs font-bold text-emerald-600">-₹{discountAmount}</Text>
            </View>
          )}
          <View className="flex-row justify-between mb-2">
            <Text className="text-xs text-slate-500 font-medium">Express Delivery Fee:</Text>
            <Text className="text-xs font-bold text-slate-900">
              {currentDeliveryFee === 0 ? <Text className="text-emerald-600 font-bold">FREE</Text> : `₹${currentDeliveryFee}`}
            </Text>
          </View>
          <View className="flex-row justify-between pt-3 border-t border-slate-100 mt-1">
            <Text className="text-base font-black text-slate-900">Total Amount:</Text>
            <Text className="text-xl font-black text-[#28469E]">₹{grandTotal}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <Text className="text-xs font-black text-slate-700 uppercase tracking-widest mt-4 mb-3">PAYMENT METHOD</Text>
        <View className="flex-row justify-between mb-4">
          <TouchableOpacity 
            onPress={() => setPaymentMethod('COD')}
            className={`flex-1 mr-2 p-3 rounded-2xl border ${paymentMethod === 'COD' ? 'border-[#28469E] bg-[#28469E]/10' : 'border-slate-200 bg-white'}`}
          >
            <Text className={`text-center font-bold text-sm ${paymentMethod === 'COD' ? 'text-[#28469E]' : 'text-slate-600'}`}>Cash on Delivery</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setPaymentMethod('PAYTM')}
            className={`flex-1 ml-2 p-3 rounded-2xl border ${paymentMethod === 'PAYTM' ? 'border-[#28469E] bg-[#28469E]/10' : 'border-slate-200 bg-white'}`}
          >
            <Text className={`text-center font-bold text-sm ${paymentMethod === 'PAYTM' ? 'text-[#28469E]' : 'text-slate-600'}`}>Paytm / UPI</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          className="bg-[#28469E] rounded-3xl py-4 items-center my-6 shadow-xl shadow-[#28469E]/30" 
          onPress={handlePlaceOrder}
          disabled={submitting || cart.length === 0}
          activeOpacity={0.85}
        >
          <Text className="text-white text-base font-black tracking-wide">
            {submitting ? 'PLACING ORDER...' : `CONFIRM 30-MIN DELIVERY (₹${grandTotal}) ➔`}
          </Text>
        </TouchableOpacity>

      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
