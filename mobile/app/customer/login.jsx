import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  ActivityIndicator, StatusBar, ScrollView, Keyboard, 
  KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

export default function CustomerLoginScreen() {
  const { loginCustomer, setCustomerUser, apiBaseUrl, setApiBaseUrl } = useApp();
  const scrollViewRef = useRef(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [serverUrlInput, setServerUrlInput] = useState(apiBaseUrl);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingServer, setTestingServer] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToField = (yOffset) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 120);
  };

  const handlePhoneChange = (val) => {
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 10);
    setPhone(cleaned);
    if (cleaned.length === 10) {
      Keyboard.dismiss();
    }
  };

  const handleTestServer = async () => {
    setTestingServer(true);
    try {
      const targetUrl = serverUrlInput.trim();
      const healthUrl = targetUrl.replace('/api/v1', '/api/health');
      const res = await fetch(healthUrl);
      const data = await res.json();
      if (data.status === 'ONLINE') {
        setApiBaseUrl(targetUrl);
        Alert.alert('Server Online', `Connected to Express API Backend at ${targetUrl}\nMongoDB State: ${data.mongoState}`);
      } else {
        Alert.alert('Response Error', 'Server is running but returned unexpected health status.');
      }
    } catch (e) {
      Alert.alert('Connection Error', `Could not reach Express server at ${serverUrlInput}.`);
    } finally {
      setTestingServer(false);
    }
  };

  const handleLogin = async () => {
    if (!name.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter your Full Name, 10-digit Mobile Number, and Password');
      return;
    }
    if (phone.trim().length < 10) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile phone number.');
      return;
    }
    if (password.trim().length < 4) {
      Alert.alert('Invalid Password', 'Password must be at least 4 characters long.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          password: password.trim(),
          fatherName: fatherName.trim(),
          role: 'customer'
        })
      });
      const data = await res.json();
      if (data.success) {
        if (loginCustomer) await loginCustomer(data.data, data.token);
        else setCustomerUser(data.data);
        router.replace('/customer');
      } else {
        Alert.alert('Registration Error', data.message || 'Failed to authenticate customer session');
      }
    } catch (e) {
      const fallbackUser = {
        name: name.trim(),
        phone: phone.trim(),
        fatherName: fatherName.trim(),
        creditBalance: 0,
        totalPurchases: 0
      };
      if (loginCustomer) await loginCustomer(fallbackUser, null);
      else setCustomerUser(fallbackUser);
      router.replace('/customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8F8]">
      <StatusBar barStyle="dark-content" backgroundColor="#F4F8F8" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={{ 
            flexGrow: 1, 
            paddingBottom: isKeyboardVisible ? 280 : 32,
            justifyContent: isKeyboardVisible ? 'flex-start' : 'space-between' 
          }} 
          className="px-5 py-4"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar */}
          <View className="flex-row justify-between items-center mb-3">
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200 justify-center items-center shadow-sm"
            >
              <Ionicons name="arrow-back" size={18} color="#1E293B" />
            </TouchableOpacity>

            <View className="flex-row items-center bg-[#CAE8E8] px-3 py-1.5 rounded-full border border-[#96C7C7]">
              <Ionicons name="flash" size={12} color="#1E367D" style={{ marginRight: 4 }} />
              <Text className="text-[11px] font-black text-[#1E367D]">30-Min Delivery Ready</Text>
            </View>
          </View>

          {/* Main Card */}
          <View className={`bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl shadow-[#28469E]/10 ${isKeyboardVisible ? 'mb-4' : 'my-auto'}`}>
            
            {/* Header */}
            <View className={`items-center ${isKeyboardVisible ? 'mb-3' : 'mb-6'}`}>
              {!isKeyboardVisible && (
                <View className="w-16 h-16 rounded-3xl bg-[#CAE8E8] items-center justify-center mb-2.5 border-4 border-[#96C7C7] shadow-inner p-3">
                  <Ionicons name="bag-handle" size={28} color="#1E367D" />
                </View>
              )}
              <Text className="text-xl font-black text-slate-900 tracking-tight">Customer Registration</Text>
              <Text className="text-xs text-slate-500 font-medium text-center mt-0.5">
                Shop online groceries & kiryana store items
              </Text>
            </View>

            {/* Form Fields */}
            <View className="space-y-3 mb-3">
              
              <View>
                <Text className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Your Full Name</Text>
                <View className="flex-row items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-3.5">
                  <Ionicons name="person-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                  <TextInput
                    className="flex-1 text-sm font-bold text-slate-900 py-0"
                    value={name}
                    onChangeText={setName}
                    onFocus={() => scrollToField(60)}
                    placeholder="Your Name"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View className="mt-3">
                <Text className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Father's Name (Optional)</Text>
                <View className="flex-row items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-3.5">
                  <Ionicons name="people-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                  <TextInput
                    className="flex-1 text-sm font-bold text-slate-900 py-0"
                    value={fatherName}
                    onChangeText={setFatherName}
                    onFocus={() => scrollToField(120)}
                    placeholder="e.g. Rajesh Chauhan"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View className="mt-3">
                <Text className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1.5">10-Digit Mobile Phone</Text>
                <View className="flex-row items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-3.5">
                  <Ionicons name="call-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                  <TextInput
                    className="flex-1 text-sm font-bold text-slate-900 py-0"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    onFocus={() => scrollToField(180)}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View className="mt-3">
                <Text className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Password</Text>
                <View className="flex-row items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-3.5">
                  <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                  <TextInput
                    className="flex-1 text-sm font-bold text-slate-900 py-0"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => scrollToField(240)}
                    secureTextEntry
                    placeholder="Enter password"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
              className="bg-[#28469E] py-4 rounded-2xl items-center shadow-xl shadow-[#28469E]/30 mb-3 flex-row justify-center"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View className="flex-row items-center">
                  <Text className="text-white font-black text-base tracking-wide uppercase">
                    REGISTER & ENTER STORE
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Server Config Toggle */}
            <TouchableOpacity 
              onPress={() => setShowServerConfig(!showServerConfig)}
              className="pt-2 items-center flex-row justify-center gap-1.5"
            >
              <Ionicons name="settings-outline" size={13} color="#28469E" />
              <Text className="text-xs font-bold text-[#28469E]">
                {showServerConfig ? 'Hide Server Settings' : 'API Server Connection Settings'}
              </Text>
            </TouchableOpacity>

            {/* Server Connection Box */}
            {showServerConfig && (
              <View className="mt-3 p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200">
                <Text className="text-xs font-bold text-slate-700 mb-1">Backend REST API Endpoint:</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 mb-2.5"
                  value={serverUrlInput}
                  onChangeText={setServerUrlInput}
                  autoCapitalize="none"
                  placeholder="http://localhost:5000/api/v1"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  onPress={handleTestServer}
                  disabled={testingServer}
                  className="bg-[#28469E] py-2.5 rounded-xl items-center flex-row justify-center gap-1.5"
                >
                  {testingServer ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="radio-outline" size={14} color="#FFFFFF" />
                      <Text className="text-white text-xs font-bold">Test Connection</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

          </View>

          {/* Footer info */}
          {!isKeyboardVisible && (
            <View className="items-center mt-2">
              <Text className="text-[11px] text-slate-400 font-semibold text-center">
                Mandhaur Supermart Online Storefront • 30-Min Express Kiryana Delivery
              </Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

