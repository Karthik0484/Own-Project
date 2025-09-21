import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const {
        userInfo,
        selectedChatData,
        selectedChatType,
        addMessage,
        addConversation,
        incrementUnreadCount,
        setOnlineStatus,
        updateMessageReadStatus,
        updateMessageStatus,
    } = useAppStore();

    useEffect(() => {
        if (userInfo) {
            // Determine protocol for production
            let socketHost = HOST;
            if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
                socketHost = HOST.replace('http://', 'https://');
            }
            const newSocket = io(socketHost, {
                withCredentials: true,
                transports: [window.location.protocol === 'https:' ? 'websocket' : 'polling', 'websocket'],
                query: { userId: userInfo.id },
            });

            newSocket.on("connect", () => {
                console.log("Connected to Socket Server.");
                console.log("Socket ID:", newSocket.id);
                console.log("Socket object:", newSocket);
            });

            newSocket.on("connect_error", (error) => {
                console.error("Socket connection error:", error);
            });

            newSocket.on("disconnect", (reason) => {
                console.log("Socket disconnected:", reason);
            });

            // Real-time online status
            newSocket.on("userOnline", ({ userId }) => {
                setOnlineStatus(userId, true);
            });
            newSocket.on("userOffline", ({ userId }) => {
                setOnlineStatus(userId, false);
            });

            // Real-time read receipts
            newSocket.on("messagesRead", ({ recipientId, messageIds }) => {
                updateMessageReadStatus(recipientId, messageIds);
            });

            // Unified message status updates (sent, delivered, read)
            newSocket.on("message_status_update", ({ messageId, status }) => {
                updateMessageStatus(messageId, status);
            });

            const handleRecieveMessage = (message) => {
                const {
                    selectedChatData,
                    selectedChatType,
                    addMessage,
                    addConversation,
                    incrementUnreadCount,
                } = useAppStore.getState();
                console.log("Received message:", message);
                console.log("Current selectedChatData:", selectedChatData);
                console.log("Current selectedChatType:", selectedChatType);

                // Add message to current chat if it matches
                if (
                    selectedChatType !== undefined &&
                    (selectedChatData._id === message.sender._id ||
                        selectedChatData._id === message.recipient._id)
                ) {
                    console.log("message rcv", message);
                    addMessage(message);
                } else {
                    console.log("Message not added to current chat - conditions not met");
                }

                // Update conversation list
                const currentUserId = useAppStore.getState().userInfo?.id;
                if (currentUserId) {
                    const conversation = {
                        _id: message.sender._id === currentUserId 
                            ? message.recipient._id 
                            : message.sender._id,
                        firstName: message.sender._id === currentUserId 
                            ? message.recipient.firstName 
                            : message.sender.firstName,
                        lastName: message.sender._id === currentUserId 
                            ? message.recipient.lastName 
                            : message.sender.lastName,
                        image: message.sender._id === currentUserId 
                            ? message.recipient.image 
                            : message.sender.image,
                        color: message.sender._id === currentUserId 
                            ? message.recipient.color 
                            : message.sender.color,
                        lastSeen: message.sender._id === currentUserId 
                            ? message.recipient.lastSeen 
                            : message.sender.lastSeen,
                        lastMessageText: message.content,
                        lastMessageAt: message.timestamp,
                        lastMessageType: message.messageType,
                    };
                    addConversation(conversation);
                    
                    // Increment unread count if this conversation is not currently selected
                    const conversationId = conversation._id;
                    if (selectedChatData?._id !== conversationId) {
                        incrementUnreadCount(conversationId);
                    }
                }
                // Ensure we call the store action from the current store instance
                try {
                    const { addContactsInDMContacts } = useAppStore.getState();
                    if (typeof addContactsInDMContacts === 'function') {
                        addContactsInDMContacts(message);
                    }
                } catch {}
            };

            const handleRecieveChannelMessage = (message) => {
                const{ selectedChatData, selectedChatType, addMessage,addChannelInChannelList } = useAppStore.getState();

                if(selectedChatType!== undefined && 
                    selectedChatData._id === message.channelId
                ) {
                    console.log("Channel message received:", message);
                    addMessage(message);
                }
                addChannelInChannelList(message);
            };

            newSocket.on("recieveMessage", handleRecieveMessage);
            newSocket.on("receive-channel-message", handleRecieveChannelMessage);

            // Join channel room on channel selection
            if (selectedChatType === 'channel' && selectedChatData?._id) {
                newSocket.emit('join-group', { groupId: selectedChatData._id });
            }

            setSocket(newSocket);

            return () => {
                console.log("Disconnecting socket...");
                newSocket.off("recieveMessage", handleRecieveMessage);
                newSocket.disconnect();
                setSocket(null);
            };
        } else {
            console.log("No userInfo available for socket connection");
            setSocket(null);
        }
    }, [userInfo, selectedChatData, selectedChatType, addMessage, addConversation, incrementUnreadCount, setOnlineStatus, updateMessageReadStatus]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};