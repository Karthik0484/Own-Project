import { Router } from "express";
import { getMessages, getConversations, markMessagesAsRead, uploadFile, testConversations} from "../controllers/MessageController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

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

// Media download per PRD: GET /media/:fileId/download
messageRoutes.get("/media/:fileId/download", verifyToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    // The uploads structure is uploads/files/<date>/<originalname>
    // We will search inside uploads/files directories for the matching fileId folder
    const baseDir = path.resolve(process.cwd(), "uploads", "files");
    if (!fs.existsSync(baseDir)) return res.status(404).end();

    const folders = fs.readdirSync(baseDir);
    let filePath = null;
    for (const folder of folders) {
      if (folder === fileId) {
        // Use first file in folder
        const full = path.join(baseDir, folder);
        const files = fs.readdirSync(full);
        if (files.length > 0) {
          filePath = path.join(full, files[0]);
        }
        break;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    return fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default messageRoutes;
