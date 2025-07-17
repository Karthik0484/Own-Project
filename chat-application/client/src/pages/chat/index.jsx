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
    channels,
    setSelectedChatType,
    isUploading,
    isDownloading,
    fileUploadProgress,
    fileDownloadProgress,
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
      let channel = channels.find((ch) => ch._id === contactId);
      if (channel) {
        setSelectedChatData(channel);
        setSelectedChatType("channel");
        // Optionally: fetch channel messages if you support them
      } else {
      if (!conversation) {
        // Optionally fetch user profile if not found in conversations
        conversation = {
          _id: contactId,
          firstName: '',
          lastName: '',
          image: '',
          color: '',
          lastSeen: '',
        };
      }
      setSelectedChatData(conversation);
      setSelectedChatType("contact");
      getMessages();
      }
    } else {
      setSelectedChatData(undefined);
      setSelectedChatMessages([]);
      setSelectedChatType(undefined);
    }
  }, [
    contactId,
    conversations,
    channels,
    setSelectedChatData,
    setSelectedChatMessages,
    setSelectedChatType,
    userInfo,
    socket,
  ]);

  return (
    <div className="flex h-[100vh] text-white overflow-hidden">
      {
        isUploading && (
          <div className="h-[100vh] w-[100vw] fixed top-0 left-0 bg-black/80 flex items-center justify-center flex-col gap-5 backdrop-blur-lg ">
            <h5 className="text-5xl animate-pulse">Uploading</h5>
            { fileUploadProgress }%
          </div>
      )}
      {
        isDownloading && (
          <div className="h-[100vh] w-[100vw] fixed top-0 left-0 bg-black/80 flex items-center justify-center flex-col gap-5 backdrop-blur-lg ">
            <h5 className="text-5xl animate-pulse">Downloading</h5>
            { fileDownloadProgress }%
          </div>
      )}
      <ContactsContainer/>
      {
        selectedChatData === undefined ? (
        <EmptyChatContainer />
        ) : (
          <ChatContainer />
        )
      }
    </div>
  );
};

export default Chat;