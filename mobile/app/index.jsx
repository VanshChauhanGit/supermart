import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StatusBar, ScrollView, Keyboard,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

export default function UnifiedAuthScreen() {
  const router = useRouter();
  const {
    adminUser, customerUser, loginAdmin, loginCustomer,
    apiBaseUrl, setApiBaseUrl, isAuthLoaded
  } = useApp();

  // Primary Auth Mode: 'LOGIN' (Default) | 'REGISTER'
  const [authMode, setAuthMode] = useState('LOGIN');

  // Active Focused Input state for border highlights
  const [focusedField, setFocusedField] = useState(null);

  // Shared Form State (Empty by default)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // ── Inline error message state (replaces Alert.alert) ──────────
  const [errorMsg, setErrorMsg] = useState('');

  // Clear error when switching tabs or typing
  const clearError = () => setErrorMsg('');

  const switchMode = (mode) => {
    setAuthMode(mode);
    clearError();
  };

  // Strictly sanitize mobile input: numbers only, max 10 digits & auto-dismiss keyboard on 10 digits
  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setPhone(cleaned);
    clearError();
    if (cleaned.length === 10) {
      Keyboard.dismiss();
    }
  };

  // Session Auto-Redirect Hook
  useEffect(() => {
    if (!isAuthLoaded) return;
    if (adminUser) {
      router.replace('/admin/dashboard');
    } else if (customerUser) {
      router.replace('/customer');
    }
  }, [isAuthLoaded, adminUser, customerUser]);

  // Loading Gate
  if (!isAuthLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] justify-center items-center">
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <ActivityIndicator size="large" color="#F7C400" />
        <Text className="mt-3 text-[#64748B] font-bold text-xs">
          Opening Supermart...
        </Text>
      </SafeAreaView>
    );
  }

  // ─── Single Unified Login Handler ─────────────────────────────
  const handleUnifiedLogin = async () => {
    const inputPhone = phone.trim();
    const inputPass = password.trim();

    if (!inputPhone || !inputPass) {
      setErrorMsg('Please enter your mobile number and password.');
      return;
    }

    if (inputPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    clearError();
    setLoading(true);

    // Unified Login — single request to /auth/login
    try {
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: inputPhone, password: inputPass })
      });
      const data = await res.json();

      if (data.success) {
        if (data.data?.role === 'SUPER_ADMIN') {
          await loginAdmin(data.data);
          router.replace('/admin/dashboard');
        } else {
          await loginCustomer(data.data, data.token);
          router.replace('/customer');
        }
      } else {
        setErrorMsg(data.message || 'Invalid mobile number or password.');
      }
    } catch (e) {
      setErrorMsg('Cannot connect to server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Customer Register Handler ────────────────────────────────
  const handleCustomerRegister = async () => {
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setErrorMsg('Please fill in your full name, mobile number, and password.');
      return;
    }
    if (phone.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (password.trim().length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    clearError();
    setLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          password: password.trim(),
          role: 'customer'
        })
      });
      const data = await res.json();
      if (data.success) {
        await loginCustomer(data.data, data.token);
        router.replace('/customer');
      } else {
        setErrorMsg(data.message || 'Could not create account. Please try again.');
      }
    } catch (e) {
      setErrorMsg('Cannot connect to server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Inline Error Banner JSX ─────────────────────────────
  const renderErrorBanner = () => {
    if (!errorMsg) return null;
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
          backgroundColor: '#FEF2F2',
          borderWidth: 1,
          borderColor: '#FECACA',
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 12,
          marginBottom: 14,
        }}
      >
        <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginTop: 1 }} />
        <Text
          style={{
            flex: 1,
            color: '#DC2626',
            fontSize: 12,
            fontWeight: '600',
            lineHeight: 18,
          }}
        >
          {errorMsg}
        </Text>
        <TouchableOpacity onPress={clearError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={14} color="#DC2626" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
          className="px-5 pt-3 pb-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {/* ── Brand Header ── */}
            <View className="items-center mt-2 mb-5">
              {/* Yellow Glowing Logo Badge */}
              <View className="w-16 h-16 rounded-full bg-[#F7C400] items-center justify-center mb-3 shadow-md shadow-[#F7C400]/40">
                <Ionicons name="flash-sharp" size={32} color="#111827" />
              </View>

              <Text className="text-2xl font-black text-[#0F172A] tracking-tight">
                SUPERMART
              </Text>

              <View className="flex-row items-center bg-[#FEF3C7] px-3 py-1 rounded-xl mt-1.5 border border-[#FDE68A] gap-1">
                <Ionicons name="flash" size={11} color="#D97706" />
                <Text className="text-[10px] font-extrabold text-[#D97706] tracking-wider uppercase">
                  10-MIN EXPRESS DELIVERY • KIRYANA STORE
                </Text>
              </View>
            </View>

            {/* ── Primary Auth Mode Switcher: LOGIN | REGISTER ── */}
            <View className="bg-[#F1F5F9] p-1 rounded-2xl flex-row mb-5">
              {/* LOGIN TAB (Default) */}
              <TouchableOpacity
                onPress={() => switchMode('LOGIN')}
                activeOpacity={0.85}
                className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-2 ${authMode === 'LOGIN' ? 'bg-white shadow-sm shadow-[#0F172A]/10' : 'bg-transparent'}`}
              >
                <Ionicons name="log-in-outline" size={15} color={authMode === 'LOGIN' ? '#0F172A' : '#64748B'} />
                <Text className={`text-xs font-extrabold tracking-wide ${authMode === 'LOGIN' ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
                  LOGIN
                </Text>
              </TouchableOpacity>

              {/* REGISTER TAB */}
              <TouchableOpacity
                onPress={() => switchMode('REGISTER')}
                activeOpacity={0.85}
                className={`flex-1 py-3 rounded-xl flex-row items-center justify-center gap-2 ${authMode === 'REGISTER' ? 'bg-white shadow-sm shadow-[#0F172A]/10' : 'bg-transparent'}`}
              >
                <Ionicons name="person-add-outline" size={15} color={authMode === 'REGISTER' ? '#0F172A' : '#64748B'} />
                <Text className={`text-xs font-extrabold tracking-wide ${authMode === 'REGISTER' ? 'text-[#0F172A]' : 'text-[#64748B]'}`}>
                  REGISTER
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Main Auth Card ── */}
            <View className="bg-white rounded-3xl p-5 border border-[#E2E8F0] shadow-md shadow-[#0F172A]/5 mb-4">

              {/* ══════════════════════════════════════════════════════════
                  VIEW 1: UNIFIED LOGIN (Single Form using Mobile & Password)
                  ══════════════════════════════════════════════════════════ */}
              {authMode === 'LOGIN' ? (
                <View>
                  <View className="items-center mb-5">
                    <Text className="text-lg font-black text-[#0F172A] tracking-tight">
                      Welcome Back
                    </Text>
                    <Text className="text-xs text-[#64748B] font-medium text-center mt-1">
                      Sign in with your Mobile Number & Password
                    </Text>
                  </View>

                  {/* 1. Mobile Phone Number */}
                  <View className="mb-4">
                    <Text className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider mb-2">
                      Mobile Number *
                    </Text>
                    <View className={`flex-row items-center bg-[#F8FAFC] border ${focusedField === 'phone' ? 'border-[#F7C400]' : 'border-[#E2E8F0]'} rounded-xl px-3.5 h-12`}>
                      <Ionicons name="call-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        className="flex-1 h-full text-md font-semibold text-[#0F172A] py-0"
                        value={phone}
                        onChangeText={handlePhoneChange}
                        onFocus={() => setFocusedField('phone')}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="phone-pad"
                        maxLength={10}
                        placeholder="e.g. 9876543210"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  {/* 2. Password */}
                  <View className="mb-4">
                    <Text className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider mb-2">
                      Password *
                    </Text>
                    <View className={`flex-row items-center bg-[#F8FAFC] border ${focusedField === 'password' ? 'border-[#F7C400]' : 'border-[#E2E8F0]'} rounded-xl px-3.5 h-12`}>
                      <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        className="flex-1 h-full text-md font-semibold text-[#0F172A] py-0"
                        value={password}
                        onChangeText={(t) => { setPassword(t); clearError(); }}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="Enter password"
                        placeholderTextColor="#94A3B8"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1 ml-1">
                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Quick Demo Pre-fill Shortcuts */}
                  <View className="flex-row justify-end gap-2 mb-5">
                    <TouchableOpacity
                      onPress={() => { setPhone('9389401218'); setPassword('Asdf@1234'); clearError(); Keyboard.dismiss(); }}
                      activeOpacity={0.75}
                      className="bg-[#FFFBEB] px-3 py-1.5 rounded-lg border border-[#FCD34D] flex-row items-center gap-1"
                    >
                      <Ionicons name="bag-handle-outline" size={12} color="#B45309" />
                      <Text className="text-[11px] font-extrabold text-[#B45309]">
                        Customer Demo
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => { setPhone('9999999999'); setPassword('supermart123'); clearError(); Keyboard.dismiss(); }}
                      activeOpacity={0.75}
                      className="bg-[#FFFBEB] px-3 py-1.5 rounded-lg border border-[#FCD34D] flex-row items-center gap-1"
                    >
                      <Ionicons name="shield-checkmark-outline" size={12} color="#B45309" />
                      <Text className="text-[11px] font-extrabold text-[#B45309]">
                        Admin Demo
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* ── Inline Error Banner ── */}
                  {renderErrorBanner()}

                  {/* Submit Single Login Button */}
                  <TouchableOpacity
                    onPress={handleUnifiedLogin}
                    disabled={loading}
                    activeOpacity={0.85}
                    className="bg-[#F7C400] h-12 rounded-xl items-center justify-center shadow-md shadow-[#F7C400]/40"
                  >
                    {loading ? (
                      <ActivityIndicator color="#111827" />
                    ) : (
                      <View className="flex-row items-center gap-2">
                        <Text className="text-[#111827] text-sm font-black tracking-wide uppercase">
                          SIGN IN
                        </Text>
                        <Ionicons name="arrow-forward-outline" size={16} color="#111827" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Switch to Register Link */}
                  <TouchableOpacity
                    onPress={() => switchMode('REGISTER')}
                    activeOpacity={0.7}
                    className="items-center mt-4"
                  >
                    <Text className="text-xs font-semibold text-[#64748B]">
                      Don&apos;t have an account? <Text className="text-[#D97706] font-extrabold">Register Now</Text>
                    </Text>
                  </TouchableOpacity>
                </View>

              ) : (

                /* ══════════════════════════════════════════════════════════
                    VIEW 2: REGISTER (Customer Registration Only)
                    ══════════════════════════════════════════════════════════ */
                <View>
                  <View className="items-center mb-5">
                    <Text className="text-lg font-black text-[#0F172A] tracking-tight">
                      Create Account
                    </Text>
                    <Text className="text-xs text-[#64748B] font-medium text-center mt-1">
                      Sign up with your Name & Mobile Number
                    </Text>
                  </View>

                  {/* 1. Full Name */}
                  <View className="mb-4">
                    <Text className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider mb-2">
                      Full Name *
                    </Text>
                    <View className={`flex-row items-center bg-[#F8FAFC] border ${focusedField === 'name' ? 'border-[#F7C400]' : 'border-[#E2E8F0]'} rounded-xl px-3.5 h-12`}>
                      <Ionicons name="person-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        className="flex-1 h-full text-md font-semibold text-[#0F172A] py-0"
                        value={name}
                        onChangeText={(t) => { setName(t); clearError(); }}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="e.g. Vansh Chauhan"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  {/* 2. Mobile Phone */}
                  <View className="mb-4">
                    <Text className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider mb-2">
                      Mobile Phone *
                    </Text>
                    <View className={`flex-row items-center bg-[#F8FAFC] border ${focusedField === 'regPhone' ? 'border-[#F7C400]' : 'border-[#E2E8F0]'} rounded-xl px-3.5 h-12`}>
                      <Ionicons name="call-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        className="flex-1 h-full text-md font-semibold text-[#0F172A] py-0"
                        value={phone}
                        onChangeText={handlePhoneChange}
                        onFocus={() => setFocusedField('regPhone')}
                        onBlur={() => setFocusedField(null)}
                        keyboardType="phone-pad"
                        maxLength={10}
                        placeholder="e.g. 9876543210"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  {/* 3. Password */}
                  <View className="mb-5">
                    <Text className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider mb-2">
                      Password *
                    </Text>
                    <View className={`flex-row items-center bg-[#F8FAFC] border ${focusedField === 'regPass' ? 'border-[#F7C400]' : 'border-[#E2E8F0]'} rounded-xl px-3.5 h-12`}>
                      <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        className="flex-1 h-full text-md font-semibold text-[#0F172A] py-0"
                        value={password}
                        onChangeText={(t) => { setPassword(t); clearError(); }}
                        onFocus={() => setFocusedField('regPass')}
                        onBlur={() => setFocusedField(null)}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="Create password (min. 4 chars)"
                        placeholderTextColor="#94A3B8"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1 ml-1">
                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* ── Inline Error Banner ── */}
                  {renderErrorBanner()}

                  {/* Submit Register Button */}
                  <TouchableOpacity
                    onPress={handleCustomerRegister}
                    disabled={loading}
                    activeOpacity={0.85}
                    className="bg-[#F7C400] h-12 rounded-xl items-center justify-center shadow-md shadow-[#F7C400]/40"
                  >
                    {loading ? (
                      <ActivityIndicator color="#111827" />
                    ) : (
                      <View className="flex-row items-center gap-2">
                        <Text className="text-[#111827] text-sm font-black tracking-wide">
                          REGISTER ACCOUNT
                        </Text>
                        <Ionicons name="arrow-forward-outline" size={16} color="#111827" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Switch to Login Link */}
                  <TouchableOpacity
                    onPress={() => switchMode('LOGIN')}
                    activeOpacity={0.7}
                    className="items-center mt-4"
                  >
                    <Text className="text-xs font-semibold text-[#64748B]">
                      Already have an account? <Text className="text-[#D97706] font-extrabold">Sign In</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          </View>

          {/* ── Footer ── */}
          <View className="items-center py-2">
            <Text className="text-[11px] text-[#94A3B8] font-semibold">
              Supermart POS & Delivery System © 2026
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
