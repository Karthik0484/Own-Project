import { useSocket } from "@/context/SocketContext";
import { useAppStore } from "@/store";
import { Content } from "@radix-ui/react-dialog";
import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";
import { GrAttachment } from "react-icons/gr"
import { IoSend } from "react-icons/io5";
import { RiEmojiStickerLine } from "react-icons/ri";
import { Socket } from "socket.io-client";

const MessageBar = () => {
    const emojiRef = useRef();
    const socket = useSocket();
    const {selectedChatType,selectedChatData,userInfo, addConversation, onlineUsers, unreadCounts} =useAppStore();
    const [message, setMessage] = useState("");
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if(emojiRef.current && !emojiRef.current.contains(event.target)){
                setEmojiPickerOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [emojiRef]);

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

    const handleAddEmoji = (emoji) => {
        setMessage((msg) => msg + emoji.emoji);
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
      } else {
        console.log("selectedChatType is not 'contact':", selectedChatType);
      }
    };

  return (
    <div className="h-[10vh] bg-[#1c1d25] flex justify-center items-center px-8 mb-6 gap-6">
        <div className="flex-1 flex bg-[#2a2b33] rounded-md items-center gap-5 pr-5">
            <input type="text" className="flex-1 p-5 bg-transparent rounded-md focus:border-none focus:outline-none"
              placeholder="Enter-Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
            />
            <button className="text-neutral-500 focus:border-none focus:outline-none focus:text-white duration-300 transition-all">
                <GrAttachment className="text-2xl "/>
            </button>
            <div className="relative">
              <button className="text-neutral-500 focus:border-none focus:outline-none focus:text-white duration-300 transition-all"
               onClick={()=>setEmojiPickerOpen(true)}>
                <RiEmojiStickerLine className="text-2xl "/>
              </button>
              <div className="absolute bottom-16 right-0" ref={emojiRef}>
              <EmojiPicker 
                theme="dark"
                open={emojiPickerOpen}
                onEmojiClick={handleAddEmoji} 
                autoFocusSearch={false}
              />
              </div>
            </div>
        </div>
        <button className="bg-[#8417ff] rounded-md flex items-center justify-center p-5  focus:border-none hover:bg-[#741bda] focus:bg-[#741bda] 
        focus:outline-none focus:text-white duration-300 transition-all"
        onClick={handleSendMessage}
        >
            <IoSend className="text-2xl "/>
        </button>
    </div>
  );
};

export default MessageBar;