import { useAppStore } from '@/store';
import { getColor } from '@/lib/utils';
import { RiCloseFill, RiArrowLeftLine } from 'react-icons/ri';
import { Avatar, AvatarImage, AvatarFallback } from '@radix-ui/react-avatar';
import { HOST, SEARCH_CONTACTS_ROUTES } from '@/utils/constants';
import { useNavigate } from 'react-router-dom';
import { formatLastSeen } from '@/utils/dateUtils';
import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

const ChatHeader = ({ onHeaderClick }) => {
  const { closeChat, selectedChatData, selectedChatType, onlineUsers, userInfo, setSelectedChatData, updateChannelInList } = useAppStore();
  const socket = useSocket();
  const fileRef = useRef(null);
  const navigate = useNavigate();
  const [headerActive, setHeaderActive] = useState(false);

  const isOnline = selectedChatData?._id && onlineUsers?.[selectedChatData._id];
  const lastSeen = selectedChatData?.lastSeen;
  const lastSeenText = lastSeen ? formatLastSeen(lastSeen) : '';
  const rawAvatar = selectedChatData?.profilePicture || selectedChatData?.profileImage || selectedChatData?.image || selectedChatData?.profileImageUrl;
  // Avatar logic with cache busting using updatedAt
  let avatarUrl = '';
  if (selectedChatType === 'channel' && selectedChatData?.profilePicture) {
    const base = selectedChatData.profilePicture.startsWith('http')
      ? selectedChatData.profilePicture
      : `${HOST}/channels/${selectedChatData.profilePicture.replace(/^\/?channels\//, '').replace(/^\//, '')}`;
    const ts = selectedChatData?.updatedAt ? `?t=${new Date(selectedChatData.updatedAt).getTime()}` : '';
    avatarUrl = `${base}${ts}`;
  } else if (rawAvatar) {
    avatarUrl = rawAvatar.startsWith('http') ? rawAvatar : `${HOST}/${rawAvatar.replace(/^\//, '')}`;
  }
  const avatarInitial = selectedChatType === 'channel'
    ? (selectedChatData?.name?.[0] || '#')
    : (selectedChatData?.firstName
      ? selectedChatData.firstName[0]
      : selectedChatData?.lastName
        ? selectedChatData.lastName[0]
        : '?');

  const handleClose = () => {
    closeChat();
    navigate('/chat');
  };

  const isChannel = selectedChatType === 'channel';
  // Fallback: if adminId not present on older channels, treat creator as admin
  const isAdmin = isChannel && (
    (selectedChatData?.adminId && String(selectedChatData.adminId) === String(userInfo?.id)) ||
    (!selectedChatData?.adminId && selectedChatData?.createdBy && String(selectedChatData.createdBy) === String(userInfo?.id))
  );

  const handleUpdatePicture = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !isChannel || !isAdmin) return;
    const form = new FormData();
    form.append('channel-image', file);
    try {
      const res = await apiClient.post(`/api/channel/${selectedChatData._id}/update-picture`, form, { withCredentials: true });
      if (res.status === 200 && res.data?.success && res.data?.profilePicture) {
        const profilePicture = res.data.profilePicture;
        const updatedAt = res.data?.updatedAt || Date.now();
        setSelectedChatData({ ...selectedChatData, profilePicture, updatedAt });
        updateChannelInList?.(selectedChatData._id, { profilePicture, updatedAt });
        socket?.emit('channel-picture-updated', { channelId: selectedChatData._id, profilePicture, updatedAt });
        toast.success('✅ Channel picture updated', { duration: 3000 });
      } else {
        toast.error(res.data?.error || '❌ Failed to update picture', { duration: 3000 });
      }
    } catch (e) {
      toast.error('❌ Failed to update picture', { duration: 3000 });
    }
  };

  // manage search removed from header; handled in drawer

  const handleAddMember = async (userOrId) => {
    if (!isChannel || !isAdmin) return;
    const id = typeof userOrId === 'object' ? (userOrId.id || userOrId._id) : userOrId;
    const displayName = typeof userOrId === 'object'
      ? (`${userOrId.firstName || ''} ${userOrId.lastName || ''}`.trim() || userOrId.email || 'User')
      : 'User';
    try {
      const payload = { userId: id }; // send canonical shape
      let res = await apiClient.post(`/api/channel/${selectedChatData._id}/add-members`, payload, { withCredentials: true });
      // Fallback for older backends with reversed route order
      if (res?.status === 404 || res?.data?.success === undefined) {
        res = await apiClient.post(`/api/channel/add-members/${selectedChatData._id}`, payload, { withCredentials: true });
      }
      if (res.status === 200 && res.data?.success && Array.isArray(res.data?.members) && res.data?.user) {
        setSelectedChatData({ ...selectedChatData, members: res.data.members });
        updateChannelInList?.(selectedChatData._id, { members: res.data.members });
        socket?.emit('channel-members-added', { channelId: selectedChatData._id, members: res.data.members });
        setSearchTerm(''); setSearchResults([]);
        const dn = `${res.data.user.firstName || ''} ${res.data.user.lastName || ''}`.trim() || res.data.user.email || displayName;
        toast.success(`✅ ${dn} added to channel`, { duration: 3000 });
      } else {
        toast.error(res.data?.error || '❌ Failed to add user. Please try again.', { duration: 3000 });
      }
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || '❌ Failed to add user. Please try again.';
      // Retry once if 404 on primary route
      if (status === 404) {
        try {
          const res2 = await apiClient.post(`/api/channel/add-members/${selectedChatData._id}`, { userId: id }, { withCredentials: true });
          if (res2.status === 200 && res2.data?.success && Array.isArray(res2.data?.members) && res2.data?.user) {
            setSelectedChatData({ ...selectedChatData, members: res2.data.members });
            updateChannelInList?.(selectedChatData._id, { members: res2.data.members });
            socket?.emit('channel-members-added', { channelId: selectedChatData._id, members: res2.data.members });
            setSearchTerm(''); setSearchResults([]);
            const dn = `${res2.data.user.firstName || ''} ${res2.data.user.lastName || ''}`.trim() || res2.data.user.email || displayName;
            toast.success(`✅ ${dn} added to channel`, { duration: 3000 });
            return;
          }
        } catch (e2) {
          // fall through to error toast
        }
      }
      toast.error(msg, { duration: 3000 });
    }
  };

  useEffect(() => {
    if (!socket) return;
    const onPic = ({ channelId, profilePicture, updatedAt }) => {
      if (isChannel && selectedChatData?._id === channelId) {
        setSelectedChatData((c) => ({ ...c, profilePicture, updatedAt: updatedAt || Date.now() }));
      }
      updateChannelInList?.(channelId, { profilePicture, updatedAt: updatedAt || Date.now() });
    };
    const onMembers = ({ channelId, members }) => {
      if (isChannel && selectedChatData?._id === channelId) {
        setSelectedChatData((c) => ({ ...c, members }));
      }
    };
    socket.on('channel-picture-updated', onPic);
    socket.on('channel-members-added', onMembers);
    return () => {
      socket.off('channel-picture-updated', onPic);
      socket.off('channel-members-added', onMembers);
    };
  }, [socket, isChannel, selectedChatData?._id]);

  const handleHeaderClick = () => {
    setHeaderActive(true);
    setTimeout(() => setHeaderActive(false), 180);
    onHeaderClick?.();
  };

  return (
    <div
      className={`h-[10vh] border-b-2 border-[#2f303b] flex items-center justify-between px-4 sm:px-6 md:px-10 xl:px-20 chat-header transition-colors duration-150 ${headerActive ? 'ring-2 ring-[#6c46f5]/40' : ''} hover:bg-[#20212b] cursor-pointer group`}
      onClick={handleHeaderClick}
      title="Click to view channel info"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleHeaderClick(); }}
    >
      <div className="flex gap-3 sm:gap-5 items-center w-full justify-between">
        {/* Back button on mobile to show sidebar */}
        <button
          className="md:hidden text-neutral-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={handleClose}
          aria-label="Back"
        >
          <RiArrowLeftLine className="text-2xl" />
        </button>
        <div className="flex gap-3 items-center justify-center ">
          <div className="relative flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12">
            {/* Render avatar for both contacts and channels */}
            <Avatar className="rounded-full overflow-hidden w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12">
              {avatarUrl && (
                <AvatarImage
                  src={avatarUrl}
                  alt="profile"
                  className="object-cover w-full h-full bg-black rounded-full"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; const fb = e.currentTarget.parentNode.querySelector('.avatar-fallback'); if (fb) fb.style.display = 'flex'; }}
                />
              )}
              <AvatarFallback className="avatar-fallback rounded-full bg-purple-500 flex items-center justify-center text-white font-bold w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12">
                {selectedChatType === 'channel'
                  ? (selectedChatData?.name?.[0] || '#').toUpperCase()
                  : avatarInitial.toUpperCase()}
              </AvatarFallback>
              {/* Online dot only for contacts */}
              {selectedChatType === 'contact' && isOnline && (
                <div
                  className="absolute rounded-full bg-green-500 border-2 border-[#1b1c24]"
                  style={{ right: -2, bottom: -2, width: 10, height: 10 }}
                ></div>
              )}
            </Avatar>
          </div>
          <div>
            <div className="font-semibold flex items-center gap-1">
              {selectedChatType === "channel" && (
                <>
                  <span>{selectedChatData?.name || 'Channel'}</span>
                  <span
                    className="ml-1 inline-flex items-center h-5 rounded-full bg-gradient-to-r from-[#6c46f5] to-[#8b5cf6] text-white text-[10px] px-1.5 shadow-sm transform transition-all duration-200 group-hover:px-2 group-hover:gap-1 group-hover:scale-[1.03]"
                    aria-hidden="true"
                    title="Click to view channel info"
                  >
                    <span className="leading-none">ℹ️</span>
                    <span className="hidden sm:inline leading-none">Info</span>
                  </span>
                </>
              )}
              {selectedChatType === "contact" && selectedChatData?.firstName ? (
                <span>{`${selectedChatData.firstName} ${selectedChatData.lastName}`}</span>
              ) : selectedChatType === "contact" && selectedChatData?.email ? (
                <span>{selectedChatData.email}</span>
              ) : null}
            </div>
            <div className="text-xs text-gray-400">
              {selectedChatType === "contact" && (isOnline ? (
                <span className="text-green-500 font-medium">Online</span>
              ) : (
                lastSeenText && <span>{lastSeenText}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center jus gap-5">
          <button className="text-neutral-500 focus:border-none focus:outline-none focus:text-white duration-300 transition-all" 
            onClick={handleClose}
          >
            <RiCloseFill className="text-3xl"/>
          </button>
        </div>
      </div>
      
    </div>
  );
};

export default ChatHeader;