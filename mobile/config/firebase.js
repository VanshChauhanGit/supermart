import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: "AIzaSyBpI5MzAUVgSH6yOiFpaKi08OKG5GD7-cg",
  authDomain: "mandhaur-supermart.firebaseapp.com",
  projectId: "mandhaur-supermart",
  storageBucket: "mandhaur-supermart.firebasestorage.app",
  messagingSenderId: "1055502638218",
  appId: "1:1055502638218:web:0ddf4397806d1000906173",
  measurementId: "G-57R5XJX37G"
};

let app = null;
let auth = null;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  try {
    if (typeof getReactNativePersistence === 'function' && AsyncStorage) {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    } else {
      auth = getAuth(app);
    }
  } catch (_) {
    // Auth already initialized on fast reload or default fallback
    auth = getAuth(app);
  }
} catch (e) {
  console.error('[Firebase] Init error:', e.message);
}

export { app, auth };
export default app;
