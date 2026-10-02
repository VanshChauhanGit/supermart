import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  const { adminUser, logoutAdmin, apiBaseUrl } = useApp();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

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

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-[#F8FAFF]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFF" />

      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-3xl font-black text-slate-900">Profile</Text>
        <Text className="text-xs text-slate-400 font-semibold mt-0.5">Store settings & account</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Store Owner Avatar Card */}
        <View className="bg-[#1E3A8A] rounded-3xl p-5 mb-6 flex-row items-center shadow-2xl shadow-[#1E3A8A]/40">
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

        {/* Store Management Section */}
        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Store Management</Text>
        <MenuItem icon="cube-outline"    iconBg="bg-blue-50"    iconColor="#1E3A8A" title="Manage Catalog & Stock"  subtitle="Add products, update prices & stock"     onPress={() => router.push('/admin/inventory')} />
        <MenuItem icon="pricetag-outline" iconBg="bg-fuchsia-50" iconColor="#7C3AED" title="Offers & Promo Codes"    subtitle="Create discount codes and deals"         onPress={() => router.push('/admin/offers')} />
        <MenuItem icon="grid-outline"    iconBg="bg-sky-50"    iconColor="#0369A1" title="Manage Categories"       subtitle="Add & organize product categories"      onPress={() => router.push('/admin/categories')} />
        <MenuItem icon="bicycle-outline" iconBg="bg-green-50"  iconColor="#16A34A" title="Delivery Orders"         subtitle="Accept & fulfill customer orders"        onPress={() => router.push('/admin/orders')} />

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

        {/* Server Connection */}
        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 mt-5">Server Connection</Text>
        <View className="bg-white rounded-2xl p-3.5 mb-2 border border-slate-100">
          <View className="flex-row items-center mb-2.5">
            <View className="w-10 h-10 rounded-xl bg-green-50 items-center justify-center mr-3">
              <Ionicons name="server-outline" size={20} color="#16A34A" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-slate-900">API Server</Text>
              <Text className="text-[11px] text-slate-400 font-medium mt-0.5">Backend endpoint config</Text>
            </View>
            <View className="flex-row items-center bg-green-50 px-2 py-1 rounded-lg">
              <View className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1" />
              <Text className="text-[10px] font-black text-green-700">Online</Text>
            </View>
          </View>
          <View className="bg-slate-50 rounded-xl p-2.5 border border-slate-200">
            <Text className="text-xs font-semibold text-slate-500" numberOfLines={1}>{apiBaseUrl}</Text>
          </View>
        </View>

        {/* App Info */}
        <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 mt-5">App Info</Text>
        <View className="bg-white rounded-2xl p-3.5 mb-2 border border-slate-100">
          {[
            { label: 'App Name', value: 'Supermart POS' },
            { label: 'Version', value: '2.0.0' },
            { label: 'Role', value: adminUser?.role || 'SUPER_ADMIN' },
            { label: 'Platform', value: 'Expo React Native' },
          ].map((item, i, arr) => (
            <View key={i} className={`flex-row justify-between py-2 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <Text className="text-xs text-slate-400 font-semibold">{item.label}</Text>
              <Text className="text-xs text-slate-900 font-bold">{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Logout */}
        <View className="mt-5">
          <MenuItem icon="log-out-outline" iconBg="bg-red-50" iconColor="#EF4444" title="Logout" subtitle="End your admin session" onPress={handleLogout} danger />
        </View>

        <Text className="text-center text-xs text-slate-300 font-semibold mt-5">
          Supermart Store Owner Portal · Protected Session
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}
