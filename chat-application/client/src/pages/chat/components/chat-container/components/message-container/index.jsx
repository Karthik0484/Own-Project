import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { getColor } from "@/lib/utils";
import { useEffect, useRef } from "react";
import moment from "moment";

const MessageContainer = () => {

  const scrollRef = useRef();
  const { selectedChatType, selectedChatData, userInfo, selectedChatMessages } =
       useAppStore();
  useEffect (() => {
     if (scrollRef.current) {
              scrollRef.current.scrollIntoView({behavior: "smooth" });
      }
}, [selectedChatMessages]);

const renderMessages = () => {
   let lastDate = null;
   return selectedChatMessages.map((message, index) => {
     const messageDate = moment(message.timestamp).format("YYYY-MM-DD");
     const showDate = messageDate !== lastDate;
     lastDate = messageDate;
     return (
        <div key={index}>
        {showDate && (
            <div className="text-center text-gray-500 my-2">
              {moment(message.timestamp).format("LL")}
            </div>
        )}
        {selectedChatType === "contact" && renderDMMessages(message)}
        </div>
     );
   });
};

 const renderDMMessages = (message) => ( 
  <div
    className={`${
         message.sender === selectedChatData._id ? "text-left" : "text-right"
  }`}
  >
    {message.messageType === "text" && (
      <div
        className={`${
          message.sender !== selectedChatData._id
            ? " bg-[#8417ff]/5 text-[#8417ff]/90 border-[#8417ff]/50"
            : " bg-[#2a2b33]/5 text-white/80 border-[#ffffff]/20"
        } border inline-block p-4 rounded my-1 max-w-[50%] break-words`}
      >
        {message.content}
      </div>
    )}
    <div className="text-xs text-gray-600">
      {moment(message.timestamp).format("LT")}
    </div>
   </div>
);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hidden p-1 px-8 md:w-[65vw] lg:w-[70vw] xl:w-[80vw] w-full">
      {selectedChatMessages && selectedChatMessages.map((message, index) => {
        const isOwnMessage = message.sender === userInfo.id || message.sender._id === userInfo.id;
        const sender = message.sender || {};
        
        return (
          <div
            key={index}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
          >
            <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[70%]`}>
              <div className="w-8 h-8 relative">
                <Avatar className="h-8 w-8 rounded-full overflow-hidden">
                  {sender.image ? (
                    <AvatarImage
                      src={`${HOST}/${sender.image}`}
                      alt="profile"
                      className="object-cover w-full h-full bg-black"
                    />
                  ) : (
                    <div className={`uppercase h-8 w-8 text-sm border-[1px] flex items-center justify-center rounded-full ${getColor(sender.color)}`}>
                      {sender.firstName
                        ? sender.firstName.split("").shift()
                        : sender.email ? sender.email.split("").shift() : "?"}
                    </div>
                  )}
                </Avatar>
              </div>
              <div
                className={`px-4 py-2 rounded-lg ${
                  isOwnMessage
                    ? 'bg-[#8417ff] text-white'
                    : 'bg-[#2a2b33] text-white'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageContainer;