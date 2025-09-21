import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import {
    createUpdate,
    getUpdates,
    getLatestUpdates,
    updateUpdate,
    deleteUpdate,
    getUpdateById,
    checkGroupAdmin
} from "../controllers/UpdatesController.js";

const router = Router();

// Group-specific routes (authentication required)
router.get("/group/:groupId", verifyToken, getUpdates); // Get all updates for a group
router.get("/group/:groupId/latest", verifyToken, getLatestUpdates); // Get latest updates for group carousel
router.get("/group/:groupId/admin", verifyToken, checkGroupAdmin); // Check if user is group admin
router.post("/group/:groupId", verifyToken, createUpdate); // Create new update for group (Group Admin only)
router.put("/:id", verifyToken, updateUpdate); // Update existing update (Group Admin only)
router.delete("/:id", verifyToken, deleteUpdate); // Delete update (Group Admin only)
router.get("/:id", verifyToken, getUpdateById); // Get specific update by ID (Group members only)

export default router;



