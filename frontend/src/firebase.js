import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDZJpF0g1O8RLO7BQ8JW8Ln0aNC_LlaEFY",
  authDomain: "aegis-be2e6.firebaseapp.com",
  projectId: "aegis-be2e6",
  storageBucket: "aegis-be2e6.firebasestorage.app",
  messagingSenderId: "74633325853",
  appId: "1:74633325853:web:f713bb36281e39f3cc05f4",
  measurementId: "G-1S7S35LFBZ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const messaging = getMessaging(app);
const storage = getStorage(app);

// Request permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey: 'BPhu5daBaxOS3sKGFHYb69o0ex7HAQkNuGFfBapguHoy2n8KMJ1tvgDkrNxAjhPxCjVLOMANAyqScQAkcaGNKi8' });
      return token;
    }
  } catch (err) {
    console.error('Notification permission error:', err);
  }
};

// Foreground messages
onMessage(messaging, (payload) => {
  new Notification(payload.notification.title, { body: payload.notification.body });
});

export { messaging, storage };