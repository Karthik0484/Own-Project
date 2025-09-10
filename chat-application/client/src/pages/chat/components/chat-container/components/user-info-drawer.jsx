import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { formatLastSeen } from "@/utils/dateUtils";
import { Avatar, AvatarImage, AvatarFallback } from '@radix-ui/react-avatar';
import { toast } from "sonner";
import { useSocket } from "@/context/SocketContext";
import { apiClient } from "@/lib/api-client";
import { useNavigate } from "react-router-dom";
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
  Loader2,
  X,
  Play,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  File,
  Video
} from 'lucide-react';
import './user-info-drawer.css';

const UserInfoDrawer = ({ open, onClose }) => {
  const { selectedChatData, userInfo, onlineUsers, setSelectedChatData, setSelectedChatType } = useAppStore();
  const socket = useSocket();
  const navigate = useNavigate();
  
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
  
  // Media preview state
  const [mediaPreview, setMediaPreview] = useState({
    isOpen: false,
    currentIndex: 0,
    media: [],
    type: 'image' // 'image', 'video', 'file'
  });
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Actions menu & modals
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [reportReason, setReportReason] = useState('spam');

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
      
      const response = await apiClient.get(`/api/users/${userId}`, { 
        withCredentials: true 
      });
      
      if (response.data?.success) {
        setUserDetails(response.data.user);
      } else {
        toast.error(response.data?.error || 'Failed to load user details');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('User not found');
      } else if (error.response?.status === 401) {
        toast.error('Please log in to view user details');
      } else if (error.response?.status >= 500) {
        toast.error('Server error. Please try again later');
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        toast.error('Could not load profile. Try again.');
      } else {
        toast.error('Failed to load user details. Please check your connection');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch shared media from database
  const fetchSharedMedia = useCallback(async (userId, page = 1) => {
    if (!userId || !userInfo?.id) return;
    
    try {
      setMediaLoading(true);
      // Prefer unified media endpoint for richer metadata
      const response = await apiClient.get(`/api/users/${userId}/media`, {
        withCredentials: true
      });
      
      if (response.data?.success) {
        const all = response.data.media || [];
        const images = all.filter(m => m.type === 'image');
        const videos = all.filter(m => m.type === 'video');
        const files = all.filter(m => m.type !== 'image' && m.type !== 'video');
        setSharedMedia({ images, files: [...videos, ...files], links: [] });
        setHasMoreMedia(false);
        setMediaPage(1);
      } else {
        setSharedMedia({ images: [], files: [], links: [] });
      }
    } catch (error) {
      setSharedMedia({ images: [], files: [], links: [] });
    } finally {
      setMediaLoading(false);
    }
  }, [userInfo?.id]);

  // Fetch mutual channels from database
  const fetchMutualChannels = useCallback(async (userId) => {
    if (!userId || !userInfo?.id) return;
    
    try {
      setMutualLoading(true);
      const response = await apiClient.get(`/api/users/channels/mutual`, {
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
      setIsMuted(false);
    }
  }, [userInfo?.id]);

  // Load data when drawer opens
  useEffect(() => {
    if (!open || !selectedChatData?._id) return;
    
    const userId = selectedChatData._id;
    
    // Reset user details when opening
    setUserDetails(null);
    
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

    const handleUserUpdate = (data) => {
      if (data.userId === selectedChatData._id) {
        setUserDetails(prev => ({ ...prev, ...data.updates }));
        toast.info(`${displayName} updated their profile`);
      }
    };

    const handleStatusChange = (data) => {
      if (data.userId === selectedChatData._id) {
        setUserDetails(prev => ({ 
          ...prev, 
          lastSeen: data.lastSeen,
          customStatus: data.customStatus 
        }));
      }
    };

    const handleNewMedia = (data) => {
      if (data.senderId === selectedChatData._id || data.receiverId === selectedChatData._id) {
        fetchSharedMedia(selectedChatData._id, 1);
      }
    };

    const handleChannelUpdate = (data) => {
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
  const confirmBlockUser = () => {
    setShowActionsMenu(false);
    setShowBlockConfirm(true);
  };
  const confirmReportUser = () => {
    setShowActionsMenu(false);
    setShowReportConfirm(true);
  };

  const handleBlockUser = async () => {
    if (!selectedChatData?._id) return;
    
    try {
      const response = await apiClient.post(`/api/users/${selectedChatData._id}/block`, {}, { withCredentials: true });
      
      if (response.data?.success) {
        toast.success('User blocked successfully');
        setShowBlockConfirm(false);
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
      const response = await apiClient.post(`/api/users/${selectedChatData._id}/report`, {
        reason: reportReason
      }, { withCredentials: true });
      
      if (response.data?.success) {
        toast.success('User reported successfully');
        setShowReportConfirm(false);
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
      if (!item.url) return;
      const lower = item.name?.toLowerCase() || '';
      const url = item.url;
      const isImage = item.type === 'image';
      const isVideo = item.type === 'video';
      const isPdf = lower.endsWith('.pdf');
      const isTxt = lower.endsWith('.txt');

      if (isImage) {
        window.open(url, '_blank');
        return;
      }
      if (isVideo) {
        window.open(url, '_blank');
        return;
      }
      if (isPdf || isTxt) {
        window.open(url, '_blank');
        return;
      }

      // Download for other file types via PRD endpoint
      const response = await apiClient.get(`/api/media/${item.id}/download`, {
        responseType: 'blob',
        withCredentials: true
      });
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = item.name || `File-${item.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success(`Downloading ${item.name || `File-${item.id}`}...`);
    } catch (error) {
      console.error('Error downloading file:', error);
      const status = error?.response?.status;
      if (status === 404) toast.error('⚠️ File not found. It may have been deleted.');
      else toast.error('Failed to download file');
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

  // Enhanced responsive detection with better breakpoints
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Media preview functions
  const openMediaPreview = (media, index, type) => {
    setMediaPreview({
      isOpen: true,
      currentIndex: index,
      media: media,
      type: type
    });
  };

  const closeMediaPreview = () => {
    setMediaPreview({
      isOpen: false,
      currentIndex: 0,
      media: [],
      type: 'image'
    });
  };

  const navigateMedia = (direction) => {
    const { currentIndex, media } = mediaPreview;
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % media.length
      : (currentIndex - 1 + media.length) % media.length;
    
    setMediaPreview(prev => ({ ...prev, currentIndex: newIndex }));
  };

  const handleMediaClick = (item, type) => {
    if (type === 'image') {
      const allImages = sharedMedia.images;
      const index = allImages.findIndex(img => img.id === item.id);
      openMediaPreview(allImages, index, 'image');
    } else if (type === 'video') {
      const allVideos = sharedMedia.files.filter(f => f.type === 'video');
      const index = allVideos.findIndex(vid => vid.id === item.id);
      openMediaPreview(allVideos, index, 'video');
    } else {
      handleMediaPreview(item);
    }
  };

  // Enhanced media preview with better file type detection
  const getFileIcon = (fileName, fileType) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    
    if (fileType === 'video' || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
      return <Video className="w-5 h-5 text-blue-400" />;
    } else if (['pdf'].includes(extension)) {
      return <FileText className="w-5 h-5 text-red-400" />;
    } else if (['doc', 'docx'].includes(extension)) {
      return <FileText className="w-5 h-5 text-blue-400" />;
    } else if (['xls', 'xlsx'].includes(extension)) {
      return <FileText className="w-5 h-5 text-green-400" />;
    } else if (['ppt', 'pptx'].includes(extension)) {
      return <FileText className="w-5 h-5 text-orange-400" />;
    } else if (['zip', 'rar', '7z'].includes(extension)) {
      return <File className="w-5 h-5 text-purple-400" />;
    } else {
      return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Enhanced channel navigation with proper routing
  const handleChannelNavigation = async (channel) => {
    try {
      const id = channel.id || channel._id;
      // PRD: fetch channel details
      const response = await apiClient.get(`/api/channels/${id}`, { withCredentials: true });
      if (response?.data?.channelId) {
        setSelectedChatData({ ...channel, _id: id });
        setSelectedChatType('channel');
        navigate(`/chat/${id}`);
        onClose();
        toast.success(`Switched to ${channel.name}`);
      } else {
        toast.error('⚠️ Channel no longer exists.');
      }
    } catch (error) {
      if (error.response?.status === 404) toast.error('⚠️ Channel no longer exists.');
      else toast.error('Failed to access channel. Please try again.');
    }
  };

  // Keyboard navigation for media preview
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!mediaPreview.isOpen) return;

      switch (e.key) {
        case 'Escape':
          closeMediaPreview();
          break;
        case 'ArrowLeft':
          if (mediaPreview.media.length > 1) {
            navigateMedia('prev');
          }
          break;
        case 'ArrowRight':
          if (mediaPreview.media.length > 1) {
            navigateMedia('next');
          }
          break;
        default:
          break;
      }
    };

    if (mediaPreview.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [mediaPreview.isOpen, mediaPreview.media.length]);

  if (!open) return null;

  // Enhanced responsive width classes with better breakpoints
  const getResponsiveWidth = () => {
    if (isMobile) return 'w-full sm:w-[90%]';
    if (isTablet) return 'w-[45%] md:w-[40%]';
    return 'w-[35%] lg:w-[30%]';
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      <div 
        className={`${open ? 'translate-x-0' : 'translate-x-full'} fixed right-0 top-0 h-screen ${getResponsiveWidth()} bg-[#11121a] border-l border-[#2f303b] z-50 transition-transform duration-200`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-info-title"
      >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2f303b]">
        <h2 id="user-info-title" className="text-xl font-semibold text-white">User Info</h2>
        <div className="flex items-center gap-2">
          {/* Mobile actions menu trigger */}
          {isMobile && (
            <div className="relative">
              <button
                onClick={() => setShowActionsMenu(v => !v)}
                className="text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="More actions"
              >
                <MoreHorizontal className="w-6 h-6" />
              </button>
              {showActionsMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-[#1a1b23] border border-[#2f303b] rounded-md shadow-lg z-50">
                  <button className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#25262e]" onClick={confirmBlockUser}>Block User</button>
                  <button className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#25262e]" onClick={confirmReportUser}>Report User</button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Close user info panel"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#2f303b]" role="tablist">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
            activeTab === 'profile' 
              ? 'text-purple-400 border-b-2 border-purple-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          role="tab"
          aria-selected={activeTab === 'profile'}
          aria-controls="profile-panel"
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
            activeTab === 'media' 
              ? 'text-purple-400 border-b-2 border-purple-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          role="tab"
          aria-selected={activeTab === 'media'}
          aria-controls="media-panel"
        >
          Media
        </button>
        <button
          onClick={() => setActiveTab('mutual')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
            activeTab === 'mutual' 
              ? 'text-purple-400 border-b-2 border-purple-400' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          role="tab"
          aria-selected={activeTab === 'mutual'}
          aria-controls="mutual-panel"
        >
          Mutual
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <span className="ml-2 text-gray-400">Loading user details...</span>
          </div>
        ) : (
          <>
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              userDetails ? (
              <div id="profile-panel" className="p-6 space-y-6" role="tabpanel" aria-labelledby="profile-tab">
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
                          {lastSeenText}
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
                  {/* Desktop inline more button (placeholder for future) */}
                  {!isMobile && (
                    <button className="text-gray-400 hover:text-white">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  )}
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

                  {/* Actions - desktop only */}
                  <div className="space-y-3 hidden md:block">
                    <button
                      onClick={() => setShowBlockConfirm(true)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      Block User
                    </button>
                    
                    <button
                      onClick={() => setShowReportConfirm(true)}
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
              ) : (
                <div className="p-6">
                  {/* Show basic info from selectedChatData as fallback */}
                  {selectedChatData ? (
                    <div className="space-y-6">
                      {/* Basic Profile Section */}
                      <div className="text-center space-y-4">
                        <div className="relative inline-block">
                          <Avatar className="w-24 h-24 rounded-full overflow-hidden mx-auto">
                            {selectedChatData.image && (
                              <AvatarImage
                                src={selectedChatData.image.startsWith('http') ? selectedChatData.image : `${HOST}/${selectedChatData.image.replace(/^\//, '')}`}
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
                              {selectedChatData.firstName ? selectedChatData.firstName[0].toUpperCase() : selectedChatData.email?.[0]?.toUpperCase() || '?'}
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
                          <h3 className="text-xl font-semibold text-white">
                            {selectedChatData.firstName && selectedChatData.lastName 
                              ? `${selectedChatData.firstName} ${selectedChatData.lastName}`.trim()
                              : selectedChatData.email || 'Unknown User'
                            }
                          </h3>
                          <p className="text-gray-400 text-sm">{selectedChatData.email}</p>
                          
                          {/* Last Seen */}
                          <div className="mt-2">
                            {isOnline ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                                Online
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                {lastSeenText}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Error Message */}
                      <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-yellow-400 mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="font-medium">Limited Profile Information</span>
                        </div>
                        <p className="text-gray-300 text-sm mb-3">
                          Unable to load full profile details. Showing basic information from chat data.
                        </p>
                        <button
                          onClick={() => fetchUserDetails(selectedChatData._id)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm transition-colors duration-200"
                        >
                          Retry Loading Full Profile
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <h3 className="text-lg font-medium text-white mb-2">Could not load profile</h3>
                        <p className="text-gray-400 mb-4">There was an error loading this user's profile information.</p>
                        <button
                          onClick={() => fetchUserDetails(selectedChatData?._id)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* Media Tab */}
            {activeTab === 'media' && (
              <div id="media-panel" className="p-6 space-y-6" role="tabpanel" aria-labelledby="media-tab">
                <h3 className="text-lg font-semibold text-white">Shared Media & Files</h3>
                
                {mediaLoading && sharedMedia.images.length === 0 && sharedMedia.files.length === 0 && sharedMedia.links.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                  </div>
                ) : (
                  <>
                    {/* Images Grid */}
                    {sharedMedia.images.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Images ({sharedMedia.images.length})
                        </h4>
                        <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-3' : 'grid-cols-4'}`}>
                          {sharedMedia.images.map((img) => (
                            <div key={img.id} className="group relative rounded-lg overflow-hidden bg-[#1a1b23]">
                              <img
                                src={img.thumbnailUrl || img.url}
                                alt={img.name}
                                className="w-full h-32 object-cover"
                                loading="lazy"
                                onClick={() => handleMediaClick(img, 'image')}
                                onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22150%22><rect width=%22200%22 height=%22150%22 fill=%22%2325252e%22/><text x=%2250%22 y=%2275%22 fill=%22%23aaa%22>Image</text></svg>'; }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                                <div className="w-full p-2 text-xs text-white truncate">{img.name}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Videos and Other Files */}
                    {sharedMedia.files.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Files & Videos ({sharedMedia.files.length})
                        </h4>
                        <div className="space-y-2">
                          {sharedMedia.files.map((file) => (
                            <div key={file.id} className="bg-[#1a1b23] p-3 rounded-lg">
                              {file.type === 'video' ? (
                                <div className="space-y-2">
                                  <div className="rounded-md overflow-hidden bg-black">
                                    <video
                                      src={file.url}
                                      controls
                                      className="w-full h-48 object-contain"
                                      preload="metadata"
                                      onError={(e) => { e.currentTarget.controls = false; }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                      <p className="text-white text-sm truncate">{file.name || `Video-${file.id}`}</p>
                                      <p className="text-gray-400 text-xs truncate">{[file.size, formatJoinDate(file.uploadedAt)].filter(Boolean).join(' • ')}</p>
                                    </div>
                                    <button
                                      className="text-gray-300 hover:text-white"
                                      onClick={() => handleMediaPreview(file)}
                                      title="Download"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {getFileIcon(file.name, file.type)}
                                    <div className="min-w-0">
                                      <p className="text-white text-sm truncate">{file.name || `File-${file.id}`}</p>
                                      <p className="text-gray-400 text-xs truncate">{[file.size, formatJoinDate(file.uploadedAt)].filter(Boolean).join(' • ')}</p>
                                    </div>
                                  </div>
                                  <button
                                    className="text-gray-300 hover:text-white"
                                    onClick={() => handleMediaPreview(file)}
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {sharedMedia.images.length === 0 && sharedMedia.files.length === 0 && (
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
              <div id="mutual-panel" className="p-6 space-y-6" role="tabpanel" aria-labelledby="mutual-tab">
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
                          onClick={() => handleChannelNavigation(channel)}
                          className="flex items-center justify-between bg-[#1a1b23] p-4 rounded-lg cursor-pointer hover:bg-[#25262e] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleChannelNavigation(channel);
                            }
                          }}
                          aria-label={`Navigate to ${channel.name} channel`}
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

    {/* Media Preview Modal */}
    {mediaPreview.isOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4">
        <div className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={closeMediaPreview}
            className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black bg-opacity-50"
            aria-label="Close media preview"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Buttons */}
          {mediaPreview.media.length > 1 && (
            <>
              <button
                onClick={() => navigateMedia('prev')}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black bg-opacity-50"
                aria-label="Previous media"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => navigateMedia('next')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black bg-opacity-50"
                aria-label="Next media"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Media Content */}
          <div className="flex items-center justify-center w-full h-full">
            {mediaPreview.type === 'image' && (
              <img
                src={mediaPreview.media[mediaPreview.currentIndex]?.url}
                alt={mediaPreview.media[mediaPreview.currentIndex]?.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
            {mediaPreview.type === 'video' && (
              <video
                src={mediaPreview.media[mediaPreview.currentIndex]?.url}
                controls
                className="max-w-full max-h-full rounded-lg"
                autoPlay
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Media Info */}
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <p className="text-white text-sm bg-black bg-opacity-50 px-3 py-1 rounded-full inline-block">
              {mediaPreview.media[mediaPreview.currentIndex]?.name}
            </p>
            {mediaPreview.media.length > 1 && (
              <p className="text-gray-300 text-xs mt-1">
                {mediaPreview.currentIndex + 1} of {mediaPreview.media.length}
              </p>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Block Confirm Modal */}
    {showBlockConfirm && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
        <div className="bg-[#1a1b23] border border-[#2f303b] rounded-lg p-5 w-full max-w-sm">
          <h4 className="text-white font-semibold mb-2">Block User</h4>
          <p className="text-gray-300 text-sm mb-4">Are you sure you want to block this user?</p>
          <div className="flex justify-end gap-2">
            <button className="px-3 py-1.5 rounded-md bg-gray-600 text-white hover:bg-gray-500" onClick={() => setShowBlockConfirm(false)}>Cancel</button>
            <button className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700" onClick={handleBlockUser}>Block</button>
          </div>
        </div>
      </div>
    )}

    {/* Report Confirm Modal */}
    {showReportConfirm && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
        <div className="bg-[#1a1b23] border border-[#2f303b] rounded-lg p-5 w-full max-w-sm">
          <h4 className="text-white font-semibold mb-2">Report User</h4>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-1">Please select a reason</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full bg-[#11121a] border border-[#2f303b] text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="spam">Spam</option>
              <option value="harassment">Harassment</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-3 py-1.5 rounded-md bg-gray-600 text-white hover:bg-gray-500" onClick={() => setShowReportConfirm(false)}>Cancel</button>
            <button className="px-3 py-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-700" onClick={handleReportUser}>Submit</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default UserInfoDrawer;
  