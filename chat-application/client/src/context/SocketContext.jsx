import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const socket = useRef();
    const { userInfo, selectedChatData, selectedChatType, addMessage } = useAppStore();

    useEffect(() => {
        if (userInfo) {
            console.log("Setting up socket connection...");
            console.log("User info:", userInfo);
            console.log("HOST:", HOST);
            
            socket.current = io(HOST, {
                withCredentials: true,
                query: { userId: userInfo.id },
            });

            socket.current.on("connect", () => {
                console.log("Connected to Socket Server.");
                console.log("Socket ID:", socket.current.id);
            });

            socket.current.on("connect_error", (error) => {
                console.error("Socket connection error:", error);
            });

            const handleRecieveMessage = (message) => {
                const {selectedChatData, selectedChatType, addMessage } = 
                useAppStore.getState();
                console.log("Received message:", message);
                console.log("Current selectedChatData:", selectedChatData);
                console.log("Current selectedChatType:", selectedChatType);

                if (
                    selectedChatType !== undefined &&
                    (selectedChatData._id === message.sender._id ||
                        selectedChatData._id === message.recipient._id)
                ) {
                    console.log("message rcv", message);
                  addMessage(message);
                } else {
                    console.log("Message not added - conditions not met");
                }
            };

            socket.current.on("recieveMessage", handleRecieveMessage);

            return () => {
                console.log("Disconnecting socket...");
                socket.current.off("recieveMessage", handleRecieveMessage);
                socket.current.disconnect();
            };
        } else {
            console.log("No userInfo available for socket connection");
        }
    }, [userInfo, selectedChatData, selectedChatType, addMessage]);

    return (
        <SocketContext.Provider value={socket.current}>
            {children}
        </SocketContext.Provider>
    );
};