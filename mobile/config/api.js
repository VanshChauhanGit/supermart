import Constants from "expo-constants";

// Auto-detect local development machine IP, or fallback to Wi-Fi LAN IP (192.168.1.4)
const getLocalIp = () => {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(":")[0];
      if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
        return ip;
      }
    }
  } catch (e) {}
  return "192.168.1.4";
};

const LOCAL_IP = getLocalIp();

// Active Local API & Socket URLs:
export const API_BASE_URL = `http://${LOCAL_IP}:5050/api/v1`;
export const SOCKET_URL = `http://${LOCAL_IP}:5050`;

// Live Render URLs (kept for easy toggle):
export const LIVE_API_BASE_URL = "https://supermart-ok26.onrender.com/api/v1";
export const LIVE_SOCKET_URL = "https://supermart-ok26.onrender.com";

export default {
  API_BASE_URL,
  SOCKET_URL,
};
