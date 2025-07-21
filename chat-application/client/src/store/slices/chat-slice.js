import { add } from "date-fns";

export const createChatSlice = (set,get) => ({
    selectedChatType: undefined,
    selectedChatData: undefined,
    selectedChatMessages: [],
    isUploading:false,
    isDownloading:false,
    fileUploadProgress:0,
    fileDownloadProgress:0,
    channels:[],
    setChannels: (channels) => set({ channels }),
    setIsUploading: (isUploading) => set({ isUploading }),
    setIsDownloading: (isDownloading) => set({ isDownloading }),
    setFileUploadProgress: (fileUploadProgress) => set({ fileUploadProgress }),
    setFileDownloadProgress: (fileDownloadProgress) => set({ fileDownloadProgress }),
    conversations: [],
    unreadCounts: {}, // Track unread messages per conversation
    onlineUsers: {}, // { userId: true/false }
    setSelectedChatType: (selectedChatType) => set({ selectedChatType }),
    setSelectedChatData: (selectedChatData) => set({ selectedChatData }),
    setSelectedChatMessages: (selectedChatMessages) => set({ selectedChatMessages }),
    setConversations: (conversations) => set({ conversations }),
    addConversation: (conversation) => {
      const { conversations, selectedChatData } = get();
      const existingConversationIndex = conversations.findIndex(c => c._id === conversation._id);

      if (existingConversationIndex !== -1) {
        // Update existing conversation's last message details
        const updatedConversations = [...conversations];
        updatedConversations[existingConversationIndex] = {
          ...updatedConversations[existingConversationIndex],
          lastMessageText: conversation.lastMessageText,
          lastMessageAt: conversation.lastMessageAt,
          lastMessageType: conversation.lastMessageType,
          lastSeen: conversation.lastSeen,
        };
        set({ conversations: updatedConversations });
      } else {
        // Add new conversation to the list
        set({ conversations: [conversation, ...conversations] });
      }
    },
    markConversationAsRead: (conversationId) => {
      const { unreadCounts } = get();
      const updatedUnreadCounts = { ...unreadCounts };
      delete updatedUnreadCounts[conversationId];
      set({ unreadCounts: updatedUnreadCounts });
    },
    incrementUnreadCount: (conversationId) => {
      const { unreadCounts, selectedChatData } = get();
      
      // Don't increment if this conversation is currently selected
      if (selectedChatData?._id === conversationId) return;
      
      const currentCount = unreadCounts[conversationId] || 0;
      set({ 
        unreadCounts: { 
          ...unreadCounts, 
          [conversationId]: currentCount + 1 
        } 
      });
    },
    addChannel: (channel) => {
        const  channels  = get().channels;
        set({ channels: [channel , ...channels] });
    },

    closeChat: () => set({
        selectedChatData: undefined,
        selectedChatType: undefined,
        selectedChatMessages: [],
    }),
    addMessage: (message) => {
        const selectedChatMessages = get().selectedChatMessages;
        const selectedChatType = get().selectedChatType;

        set({
            selectedChatMessages: [
                ...selectedChatMessages,{
                    ...message,
                    recipient: 
                      selectedChatType === "channel" 
                        ? message.recipient 
                        : message.recipient._id,
                    sender: 
                      selectedChatType === "channel" 
                        ? message.sender 
                        : message.sender._id,
                },
            ],
        });
    },
    loadMessages: async (recipientId) => {
        console.log("Loading messages for recipient:", recipientId);
        try {
            const { apiClient } = await import("@/lib/api-client");
            const { GET_MESSAGES_ROUTE } = await import("@/utils/constants");
            
            const response = await apiClient.get(`${GET_MESSAGES_ROUTE}/${recipientId}`, {
                withCredentials: true
            });
            
            console.log("Messages response:", response.data);
            
            if (response.status === 200 && response.data.messages) {
                console.log("Setting messages:", response.data.messages);
                set({ selectedChatMessages: response.data.messages });
                
                // Mark conversation as read when loading messages
                const { markConversationAsRead } = get();
                markConversationAsRead(recipientId);
            }
        } catch (error) {
            console.error("Error loading messages:", error);
        }
    },
    loadConversations: async () => {
        console.log("Loading conversations...");
        try {
            const { apiClient } = await import("@/lib/api-client");
            const { GET_CONVERSATIONS_ROUTE } = await import("@/utils/constants");
            
            const response = await apiClient.get(GET_CONVERSATIONS_ROUTE, {
                withCredentials: true
            });
            
            console.log("Conversations response:", response.data);
            
            if (response.status === 200 && response.data.conversations) {
                console.log("Setting conversations:", response.data.conversations);
                set({ conversations: response.data.conversations });
            }
        } catch (error) {
            console.error("Error loading conversations:", error);
        }
    },
    setOnlineStatus: (userId, isOnline) => {
        const { onlineUsers } = get();
        set({ onlineUsers: { ...onlineUsers, [userId]: isOnline } });
    },
    updateMessageReadStatus: (recipientId, messageIds) => {
        // Update read status for messages in selectedChatMessages
        const { selectedChatMessages } = get();
        const updatedMessages = selectedChatMessages.map(msg =>
            messageIds.includes(msg._id) ? { ...msg, read: true } : msg
        );
        set({ selectedChatMessages: updatedMessages });
    },

    addChannelInChannelList: (message) => {
        const channels = get().channels;
        const data = channels.find((channel) => channel._id === message.channelId);
        const index = channels.findIndex((channel) => channel._id === message.channelId);
        if(index !== -1 && index !== undefined){
          channels.splice(index,1);
          channels.unshift(data);
        }
        set({ channels: channels });
    },

    addContactsInDMContacts: (message) => {
      const userId = get().userInfo.id;
      const fromId = 
          message.sender._id === userId
            ? message.recipient._id
            : message.sender._id;
      const fromData = 
        message.sender._id === userId ? message.recipient : message.sender;
      const dmContacts = get().directMessagesContacts;
      const data = dmContacts.find((contact) => contact._id === fromId);
      const index = dmContacts.findIndex((contact) => contact._id === fromId);
      if(index !== -1 && index !== undefined){
        dmContacts.splice(index,1);
        dmContacts.unshift(Data);
      }else{
        
        dmContacts.unshift(fromData);
      }
      set({ directMessagesContacts: dmContacts });
    },
      
    
});