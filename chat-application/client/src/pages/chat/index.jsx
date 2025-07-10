import { useAppStore } from "@/store";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { GET_MESSAGES_ROUTE } from "@/utils/constants";
import { toast } from "sonner";
import EmptyChatContainer from "./components/empty-chat-container";
import ContactsContainer from "./components/contacts-container";
import ChatContainer from "./components/chat-container";
import { useSocket } from "@/context/SocketContext";

const Chat = () => {
  const {
    userInfo,
    selectedChatData,
    setSelectedChatData,
    setSelectedChatMessages,
    conversations,
    setSelectedChatType,
  } = useAppStore();
  const navigate = useNavigate();
  const { contactId } = useParams();
  const socket = useSocket();

  useEffect(() => {
    if (!userInfo) {
      navigate("/auth");
      return;
    }
    if (!userInfo.profileSetup) {
      toast("Please setup profile to continue.");
      navigate("/profile");
    }
  }, [userInfo, navigate]);

  useEffect(() => {
    const getMessages = async () => {
      try {
        const response = await apiClient.get(
          `${GET_MESSAGES_ROUTE}/${contactId}`,
          { withCredentials: true }
        );
        if (response.data && response.data.messages) {
          setSelectedChatMessages(response.data.messages);
          // Mark messages as read
          if (contactId && userInfo?.id) {
            await apiClient.post(
              "/api/messages/mark-read",
              { senderId: contactId, recipientId: userInfo.id },
              { withCredentials: true }
            );
            // Emit socket event for real-time read receipt
            if (socket) {
              socket.emit("readMessages", { senderId: contactId, recipientId: userInfo.id });
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        setSelectedChatMessages([]);
      }
    };

    if (contactId) {
      let conversation = conversations.find((c) => c._id === contactId);
      if (!conversation) {
        conversation = {
          _id: contactId,
          firstName: '',
          lastName: '',
          image: '',
          color: '',
          lastSeen: '',
        };
      }
      // Only update store if not already set to avoid flicker
      if (!selectedChatData || selectedChatData._id !== contactId) {
        setSelectedChatData(conversation);
        setSelectedChatType("contact");
      }
      getMessages();
    } else {
      setSelectedChatData(undefined);
      setSelectedChatMessages([]);
      setSelectedChatType(undefined);
    }
  }, [
    contactId,
    conversations,
    setSelectedChatData,
    setSelectedChatMessages,
    setSelectedChatType,
    userInfo,
    socket,
    selectedChatData,
  ]);

  return (
    <div className="flex h-[100vh] text-white overflow-hidden">
      <ContactsContainer/>
      {
        contactId && selectedChatData && selectedChatData._id === contactId ? (
          <ChatContainer />
        ) : (
          <EmptyChatContainer />
        )
      }
    </div>
  );
};

export default Chat;