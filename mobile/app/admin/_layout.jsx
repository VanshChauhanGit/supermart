import React, { useEffect, useState, useRef } from 'react';
import { Tabs, Redirect, router } from 'expo-router';
import { View, Text, Alert, ActivityIndicator, Vibration, Modal, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

// Safe Sound Player that gracefully handles environments without ExponentAV (like Expo Go)
const playSoundSafe = async () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.Audio) {
    try {
      const audio = new window.Audio('https://cdn.freesound.org/previews/256/256113_3263906-lq.mp3');
      audio.play().catch(() => {});
      return { stopAsync: async () => { audio.pause(); }, unloadAsync: async () => {} };
    } catch (e) {}
  }
  try {
    const { Audio } = require('expo-av');
    if (Audio?.Sound) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://cdn.freesound.org/previews/256/256113_3263906-lq.mp3' },
        { shouldPlay: true, isLooping: false, volume: 1.0 }
      );
      return sound;
    }
  } catch (e) {
    // ExponentAV native module not compiled into current client runtime (e.g. Expo Go)
  }
  return null;
};

// Safe Haptic feedback trigger
const triggerHapticsSafe = () => {
  try {
    const Haptics = require('expo-haptics');
    if (Haptics?.notificationAsync) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  } catch (e) {}
};

// Background Notifier Component with Audio, Haptic & Incoming Order Overlay
function AdminOrderNotifier() {
  const { socket } = useApp();
  const [incomingOrder, setIncomingOrder] = useState(null);
  const soundRef = useRef(null);

  const playChimeAndVibrate = async () => {
    try {
      // Haptics & Vibration loop (always works natively)
      triggerHapticsSafe();
      Vibration.vibrate([0, 500, 250, 500, 250, 500]);

      // Play chime safely
      const sound = await playSoundSafe();
      if (sound) soundRef.current = sound;
    } catch (e) {
      Vibration.vibrate([0, 600, 300, 600]);
    }
  };

  const stopAlert = async () => {
    try {
      Vibration.cancel();
      if (soundRef.current) {
        if (soundRef.current.stopAsync) await soundRef.current.stopAsync();
        if (soundRef.current.unloadAsync) await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (socket) {
      const handleNewOrder = (order) => {
        setIncomingOrder(order);
        playChimeAndVibrate();
      };

      socket.on('newOrder', handleNewOrder);
      return () => {
        socket.off('newOrder', handleNewOrder);
        stopAlert();
      };
    }
  }, [socket]);

  if (!incomingOrder) return null;

  return (
    <Modal visible={!!incomingOrder} transparent animationType="slide">
      <View className="flex-1 bg-slate-900/75 justify-center items-center p-5">
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl items-center border-2 border-amber-300">
          <View className="w-16 h-16 rounded-full bg-amber-100 items-center justify-center mb-3">
            <Ionicons name="notifications" size={32} color="#D97706" />
          </View>

          <Text className="text-xl font-black text-slate-900 text-center">NEW ORDER RECEIVED!</Text>
          <Text className="text-sm font-bold text-[#1E3A8A] mt-1">#{incomingOrder.orderNo}</Text>
          <Text className="text-xs text-slate-500 font-semibold text-center mt-1">
            Customer: {incomingOrder.customerName}
          </Text>
          <Text className="text-2xl font-black text-slate-900 mt-2">
            ₹{incomingOrder.totalAmount}
          </Text>
          <Text className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
            {incomingOrder.paymentMethod || 'COD'} · {incomingOrder.items?.length || 1} items
          </Text>

          <View className="w-full mt-5 gap-2">
            <TouchableOpacity
              onPress={() => {
                stopAlert();
                setIncomingOrder(null);
                router.push('/admin/orders');
              }}
              className="bg-[#1E3A8A] rounded-2xl py-3.5 items-center shadow-lg shadow-[#1E3A8A]/30"
            >
              <Text className="text-white font-black text-sm">VIEW & ACCEPT ORDER</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                stopAlert();
                setIncomingOrder(null);
              }}
              className="bg-slate-100 rounded-2xl py-3 items-center"
            >
              <Text className="text-slate-600 font-bold text-xs">Dismiss Alert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminTabsLayout() {
  const { adminUser, logoutAdmin, isAuthLoaded } = useApp();

  // Show loading while session restores
  if (!isAuthLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#28469E" />
      </View>
    );
  }

  // Redirect to login if no admin session
  if (!adminUser) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <AdminOrderNotifier />
      <Tabs screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F1F5F9',
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 10,
          paddingTop: 0,
          shadowColor: '#94A3B8',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarActiveTintColor: '#1E3A8A',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontWeight: '700', fontSize: 10, marginTop: 2 }
      }}>
        {/* Tab 1: Home Dashboard */}
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarLabel: "Home",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
            )
          }}
        />
        {/* Tab 2: Quick POS Counter Billing */}
        <Tabs.Screen
          name="pos"
          options={{
            title: "Quick POS",
            tabBarLabel: "Billing",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? "calculator" : "calculator-outline"} size={22} color={color} />
            )
          }}
        />
        {/* Tab 3: Catalog */}
        <Tabs.Screen
          name="inventory"
          options={{
            title: "Catalog & Stock",
            tabBarLabel: "Catalog",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? "cube" : "cube-outline"} size={22} color={color} />
            )
          }}
        />
        {/* Tab 4: Orders */}
        <Tabs.Screen
          name="orders"
          options={{
            title: "Delivery Orders",
            tabBarLabel: "Orders",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? "bicycle" : "bicycle-outline"} size={22} color={color} />
            )
          }}
        />
        {/* Tab 5: Udhar */}
        <Tabs.Screen
          name="udhar"
          options={{
            title: "Udhar Khata",
            tabBarLabel: "Udhar",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? "book" : "book-outline"} size={22} color={color} />
            )
          }}
        />
        {/* Tab 6: Profile */}
        <Tabs.Screen
          name="profile"
          options={{
            title: "My Profile",
            tabBarLabel: "Profile",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={22} color={color} />
            )
          }}
        />
        {/* Hidden screens */}
        <Tabs.Screen name="login" options={{ href: null }} />
        <Tabs.Screen name="categories" options={{ href: null, title: 'Manage Categories' }} />
        <Tabs.Screen name="offers" options={{ href: null, title: 'Manage Offers' }} />
      </Tabs>
    </>
  );
}
