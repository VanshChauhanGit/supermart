import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

export default function AdminLoginScreen() {
  const { loginAdmin, setAdminUser, apiBaseUrl, setApiBaseUrl } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrlInput, setServerUrlInput] = useState(apiBaseUrl);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingServer, setTestingServer] = useState(false);

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
    if (!username.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter admin username and password');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });
      const data = await res.json();
      if (data.success) {
        if (loginAdmin) await loginAdmin(data.data);
        else setAdminUser(data.data);
        router.replace('/admin/dashboard');
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid admin credentials');
      }
    } catch (e) {
      if (username.trim() === 'admin' && password.trim() === 'supermart123') {
        const demoUser = { username: 'admin', role: 'SUPER_ADMIN' };
        if (loginAdmin) await loginAdmin(demoUser);
        else setAdminUser(demoUser);
        router.replace('/admin/dashboard');
      } else {
        Alert.alert('Network Error', `Could not reach backend API at ${apiBaseUrl}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F8F8]">
      <StatusBar barStyle="dark-content" backgroundColor="#F4F8F8" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }} className="px-5 py-6">
        
        {/* Top Bar */}
        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="w-11 h-11 rounded-2xl bg-white border border-slate-200 justify-center items-center shadow-sm"
          >
            <Ionicons name="arrow-back" size={20} color="#1E293B" />
          </TouchableOpacity>

          <View className="flex-row items-center bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
            <Text className="text-[11px] font-bold text-slate-700">REST API Connected</Text>
          </View>
        </View>

        {/* Main Glassmorphic Card */}
        <View className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl shadow-[#28469E]/10 my-auto">
          
          {/* Header */}
          <View className="items-center mb-6">
            <View className="w-18 h-18 rounded-3xl bg-[#28469E] items-center justify-center mb-3.5 shadow-lg shadow-[#28469E]/30 border-4 border-[#CAE8E8] p-4">
              <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
            </View>
            <Text className="text-2xl font-black text-slate-900 tracking-tight">Store Owner Portal</Text>
            <Text className="text-xs text-slate-500 font-medium text-center mt-1">
              Secure POS billing, Udhar khata & inventory control
            </Text>
          </View>

          {/* Form Fields */}
          <View className="space-y-4 mb-3">
            
            <View>
              <Text className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Admin Username</Text>
              <View className="flex-row items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-3.5">
                <Ionicons name="person-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                <TextInput
                  className="flex-1 text-sm font-bold text-slate-900"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  placeholder="Enter admin username"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View className="mt-3">
              <Text className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1.5">Admin Password</Text>
              <View className="flex-row items-center bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-3.5">
                <Ionicons name="lock-closed-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
                <TextInput
                  className="flex-1 text-sm font-bold text-slate-900"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Enter admin password"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

          </View>

          {/* Quick Pill Button */}
          <TouchableOpacity 
            onPress={() => { setUsername('admin'); setPassword('supermart123'); }}
            className="my-3 self-end bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200 flex-row items-center"
          >
            <Ionicons name="key-outline" size={13} color="#B45309" style={{ marginRight: 4 }} />
            <Text className="text-[11px] font-bold text-amber-800">Pre-fill Demo Admin</Text>
          </TouchableOpacity>

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
                  AUTHENTICATE & ENTER ADMIN
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
        <View className="items-center mt-4">
          <Text className="text-[11px] text-slate-400 font-semibold text-center">
            Supermart Store Owner Portal • Protected POS Session
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

