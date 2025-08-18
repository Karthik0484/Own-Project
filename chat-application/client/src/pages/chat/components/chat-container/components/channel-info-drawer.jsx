import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store";
import { apiClient } from "@/lib/api-client";
import { HOST } from "@/utils/constants";
import { useSocket } from "@/context/SocketContext";
import { toast } from "sonner";

const ChannelInfoDrawer = ({ open, onClose }) => {
  const { selectedChatData, userInfo } = useAppStore();
  const socket = useSocket();
  const channelId = selectedChatData?._id;
  const isAdmin = selectedChatData && (String(selectedChatData.adminId || selectedChatData.createdBy) === String(userInfo?.id));
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  const loadInfo = useCallback(async () => {
    if (!channelId) return;
    try {
      setLoading(true);
      // Try new route; if 404 (older backend), fallback to base path
      let res;
      try {
        res = await apiClient.get(`/api/channel/channels/${channelId}/info`, { withCredentials: true });
      } catch (e) {
        if (e?.response?.status === 404) {
          res = await apiClient.get(`/api/channel/${channelId}/info`, { withCredentials: true });
        } else { throw e; }
      }
      if (res.data?.success) {
        setInfo(res.data);
        setDescDraft(res.data.description || "");
      }
    } finally { setLoading(false); }
  }, [channelId]);

  useEffect(() => {
    if (!open || !channelId) return;
    loadInfo();
  }, [open, channelId, loadInfo]);

  useEffect(() => {
    if (!socket || !channelId) return;
    const onUpdate = (payload) => {
      if (payload.channelId !== channelId) return;
      setInfo((prev) => prev ? { ...prev, ...('description' in payload ? { description: payload.description } : {}), ...('pictureUrl' in payload ? { pictureUrl: payload.pictureUrl } : {}), ...('name' in payload ? { name: payload.name } : {}) } : prev);
    };
    const onMembers = ({ channelId: id }) => {
      if (id !== channelId) return;
      // Refetch to get full member objects with names/pictures
      loadInfo();
    };
    socket.on('channel:update', onUpdate);
    socket.on('channel:members:update', onMembers);
    return () => {
      socket.off('channel:update', onUpdate);
      socket.off('channel:members:update', onMembers);
    };
  }, [channelId, open, socket, loadInfo]);

  const handleSaveDescription = async () => {
    try {
      let res;
      try {
        res = await apiClient.put(`/api/channel/channels/${channelId}/description`, { description: descDraft }, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        if (e?.response?.status === 404) {
          res = await apiClient.put(`/api/channel/${channelId}/description`, { description: descDraft }, { withCredentials: true, headers: { 'Content-Type': 'application/json' } });
        } else { throw e; }
      }
      if (res.status === 200 && res.data?.success) {
        setInfo((i) => i ? { ...i, description: res.data.description } : i);
        setEditing(false);
        toast.success("✅ Description updated", { duration: 2500 });
        socket?.emit('channel:update', { channelId, description: res.data.description });
      } else {
        toast.error(res.data?.error || "❌ Failed to update description", { duration: 3000 });
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || "❌ Failed to update description";
      toast.error(msg, { duration: 3000 });
    }
  };

  // No update picture action in drawer per requirement

  const pictureSrc = info?.id ? `${HOST}/channels/${info.id}/picture?t=${Date.now()}` : (info?.pictureUrl ? `${HOST}/${info.pictureUrl}?t=${Date.now()}` : null);

  return (
    <div className={`${open ? 'translate-x-0' : 'translate-x-full'} fixed right-0 top-0 h-screen w-full md:w-[420px] bg-[#11121a] border-l border-[#2f303b] z-50 transition-transform duration-200`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-4 border-b border-[#2f303b]">
        <h3 className="text-lg font-semibold">Channel Info</h3>
        <button className="text-neutral-400 hover:text-white" onClick={onClose}>Close</button>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto h-[calc(100vh-64px)]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#48228b] to-[#1e1f2b] flex items-center justify-center text-xl font-bold border border-[#2f303b]">
            {pictureSrc ? (
              <img src={pictureSrc} alt="channel" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} />
            ) : (
              (info?.name?.[0] || '#').toUpperCase()
            )}
          </div>
          {/* Update picture button intentionally removed */}
          <div>
            <div className="text-xl font-semibold">{info?.name || selectedChatData?.name || 'Channel'}</div>
            {!editing && (
              <div className="mt-1 p-3 rounded-lg bg-[#171826] border border-[#2f303b] text-sm text-neutral-200 whitespace-pre-wrap break-words shadow-sm">
                {info?.description || 'No description'}
              </div>
            )}
            {editing && (
              <div className="space-y-2">
                <textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)} className="w-full p-3 rounded-lg bg-[#1b1c24] border border-[#2f303b] focus:outline-none focus:ring-2 focus:ring-[#6c46f5]" rows={4} placeholder="Add a description" />
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded bg-[#6c46f5] hover:bg-[#7a58f7]" onClick={handleSaveDescription}>Save</button>
                  <button className="px-3 py-1 rounded bg-[#2a2b33] hover:bg-[#3a3d49]" onClick={() => { setEditing(false); setDescDraft(info?.description || ""); }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {isAdmin && !editing && (
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded bg-[#2a2b33] hover:bg-[#3a3d49]" onClick={() => setEditing(true)}>Edit Description</button>
          </div>
        )}

        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2">Members</div>
          {!info && loading && (
            <div className="text-sm text-neutral-400">Loading…</div>
          )}
          {info?.members?.length === 0 && (
            <div className="text-sm text-neutral-400">No members found</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Array.isArray(info?.members) && info.members.map((m) => {
              const avatar = m.profilePic ? (m.profilePic.startsWith('http') ? m.profilePic : `${HOST}/${m.profilePic}`) : '';
              return (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-[#151622] border border-[#2f303b]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-[#2a2b33] flex items-center justify-center font-semibold shrink-0">
                      {avatar ? (
                        <img src={avatar} alt={m.username} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} />
                      ) : (
                        (m.username?.[0] || '?').toUpperCase()
                      )}
                    </div>
                    <div className="text-sm truncate">{m.username}</div>
                  </div>
                  {m.isAdmin && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3b2276] text-white">Admin</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelInfoDrawer;


