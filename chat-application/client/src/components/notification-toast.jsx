import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';

export default function NotificationToast() {
  const navigate = useNavigate();
  const { notifications, removeNotification } = useAppStore();

  useEffect(() => {
    const timers = notifications.map((n) =>
      setTimeout(() => removeNotification(n.id), 7000)
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [notifications, removeNotification]);

  if (!notifications?.length) return null;

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {notifications.map((n) => (
        <div key={n.id} style={{ background: '#1f2030', border: '1px solid #2f303b', borderRadius: 12, padding: 10, width: 320, color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', display: 'flex', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: '#2a2b33', flexShrink: 0 }}>
            {n.avatar ? (
              <img src={n.avatar} alt={n.senderName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.currentTarget.style.display = 'none')} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {(n.senderName || '?').charAt(0)}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{n.senderName}</div>
            <div style={{ fontSize: 13, color: '#cfcfe1', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {n.preview?.slice(0, 60) || ''}
            </div>
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#9aa0a6' }}>{new Date(n.timestamp).toLocaleTimeString()}</span>
              <button
                onClick={() => {
                  removeNotification(n.id);
                  navigate(n.url || '/chat');
                }}
                style={{ background: '#6c46f5', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 8, cursor: 'pointer' }}
              >
                View
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


