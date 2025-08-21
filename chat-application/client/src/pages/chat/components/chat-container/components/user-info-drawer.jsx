import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { formatLastSeen } from "@/utils/dateUtils";
import { Avatar, AvatarImage, AvatarFallback } from '@radix-ui/react-avatar';
import { toast } from "sonner";
import { useSocket } from "@/context/SocketContext";
import { apiClient } from "@/lib/api-client";
import { 
  Bell, 
  BellOff, 
  Users, 
  Image, 
  FileText, 
  Link, 
  Download, 
  Eye,
  Calendar,
  MessageCircle,
  MoreHorizontal,
  Loader2
} from 'lucide-react';

const UserInfoDrawer = ({ open, onClose }) => {
  const { selectedChatData, userInfo, onlineUsers, setSelectedChatData, setSelectedChatType } = useAppStore();
  const socket = useSocket();
  
  // State management
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [isMuted, setIsMuted] = useState(false);
  const [sharedMedia, setSharedMedia] = useState({
    images: [],
    files: [],
    links: []
  });
  const [mutualChannels, setMutualChannels] = useState([]);
  const [showAllMutual, setShowAllMutual] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mutualLoading, setMutualLoading] = useState(false);
  const [mediaPage, setMediaPage] = useState(1);
  const [hasMoreMedia, setHasMoreMedia] = useState(true);

  const isOnline = selectedChatData?._id && onlineUsers?.[selectedChatData._id];
  const lastSeen = selectedChatData?.lastSeen;
  const lastSeenText = lastSeen ? formatLastSeen(lastSeen) : '';

  // Avatar logic
  const rawAvatar = userDetails?.profilePicture || userDetails?.profileImage || userDetails?.image || userDetails?.profileImageUrl;
  let avatarUrl = '';
  if (rawAvatar) {
    avatarUrl = rawAvatar.startsWith('http') ? rawAvatar : `${HOST}/${rawAvatar.replace(/^\//, '')}`;
  }
  
  const avatarInitial = userDetails?.firstName
    ? userDetails.firstName[0]
    : userDetails?.lastName
      ? userDetails.lastName[0]
      : userDetails?.email?.[0] || '?';

  const displayName = userDetails?.firstName 
    ? `${userDetails.firstName} ${userDetails.lastName || ''}`.trim()
    : userDetails?.email || 'Unknown User';

  // Fetch user details from database
  const fetchUserDetails = useCallback(async (userId) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/users/${userId}/profile`, { 
        withCredentials: true 
      });
      
      if (response.data?.success) {
        setUserDetails(response.data.user);
      } else {
        toast.error('Failed to load user details');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch shared media from database
  const fetchSharedMedia = useCallback(async (userId, page = 1) => {
    if (!userId || !userInfo?.id) return;
    
    try {
      setMediaLoading(true);
      const response = await apiClient.get(`/api/messages/shared-media`, {
        params: {
          userId,
          currentUserId: userInfo.id,
          page,
          limit: 10
        },
        withCredentials: true
      });
      
      if (response.data?.success) {
        const { images, files, links, hasMore } = response.data;
        
        if (page === 1) {
          setSharedMedia({ images, files, links });
        } else {
          setSharedMedia(prev => ({
            images: [...prev.images, ...images],
            files: [...prev.files, ...files],
            links: [...prev.links, ...links]
          }));
        }
        
        setHasMoreMedia(hasMore);
        setMediaPage(page);
      }
    } catch (error) {
      console.error('Error fetching shared media:', error);
      toast.error('Failed to load shared media');
    } finally {
      setMediaLoading(false);
    }
  }, [userInfo?.id]);

  // Fetch mutual channels from database
  const fetchMutualChannels = useCallback(async (userId) => {
    if (!userId || !userInfo?.id) return;
    
    try {
      setMutualLoading(true);
      const response = await apiClient.get(`/api/channels/mutual`, {
        params: {
          userId,
          currentUserId: userInfo.id
        },
        withCredentials: true
      });
      
      if (response.data?.success) {
        setMutualChannels(response.data.channels);
      } else {
        setMutualChannels([]);
      }
    } catch (error) {
      console.error('Error fetching mutual channels:', error);
      setMutualChannels([]);
    } finally {
      setMutualLoading(false);
    }
  }, [userInfo?.id]);

  // Fetch mute status from database
  const fetchMuteStatus = useCallback(async (userId) => {
    if (!userId || !userInfo?.id) return;
    
    try {
      const response = await apiClient.get(`/api/users/mute-status`, {
        params: { targetUserId: userId },
        withCredentials: true
      });
      
      if (response.data?.success) {
        setIsMuted(response.data.isMuted);
      }
    } catch (error) {
      console.error('Error fetching mute status:', error);
    }
  }, [userInfo?.id]);

  // Load data when drawer opens
  useEffect(() => {
    if (!open || !selectedChatData?._id) return;
    
    const userId = selectedChatData._id;
    
    // Fetch all data
    fetchUserDetails(userId);
    fetchSharedMedia(userId, 1);
    fetchMutualChannels(userId);
    fetchMuteStatus(userId);
    
    // Reset pagination
    setMediaPage(1);
    setHasMoreMedia(true);
    setShowAllMutual(false);
  }, [open, selectedChatData?._id, fetchUserDetails, fetchSharedMedia, fetchMutualChannels, fetchMuteStatus]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!socket || !selectedChatData?._id) return;

    // Listen for user profile updates
    const handleUserUpdate = (data) => {
      if (data.userId === selectedChatData._id) {
        setUserDetails(prev => ({ ...prev, ...data.updates }));
        toast.info(`${displayName} updated their profile`);
      }
    };

    // Listen for online status changes
    const handleStatusChange = (data) => {
      if (data.userId === selectedChatData._id) {
        setUserDetails(prev => ({ 
          ...prev, 
          lastSeen: data.lastSeen,
          customStatus: data.customStatus 
        }));
      }
    };

    // Listen for new shared media
    const handleNewMedia = (data) => {
      if (data.senderId === selectedChatData._id || data.receiverId === selectedChatData._id) {
        // Refresh media list
        fetchSharedMedia(selectedChatData._id, 1);
      }
    };

    // Listen for channel membership changes
    const handleChannelUpdate = (data) => {
      // Refresh mutual channels if either user's membership changed
      if (data.members?.some(member => member.userId === selectedChatData._id || member.userId === userInfo?.id)) {
        fetchMutualChannels(selectedChatData._id);
      }
    };

    socket.on('user:profile:update', handleUserUpdate);
    socket.on('user:status:change', handleStatusChange);
    socket.on('message:media:shared', handleNewMedia);
    socket.on('channel:members:update', handleChannelUpdate);

    return () => {
      socket.off('user:profile:update', handleUserUpdate);
      socket.off('user:status:change', handleStatusChange);
      socket.off('message:media:shared', handleNewMedia);
      socket.off('channel:members:update', handleChannelUpdate);
    };
  }, [socket, selectedChatData?._id, userInfo?.id, displayName, fetchSharedMedia, fetchMutualChannels]);

  // Event handlers
  const handleBlockUser = async () => {
    if (!selectedChatData?._id) return;
    
    try {
      const response = await apiClient.post(`/api/users/block`, {
        targetUserId: selectedChatData._id
      }, { withCredentials: true });
      
      if (response.data?.success) {
        toast.success('User blocked successfully');
        onClose();
      } else {
        toast.error(response.data?.error || 'Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
    }
  };

  const handleReportUser = async () => {
    if (!selectedChatData?._id) return;
    
    try {
      const response = await apiClient.post(`/api/users/report`, {
        targetUserId: selectedChatData._id,
        reason: 'User reported'
      }, { withCredentials: true });
      
      if (response.data?.success) {
        toast.success('User reported successfully');
      } else {
        toast.error(response.data?.error || 'Failed to report user');
      }
    } catch (error) {
      console.error('Error reporting user:', error);
      toast.error('Failed to report user');
    }
  };

  const handleMuteToggle = async () => {
    if (!selectedChatData?._id) return;
    
    try {
      const response = await apiClient.post(`/api/users/toggle-mute`, {
        targetUserId: selectedChatData._id,
        mute: !isMuted
      }, { withCredentials: true });
      
      if (response.data?.success) {
        setIsMuted(!isMuted);
        toast.success(isMuted ? "Notifications unmuted" : "Notifications muted");
      } else {
        toast.error(response.data?.error || 'Failed to update mute status');
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error('Failed to update mute status');
    }
  };

  const handleChannelClick = (channel) => {
    setSelectedChatData(channel);
    setSelectedChatType('channel');
    onClose();
    toast.success(`Switched to ${channel.name}`);
  };

  const handleMediaPreview = async (item) => {
    try {
      if (item.url) {
        // For images, open in new tab
        if (item.type === 'image') {
          window.open(item.url, '_blank');
        } else {
          // For files, trigger download
          const response = await apiClient.get(`/api/files/download/${item.id}`, {
            responseType: 'blob',
            withCredentials: true
          });
          
          const url = window.URL.createObjectURL(response.data);
          const link = document.createElement('a');
          link.href = url;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          toast.success(`Downloading ${item.name}...`);
        }
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const loadMoreMedia = () => {
    if (!mediaLoading && hasMoreMedia) {
      fetchSharedMedia(selectedChatData._id, mediaPage + 1);
    }
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (!open) return null;

  return (
    <div 
      className={`${open ? 'translate-x-0' : 'translate-x-full'} fixed right-0 top-0 h-screen w-full md:w-[420px] bg-[#11121a] border-l border-[#2f303b] z-50 transition-transform duration-200`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2f303b]">
        <h2 className="text-xl font-semibold text-white">User Info</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors duration-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#2f303b]">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'profile' 
              ? 'text-purple-400 border-b-2 border-purple-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'media' 
              ? 'text-purple-400 border-b-2 border-purple-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Media
        </button>
        <button
          onClick={() => setActiveTab('mutual')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'mutual' 
              ? 'text-purple-400 border-b-2 border-purple-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Mutual
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            {/* Profile Tab */}
            {activeTab === 'profile' && userDetails && (
              <div className="p-6 space-y-6">
                {/* Profile Section */}
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <Avatar className="w-24 h-24 rounded-full overflow-hidden mx-auto">
                      {avatarUrl && (
                        <AvatarImage
                          src={avatarUrl}
                          alt="profile"
                          className="object-cover w-full h-full"
                          loading="lazy"
                          onError={(e) => { 
                            e.currentTarget.onerror = null; 
                            e.currentTarget.style.display = 'none'; 
                            const fb = e.currentTarget.parentNode.querySelector('.avatar-fallback'); 
                            if (fb) fb.style.display = 'flex'; 
                          }}
                        />
                      )}
                      <AvatarFallback className="avatar-fallback rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-2xl w-24 h-24">
                        {avatarInitial.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Online Status */}
                    <div className="absolute -bottom-1 -right-1">
                      <div className={`w-6 h-6 rounded-full border-2 border-[#11121a] ${
                        isOnline ? 'bg-green-500' : 'bg-gray-500'
                      }`}></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white">{displayName}</h3>
                    <p className="text-gray-400 text-sm">{userDetails?.email}</p>
                    
                    {/* Custom Status */}
                    <div className="mt-2">
                      {isOnline ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                          Online
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          Last seen {lastSeenText}
                        </span>
                      )}
                    </div>

                    {/* Custom Status Message */}
                    {userDetails?.customStatus && (
                      <div className="mt-2 text-sm text-gray-300 bg-[#1a1b23] rounded-lg p-2">
                        "{userDetails.customStatus}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-between bg-[#1a1b23] rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleMuteToggle}
                      className={`p-2 rounded-lg transition-colors ${
                        isMuted ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                      title={isMuted ? 'Unmute notifications' : 'Mute notifications'}
                    >
                      {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </button>
                    <span className="text-sm text-gray-300">
                      {isMuted ? 'Muted' : 'Notifications'}
                    </span>
                  </div>
                  <button className="text-gray-400 hover:text-white">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* User Details */}
                <div className="space-y-4">
                  <div className="bg-[#1a1b23] rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">About</h4>
                    <p className="text-white">
                      {userDetails?.bio || "No bio available"}
                    </p>
                  </div>

                  {/* Member Since */}
                  <div className="bg-[#1a1b23] rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Member Since
                    </h4>
                    <p className="text-white text-sm">
                      Joined on {formatJoinDate(userDetails?.createdAt)}
                    </p>
                  </div>

                  {/* Contact Info */}
                  <div className="bg-[#1a1b23] rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Contact Information</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Email:</span>
                        <span className="text-white text-sm">{userDetails?.email}</span>
                      </div>
                      {userDetails?.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Phone:</span>
                          <span className="text-white text-sm">{userDetails.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <button
                      onClick={handleBlockUser}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      Block User
                    </button>
                    
                    <button
                      onClick={handleReportUser}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Report User
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Media Tab */}
            {activeTab === 'media' && (
              <div className="p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white">Shared Media & Files</h3>
                
                {mediaLoading && sharedMedia.images.length === 0 && sharedMedia.files.length === 0 && sharedMedia.links.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                ) : (
                  <>
                    {/* Images Section */}
                    {sharedMedia.images.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Images ({sharedMedia.images.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {sharedMedia.images.map((image) => (
                            <div key={image.id} className="relative group cursor-pointer">
                              <img 
                                src={image.url} 
                                alt={image.name}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                                <button 
                                  onClick={() => handleMediaPreview(image)}
                                  className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-20 p-2 rounded-full"
                                >
                                  <Eye className="w-4 h-4 text-white" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Files Section */}
                    {sharedMedia.files.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Files ({sharedMedia.files.length})
                        </h4>
                        <div className="space-y-2">
                          {sharedMedia.files.map((file) => (
                            <div key={file.id} className="flex items-center justify-between bg-[#1a1b23] p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="text-white text-sm">{file.name}</p>
                                  <p className="text-gray-400 text-xs">{file.size} • {file.date}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleMediaPreview(file)}
                                className="text-gray-400 hover:text-white"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Links Section */}
                    {sharedMedia.links.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                          <Link className="w-4 h-4" />
                          Links ({sharedMedia.links.length})
                        </h4>
                        <div className="space-y-2">
                          {sharedMedia.links.map((link) => (
                            <div key={link.id} className="bg-[#1a1b23] p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Link className="w-5 h-5 text-gray-400" />
                                <div className="flex-1">
                                  <p className="text-white text-sm">{link.title}</p>
                                  <p className="text-gray-400 text-xs">{link.url}</p>
                                  <p className="text-gray-500 text-xs">{link.date}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Load More Button */}
                    {hasMoreMedia && (
                      <button
                        onClick={loadMoreMedia}
                        disabled={mediaLoading}
                        className="w-full py-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {mediaLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading...
                          </div>
                        ) : (
                          'Load More Media'
                        )}
                      </button>
                    )}

                    {/* Empty State */}
                    {sharedMedia.images.length === 0 && sharedMedia.files.length === 0 && sharedMedia.links.length === 0 && (
                      <div className="text-center py-8">
                        <Image className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                        <p className="text-gray-400">No shared media found</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Mutual Tab */}
            {activeTab === 'mutual' && (
              <div className="p-6 space-y-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Mutual Groups & Channels
                </h3>
                
                {mutualLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {(showAllMutual ? mutualChannels : mutualChannels.slice(0, 3)).map((channel) => (
                        <div 
                          key={channel.id}
                          onClick={() => handleChannelClick(channel)}
                          className="flex items-center justify-between bg-[#1a1b23] p-4 rounded-lg cursor-pointer hover:bg-[#25262e] transition-colors duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {channel.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{channel.name}</p>
                              <p className="text-gray-400 text-sm">{channel.members} members</p>
                            </div>

                          </div>
                          <MessageCircle className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>

                    {mutualChannels.length > 3 && (
                      <button
                        onClick={() => setShowAllMutual(!showAllMutual)}
                        className="w-full py-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                      >
                        {showAllMutual ? 'Show Less' : `View All (${mutualChannels.length})`}
                      </button>
                    )}

                    {mutualChannels.length === 0 && (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                        <p className="text-gray-400">No mutual groups or channels</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserInfoDrawer;
