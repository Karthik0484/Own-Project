import React from 'react'
import { useAppStore } from "@/store";
import { useNavigate, useParams } from 'react-router-dom';
import { formatLastSeen, formatMessageTime } from '@/utils/dateUtils';
import { HOST } from '@/utils/constants';

const ContactList = ({ conversations, isChannel = false}) => {
    const { selectedChatData, onlineUsers, unreadCounts, setSelectedChatType, setSelectedChatData } = useAppStore();
    const navigate = useNavigate();
    const { userId: selectedUserId } = useParams();

    console.log("ContactList received conversations:", conversations);

    const handleClick = (conversation) => {
        if (isChannel) {
            setSelectedChatType('channel');
            setSelectedChatData(conversation);
        } else {
            setSelectedChatType('contact');
            setSelectedChatData(conversation);
        }
        navigate(`/chat/${conversation._id}`);
    };

    const isOnline = (userId) => {
        return !!onlineUsers[userId];
    };

    // Sort conversations by the most recent message timestamp
    const sortedConversations = [...(conversations || [])].sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
    });

    return (
        <div className='mt-5'>
            {sortedConversations.length > 0 ? (
                sortedConversations.map((conversation) => {
                    const isSelected = selectedUserId === conversation._id;
                    const unreadCount = unreadCounts?.[conversation._id] || 0;
                    // For channels, use name; for DMs, use firstName/lastName
                    const displayName = isChannel
                        ? (conversation.name || 'Unnamed Channel')
                        : `${conversation.firstName || ''} ${conversation.lastName || ''}`.trim();
                    const avatarUrl = isChannel
                        ? (conversation.profilePicture || conversation.image || conversation.profileImage)
                        : (conversation.profileImage || conversation.image);
                    const avatarInitial = isChannel
                        ? (conversation.name ? conversation.name[0].toUpperCase() : '#')
                        : conversation.firstName
                            ? conversation.firstName[0].toUpperCase()
                            : conversation.lastName
                                ? conversation.lastName[0].toUpperCase()
                                : '?';
                    return (
                        <div
                            key={conversation._id}
                            onClick={() => handleClick(conversation)}
                            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-[#2f303b] transition-colors duration-200 ${
                                isSelected ? 'bg-[#2f303b]' : ''
                            }`}
                        >
                            <div className="relative flex-shrink-0">
                                <div className="rounded-full flex items-center justify-center text-white font-bold overflow-hidden border border-gray-600 dark:border-gray-300 bg-purple-500 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12">
                                    {avatarUrl && (
                                        <img
                                            src={avatarUrl.startsWith('http') ? avatarUrl : `${HOST}/${avatarUrl}`}
                                            alt={displayName}
                                            className="w-full h-full rounded-full object-cover"
                                            loading="lazy"
                                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; const fb = e.currentTarget.parentNode.querySelector('.avatar-fallback'); if (fb) fb.style.display = 'flex'; }}
                                        />
                                    )}
                                    <div className={`avatar-fallback rounded-full flex items-center justify-center text-white font-bold ${avatarUrl ? 'hidden' : ''} w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12`}>
                                        {isChannel ? (conversation.name ? conversation.name[0].toUpperCase() : '#') : avatarInitial}
                                    </div>
                                </div>
                                {/* Online status indicator (only for DMs) */}
                                {!isChannel && isOnline(conversation._id) && (
                                    <div
                                      className="absolute rounded-full bg-green-500 border-2 border-[#1b1c24]"
                                      style={{ right: -2, bottom: -2, width: 10, height: 10 }}
                                    ></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-white font-medium truncate block">
                                            {displayName}
                                        </span>
                                        {!isChannel && (
                                            <span className="text-gray-500 text-xs block">
                                                {formatLastSeen(conversation.lastSeen)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {conversation.lastMessageAt && (
                                            <span className="text-gray-400 text-xs whitespace-nowrap ml-2">
                                                {formatMessageTime(conversation.lastMessageAt)}
                                            </span>
                                        )}
                                        {/* Unread message badge */}
                                        {unreadCount > 0 && (
                                            <div className="bg-[#8417ff] text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <p className={`text-sm truncate mt-1 ${unreadCount > 0 ? 'text-white font-medium' : 'text-gray-400'}`}>
                                    {conversation.lastMessageText || 'No messages yet'}
                                </p>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="text-gray-400 text-center py-4">
                    No recent conversations
                </div>
            )}
        </div>
    );
};

export default ContactList;