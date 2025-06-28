export const createChatSlice = (set,get) => ({
    selectedChatType: undefined,
    selectedChatData: undefined,
    selectedChatMessages: [],
    setSelectedChatType: (selectedChatType) => set({ selectedChatType }),
    setSelectedChatData: (selectedChatData) => set({ selectedChatData }),
    setSelectedChatMessages: (selectedChatMessages) => set({ selectedChatMessages }),
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
            }
        } catch (error) {
            console.error("Error loading messages:", error);
        }
    },
});