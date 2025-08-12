import { useAppStore } from "@/store";
import { HOST,GET_MESSAGES_ROUTE } from "@/utils/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { getColor } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";
import moment from "moment";
import { FaCheck } from 'react-icons/fa';
import { apiClient } from "@/lib/api-client";
import { MdFolderZip } from 'react-icons/md';
import { IoMdArrowRoundDown } from 'react-icons/io';
import { set } from "date-fns";
import { IoCloseSharp } from "react-icons/io5";
import { render } from "react-dom";

const MessageContainer = () => {

  const scrollRef = useRef();
  const containerRef = useRef();
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const { selectedChatType, selectedChatData, userInfo, selectedChatMessages ,setSelectedChatMessages,setFileDownloadProgress,setIsDownloading} =
       useAppStore();

const [showImage, setShowImage] = useState(false);
const [imageUrl, setImageUrl] = useState(null);

  // Fetch messages on chat change
  useEffect(() => {
    const getMessages = async () => {
      try {
        let response;
        if (selectedChatType === "channel") {
          response = await apiClient.get(`/api/channel/get-channel-messages/${selectedChatData._id}`, { withCredentials: true });
        } else {
          response = await apiClient.get(`${GET_MESSAGES_ROUTE}/${selectedChatData._id}`, { withCredentials: true });
        }
        if (response.data && response.data.messages) {
          setSelectedChatMessages(response.data.messages);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      }
    };
    if (selectedChatData._id && (selectedChatType === "contact" || selectedChatType === "channel")) {
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
        {selectedChatType === "channel" && renderChannelMessages(message)}
        </div>
     );
   });
};

const downloadFile = async (url) => {
  setIsDownloading(true);
  setFileDownloadProgress(0);
  const response = await apiClient.get(`${HOST}/${url}`, {
    responseType: "blob",
    onDownloadProgress: (progressEvent) => {
      const { loaded,total} = progressEvent;
    const percentCompleted = Math.round((loaded * 100) / total);
    setFileDownloadProgress(percentCompleted);
    }
  });
  const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = urlBlob;
  link.setAttribute("download", url.split("/").pop());
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(urlBlob);
  setIsDownloading(false);
  setFileDownloadProgress(0);
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
          <div 
           className="cursor-pointer"
            onClick={() => {
              setShowImage(true);
              setImageUrl(message.fileUrl);
            }}
            >

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
           <span className="bg-black/20 rounded-full p-3 text-2xl cursor-pointer hover:bg-black/50 transition-all duration-300"
           onClick={() => downloadFile(message.fileUrl)}
           >
            <IoMdArrowRoundDown/>
           </span>
         </div>)
        }
        </div>
)}
 <div className="text-xs text-gray-600">
      {moment(message.timestamp).format("LT")}
    </div>
   </div>
);

const renderChannelMessages = (message) => {
  const isOwnMessage = String(message.sender._id) === String(userInfo.id);
  return(
    <div className={`mt-5 ${isOwnMessage ? "text-right" : "text-left"}`}>
      {message.messageType === "text" && (
      <div
        className={`${
          message.sender._id ===userInfo.id
            ? " bg-[#8417ff]/5 text-[#8417ff]/90 border-[#8417ff]/50"
            : " bg-[#2a2b33]/5 text-white/80 border-[#ffffff]/20"
        } border inline-block p-4 rounded my-1 max-w-[50%] break-words ml-9`}
      >
        {message.content}
      </div>
    )}
    {
      message.sender._id !== userInfo.id ? (
        <div className="flex items-center justify-start gap-3">
          <Avatar className="h-8 w-8  rounded-full overflow-hidden ">
            {message.sender.image && (
              <AvatarImage
                src={`${HOST}/${message.sender.image}`}
                alt="profile"
                className="object-cover w-full h-full bg-black rounded-full"
                />
            )}
            <AvatarFallback
              className={`uppercase h-8 w-8 text-lg flex items-center justify-center rounded-full ${getColor(message.sender.color)}`}
            >
              {message.sender.firstName ? 
             ( message.sender.firstName || "").split("")
              : (message.sender.email || "").split("").shift()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-white/60">{`${message.sender.firstName} ${message.sender.lastName}`}</span>
          <span className="text-xs text-white/60">
          {moment(message.timestamp).format("LT")}
          </span>
        </div>
      ) : (
        <div className="text-xs text-white/60 mt-1">
          {moment(message.timestamp).format("LT")}
        </div>
      )
    }
    </div>
  );
}

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scrollbar-hidden p-4 pb-24 px-4 sm:px-6 md:px-8 md:w-[60vw] lg:w-[70vw] xl:w-[80vw] w-full"
      style={{ position: "relative" }}
    >
      {renderMessages()}
      <div ref={scrollRef} />
      {
        showImage && <div className="fixed z-[1000] top-0 left-0 h-[100vh] w-[100vw] flex items-center justify-center backdrop-blur-lg">
          <div>
            <img src={`${HOST}/${imageUrl}`} alt="Sent file"
            className = "h-[80vh] w-full bg-cover"
            />
          </div>
          <div className="flex gap-5 fixed top-0 mt-5">
            <button
            className="bg-black/20 rounded-full p-3 text-2xl cursor-pointer hover:bg-black/50 transition-all duration-300"
            onClick = {() => downloadFile(imageUrl)}
            >
              <IoMdArrowRoundDown />
            </button>
            <button
            className="bg-black/20 rounded-full p-3 text-2xl cursor-pointer hover:bg-black/50 transition-all duration-300"
            onClick = {() => {
              setShowImage(false);
              setImageUrl(null);
            }}
            >
              <IoCloseSharp />
            </button>
          </div>
        </div>
      }
    </div>
  );
}

export default MessageContainer;