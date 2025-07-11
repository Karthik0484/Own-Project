import { useAppStore } from "@/store";
import { HOST,GET_MESSAGES_ROUTE } from "@/utils/constants";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { getColor } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";
import moment from "moment";
import { FaCheck } from 'react-icons/fa';
import { apiClient } from "@/lib/api-client";
import { MdFolderZip } from 'react-icons/md';

const MessageContainer = () => {

  const scrollRef = useRef();
  const containerRef = useRef();
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const { selectedChatType, selectedChatData, userInfo, selectedChatMessages ,setSelectedChatMessages} =
       useAppStore();

  // Fetch messages on chat change
  useEffect(() => {
    const getMessages = async () => {
      try {
        const response = await apiClient.get(
          `${GET_MESSAGES_ROUTE}/${selectedChatData._id}`,
          { withCredentials: true }
        );
        if (response.data && response.data.messages) {
          setSelectedChatMessages(response.data.messages);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };
    if (selectedChatData._id && selectedChatType === "contact") {
      getMessages();
    }
    // Reset auto-scroll on chat change
    setIsAutoScroll(true);
  }, [selectedChatData, selectedChatType, setSelectedChatMessages]);

  // Smart auto-scroll on new messages
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedChatMessages, isAutoScroll]);

  // Detect user scroll position
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const threshold = 80; // px
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAutoScroll(atBottom);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

const checkIfImage = (filePath) => {
  const imageRegex = 
    /\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp|svg|ico|heic|heif)$/i;
  return imageRegex.test(filePath);
};

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
{
      message.messageType === "file" && (
      <div
        className={`${
          message.sender !== selectedChatData._id
            ? " bg-[#8417ff]/5 text-[#8417ff]/90 border-[#8417ff]/50"
            : " bg-[#2a2b33]/5 text-white/80 border-[#ffffff]/20"
        } border inline-block p-4 rounded my-1 max-w-[50%] break-words`}
      >
        {
        checkIfImage(message.fileUrl) ? (
          <div className="cursor-pointer">
            <img 
              src={`${HOST}/${message.fileUrl}`} 
              alt="Sent file"
              style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8, objectFit: "contain" }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/fallback-image.png"; // Place a fallback image in public/ or change as needed
                e.target.alt = "Image not available";
              }}
            />
          </div>
         ) : (
         <div className="flex items-center justify-center gap-4">
           <span className="text-white/8- text-3xl bg-black/20 rounded-full p-3 ">
           <MdFolderZip/>
           </span>
           <span>{message.fileUrl.split("/").pop()}</span>
         </div>)
        }
        </div>
)}
 <div className="text-xs text-gray-600">
      {moment(message.timestamp).format("LT")}
    </div>
   </div>
);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scrollbar-hidden p-4 px-8 md:w-[60vw] lg:w-[70vw] xl:w-[80vw] w-full"
      style={{ position: "relative" }}
    >
      {renderMessages()}
      <div ref={scrollRef} />
    </div>
  );
}

export default MessageContainer;