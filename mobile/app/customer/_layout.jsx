import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Text, Alert, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = {
  index: { label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  cart: { label: 'Cart', icon: 'cart-outline', activeIcon: 'cart' },
  orders: { label: 'Orders', icon: 'receipt-outline', activeIcon: 'receipt' },
  profile: { label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
};

function FloatingTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { cart } = useApp();
  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Math.max(insets.bottom, 8) + 8,
        paddingHorizontal: 50,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 60,
          borderRadius: 50,
          paddingHorizontal: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          borderWidth: 1,
          borderColor: 'rgba(226, 232, 240, 0.8)',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.10,
          shadowRadius: 14,
          elevation: 10,
        }}
      >
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null; // Hides udhar, login, history, etc.

          const focused = state.index === index;
          const badge = route.name === 'cart' ? cartCount : 0;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 70,
                  height: 52,
                  paddingHorizontal: 14,
                  borderRadius: 50,
                  backgroundColor: focused ? '#EAEAEA' : 'transparent',
                }}
              >
                <View style={{ position: 'relative' }}>
                  <Ionicons
                    name={focused ? tab.activeIcon : tab.icon}
                    size={22}
                    color={focused ? '#FFC107' : '#222222'}
                  />
                  {badge > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        top: -5,
                        right: -10,
                        backgroundColor: '#FFC107',
                        borderRadius: 9,
                        minWidth: 16,
                        height: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 3,
                        borderWidth: 1.5,
                        borderColor: '#FFFFFF',
                      }}
                    >
                      <Text style={{ color: '#111827', fontSize: 8, fontWeight: '900' }}>
                        {badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    marginTop: 2,
                    color: '#111111',
                    fontWeight: focused ? '800' : '600',
                  }}
                >
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function CustomerTabsLayout() {
  const { customerUser, logoutCustomer, isAuthLoaded } = useApp();

  if (!isAuthLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F7C400" />
      </View>
    );
  }

  if (!customerUser) return <Redirect href="/" />;

  const handleLogoutCustomer = () => {
    Alert.alert(
      'Logout Customer Account',
      `Are you sure you want to log out of ${customerUser?.name || 'your account'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => { if (logoutCustomer) await logoutCustomer(); }
        }
      ]
    );
  };

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="udhar" options={{ href: null }} />
      <Tabs.Screen name="login" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
    </Tabs>
  );
}
