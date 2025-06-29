import React from 'react'
import { useAppStore } from "@/store";
import { useNavigate, useParams } from 'react-router-dom';
import { formatLastSeen, formatMessageTime } from '@/utils/dateUtils';

const ContactList = ({ conversations, isChannel = false}) => {
    const { selectedChatData, onlineUsers, unreadCounts } = useAppStore();
    const navigate = useNavigate();
    const { userId: selectedUserId } = useParams();

    console.log("ContactList received conversations:", conversations);

    const handleClick = (conversation) => {
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
                    const avatarUrl = conversation.profileImage || conversation.image;
                    const avatarInitial = conversation.firstName ? conversation.firstName[0].toUpperCase() : conversation.lastName ? conversation.lastName[0].toUpperCase() : '?';
                    
                    return (
                        <div
                            key={conversation._id}
                            onClick={() => handleClick(conversation)}
                            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-[#2f303b] transition-colors duration-200 ${
                                isSelected ? 'bg-[#2f303b]' : ''
                            }`}
                        >
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden"
                                    style={{ backgroundColor: conversation.color || '#8338ec' }}>
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt={`${conversation.firstName} ${conversation.lastName}`}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <span>{avatarInitial}</span>
                                    )}
                                </div>
                                {/* Online status indicator */}
                                {isOnline(conversation._id) && (
                                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1b1c24]"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-white font-medium truncate block">
                                            {`${conversation.firstName} ${conversation.lastName}`}
                                        </span>
                                        <span className="text-gray-500 text-xs block">
                                            {formatLastSeen(conversation.lastSeen)}
                                        </span>
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