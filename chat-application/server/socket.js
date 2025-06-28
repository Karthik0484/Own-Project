import { Socket, Server as SocketIOServer } from "socket.io"
import Message from "./models/MessagesModel.js";

const setupSocket = (server) => {
    const io = new SocketIOServer(server,{
    cors: {
        origin: process.env.ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
    },
 });

 const userSocketMap = new Map();

 const disconnect = (socket) => {
    console.log(`Client Disconnected: ${socket.id}`);
    for(const [userId,socketId] of userSocketMap.entries()) {
        if (socketId === socket.id){
            userSocketMap.delete(userId);
            break;
        }
    }
 };

 const sendMessage = async ( message ) => {
    console.log("sendMessage function called with:", message);
    
    try {
        const senderSocketId = userSocketMap.get(message.sender);
        const recipientSocketId = userSocketMap.get(message.recipient);
        
        console.log("Sender socket ID:", senderSocketId);
        console.log("Recipient socket ID:", recipientSocketId);
        console.log("User socket map:", userSocketMap);

        console.log("Creating message in database...");
        const createdMessage = await Message.create(message);
        console.log("Message created successfully:", createdMessage);

        console.log("Populating message data...");
        const messageData = await Message.findById(createdMessage._id)
        .populate("sender","id email firstName lastName image color")
        .populate("recipient","id email firstName lastName image color");
        console.log("Message data populated:", messageData);

        if (recipientSocketId) {
            console.log("Emitting to recipient:", recipientSocketId);
            io.to(recipientSocketId).emit("recieveMessage", messageData);
        }
        if (senderSocketId){
            console.log("Emitting to sender:", senderSocketId);
            io.to(senderSocketId).emit("recieveMessage", messageData);
        }
    } catch (error) {
        console.error("Error in sendMessage:", error);
    }
 };

 io.on("connection",(socket) => {
    console.log("New socket connection:", socket.id);
    const userId = socket.handshake.query.userId;
    console.log("User ID from query:", userId);

    if(userId) {
        userSocketMap.set(userId, socket.id);
        console.log(`User connected: ${userId} with socket ID: ${socket.id}`);
        console.log("Current user socket map:", userSocketMap);
    }else{
        console.log("User ID not provided during connection.")
    }

    socket.on("sendMessage", (data) => {
        console.log("Received sendMessage event from client:", data);
        sendMessage(data);
    });
    
    socket.on("disconnect",() =>disconnect(socket));

 });
};

export default setupSocket;