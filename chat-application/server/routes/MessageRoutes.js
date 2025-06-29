import { Router } from "express";
import { getMessages, getConversations, markMessagesAsRead } from "../controllers/MessageController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const messageRoutes = Router();

messageRoutes.get("/get-messages/:recipientId", verifyToken, getMessages);
messageRoutes.get("/get-conversations", verifyToken, getConversations);
messageRoutes.post("/mark-read", verifyToken, markMessagesAsRead);

export default messageRoutes;
