/* global importScripts, firebase */
// Take control immediately to avoid waiting
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDAopGqJdysBNTHzfJhQcBxOLd5soi4mvA",
  authDomain: "push-notification-8070e.firebaseapp.com",
  projectId: "push-notification-8070e",
  storageBucket: "push-notification-8070e.firebasestorage.app",
  messagingSenderId: "598117056622",
  appId: "1:598117056622:web:9c079378dd0c2812ed267f"
});

const messaging = firebase.messaging();

// FCM background handler
messaging.onBackgroundMessage((payload) => {
  const n = payload?.notification || {};
  const d = payload?.data || {};
  self.registration.showNotification(n.title || 'New message', {
    body: n.body || '',
    icon: n.image || '/vite.svg',
    data: { url: d.url || '/chat', ...d },
  });
});

// Generic Web Push fallback (if payload arrives via raw Push API)
self.addEventListener('push', (event) => {
  try {
    const data = event.data?.json?.() || {};
    const n = data.notification || {};
    const d = data.data || {};
    event.waitUntil(
      self.registration.showNotification(n.title || 'New message', {
        body: n.body || '',
        icon: n.image || '/vite.svg',
        data: { url: d.url || '/chat', ...d },
      })
    );
  } catch (e) { /* ignore */ }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/chat";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const c of clientsArr) {
        c.postMessage({ __PUSH_NAV__: url });
        if (c.focus) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});


