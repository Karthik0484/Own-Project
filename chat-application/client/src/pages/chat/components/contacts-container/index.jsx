import { useEffect } from "react";
import NewDM from "./components/new-dm";
import ProfileInfo from "./components/profile-info";
import { useAppStore } from "@/store";
import ContactList from "@/components/contact-list";
import { useSocket } from "@/context/SocketContext";
import CreateChannel from "./components/create-channel";
import { apiClient } from "@/lib/api-client";

const ContactsContainer = () => {
  const { conversations, loadConversations, addConversation,channels,setChannels,setDirectMessagesContacts } = useAppStore();
  const socket = useSocket();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

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
    const getChannels = async () => {
    const response = await apiClient.get(GET_USER_CHANNELS_ROUTE, {
      withCredentials: true,
    });
    if (response.data.channels) {
      setChannels(response.data.channels);
    }
  };

  
  getChannels();
  }, [socket, addConversation,setChannels,setDirectMessagesContacts]);



  return (
    <div className="relative md:w-[35vw] lg:w-[30vw] xl:w-[20vw] bg-[#1b1c24] border-r-2 border-[#2f303b] w-full">
      <div className="pt-3">
        <Logo />
      </div>
      <div className="my-5">
        <div className="flex items-center justify-between pr-10">
          <Title text="Direct Messages" />
          <NewDM />
        </div>
        <div className="max-h-[38vh] overflow-y-auto scrollbar-hidden">
          <ContactList conversations={conversations} />
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