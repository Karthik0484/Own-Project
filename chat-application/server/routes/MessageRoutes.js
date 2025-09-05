import { Router } from "express";
import { getMessages, getConversations, markMessagesAsRead, uploadFile, getOrCreateDM, getUniverses, addUniverse, getUniverseMessages, sendUniverseMessage } from "../controllers/MessageController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import multer from "multer";

const messageRoutes = Router();
const upload = multer({ dest: "uploads/files" });

messageRoutes.get("/get-messages/:recipientId", verifyToken, getMessages);
messageRoutes.get("/get-conversations", verifyToken, getConversations);
messageRoutes.post("/mark-read", verifyToken, markMessagesAsRead);
messageRoutes.post(
    "/upload-file",
    verifyToken, 
    upload.single("file"), 
    uploadFile
);

// Universe system routes
messageRoutes.get("/dm/:otherUserId", verifyToken, getOrCreateDM);
messageRoutes.get("/dm/:dmId/universes", verifyToken, getUniverses);
messageRoutes.post("/dm/:dmId/universes", verifyToken, addUniverse);
messageRoutes.get("/dm/:dmId/universe/:universeId/messages", verifyToken, getUniverseMessages);
messageRoutes.post("/dm/:dmId/universe/:universeId/message", verifyToken, sendUniverseMessage);

export default messageRoutes;
