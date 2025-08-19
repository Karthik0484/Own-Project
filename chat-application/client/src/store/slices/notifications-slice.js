export const createNotificationsSlice = (set, get) => ({
  notifications: [],
  addNotification: (notification) => {
    const id = notification.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const n = {
      id,
      type: notification.type || 'dm',
      chatId: notification.chatId || notification.recipientId || '',
      channelId: notification.channelId || '',
      senderId: notification.senderId || '',
      senderName: notification.senderName || 'New message',
      preview: notification.preview || '',
      avatar: notification.avatar || '',
      url: notification.url || '/chat',
      timestamp: notification.timestamp || Date.now(),
    };
    set({ notifications: [n, ...get().notifications].slice(0, 20) });
  },
  removeNotification: (id) => {
    set({ notifications: get().notifications.filter((n) => n.id !== id) });
  },
  clearNotifications: () => set({ notifications: [] }),
});


