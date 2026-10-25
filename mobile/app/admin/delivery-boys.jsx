import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  Linking,
  Switch,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';

export default function AdminDeliveryBoysScreen() {
  const insets = useSafeAreaInsets();
  const { apiBaseUrl } = useApp();

  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingBoy, setEditingBoy] = useState(null); // null = Add, object = Edit

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formVehicleNo, setFormVehicleNo] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchDeliveryBoys = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/auth/admin/delivery-boys`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDeliveryBoys(data.data);
      }
    } catch (e) {
      console.warn('Could not fetch delivery boys:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchDeliveryBoys();
  }, [fetchDeliveryBoys]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveryBoys();
  };

  const openAddModal = () => {
    setEditingBoy(null);
    setFormName('');
    setFormPhone('');
    setFormPassword('');
    setShowPassword(false);
    setFormVehicleNo('');
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (boy) => {
    setEditingBoy(boy);
    setFormName(boy.name || '');
    setFormPhone(boy.mobile || '');
    setFormPassword(''); // blank means do not change password
    setShowPassword(false);
    setFormVehicleNo(boy.vehicleNumber || '');
    setFormIsActive(boy.isActive !== false);
    setShowModal(true);
  };

  const handleSaveDeliveryBoy = async () => {
    const trimmedName = formName.trim();
    const trimmedPhone = formPhone.replace(/\D/g, '').slice(0, 10);
    const trimmedPassword = formPassword.trim();
    const trimmedVehicleNo = formVehicleNo.trim();

    if (!trimmedName || trimmedName.length < 2) {
      Alert.alert('Required Field', 'Please enter delivery partner full name (at least 2 letters).');
      return;
    }

    if (!trimmedPhone || trimmedPhone.length !== 10) {
      Alert.alert('Invalid Mobile', 'Please provide a valid 10-digit mobile number.');
      return;
    }

    if (!editingBoy && (!trimmedPassword || trimmedPassword.length < 4)) {
      Alert.alert('Required Password', 'Please set a login password of at least 4 characters for this delivery partner.');
      return;
    }

    setSubmitting(true);
    try {
      let url = `${apiBaseUrl}/auth/admin/delivery-boys`;
      let method = 'POST';

      const payload = {
        name: trimmedName,
        mobile: trimmedPhone,
        vehicleNumber: trimmedVehicleNo,
      };

      if (trimmedPassword) {
        payload.password = trimmedPassword;
      }

      if (editingBoy) {
        url = `${apiBaseUrl}/auth/admin/delivery-boys/${editingBoy._id}`;
        method = 'PUT';
        payload.isActive = formIsActive;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_e) {}
        Alert.alert(
          editingBoy ? 'Updated Successfully! ✅' : 'Fleet Member Created! 🛵',
          editingBoy
            ? `Delivery Partner ${trimmedName} has been updated.`
            : `Delivery Boy account for ${trimmedName} is ready. They can now login with their phone and password.`
        );
        setShowModal(false);
        fetchDeliveryBoys();
      } else {
        Alert.alert('Action Failed', data.message || 'Could not save delivery boy.');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Could not save delivery boy account: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDeliveryBoy = (boy) => {
    if (boy.isBusy) {
      Alert.alert(
        'Cannot Delete Partner',
        `${boy.name} is currently out on delivery for Order #${boy.activeOrder?.orderNo}. Please wait until delivery is completed.`
      );
      return;
    }

    Alert.alert(
      'Remove Delivery Partner',
      `Are you sure you want to delete ${boy.name} (+91 ${boy.mobile}) from your delivery fleet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${apiBaseUrl}/auth/admin/delivery-boys/${boy._id}`, {
                method: 'DELETE'
              });
              const data = await res.json();
              if (data.success) {
                try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_e) {}
                fetchDeliveryBoys();
              } else {
                Alert.alert('Delete Failed', data.message || 'Could not remove delivery boy.');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete delivery partner.');
            }
          }
        }
      ]
    );
  };

  const callPartner = (mobile) => {
    if (!mobile) return;
    Linking.openURL(`tel:+91${mobile}`).catch(() => {
      Alert.alert('Error', 'Could not open phone dialer.');
    });
  };

  const busyCount = deliveryBoys.filter(b => b.isBusy).length;
  const availableCount = deliveryBoys.filter(b => !b.isBusy && b.isActive !== false).length;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFF]">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header with Back Navigation and Add Action */}
      <View
        className="px-5 py-3.5 flex-row items-center justify-between border-b border-slate-100 bg-white shadow-xs"
      >
        <View className="flex-row items-center flex-1 mr-3">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.75}
            className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 justify-center items-center mr-3"
          >
            <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-black text-[#1E3A8A] tracking-tight">Delivery Boys</Text>
            <Text className="text-[11px] font-semibold text-slate-400">
              {deliveryBoys.length} fleet member{deliveryBoys.length === 1 ? '' : 's'} registered
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={openAddModal}
          activeOpacity={0.85}
          className="bg-[#1E3A8A] px-3.5 py-2 rounded-xl flex-row items-center shadow-sm"
        >
          <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text className="text-white font-black text-xs uppercase tracking-wider">+ Add Boy</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <FlatList
        data={deliveryBoys}
        keyExtractor={item => item._id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View className="mb-4">
            {/* Quick Metrics Bar */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs items-center">
                <Text className="text-2xl font-black text-slate-900">{deliveryBoys.length}</Text>
                <Text className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Total Fleet</Text>
              </View>
              <View className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs items-center">
                <Text className="text-2xl font-black text-emerald-600">{availableCount}</Text>
                <Text className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Available</Text>
              </View>
              <View className="flex-1 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs items-center">
                <Text className="text-2xl font-black text-amber-600">{busyCount}</Text>
                <Text className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Delivering</Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          loading ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text className="text-xs font-bold text-slate-400 mt-2">Loading delivery partners...</Text>
            </View>
          ) : (
            <View className="py-16 items-center justify-center px-6 bg-white rounded-3xl border border-slate-200 mt-2">
              <View className="w-16 h-16 rounded-2xl bg-amber-50 items-center justify-center mb-3">
                <Ionicons name="bicycle" size={32} color="#D97706" />
              </View>
              <Text className="text-base font-black text-slate-800 text-center">No Delivery Boys Added Yet</Text>
              <Text className="text-xs text-slate-400 text-center mt-1 mb-4 leading-relaxed">
                Add delivery boys so you can dispatch customer orders directly to their mobile app.
              </Text>
              <TouchableOpacity
                onPress={openAddModal}
                activeOpacity={0.85}
                className="bg-[#1E3A8A] px-5 py-3 rounded-2xl flex-row items-center shadow-md shadow-[#1E3A8A]/30"
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text className="text-white font-black text-xs uppercase tracking-wider">Add First Delivery Boy</Text>
              </TouchableOpacity>
            </View>
          )
        )}
        renderItem={({ item }) => {
          const isBusy = item.isBusy;
          const isActive = item.isActive !== false;

          return (
            <View className="bg-white rounded-3xl p-4 mb-3 border border-slate-200 shadow-sm">
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-center flex-1 mr-2">
                  <View className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-200 items-center justify-center mr-3 shadow-xs">
                    <Ionicons name="bicycle" size={22} color="#B45309" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-black text-slate-900" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-xs font-bold text-slate-500 mt-0.5">
                      +91 {item.mobile}
                    </Text>
                    {item.vehicleNumber ? (
                      <View className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 mt-1 self-start">
                        <Text className="text-[10px] font-mono font-black text-slate-700 uppercase">
                          {item.vehicleNumber}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Status Badge */}
                <View className={`px-2.5 py-1 rounded-full ${
                  isBusy
                    ? 'bg-amber-100 border border-amber-200'
                    : isActive
                      ? 'bg-emerald-100 border border-emerald-200'
                      : 'bg-slate-100 border border-slate-200'
                }`}>
                  <Text className={`text-[10px] font-black uppercase ${
                    isBusy
                      ? 'text-amber-900'
                      : isActive
                        ? 'text-emerald-900'
                        : 'text-slate-500'
                  }`}>
                    {isBusy ? `Delivering #${item.activeOrder?.orderNo}` : isActive ? 'Available' : 'Inactive'}
                  </Text>
                </View>
              </View>

              {/* Action Buttons Bar: Call, Edit, Delete */}
              <View className="flex-row items-center justify-between pt-3 mt-3 border-t border-slate-100">
                <TouchableOpacity
                  onPress={() => callPartner(item.mobile)}
                  activeOpacity={0.7}
                  className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex-row items-center"
                >
                  <Ionicons name="call" size={13} color="#059669" style={{ marginRight: 4 }} />
                  <Text className="text-[11px] font-black text-emerald-700">Call</Text>
                </TouchableOpacity>

                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => openEditModal(item)}
                    activeOpacity={0.7}
                    className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl flex-row items-center"
                  >
                    <Ionicons name="create-outline" size={13} color="#1E3A8A" style={{ marginRight: 4 }} />
                    <Text className="text-[11px] font-black text-[#1E3A8A]">Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteDeliveryBoy(item)}
                    activeOpacity={0.7}
                    className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex-row items-center"
                  >
                    <Ionicons name="trash-outline" size={13} color="#DC2626" style={{ marginRight: 4 }} />
                    <Text className="text-[11px] font-black text-rose-600">Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ══════════════════════════════════════════════════════
          ADD / EDIT DELIVERY BOY FULL MODAL
          ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-[#F8FAFF]">
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          {/* Top Bar with Back Arrow */}
          <View
            style={{ paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 48 : 20) }}
            className="px-5 pb-3.5 flex-row items-center justify-between border-b border-slate-100 bg-white shadow-xs"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                activeOpacity={0.75}
                className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 justify-center items-center mr-3"
              >
                <Ionicons name="arrow-back" size={20} color="#1E3A8A" />
              </TouchableOpacity>
              <View>
                <Text className="text-xl font-black text-[#1E3A8A] tracking-tight">
                  {editingBoy ? 'Edit Delivery Partner' : 'Add Delivery Boy'}
                </Text>
                <Text className="text-[11px] font-semibold text-slate-400">
                  {editingBoy ? `Update ${editingBoy.name}'s details` : 'Create app login credentials'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowModal(false)}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Form Card */}
              <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-6">
                
                {/* 1. Full Name */}
                <Text className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name *
                </Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 mb-4">
                  <Ionicons name="person-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                  <TextInput
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="e.g. Ramesh Kumar"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 text-md font-bold text-slate-900 py-1"
                  />
                </View>

                {/* 2. Mobile Phone Number */}
                <Text className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Mobile Number (10 digits) *
                </Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 mb-4">
                  <Ionicons name="call-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                  <TextInput
                    value={formPhone}
                    onChangeText={(t) => setFormPhone(t.replace(/\D/g, '').slice(0, 10))}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 text-md font-bold text-slate-900 py-1"
                  />
                </View>

                {/* 3. Login Password (with EYE on/off toggle!) */}
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    {editingBoy ? 'New Password (Optional)' : 'Login Password *'}
                  </Text>
                  {editingBoy ? (
                    <Text className="text-[10px] text-slate-400 font-semibold">
                      Leave blank to keep current
                    </Text>
                  ) : null}
                </View>

                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 mb-4">
                  <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                  <TextInput
                    value={formPassword}
                    onChangeText={setFormPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={editingBoy ? 'Enter new password to change' : 'Set rider app password'}
                    placeholderTextColor="#94A3B8"
                    className="flex-1 text-md font-bold text-slate-900 py-1"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    className="p-1"
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#1E3A8A"
                    />
                  </TouchableOpacity>
                </View>

                {/* 4. Vehicle Plate Number */}
                <Text className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Vehicle Plate Number (Optional)
                </Text>
                <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 mb-4">
                  <Ionicons name="card-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                  <TextInput
                    value={formVehicleNo}
                    onChangeText={setFormVehicleNo}
                    autoCapitalize="characters"
                    placeholder="e.g. DL-01-AB-1234"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 text-md font-bold text-slate-900 py-1"
                  />
                </View>

                {/* 6. Active Account Switch (when editing) */}
                {editingBoy && (
                  <View className="flex-row items-center justify-between py-3 px-1 mb-4 border-t border-slate-100">
                    <View>
                      <Text className="text-xs font-black text-slate-800">Account Active</Text>
                      <Text className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Can accept new deliveries and log into app
                      </Text>
                    </View>
                    <Switch
                      value={formIsActive}
                      onValueChange={setFormIsActive}
                      trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                      thumbColor={formIsActive ? '#1E3A8A' : '#94A3B8'}
                    />
                  </View>
                )}

                {/* Save / Create Button */}
                <TouchableOpacity
                  onPress={handleSaveDeliveryBoy}
                  disabled={submitting}
                  activeOpacity={0.85}
                  className="bg-[#1E3A8A] py-4 rounded-2xl items-center flex-row justify-center shadow-lg shadow-[#1E3A8A]/30 mt-2"
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name={editingBoy ? 'checkmark-circle-outline' : 'person-add-outline'}
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-white font-black text-xs uppercase tracking-wider">
                        {editingBoy ? 'SAVE PARTNER CHANGES' : 'CREATE DELIVERY BOY ACCOUNT'}
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
