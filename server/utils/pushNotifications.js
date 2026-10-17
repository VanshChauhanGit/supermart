/**
 * Push Notification Service for Supermart
 * Sends high-priority push notifications to:
 * 1. Store Owner / Admin devices (when a new customer order arrives)
 * 2. Assigned Delivery Boy devices (when an order is dispatched/assigned to them)
 *
 * Uses the Expo Push Notification Service (APNs for iOS and FCM for Android)
 * so alerts arrive even if the app is completely closed or running in background.
 */

const fs = require('fs');
const path = require('path');

// ── Store Owner Tokens Persistence ──────────────────────────────
const TOKENS_FILE = path.join(__dirname, '../data/admin_push_tokens.json');
let adminPushTokens = new Set();

try {
  const dir = path.dirname(TOKENS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(TOKENS_FILE)) {
    const raw = fs.readFileSync(TOKENS_FILE, 'utf8');
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      list.forEach(t => adminPushTokens.add(t));
    }
  }
} catch (e) {
  console.warn('[Push Service] Admin token persistence init warning:', e.message);
}

const persistAdminTokens = () => {
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(Array.from(adminPushTokens), null, 2));
  } catch (e) {
    console.warn('[Push Service] Could not persist admin tokens:', e.message);
  }
};

// ── Delivery Boy Tokens Persistence ─────────────────────────────
const DELIVERY_TOKENS_FILE = path.join(__dirname, '../data/delivery_push_tokens.json');
// Keyed by deliveryBoyId and/or normalized mobile: Map<string, Set<string>>
let deliveryBoyTokens = new Map();

try {
  const dir = path.dirname(DELIVERY_TOKENS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(DELIVERY_TOKENS_FILE)) {
    const raw = fs.readFileSync(DELIVERY_TOKENS_FILE, 'utf8');
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (Array.isArray(obj[key])) {
          deliveryBoyTokens.set(key, new Set(obj[key]));
        }
      });
    }
  }
} catch (e) {
  console.warn('[Push Service] Delivery tokens persistence init warning:', e.message);
}

const persistDeliveryTokens = () => {
  try {
    const serialized = {};
    for (const [key, tokenSet] of deliveryBoyTokens.entries()) {
      serialized[key] = Array.from(tokenSet);
    }
    fs.writeFileSync(DELIVERY_TOKENS_FILE, JSON.stringify(serialized, null, 2));
  } catch (e) {
    console.warn('[Push Service] Could not persist delivery tokens:', e.message);
  }
};

/**
 * Register a new Admin/Store Owner Expo Push Token
 */
function registerAdminPushToken(token) {
  if (!token || typeof token !== 'string') return false;
  const cleanToken = token.trim();
  adminPushTokens.add(cleanToken);
  persistAdminTokens();
  console.log(`[Push Service] Registered admin push token. Total active tokens: ${adminPushTokens.size}`);
  return true;
}

/**
 * Remove an invalid or expired admin push token
 */
function removeAdminPushToken(token) {
  if (adminPushTokens.has(token)) {
    adminPushTokens.delete(token);
    persistAdminTokens();
  }
}

/**
 * Register a Delivery Boy Expo Push Token
 * Links the token to rider ID and mobile number so assignments reliably find it.
 */
function registerDeliveryBoyPushToken({ deliveryBoyId, mobile, pushToken }) {
  if (!pushToken || typeof pushToken !== 'string') return false;
  const cleanToken = pushToken.trim();

  let registered = false;

  if (deliveryBoyId) {
    const idKey = String(deliveryBoyId);
    if (!deliveryBoyTokens.has(idKey)) {
      deliveryBoyTokens.set(idKey, new Set());
    }
    deliveryBoyTokens.get(idKey).add(cleanToken);
    registered = true;
  }

  if (mobile) {
    const cleanPhone = String(mobile).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length >= 10) {
      if (!deliveryBoyTokens.has(cleanPhone)) {
        deliveryBoyTokens.set(cleanPhone, new Set());
      }
      deliveryBoyTokens.get(cleanPhone).add(cleanToken);
      registered = true;
    }
  }

  if (registered) {
    persistDeliveryTokens();
    console.log(`[Push Service] Registered delivery boy push token for [ID: ${deliveryBoyId || 'N/A'}, Phone: ${mobile || 'N/A'}]`);
  }

  return registered;
}

/**
 * Find all active tokens for a specific delivery partner
 */
function getDeliveryBoyTokens(deliveryBoyId, riderPhone) {
  const tokenSet = new Set();

  if (deliveryBoyId) {
    const byId = deliveryBoyTokens.get(String(deliveryBoyId));
    if (byId) byId.forEach(t => tokenSet.add(t));
  }

  if (riderPhone) {
    const cleanPhone = String(riderPhone).replace(/\D/g, '').slice(-10);
    if (cleanPhone.length >= 10) {
      const byPhone = deliveryBoyTokens.get(cleanPhone);
      if (byPhone) byPhone.forEach(t => tokenSet.add(t));
    }
  }

  return Array.from(tokenSet);
}

/**
 * Send High-Priority Order Notification to all registered Store Owners
 */
async function sendOrderPushNotification(order) {
  if (adminPushTokens.size === 0) {
    console.log('[Push Service] No admin push tokens registered yet. Notification skipped.');
    return;
  }

  const tokens = Array.from(adminPushTokens);
  const title = `🚨 NEW ORDER #${order.orderNo || 'ALERT'}!`;
  const body = `${order.customerName || 'Customer'} placed a delivery order for ₹${order.totalAmount} (${order.paymentMethod || 'COD'}). Tap to accept!`;

  const messages = tokens.map(to => ({
    to,
    sound: 'default',
    title,
    body,
    data: {
      orderId: String(order._id || ''),
      orderNo: order.orderNo,
      type: 'NEW_ORDER'
    },
    priority: 'high',
    channelId: 'order-alerts',
    badge: 1
  }));

  try {
    console.log(`[Push Service] Dispatching push notifications for Order #${order.orderNo} to ${messages.length} store device(s)...`);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messages)
    });

    const data = await response.json();
    console.log('[Push Service] Expo Push API response (Store Owner):', JSON.stringify(data));

    if (data && Array.isArray(data.data)) {
      data.data.forEach((ticket, idx) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          removeAdminPushToken(tokens[idx]);
        }
      });
    }
  } catch (error) {
    console.error('[Push Service] Failed to send store push notification:', error.message);
  }
}

/**
 * Send High-Priority Push Notification to the Assigned Delivery Boy
 * Works when rider's phone is locked, app is closed or in background.
 */
async function sendDeliveryBoyPushNotification({ order, deliveryBoyId, riderPhone }) {
  const tokens = getDeliveryBoyTokens(deliveryBoyId, riderPhone);

  if (tokens.length === 0) {
    console.log(`[Push Service] No push token found for Delivery Boy (ID: ${deliveryBoyId}, Phone: ${riderPhone}). Push skipped.`);
    return;
  }

  const title = `🛵 NEW DELIVERY ASSIGNED! #${order.orderNo}`;
  const addressPreview = order.deliveryAddress ? ` at ${order.deliveryAddress.substring(0, 45)}...` : '';
  const body = `Deliver to ${order.customerName || 'Customer'}${addressPreview}. Collect ₹${order.totalAmount} (${order.paymentMethod || 'COD'}). Tap to start!`;

  const messages = tokens.map(to => ({
    to,
    sound: 'default',
    title,
    body,
    data: {
      orderId: String(order._id || ''),
      orderNo: order.orderNo,
      customerName: order.customerName,
      deliveryAddress: order.deliveryAddress,
      totalAmount: order.totalAmount,
      type: 'DELIVERY_ASSIGNED'
    },
    priority: 'high',
    channelId: 'order-alerts',
    badge: 1
  }));

  try {
    console.log(`[Push Service] Dispatching push notification for assigned Order #${order.orderNo} to ${messages.length} delivery boy device(s)...`);
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messages)
    });

    const data = await response.json();
    console.log('[Push Service] Expo Push API response (Delivery Boy):', JSON.stringify(data));
  } catch (error) {
    console.error('[Push Service] Failed to send delivery boy push notification:', error.message);
  }
}

module.exports = {
  registerAdminPushToken,
  removeAdminPushToken,
  registerDeliveryBoyPushToken,
  getDeliveryBoyTokens,
  sendOrderPushNotification,
  sendDeliveryBoyPushNotification,
  getAdminPushTokens: () => Array.from(adminPushTokens)
};
