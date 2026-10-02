import React, { useEffect, useState } from 'react';
import { Tabs, Redirect, router } from 'expo-router';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';

// Background Notifier Component
function AdminOrderNotifier() {
  const { socket } = useApp();

  useEffect(() => {
    if (socket) {
      const handleNewOrder = (order) => {
        Alert.alert(
          '🔔 NEW ORDER RECEIVED!',
          `Order ${order.orderNo} arrived from ${order.customerName}. Action required!`,
          [
            { text: 'View Orders', onPress: () => router.push('/admin/orders') },
            { text: 'Dismiss', style: 'cancel' }
          ]
        );
      };

      socket.on('newOrder', handleNewOrder);
      return () => {
        socket.off('newOrder', handleNewOrder);
      };
    }
  }, [socket]);

  return null;
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
        {/* Tab 1: Home */}
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
        {/* Tab 2: Catalog */}
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
        {/* Tab 3: Orders */}
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
        {/* Tab 4: Udhar */}
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
        {/* Tab 5: Profile */}
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
