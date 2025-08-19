// Notification subscription helper for login flow
// Usage: call enableNotifications() when user logs in (userInfo available)

import { getToken, isSupported, onMessage } from "firebase/messaging";
import { messaging } from "@/firebase/init";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useAppStore } from "@/store";

export async function enableNotifications() {
  try {
    // Check browser support
    const supported = await isSupported();
    if (!supported) return { enabled: false, reason: "unsupported" };
    if (!("serviceWorker" in navigator)) return { enabled: false, reason: "no-sw" };

    // Ensure SW is registered before requesting token
    const reg = await registerServiceWorker();
    if (!reg) return { enabled: false, reason: "sw-register-failed" };

    // Ask permission only if not already granted
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      return { enabled: false, reason: "denied" };
    }

    // Ensure service worker is active/ready
    await navigator.serviceWorker.ready;
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) return { enabled: false, reason: "no-vapid" };

    // Get FCM token for this browser
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
    console.log("[FCM] Token fetched:", token || "<no token>");
    if (!token) return { enabled: false, reason: "no-token" };

    // Register token with backend (upsert)
    await apiClient.post(
      "/api/push/subscribe",
      { token, platform: "web" },
      { withCredentials: true }
    );
    return { enabled: true, token };
  } catch (e) {
    return { enabled: false, reason: e?.message || "error" };
  }
}

export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    return navigator.serviceWorker.ready;
  }
  return undefined;
}

export async function requestPermissionAndSubscribe(userId) {
  if (!userId || !(await isSupported())) return { enabled: false };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { enabled: false };
  const reg = await registerServiceWorker();
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
  if (!token) return { enabled: false };
  await apiClient.post("/api/push/subscribe", { token, platform: "web" }, { withCredentials: true });
  return { enabled: true, token };
}

export async function unsubscribePush(token) {
  try { if (token) await apiClient.delete("/api/push/unsubscribe", { data: { token }, withCredentials: true }); } catch {}
}

let __onMessageAttached = false;
export function listenForegroundNotifications() {
  if (__onMessageAttached) return; // avoid duplicate handlers on HMR/multiple mounts
  const { addNotification } = useAppStore.getState();
  onMessage(messaging, (payload) => {
    try {
      const n = payload?.notification || {};
      const d = payload?.data || {};
      addNotification({
        type: d?.type || 'dm',
        chatId: d?.chatId || d?.recipientId || '',
        channelId: d?.channelId || '',
        senderId: d?.senderId || '',
        senderName: d?.senderName || n.title || 'New message',
        preview: d?.preview || n.body || '',
        avatar: d?.avatar || n.image || '',
        url: d?.url || '/chat',
        timestamp: Date.now(),
      });
    } catch (e) {
      // Fallback toast if store not ready
      const title = payload?.notification?.title || 'New message';
      const body = payload?.notification?.body || '';
      toast(`${title}\n${body}`);
    }
  });
  __onMessageAttached = true;
}


