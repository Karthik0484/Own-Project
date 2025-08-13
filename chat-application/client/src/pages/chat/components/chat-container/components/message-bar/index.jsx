import { useSocket } from "@/context/SocketContext";
import { useAppStore } from "@/store";
import { Content } from "@radix-ui/react-dialog";
import EmojiPicker from "emoji-picker-react";
import "@/styles/emoji-picker.css";
import { useEffect, useRef, useState } from "react";
import { GrAttachment } from "react-icons/gr"
import { IoSend } from "react-icons/io5";
import { RiEmojiStickerLine } from "react-icons/ri";
import { Socket } from "socket.io-client";
import { UPLOAD_FILE_ROUTE } from "@/utils/constants";
import { apiClient } from "@/lib/api-client";
import { data } from "autoprefixer";
import { set } from "date-fns";

const MessageBar = () => {
    const emojiRef = useRef();
    const fileInputRef = useRef();
    const socket = useSocket();
    const {selectedChatType,selectedChatData,userInfo, addConversation, onlineUsers, unreadCounts,setIsUploading,setIsDownloading,setFileUploadProgress,setFileDownloadProgress} =useAppStore();
    const [message, setMessage] = useState("");
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (emojiRef.current && !emojiRef.current.contains(event.target)) {
                setEmojiPickerOpen(false);
            }
        }
        const handler = (e) => handleClickOutside(e);
        document.addEventListener("mousedown", handler, true);
        document.addEventListener("touchstart", handler, true);
        return () => {
            document.removeEventListener("mousedown", handler, true);
            document.removeEventListener("touchstart", handler, true);
        };
    }, []);

    useEffect(() => {
        console.log("MessageBar - selectedChatType changed:", selectedChatType);
        console.log("MessageBar - selectedChatData changed:", selectedChatData);
    }, [selectedChatType, selectedChatData]);

    useEffect(() => {
        console.log("MessageBar - socket changed:", socket);
        if (socket) {
            console.log("Socket connected:", socket.connected);
            console.log("Socket ID:", socket.id);
        }
    }, [socket]);

    // Handle typing indicator
    useEffect(() => {
        if (!socket || !selectedChatData?._id) return;

        if (message.trim()) {
            if (!isTyping) {
                setIsTyping(true);
                socket.emit("typing", {
                    recipient: selectedChatData._id,
                    isTyping: true
                });
            }

            // Clear existing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Set new timeout to stop typing indicator
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                socket.emit("typing", {
                    recipient: selectedChatData._id,
                    isTyping: false
                });
            }, 1000);
        } else {
            if (isTyping) {
                setIsTyping(false);
                socket.emit("typing", {
                    recipient: selectedChatData._id,
                    isTyping: false
                });
            }
        }

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [message, socket, selectedChatData, isTyping]);

    const handleAddEmoji = (emojiData, emojiObject) => {
        // Support both v3 (emojiData.emoji) and v4 (emojiObject.emoji)
        const emojiChar = emojiObject?.emoji || emojiData?.emoji || '';
        if (!emojiChar) return;
        setMessage((msg) => msg + emojiChar);
        setEmojiPickerOpen(false);
        // Refocus textarea for continued typing
        requestAnimationFrame(() => {
          textAreaRef.current?.focus();
        });
    };

    const handleSendMessage = async() => {
      console.log("handleSendMessage called");
      console.log("selectedChatType:", selectedChatType);
      console.log("selectedChatData:", selectedChatData);
      console.log("userInfo:", userInfo);
      console.log("socket:", socket);
      console.log("socket type:", typeof socket);
      console.log("socket.emit:", socket?.emit);
      console.log("message:", message);

      if (!message.trim()) {
        console.log("Message is empty, not sending");
        return;
      }

      if (!socket) {
        console.error("Socket is not connected - socket is null/undefined");
        return;
      }

      if (!socket.emit || typeof socket.emit !== 'function') {
        console.error("Socket emit method is not available or not a function");
        console.error("Socket object:", socket);
        return;
      }

      if(selectedChatType === "contact"){
        const messageData = {
          sender: userInfo.id,
          content: message,
          recipient: selectedChatData._id,
          messageType: "text",
          fileUrl: undefined,
        };
        console.log("Emitting sendMessage with data:", messageData);
        try {
          socket.emit("sendMessage", messageData);
          console.log("Message sent successfully");
          // Stop typing indicator
          setIsTyping(false);
          socket.emit("typing", {
            recipient: selectedChatData._id,
            isTyping: false
          });
          // Add conversation to the list immediately for better UX
          const conversation = {
            _id: selectedChatData._id,
            firstName: selectedChatData.firstName,
            lastName: selectedChatData.lastName,
            image: selectedChatData.image,
            color: selectedChatData.color,
            lastSeen: selectedChatData.lastSeen,
            lastMessageText: message,
            lastMessageAt: new Date(),
            lastMessageType: "text",
          };
          addConversation(conversation);
          setMessage(""); // Clear the message input
        } catch (error) {
          console.error("Error sending message:", error);
        }
      } else if(selectedChatType === "channel") {
        socket.emit("send-channel-message", {
          sender: userInfo.id,
          content: message,
          channelId: selectedChatData._id,
          messageType: "text",
          fileUrl: undefined,
        });
        setMessage(""); // Clear the message input
      } else {
        console.log("selectedChatType is not 'contact':", selectedChatType);
      }
    };

    const handleAttachmentClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleAttachmentChange = async (event) => {
      try{
        const file = event.target.files[0];
        if(file){
          const formData = new FormData();
          formData.append("file", file);
          setIsUploading(true);
          const response = await apiClient.post(UPLOAD_FILE_ROUTE, formData, {
            withCredentials: true,
            onUploadProgress:data => {
              setFileUploadProgress(Math.round((data.loaded * 100) / data.total));
            },
          });
          if(response.status  === 200 && response.data){
            setIsUploading(false);
            if(selectedChatType === "contact"){
            socket.emit("sendMessage", {
              sender: userInfo.id,
              content: undefined,
              recipient: selectedChatData._id,
              messageType: "file",
              fileUrl: response.data.filePath,
            });
          } else if(selectedChatType === "channel") {
            socket.emit("send-channel-message", {
              sender: userInfo.id,
              content: undefined,
              channelId: selectedChatData._id,
              messageType: "file",
              fileUrl: response.data.filePath,
            });
          }
        }
      }
        console.log("Selected file:", {file});
      }
      catch(error){
        setIsUploading(false);
        console.log({error});
      }
    };
  const textAreaRef = useRef(null);

  const handleAutoResize = (e) => {
    const el = textAreaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="bg-[#1c1d25] sticky bottom-[env(safe-area-inset-bottom)] left-0 px-3 sm:px-4 md:px-6 py-2 sm:py-3">
      <div className="w-full flex items-center gap-2 sm:gap-3 md:gap-4">
        {/* Input + inline actions */}
        <div className="flex-1 min-w-0 flex items-center bg-[#2a2b33] rounded-md overflow-visible px-2 sm:px-3 md:px-4">
          <textarea
            ref={textAreaRef}
            rows={1}
            className="flex-1 min-w-0 resize-none bg-transparent py-2 sm:py-2.5 md:py-3 px-2 sm:px-3 text-sm sm:text-base outline-none max-h-40 overflow-y-auto"
            placeholder="Enter message"
            value={message}
            onChange={(e) => { setMessage(e.target.value); handleAutoResize(e); }}
            onInput={handleAutoResize}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          {/* Attachment */}
          <button
            aria-label="Attach file"
            className="flex-shrink-0 min-w-11 min-h-11 grid place-items-center rounded-md text-neutral-400 hover:text-white focus:outline-none transition-colors p-2 sm:p-2.5 md:p-3"
             onClick={handleAttachmentClick}
            >
            <GrAttachment className="w-6 h-6 md:w-7 md:h-7" />
            </button>
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleAttachmentChange} />

          {/* Emoji */}
          <div className="relative flex-shrink-0" ref={emojiRef}>
            <button
              aria-label="Open emoji picker"
              className="flex-shrink-0 min-w-11 min-h-11 grid place-items-center rounded-md text-neutral-400 hover:text-white focus:outline-none transition-colors p-2 sm:p-2.5 md:p-3"
              onClick={() => setEmojiPickerOpen((v) => !v)}
            >
              <RiEmojiStickerLine className="w-6 h-6 md:w-7 md:h-7" />
              </button>
          {emojiPickerOpen && (
              <div className="emoji-picker-popover emoji-picker-wrapper">
                <EmojiPicker
                  theme="dark"
                  onEmojiClick={handleAddEmoji}
                  autoFocusSearch={false}
                  lazyLoadEmojis
                  width="100%"
                />
              </div>
            )}
            </div>
        </div>

        {/* Send */}
        <button
          aria-label="Send message"
          className="flex-shrink-0 min-w-11 min-h-11 grid place-items-center bg-[#8417ff] hover:bg-[#741bda] rounded-md text-white transition-colors p-2 sm:p-2.5 md:p-3"
        onClick={handleSendMessage}
        >
          <IoSend className="w-6 h-6 md:w-7 md:h-7" />
        </button>
      </div>
    </div>
  );
};

export default MessageBar;