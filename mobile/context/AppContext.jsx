import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { io } from "socket.io-client";

const AppContext = createContext();

const getDefaultApiUrl = () => {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(":")[0];
      if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
        return `http://${ip}:5050/api/v1`;
      }
    }
  } catch (e) {}
  return "http://localhost:5050/api/v1";
};

// Persistent storage helper using AsyncStorage
const storage = {
  getItem: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {}
  },
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {}
  },
};

/**
 * Decode a JWT payload without verifying the signature (client-side only).
 * Returns the decoded payload, or null if the token is invalid/missing.
 */
const decodeJwt = (token) => {
  try {
    if (!token) return null;
    const base64Payload = token.split(".")[1];
    if (!base64Payload) return null;
    // React Native's atob may not exist — use manual base64 decode
    const padded = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      Array.from(atob(padded))
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

/**
 * Returns true if the JWT token is still valid (not expired).
 * Returns false if it's expired or can't be decoded.
 */
const isTokenValid = (token) => {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return false;
  // payload.exp is in seconds; Date.now() is in milliseconds
  return payload.exp * 1000 > Date.now();
};

export function AppProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [customerUser, setCustomerUser] = useState(null);
  const [customerToken, setCustomerToken] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [apiBaseUrl, setApiBaseUrl] = useState(getDefaultApiUrl());
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to Socket.IO server
    const serverUrl = apiBaseUrl.replace('/api/v1', '');
    const newSocket = io(serverUrl);
    setSocket(newSocket);
    
    return () => newSocket.disconnect();
  }, [apiBaseUrl]);

  // Restore session on startup — check token expiry locally
  useEffect(() => {
    const loadSavedSessions = async () => {
      try {
        const savedAdmin = await storage.getItem("supermart_mobile_admin");
        if (savedAdmin) setAdminUser(JSON.parse(savedAdmin));

        const savedCustomer = await storage.getItem("supermart_mobile_customer");
        const savedToken = await storage.getItem("supermart_mobile_customer_token");

        if (savedCustomer) {
          if (savedToken && isTokenValid(savedToken)) {
            // Token is still valid — restore the session
            setCustomerUser(JSON.parse(savedCustomer));
            setCustomerToken(savedToken);
          } else {
            // Token is expired or missing — clear session, force re-login
            await storage.removeItem("supermart_mobile_customer");
            await storage.removeItem("supermart_mobile_customer_token");
          }
        }
      } catch (e) {}
      setIsAuthLoaded(true);
    };
    loadSavedSessions();
  }, []);

  const loginAdmin = useCallback(async (user) => {
    setAdminUser(user);
    await storage.setItem("supermart_mobile_admin", JSON.stringify(user));
  }, []);

  const logoutAdmin = useCallback(async () => {
    setAdminUser(null);
    await storage.removeItem("supermart_mobile_admin");
  }, []);

  /**
   * loginCustomer — stores both the user object and JWT token.
   * Call as: loginCustomer(userData, token)
   */
  const loginCustomer = useCallback(async (user, token) => {
    setCustomerUser(user);
    setCustomerToken(token || null);
    await storage.setItem("supermart_mobile_customer", JSON.stringify(user));
    if (token) {
      await storage.setItem("supermart_mobile_customer_token", token);
    }
  }, []);

  const logoutCustomer = useCallback(async () => {
    setCustomerUser(null);
    setCustomerToken(null);
    await storage.removeItem("supermart_mobile_customer");
    await storage.removeItem("supermart_mobile_customer_token");
  }, []);

  const addToCart = useCallback((product) => {
    setCart((prev) => {
      const idx = prev.findIndex((item) => item._id === product._id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      } else {
        return [...prev, { ...product, quantity: 1 }];
      }
    });
  }, []);

  const updateCartQty = useCallback((id, delta) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item._id === id) {
            const q = item.quantity + delta;
            if (q <= 0) return null;
            return { ...item, quantity: q };
          }
          return item;
        })
        .filter(Boolean);
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const contextValue = useMemo(
    () => ({
      cart,
      addToCart,
      updateCartQty,
      clearCart,
      customerUser,
      customerToken,
      setCustomerUser,
      loginCustomer,
      logoutCustomer,
      adminUser,
      setAdminUser,
      loginAdmin,
      logoutAdmin,
      apiBaseUrl,
      setApiBaseUrl,
      isAuthLoaded,
      socket,
    }),
    [
      cart,
      addToCart,
      updateCartQty,
      clearCart,
      customerUser,
      customerToken,
      loginCustomer,
      logoutCustomer,
      adminUser,
      loginAdmin,
      logoutAdmin,
      apiBaseUrl,
      isAuthLoaded,
      socket,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
