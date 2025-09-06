import { useEffect } from "react";
import NewDM from "./components/new-dm";
import ProfileInfo from "./components/profile-info";
import { useAppStore } from "@/store";
import ContactList from "@/components/contact-list";
import { useSocket } from "@/context/SocketContext";
import CreateChannel from "./components/create-channel";
import { apiClient } from "@/lib/api-client";

const ContactsContainer = () => {
  const { 
    conversations, 
    loadConversations, 
    addConversation,
    channels,
    setChannels,
    setDirectMessagesContacts, 
    userInfo,
    conversationsLoading,
    conversationsError
  } = useAppStore();
  const socket = useSocket();

  // Load conversations on component mount and when userInfo changes
  useEffect(() => {
    if (userInfo) {
      loadConversations();
    }
  }, [loadConversations, userInfo]);

  // Always fetch channels on mount and when userInfo changes
  useEffect(() => {
    const getChannels = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      const response = await apiClient.get('/api/channel', {
        withCredentials: true,
      });
      if (response.data) {
        setChannels(response.data);
      }
    };
    if (userInfo) {
      getChannels();
    }
  }, [userInfo, setChannels]);

  useEffect(() => {
    if (socket) {
      const handleRecieveMessage = (message) => {
        // When a new message is received, update the conversation
        const conversation = {
          _id: message.sender._id === useAppStore.getState().userInfo?.id 
            ? message.recipient._id 
            : message.sender._id,
          firstName: message.sender._id === useAppStore.getState().userInfo?.id 
            ? message.recipient.firstName 
            : message.sender.firstName,
          lastName: message.sender._id === useAppStore.getState().userInfo?.id 
            ? message.recipient.lastName 
            : message.sender.lastName,
          image: message.sender._id === useAppStore.getState().userInfo?.id 
            ? message.recipient.image 
            : message.sender.image,
          color: message.sender._id === useAppStore.getState().userInfo?.id 
            ? message.recipient.color 
            : message.sender.color,
          lastSeen: message.sender._id === useAppStore.getState().userInfo?.id 
            ? message.recipient.lastSeen 
            : message.sender.lastSeen,
          lastMessageText: message.content,
          lastMessageAt: message.timestamp,
          lastMessageType: message.messageType,
        };
        addConversation(conversation);
      };

      socket.on("recieveMessage", handleRecieveMessage);

      return () => {
        socket.off("recieveMessage", handleRecieveMessage);
      };
    }
  }, [socket, addConversation]);


  return (
    <div className="relative w-full md:w-[35vw] lg:w-[30vw] xl:w-[20vw] bg-[#1b1c24] border-r-2 border-[#2f303b]">
      <div className="pt-3">
        <Logo />
      </div>
      <div className="my-5">
        <div className="flex items-center justify-between pr-10">
          <Title text="Direct Messages" />
          <NewDM />
        </div>
        <div className="max-h-[38vh] overflow-y-auto scrollbar-hidden">
          {conversationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-neutral-400 text-sm">Loading conversations...</div>
            </div>
          ) : conversationsError ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-red-400 text-sm text-center px-4">
                {conversationsError}
                <button 
                  onClick={() => loadConversations()} 
                  className="block mt-2 text-blue-400 hover:text-blue-300 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-neutral-400 text-sm text-center px-4">
                No conversations yet. Start a new DM to begin chatting!
              </div>
            </div>
          ) : (
            <ContactList conversations={conversations} />
          )}
        </div>
       
      </div>
      <div className="my-5">
        <div className="flex items-center justify-between pr-10">
          <Title text="Channels" />
          <CreateChannel />
           
        </div>
        <div className="max-h-[38vh] overflow-y-auto scrollbar-hidden">
          <ContactList conversations={channels} isChannel ={true}/>
        </div>
      </div>
      <ProfileInfo />
    </div>
  );
};

export default ContactsContainer;


const Logo = () => {
  return (
    <div className="flex p-5  justify-start items-center gap-2">
      <svg
        id="logo-38"
        width="78"
        height="32"
        viewBox="0 0 78 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {" "}
        <path
          d="M55.5 0H77.5L58.5 32H36.5L55.5 0Z"
          className="ccustom"
          fill="#8338ec"
        ></path>{" "}
        <path
          d="M35.5 0H51.5L32.5 32H16.5L35.5 0Z"
          className="ccompli1"
          fill="#975aed"
        ></path>{" "}
        <path
          d="M19.5 0H31.5L12.5 32H0.5L19.5 0Z"
          className="ccompli2"
          fill="#a16ee8"
        ></path>{" "}
      </svg>
      <span className="text-3xl font-semibold ">Connectify</span>
    </div>
  );
};


const Title = ({text})=> {
  return(
    <h6 className="uppercase tracking-widest text-neutral-400 pl-10 font-light text-opacity-90 text-sm">{text}</h6>
  );
};