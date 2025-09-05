import { Router } from "express";
import { getMessages, getConversations, markMessagesAsRead,uploadFile} from "../controllers/MessageController.js";
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

export default messageRoutes;
