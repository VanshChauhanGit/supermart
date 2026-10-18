import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification presentation when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and register Expo Push Token with backend
 * Works for both iOS and Android.
 */
export async function registerForPushNotificationsAsync(apiBaseUrl) {
  try {
    // 1. Android Notification Channel with high importance and alert sound
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('order-alerts', {
        name: 'Live Order Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        lightColor: '#F7C400',
        sound: 'default',
        enableVibrate: true,
      });
    }

    // 2. Request / verify permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Push notification permission not granted by user');
      return null;
    }

    // 3. Get Expo Push Token using configured projectId
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '0a2df424-a2d1-4086-8604-972666d394df'
    });

    const pushToken = tokenData.data;
    console.log('[Notifications] Acquired Expo Push Token:', pushToken);

    // 4. Register with backend for server-initiated background push alerts
    if (pushToken && apiBaseUrl) {
      await fetch(`${apiBaseUrl}/auth/admin/push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushToken })
      });
      console.log('[Notifications] Successfully registered push token with Supermart backend');
    }

    return pushToken;
  } catch (error) {
    console.warn('[Notifications] Push registration warning:', error.message);
    return null;
  }
}

/**
 * Request notification permissions and register Expo Push Token for Delivery Partner
 */
export async function registerDeliveryBoyPushNotificationsAsync(apiBaseUrl, deliveryUser) {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('order-alerts', {
        name: 'Live Order Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        lightColor: '#10B981',
        sound: 'default',
        enableVibrate: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Push permission not granted for delivery boy');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '0a2df424-a2d1-4086-8604-972666d394df'
    });

    const pushToken = tokenData.data;
    console.log('[Notifications] Acquired Delivery Boy Push Token:', pushToken);

    if (pushToken && apiBaseUrl && deliveryUser) {
      await fetch(`${apiBaseUrl}/auth/delivery-boy/push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pushToken,
          deliveryBoyId: deliveryUser._id,
          mobile: deliveryUser.mobile
        })
      });
      console.log('[Notifications] Successfully registered delivery partner push token with backend');
    }

    return pushToken;
  } catch (error) {
    console.warn('[Notifications] Delivery push registration error:', error.message);
    return null;
  }
}

/**
 * Unregister this device's push token from backend on logout or role change
 */
export async function unregisterPushTokenAsync(apiBaseUrl) {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '0a2df424-a2d1-4086-8604-972666d394df'
    });
    const pushToken = tokenData?.data;
    if (pushToken && apiBaseUrl) {
      await fetch(`${apiBaseUrl}/auth/push-token/unregister`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pushToken })
      });
      console.log('[Notifications] Push token successfully unregistered from backend');
    }
  } catch (_e) {}
}

/**
 * Trigger an immediate high-priority local notification banner with sound for Store Owner
 */
export async function triggerForegroundOrderNotification(order) {
  if (!order) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚨 NEW DELIVERY ORDER #${order.orderNo || 'ALERT'}!`,
        body: `${order.customerName || 'Customer'} placed an order of ₹${order.totalAmount} (${order.paymentMethod || 'COD'}). Tap to accept!`,
        data: {
          orderId: String(order._id || ''),
          orderNo: order.orderNo,
          type: 'NEW_ORDER'
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('[Notifications] Could not trigger local notification:', e.message);
  }
}

/**
 * Trigger an immediate high-priority local notification banner with sound for Assigned Delivery Partner
 */
export async function triggerForegroundDeliveryAssignedNotification(order) {
  if (!order) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🛵 NEW DELIVERY ASSIGNED! #${order.orderNo || 'ORDER'}`,
        body: `Deliver to ${order.customerName || 'Customer'} at ${order.deliveryAddress || 'Customer Location'}. Total ₹${order.totalAmount} (${order.paymentMethod || 'COD'}).`,
        data: {
          orderId: String(order._id || ''),
          orderNo: order.orderNo,
          type: 'DELIVERY_ASSIGNED'
        },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('[Notifications] Could not trigger rider local notification:', e.message);
  }
}
