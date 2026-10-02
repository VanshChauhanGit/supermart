import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, StatusBar, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

export default function CustomerProfileScreen() {
  const insets = useSafeAreaInsets();
  const { cart, customerUser, logoutCustomer, apiBaseUrl, setApiBaseUrl } = useApp();
  const [serverUrlInput, setServerUrlInput] = useState(apiBaseUrl);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [testingServer, setTestingServer] = useState(false);

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleTestServer = async () => {
    setTestingServer(true);
    try {
      const targetUrl = serverUrlInput.trim();
      const healthUrl = targetUrl.replace('/api/v1', '/api/health');
      const res = await fetch(healthUrl);
      const data = await res.json();
      if (data.status === 'ONLINE') {
        setApiBaseUrl(targetUrl);
        Alert.alert('Server Online 🟢', `Connected to Express API Backend at ${targetUrl}\nMongoDB State: ${data.mongoState}`);
      } else {
        Alert.alert('Response Error', 'Server is running but returned unexpected health status.');
      }
    } catch (e) {
      Alert.alert('Connection Error 🔴', `Could not reach Express server at ${serverUrlInput}.`);
    } finally {
      setTestingServer(false);
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Logout Account',
      `Are you sure you want to log out of ${customerUser?.name || 'your account'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            if (logoutCustomer) await logoutCustomer();
            router.replace('/');
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Title Bar */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 }}>
          My Account Profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Modern Profile Hero Card ── */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 3,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Avatar Circle with Gold Border */}
            <View style={{ position: 'relative', marginRight: 16 }}>
              <View style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: '#1E293B',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: '#F7C400',
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '900' }}>
                  {customerUser?.name ? customerUser.name.charAt(0).toUpperCase() : 'C'}
                </Text>
              </View>
              <View style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                backgroundColor: '#F7C400',
                borderRadius: 10,
                width: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: '#FFFFFF',
              }}>
                <Ionicons name="checkmark-sharp" size={12} color="#111827" />
              </View>
            </View>

            {/* User Info */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                {customerUser?.name || 'Customer'}
              </Text>
              {customerUser?.fatherName ? (
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 1 }}>
                  S/O: {customerUser.fatherName}
                </Text>
              ) : null}
              <View style={{
                alignSelf: 'flex-start',
                backgroundColor: '#F1F5F9',
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 12,
                marginTop: 6,
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155' }}>
                  📞 +91 {customerUser?.phone || '9876543210'}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#F8FAFC',
            borderRadius: 18,
            marginTop: 16,
            paddingVertical: 12,
            paddingHorizontal: 8,
            borderWidth: 1,
            borderColor: '#F1F5F9',
          }}>
            <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                Credit Limit
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#0F172A', marginTop: 2 }}>
                ₹{(customerUser?.creditLimit || 5000).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E2E8F0' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                Delivery Speed
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#16A34A', marginTop: 2 }}>
                ⚡ 10 Mins
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                Cart Items
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#F59E0B', marginTop: 2 }}>
                {totalCartCount} {totalCartCount === 1 ? 'Item' : 'Items'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Quick Navigation Shortcuts ── */}
        <Text style={{ fontSize: 11, fontWeight: '900', color: '#64748B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
          Quick Shortcuts
        </Text>

        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          padding: 8,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}>
          {/* Orders */}
          <TouchableOpacity
            onPress={() => router.push('/customer/orders')}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
            }}
          >
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Ionicons name="receipt" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>My Orders</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 1 }}>Track deliveries & view past invoices</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Cart */}
          <TouchableOpacity
            onPress={() => router.push('/customer/cart')}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
            }}
          >
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Ionicons name="cart" size={20} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>My Delivery Cart</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 1 }}>{totalCartCount} items waiting in cart</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Udhar Account */}
          <TouchableOpacity
            onPress={() => router.push('/customer/udhar')}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
            }}
          >
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Ionicons name="wallet" size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Udhar Khata & Credit</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 1 }}>Pay later balance & instant ledger</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* ── Settings & Developer Config ── */}
        <Text style={{ fontSize: 11, fontWeight: '900', color: '#64748B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
          Preferences & Backend
        </Text>

        <TouchableOpacity 
          onPress={() => setShowServerConfig(!showServerConfig)}
          activeOpacity={0.8}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 14,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="server" size={18} color="#334155" />
            </View>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0F172A' }}>API Server Endpoint</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B' }}>Configure Express Backend URL</Text>
            </View>
          </View>
          <Ionicons name={showServerConfig ? "chevron-up" : "chevron-down"} size={18} color="#64748B" />
        </TouchableOpacity>

        {showServerConfig && (
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 16,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 }}>
              Backend REST API Endpoint:
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 12,
                fontWeight: '600',
                color: '#0F172A',
                marginBottom: 12,
              }}
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              autoCapitalize="none"
              placeholder="http://localhost:5000/api/v1"
              placeholderTextColor="#94A3B8"
            />
            <TouchableOpacity
              onPress={handleTestServer}
              disabled={testingServer}
              style={{
                backgroundColor: '#1E293B',
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {testingServer ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                  📡 Test & Save Connection
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Logout Button ── */}
        <TouchableOpacity
          onPress={handleLogoutPress}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#FEF2F2',
            borderWidth: 1.5,
            borderColor: '#FECACA',
            paddingVertical: 14,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            marginTop: 8,
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '900', letterSpacing: 0.2 }}>
            LOGOUT ACCOUNT
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
