import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import { upsertToken, removeToken, sendToUsers } from "../push/fcm.js";

const router = Router();

router.post("/subscribe", verifyToken, async (req, res) => {
  try {
    const { token, platform = "web", deviceId = "" } = req.body || {};
    if (!token) return res.status(400).json({ error: "Missing token" });
    await upsertToken({ userId: req.userId, token, platform, deviceId });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to subscribe token" });
  }
});

router.delete("/unsubscribe", verifyToken, async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: "Missing token" });
    await removeToken({ userId: req.userId, token });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to unsubscribe token" });
  }
});

router.post("/test", verifyToken, async (req, res) => {
  try {
    const { title = "Test", body = "Hello from FCM!" } = req.body || {};
    await sendToUsers({ userIds: [req.userId], title, body, url: `/chat`, type: "test" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to send test push" });
  }
});

export default router;


