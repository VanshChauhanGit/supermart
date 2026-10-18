import "../global.css";
import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import * as Notifications from "expo-notifications";
import { AppProvider } from "../context/AppContext";

export default function RootLayout() {
  useEffect(() => {
    // Listen for notification taps by user (works from background, closed, or lockscreen)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response?.notification?.request?.content?.data;
      if (data?.type === 'DELIVERY_ASSIGNED') {
        try {
          router.push('/delivery');
        } catch (_e) {}
      } else if (data?.type === 'NEW_ORDER' || data?.orderNo) {
        try {
          router.push('/admin/orders');
        } catch (_e) {}
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProvider>
  );
}
