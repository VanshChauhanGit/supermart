import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../../context/AppContext';

const MenuItem = ({ icon, iconBg, iconColor, title, subtitle, onPress, rightEl, danger }) => (
  <TouchableOpacity
    activeOpacity={0.75}
    onPress={onPress}
    className={`bg-white rounded-2xl p-3.5 flex-row items-center mb-2 border ${danger ? 'border-red-100' : 'border-slate-100'}`}
  >
    <View className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${iconBg}`}>
      <Ionicons name={icon} size={20} color={iconColor || '#1E3A8A'} />
    </View>
    <View className="flex-1">
      <Text className={`text-sm font-bold ${danger ? 'text-red-500' : 'text-slate-900'}`}>{title}</Text>
      {subtitle ? <Text className="text-[11px] text-slate-400 font-medium mt-0.5">{subtitle}</Text> : null}
    </View>
    {rightEl || <Ionicons name="chevron-forward" size={16} color={danger ? '#FCA5A5' : '#CBD5E1'} />}
  </TouchableOpacity>
);

export default function AdminProfileScreen() {
  const insets = useSafeAreaInsets();
  const { adminUser, logoutAdmin, apiBaseUrl, storeSettings, updateStoreSettings } = useApp();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Screen/Modal visibility toggles
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Delivery configuration state
  const [deliveryFee, setDeliveryFee] = useState(String(storeSettings?.deliveryFee ?? 30));
  const [freeThreshold, setFreeThreshold] = useState(String(storeSettings?.freeDeliveryThreshold ?? 300));
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [deliverySaveSuccess, setDeliverySaveSuccess] = useState(false);

  // Store UPI QR Code State
  const [paymentQrUrl, setPaymentQrUrl] = useState(storeSettings?.paymentQrUrl || '');
  const [upiId, setUpiId] = useState(storeSettings?.upiId || '');
  const [uploadingQr, setUploadingQr] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const [qrSaveSuccess, setQrSaveSuccess] = useState(false);

  useEffect(() => {
    if (storeSettings) {
      setDeliveryFee(String(storeSettings.deliveryFee ?? 30));
      setFreeThreshold(String(storeSettings.freeDeliveryThreshold ?? 300));
      setPaymentQrUrl(storeSettings.paymentQrUrl || '');
      setUpiId(storeSettings.upiId || '');
    }
  }, [storeSettings]);

  // Delivery settings save handler
  const handleSaveDeliverySettings = async () => {
    const feeNum = Math.max(0, parseInt(deliveryFee, 10) || 0);
    const thresholdNum = Math.max(0, parseInt(freeThreshold, 10) || 0);

    setSavingDelivery(true);
    try {
      const res = await updateStoreSettings({
        deliveryFee: feeNum,
        freeDeliveryThreshold: thresholdNum,
      });
      if (res?.success) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_e) { }
        setDeliverySaveSuccess(true);
        setTimeout(() => setDeliverySaveSuccess(false), 2500);
        Alert.alert('Saved', 'Delivery charges and threshold updated successfully!');
      } else {
        Alert.alert('Update Failed', res?.error || 'Could not update delivery settings');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingDelivery(false);
    }
  };

  // QR image upload handler
  const uploadQrImage = async (imageInput) => {
    setUploadingQr(true);
    try {
      let response;
      if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
        response = await fetch(`${apiBaseUrl}/upload/base64`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageInput }),
        });
      } else {
        let fData = new FormData();
        fData.append('image', {
          uri: imageInput,
          name: `qr-${Date.now()}.jpg`,
          type: 'image/jpeg',
        });
        response = await fetch(`${apiBaseUrl}/upload`, {
          method: 'POST',
          body: fData,
        });
      }

      const data = await response.json();
      if (data.success && data.imageUrl) {
        setPaymentQrUrl(data.imageUrl);
        await updateStoreSettings({ paymentQrUrl: data.imageUrl, upiId: upiId.trim() });
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_e) { }
        Alert.alert('QR Uploaded', 'Store UPI QR scanner has been uploaded and activated!');
      } else {
        Alert.alert('Upload Failed', data.message || 'Could not upload QR code');
      }
    } catch (error) {
      console.error('QR code upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload QR code. Please check your network connection.');
    } finally {
      setUploadingQr(false);
    }
  };

  const pickQrFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery access is needed to select your QR scanner image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          await uploadQrImage(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          await uploadQrImage(asset.uri);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick QR code: ' + (e.message || ''));
    }
  };

  const takeQrWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera access is needed to take a photo of your QR scanner.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          await uploadQrImage(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          await uploadQrImage(asset.uri);
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to take QR photo: ' + (e.message || ''));
    }
  };

  const handleSaveQrSettings = async () => {
    setSavingQr(true);
    try {
      const res = await updateStoreSettings({
        paymentQrUrl,
        upiId: upiId.trim(),
      });
      if (res?.success) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_e) { }
        setQrSaveSuccess(true);
        setTimeout(() => setQrSaveSuccess(false), 2500);
        Alert.alert('Saved', 'Store UPI QR settings have been updated successfully!');
      } else {
        Alert.alert('Update Failed', res?.error || 'Could not update QR settings');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingQr(false);
    }
  };

  const handleRemoveQr = () => {
    Alert.alert(
      'Remove QR Code',
      'Are you sure you want to remove the current UPI QR scanner image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setPaymentQrUrl('');
            await updateStoreSettings({ paymentQrUrl: '', upiId: upiId.trim() });
            Alert.alert('QR Removed', 'Store UPI QR scanner has been cleared.');
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout Admin Session',
      'Are you sure you want to exit the Store Owner portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => { if (logoutAdmin) await logoutAdmin(); }
        }
      ]
    );
  };

  const feeVal = Math.max(0, parseInt(deliveryFee, 10) || 0);
  const threshVal = Math.max(0, parseInt(freeThreshold, 10) || 0);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFF]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFF" />

      {/* Header */}
      <View
        style={{ paddingTop: Platform.OS === 'ios' ? 8 : 12 }}
        className="px-5 pb-3"
      >
        <Text className="text-4xl tracking-tight font-semibold text-[#1E3A8A]">Profile</Text>
        <Text className="text-xs text-slate-400 font-semibold mt-0.5">Store settings & account</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Store Owner Avatar Card */}
        <View className="bg-[#1E3A8A] rounded-3xl p-5 mt-3 mb-5 flex-row items-center shadow-2xl shadow-[#1E3A8A]/40">
          <View className="w-16 h-16 rounded-2xl bg-white/10 items-center justify-center mr-3.5 border-2 border-white/20">
            <Ionicons name="shield-checkmark" size={32} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] text-[#93C5FD] font-black uppercase tracking-widest mb-1">STORE OWNER ADMIN</Text>
            <Text className="text-xl font-black text-white">{adminUser?.username || 'Admin'}</Text>
            <View className="flex-row items-center mt-1.5">
              <View className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5" />
              <Text className="text-xs text-[#93C5FD] font-semibold">Super Admin · Active Session</Text>
            </View>
          </View>
        </View>

        {/* ── Store Configuration Section (Click to Open Edit Screens) ── */}
        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Store Configuration</Text>
        <MenuItem
          icon="qr-code-outline"
          iconBg="bg-amber-50"
          iconColor="#D97706"
          title="Store Payment QR (UPI)"
          subtitle={paymentQrUrl ? "Active QR Scanner Configured" : "Upload QR for delivery boys to collect payment"}
          onPress={() => setShowQrModal(true)}
          rightEl={
            <View className="flex-row items-center">
              {paymentQrUrl ? (
                <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mr-2">
                  <Text className="text-[10px] font-black text-emerald-700">ACTIVE</Text>
                </View>
              ) : (
                <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full mr-2">
                  <Text className="text-[10px] font-black text-amber-700">NOT SET</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </View>
          }
        />

        <MenuItem
          icon="bicycle-outline"
          iconBg="bg-blue-50"
          iconColor="#1E3A8A"
          title="Delivery Charges & Threshold"
          subtitle={`Fee: ₹${storeSettings?.deliveryFee ?? 30} · Free delivery above ₹${storeSettings?.freeDeliveryThreshold ?? 300}`}
          onPress={() => setShowDeliveryModal(true)}
          rightEl={
            <View className="flex-row items-center">
              <View className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full mr-2">
                <Text className="text-[10px] font-black text-[#1E3A8A]">₹{storeSettings?.deliveryFee ?? 30}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
            </View>
          }
        />

        {/* Store Management Section */}
        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 mt-5">Store Management</Text>
        <MenuItem icon="people-outline" iconBg="bg-amber-50" iconColor="#D97706" title="Manage Delivery Boys" subtitle="Add, edit, set password & delete delivery fleet" onPress={() => router.push('/admin/delivery-boys')} />
        <MenuItem icon="cube-outline" iconBg="bg-blue-50" iconColor="#1E3A8A" title="Manage Catalog & Stock" subtitle="Add products, update prices & stock" onPress={() => router.push('/admin/inventory')} />
        <MenuItem icon="pricetag-outline" iconBg="bg-fuchsia-50" iconColor="#7C3AED" title="Offers & Promo Codes" subtitle="Create discount codes and deals" onPress={() => router.push('/admin/offers')} />
        <MenuItem icon="grid-outline" iconBg="bg-sky-50" iconColor="#0369A1" title="Manage Categories" subtitle="Add & organize product categories" onPress={() => router.push('/admin/categories')} />
        <MenuItem icon="bicycle-outline" iconBg="bg-green-50" iconColor="#16A34A" title="Delivery Orders" subtitle="Accept & fulfill customer orders" onPress={() => router.push('/admin/orders')} />

        {/* Preferences Section */}
        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 mt-5">Preferences</Text>
        <MenuItem
          icon="notifications-outline"
          iconBg="bg-amber-50"
          iconColor="#D97706"
          title="Order Notifications"
          subtitle={notificationsEnabled ? 'Alerts enabled for new orders' : 'Notifications disabled'}
          rightEl={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
              thumbColor={notificationsEnabled ? '#1E3A8A' : '#94A3B8'}
            />
          }
        />

        {/* Logout */}
        <View className="mt-5">
          <MenuItem icon="log-out-outline" iconBg="bg-red-50" iconColor="#EF4444" title="Logout" subtitle="End your admin session" onPress={handleLogout} danger />
        </View>

        <Text className="text-center text-xs text-slate-300 font-semibold mt-5">
          Mandhaur Supermart Store Owner Portal · Protected Session
        </Text>

      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          1. DEDICATED FULL-SCREEN MODAL: STORE PAYMENT QR (UPI)
          ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showQrModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View className="flex-1 bg-[#F8FAFF]">
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          {/* Top Bar with Back Arrow (Padded for Status Bar / Dynamic Island) */}
          <View
            style={{ paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 50 : 24) }}
            className="px-5 pb-3.5 flex-row items-center justify-between border-b border-slate-100 bg-white shadow-xs"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <TouchableOpacity
                onPress={() => setShowQrModal(false)}
                activeOpacity={0.75}
                className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 justify-center items-center mr-3"
              >
                <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
              </TouchableOpacity>
              <View>
                <Text className="text-xl font-black text-[#1E3A8A] tracking-tight">Store Payment QR</Text>
                <Text className="text-[11px] font-semibold text-slate-400">UPI Scanner for Deliveries</Text>
              </View>
            </View>

            {qrSaveSuccess && (
              <View className="flex-row items-center bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Ionicons name="checkmark-circle" size={13} color="#059669" style={{ marginRight: 4 }} />
                <Text className="text-[10px] font-black text-emerald-700">Saved</Text>
              </View>
            )}
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >


              {/* Main QR Card */}
              <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-5">
                {/* QR Code Image Preview / Placeholder */}
                <View className="items-center justify-center mb-4">
                  {paymentQrUrl ? (
                    <View className="items-center w-full">
                      <View className="p-3 bg-white border-2 border-slate-200 rounded-3xl shadow-sm mb-3 items-center justify-center">
                        <Image
                          source={{ uri: paymentQrUrl }}
                          style={{ width: 220, height: 220, borderRadius: 16 }}
                          resizeMode="contain"
                        />
                      </View>
                      <View className="flex-row items-center gap-2 mb-1">
                        <View className="bg-emerald-100 px-3 py-1 rounded-full flex-row items-center border border-emerald-200">
                          <Ionicons name="checkmark-circle" size={13} color="#059669" style={{ marginRight: 4 }} />
                          <Text className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                            Active QR Scanner
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={handleRemoveQr}
                          activeOpacity={0.7}
                          className="bg-red-50 border border-red-200 px-3 py-1 rounded-full flex-row items-center"
                        >
                          <Ionicons name="trash-outline" size={13} color="#DC2626" style={{ marginRight: 4 }} />
                          <Text className="text-[10px] font-black text-red-600">Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View className="w-full py-10 px-4 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 items-center justify-center mb-2">
                      <View className="w-16 h-16 rounded-2xl bg-slate-200 items-center justify-center mb-2.5">
                        <Ionicons name="qr-code-outline" size={34} color="#64748B" />
                      </View>
                      <Text className="text-sm font-black text-slate-800 text-center">
                        No QR Code Uploaded Yet
                      </Text>
                      <Text className="text-[11px] font-medium text-slate-400 text-center mt-1 max-w-[260px]">
                        Take a photo of your shop's UPI QR standee or select an image from your device gallery.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons: Camera & Gallery */}
                <View className="flex-row gap-3 mb-4">
                  <TouchableOpacity
                    onPress={takeQrWithCamera}
                    disabled={uploadingQr}
                    activeOpacity={0.8}
                    className="flex-1 bg-slate-100 border border-slate-200 py-3.5 rounded-2xl flex-row items-center justify-center"
                  >
                    <Ionicons name="camera" size={18} color="#1E3A8A" style={{ marginRight: 6 }} />
                    <Text className="text-xs font-black text-[#1E3A8A]">Camera Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={pickQrFromGallery}
                    disabled={uploadingQr}
                    activeOpacity={0.8}
                    className="flex-1 bg-slate-100 border border-slate-200 py-3.5 rounded-2xl flex-row items-center justify-center"
                  >
                    <Ionicons name="images" size={18} color="#1E3A8A" style={{ marginRight: 6 }} />
                    <Text className="text-xs font-black text-[#1E3A8A]">Choose Gallery</Text>
                  </TouchableOpacity>
                </View>

                {uploadingQr && (
                  <View className="flex-row items-center justify-center py-2.5 mb-3 bg-blue-50 rounded-2xl border border-blue-200">
                    <ActivityIndicator size="small" color="#1E3A8A" style={{ marginRight: 8 }} />
                    <Text className="text-xs font-black text-[#1E3A8A]">Uploading QR Code image...</Text>
                  </View>
                )}

                {/* Optional UPI ID Input */}
                <Text className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Store UPI ID (Optional)
                </Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 mb-4">
                  <Ionicons name="at-outline" size={18} color="#94A3B8" style={{ marginRight: 6 }} />
                  <TextInput
                    value={upiId}
                    onChangeText={setUpiId}
                    placeholder="e.g. supermart@okhdfcbank"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    className="flex-1 text-md font-semibold text-slate-900 py-1"
                  />
                </View>

                {/* Save QR Settings Button */}
                <TouchableOpacity
                  onPress={handleSaveQrSettings}
                  disabled={savingQr || uploadingQr}
                  activeOpacity={0.85}
                  className="bg-[#1E3A8A] py-4 rounded-2xl items-center flex-row justify-center shadow-lg shadow-[#1E3A8A]/30"
                >
                  {savingQr ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text className="text-white font-black text-xs uppercase tracking-wider">
                        Save Store QR & UPI Settings
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          2. DEDICATED FULL-SCREEN MODAL: DELIVERY CHARGES
          ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showDeliveryModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowDeliveryModal(false)}
      >
        <View className="flex-1 bg-[#F8FAFF]">
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          {/* Top Bar with Back Arrow (Padded for Status Bar / Dynamic Island) */}
          <View
            style={{ paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 50 : 24) }}
            className="px-5 pb-3.5 flex-row items-center justify-between border-b border-slate-100 bg-white shadow-xs"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <TouchableOpacity
                onPress={() => setShowDeliveryModal(false)}
                activeOpacity={0.75}
                className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 justify-center items-center mr-3"
              >
                <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
              </TouchableOpacity>
              <View>
                <Text className="text-xl font-black text-[#1E3A8A] tracking-tight">Delivery Charges</Text>
                <Text className="text-[11px] font-semibold text-slate-400">Fees & Free Shipping Threshold</Text>
              </View>
            </View>

            {deliverySaveSuccess && (
              <View className="flex-row items-center bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Ionicons name="checkmark-circle" size={13} color="#059669" style={{ marginRight: 4 }} />
                <Text className="text-[10px] font-black text-emerald-700">Saved</Text>
              </View>
            )}
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Status Preview Strip */}
              <View className={`rounded-3xl p-4 mb-4 flex-row items-center border ${feeVal === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${feeVal === 0 ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                  <Ionicons
                    name={feeVal === 0 ? "gift" : "bicycle"}
                    size={24}
                    color={feeVal === 0 ? "#059669" : "#1E3A8A"}
                  />
                </View>
                <View className="flex-1">
                  <Text className={`text-sm font-black ${feeVal === 0 ? 'text-emerald-900' : 'text-[#1E3A8A]'}`}>
                    {feeVal === 0
                      ? 'All customer orders qualify for FREE Delivery'
                      : `Orders under ₹${threshVal} pay ₹${feeVal} delivery fee`}
                  </Text>
                  {feeVal > 0 && (
                    <Text className="text-[11px] font-semibold text-slate-500 mt-1">
                      Orders ₹{threshVal}+ unlock 100% Free Express Delivery for customers.
                    </Text>
                  )}
                </View>
              </View>

              {/* Configuration Form Card */}
              <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-6">
                {/* Base Delivery Fee Field */}
                <Text className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Base Delivery Fee (₹)
                </Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 mb-2">
                  <Text className="text-base font-black text-slate-400 mr-2">₹</Text>
                  <TextInput
                    value={deliveryFee}
                    onChangeText={setDeliveryFee}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 text-md font-semibold text-slate-900 py-1"
                  />
                </View>
                {/* Quick presets for delivery fee */}
                <View className="flex-row items-center gap-1.5 mb-5 flex-wrap">
                  <Text className="text-[10px] font-bold text-slate-400 mr-1">Presets:</Text>
                  {[
                    { label: 'Free (₹0)', val: '0' },
                    { label: '₹20', val: '20' },
                    { label: '₹30', val: '30' },
                    { label: '₹40', val: '40' },
                  ].map(p => (
                    <TouchableOpacity
                      key={p.val}
                      onPress={() => setDeliveryFee(p.val)}
                      className={`px-3 py-1.5 rounded-xl border ${deliveryFee === p.val ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'bg-slate-100 border-slate-200'}`}
                    >
                      <Text className={`text-[11px] font-black ${deliveryFee === p.val ? 'text-white' : 'text-slate-700'}`}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Free Delivery Threshold Field */}
                <Text className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Free Delivery on Orders Above (₹)
                </Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 mb-2">
                  <Text className="text-base font-black text-slate-400 mr-2">₹</Text>
                  <TextInput
                    value={freeThreshold}
                    onChangeText={setFreeThreshold}
                    keyboardType="numeric"
                    placeholder="300"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 text-md font-semibold text-slate-900 py-1"
                  />
                </View>
                {/* Quick presets for threshold */}
                <View className="flex-row items-center gap-1.5 mb-6 flex-wrap">
                  <Text className="text-[10px] font-semibold text-slate-400 mr-1">Presets:</Text>
                  {[
                    { label: '₹199', val: '199' },
                    { label: '₹299', val: '299' },
                    { label: '₹499', val: '499' },
                    { label: '₹999', val: '999' },
                  ].map(p => (
                    <TouchableOpacity
                      key={p.val}
                      onPress={() => setFreeThreshold(p.val)}
                      className={`px-3 py-1.5 rounded-xl border ${freeThreshold === p.val ? 'bg-[#1E3A8A] border-[#1E3A8A]' : 'bg-slate-100 border-slate-200'}`}
                    >
                      <Text className={`text-[11px] font-black ${freeThreshold === p.val ? 'text-white' : 'text-slate-700'}`}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  onPress={handleSaveDeliverySettings}
                  disabled={savingDelivery}
                  activeOpacity={0.85}
                  className="bg-[#1E3A8A] py-4 rounded-2xl items-center flex-row justify-center shadow-lg shadow-[#1E3A8A]/30"
                >
                  {savingDelivery ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text className="text-white font-black text-xs uppercase tracking-wider">
                        Save Delivery Settings
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
