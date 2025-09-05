import { useAppStore } from "@/store";
import { HOST,GET_MESSAGES_ROUTE } from "@/utils/constants";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { getColor } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";
import moment from "moment";
import { FaCheck } from 'react-icons/fa';
import { MdDoneAll } from 'react-icons/md';
import { apiClient } from "@/lib/api-client";
import { MdFolderZip } from 'react-icons/md';
import { IoMdArrowRoundDown } from 'react-icons/io';
import { set } from "date-fns";
import { IoCloseSharp } from "react-icons/io5";
import { render } from "react-dom";

const MessageContainer = ({ selectedUniverseId }) => {

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

  // Subscribe to status updates from socket
  useEffect(() => {
    const { socket } = useAppStore.getState();
    if (!socket) return;
    const handleStatusUpdate = ({ messageId, status }) => {
      setSelectedChatMessages(prev => prev.map(m => m._id === messageId ? { ...m, status, read: status === 'read' ? true : m.read } : m));
    };
    const handleMessagesRead = ({ messageIds }) => {
      setSelectedChatMessages(prev => prev.map(m => messageIds.includes(m._id) ? { ...m, status: 'read', read: true } : m));
    };
    socket.on('message_status_update', handleStatusUpdate);
    socket.on('messagesRead', handleMessagesRead);
    return () => {
      socket.off('message_status_update', handleStatusUpdate);
      socket.off('messagesRead', handleMessagesRead);
    };
  }, [setSelectedChatMessages]);

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

const checkIfVideo = (filePath) => {
  const videoRegex = /\.(mp4|webm|ogg|ogv|mov|m4v|avi|mkv)$/i;
  return videoRegex.test(filePath);
};

const checkIfAudio = (filePath) => {
  const audioRegex = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;
  return audioRegex.test(filePath);
};

const getMimeTypeFromExtension = (filePath) => {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  const map = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    tif: 'image/tiff',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    heic: 'image/heic',
    heif: 'image/heif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    ogv: 'video/ogg',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    flac: 'audio/flac',
  };
  return map[ext] || '';
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

  const renderStatusIcon = (message) => {
    // Colors per requirement
    const gray = "#9e9e9e";
    const blue = "#2196f3";
    if (message.status === 'read' || message.read) {
      return <MdDoneAll className="inline-block align-middle" color={blue} size={14} />;
    }
    if (message.status === 'delivered') {
      return <MdDoneAll className="inline-block align-middle" color={gray} size={14} />;
    }
    if (message.status === 'sent') {
      return <FaCheck className="inline-block align-middle" color={gray} size={14} />;
    }
    // Fallback for older messages without explicit status: show single gray tick
    return <FaCheck className="inline-block align-middle" color={gray} size={14} />;
};

 const renderDMMessages = (message) => ( 
  <div
    className={`${
         message.sender === selectedChatData._id ? "text-left" : "text-right"
  }`}
  >
    {message.messageType === "text" && (
      <>
      <div
        className={`${
          message.sender !== selectedChatData._id
              ? " bg-[#9333ea] text-white border-transparent"
            : " bg-[#2a2b33]/5 text-white/80 border-[#ffffff]/20"
          } border inline-block p-4 rounded-2xl my-1 max-w-[50%] break-words`}
      >
        {message.content}
      </div>
        <div
          className={`mt-1 flex items-center gap-1 text-[0.75rem] ${
            message.sender !== selectedChatData._id ? "justify-end" : "justify-start"
          }`}
          style={{ color: "#9e9e9e", lineHeight: 1 }}
        >
          <span>{moment(message.timestamp).format("LT")}</span>
          {message.sender !== selectedChatData._id && (
            <span className="ml-1 flex items-center" aria-label={message.status || 'sent'}>
              {renderStatusIcon(message)}
            </span>
          )}
        </div>
      </>
    )}
{
      message.messageType === "file" && (
      <>
      <div
        className={`${
          message.sender !== selectedChatData._id
              ? " bg-[#9333ea] text-white border-transparent"
            : " bg-[#2a2b33]/5 text-white/80 border-[#ffffff]/20"
          } border inline-block p-4 rounded-2xl my-1 max-w-[80%] break-words`}
      >
        {checkIfImage(message.fileUrl) && (
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
              className="w-full h-auto rounded-lg object-contain border border-gray-600 dark:border-gray-300 shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/fallback-image.png";
                e.target.alt = "Image not available";
              }}
            />
          </div>
        )}
        {checkIfVideo(message.fileUrl) && (
          <video
            controls
            className="w-full h-auto rounded-lg border border-gray-600 dark:border-gray-300 shadow-sm"
          >
            <source src={`${HOST}/${message.fileUrl}`} type={getMimeTypeFromExtension(message.fileUrl)} />
          </video>
        )}
        {checkIfAudio(message.fileUrl) && (
          <audio
            controls
            className="w-full max-w-[300px] rounded-lg border border-gray-600 dark:border-gray-300 shadow-sm"
          >
            <source src={`${HOST}/${message.fileUrl}`} type={getMimeTypeFromExtension(message.fileUrl)} />
          </audio>
        )}
        {!checkIfImage(message.fileUrl) && !checkIfVideo(message.fileUrl) && !checkIfAudio(message.fileUrl) && (
          <div className="flex items-center justify-center gap-4">
            <span className="text-white/8- text-3xl bg-black/20 rounded-full p-3 ">
              <MdFolderZip />
            </span>
            <span>{message.fileUrl.split("/").pop()}</span>
            <span
              className="bg-black/20 rounded-full p-3 text-2xl cursor-pointer hover:bg-black/50 transition-all duration-300"
              onClick={() => downloadFile(message.fileUrl)}
            >
              <IoMdArrowRoundDown />
            </span>
          </div>
        )}
        {message.content && (
          <div className="mt-2 text-sm leading-relaxed">{message.content}</div>
        )}
      </div>
        <div
          className={`mt-1 flex items-center gap-1 text-[0.75rem] ${
            message.sender !== selectedChatData._id ? "justify-end" : "justify-start"
          }`}
          style={{ color: "#9e9e9e", lineHeight: 1 }}
        >
          <span>{moment(message.timestamp).format("LT")}</span>
          {message.sender !== selectedChatData._id && (
            <span className="ml-1 flex items-center" aria-label={message.status || 'sent'}>
              {renderStatusIcon(message)}
            </span>
          )}
    </div>
      </>
    )}

   </div>
);

const renderChannelMessages = (message) => {
  const isOwnMessage = String(message.sender._id) === String(userInfo.id);
  return(
    <div className={`mt-5 ${isOwnMessage ? "text-right" : "text-left"}`}>
      {message.messageType === "text" && (
        <>
      <div
        className={`${
          message.sender._id ===userInfo.id
                ? " bg-[#9333ea] text-white border-transparent"
            : " bg-[#2a2b33]/5 text-white/80 border-[#ffffff]/20"
            } border inline-block p-4 rounded-2xl my-1 max-w-[50%] break-words ml-9`}
      >
        {message.content}
      </div>
        </>
    )}
    {message.messageType === "file" && (
      <>
      <div
        className={`${
          message.sender._id === userInfo.id
              ? " bg-[#9333ea] text-white border-transparent"
            : " bg-[#2a2b33]/5 text-white/80 border-[#ffffff]/20"
          } border inline-block p-4 rounded-2xl my-1 max-w-[80%] break-words ml-9`}
      >
        {checkIfImage(message.fileUrl) && (
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
              className="w-full h-auto rounded-lg object-contain border border-gray-600 dark:border-gray-300 shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/fallback-image.png";
                e.target.alt = "Image not available";
              }}
            />
          </div>
        )}
        {checkIfVideo(message.fileUrl) && (
          <video
            controls
            className="w-full h-auto rounded-lg border border-gray-600 dark:border-gray-300 shadow-sm"
          >
            <source src={`${HOST}/${message.fileUrl}`} type={getMimeTypeFromExtension(message.fileUrl)} />
          </video>
        )}
        {checkIfAudio(message.fileUrl) && (
          <audio
            controls
            className="w-full max-w-[300px] rounded-lg border border-gray-600 dark:border-gray-300 shadow-sm"
          >
            <source src={`${HOST}/${message.fileUrl}`} type={getMimeTypeFromExtension(message.fileUrl)} />
          </audio>
        )}
        {!checkIfImage(message.fileUrl) && !checkIfVideo(message.fileUrl) && !checkIfAudio(message.fileUrl) && (
          <div className="flex items-center justify-center gap-4">
            <span className="text-white/8- text-3xl bg-black/20 rounded-full p-3 ">
              <MdFolderZip />
            </span>
            <span>{message.fileUrl.split("/").pop()}</span>
            <span
              className="bg-black/20 rounded-full p-3 text-2xl cursor-pointer hover:bg-black/50 transition-all duration-300"
              onClick={() => downloadFile(message.fileUrl)}
            >
              <IoMdArrowRoundDown />
            </span>
          </div>
        )}
        {message.content && (
          <div className="mt-2 text-sm leading-relaxed">{message.content}</div>
        )}
      </div>
      </>
    )}
    {/* Single time row below bubble; include ticks for own messages */}
    <div
      className={`mt-1 flex items-center gap-1 text-[0.75rem] ${
        message.sender._id === userInfo.id ? "justify-end" : "justify-start"
      }`}
      style={{ color: "#9e9e9e", lineHeight: 1 }}
    >
      <span>{moment(message.timestamp).format("LT")}</span>
      {message.sender._id === userInfo.id && (
        <span className="ml-1 flex items-center" aria-label={message.status || 'sent'}>
          {renderStatusIcon(message)}
        </span>
      )}
    </div>
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
        </div>
      ) : null
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
        showImage && <div className="fixed z-[1000] top-0 left-0 h-[100vh] w-[100vw] flex items-center justify-center backdrop-blur-lg" onClick={() => { setShowImage(false); setImageUrl(null); }}>
          <div className="max-h-[85vh] max-w-[95vw] p-2" onClick={(e) => e.stopPropagation()}>
            <img src={`${HOST}/${imageUrl}`} alt="Sent file"
            className = "max-h-[80vh] max-w-[90vw] w-auto h-auto object-contain rounded-lg border border-gray-600 dark:border-gray-300 shadow-sm"
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