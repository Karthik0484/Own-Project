import admin from "firebase-admin";
import PushToken from "../models/PushToken.js";

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (!admin.apps.length && FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
} else {
  console.warn("FCM not initialized (missing env). Push disabled.");
}

export async function upsertToken({ userId, token, platform = "web", deviceId = "" }) {
  if (!userId || !token) return;
  await PushToken.updateOne({ userId, token }, { $set: { platform, deviceId, active: true } }, { upsert: true });
}

export async function removeToken({ userId, token }) {
  if (!userId || !token) return;
  await PushToken.deleteOne({ userId, token });
}

export async function removeInvalidTokens(tokens) {
  if (!tokens?.length) return;
  await PushToken.deleteMany({ token: { $in: tokens } });
}

export async function getUserTokens(userIds) {
  const docs = await PushToken.find({ userId: { $in: userIds }, active: true }).select("token userId");
  return docs.map((d) => d.token);
}

export async function sendMulticast({ tokens, notification, data, webpush, android }) {
  if (!admin.apps.length || !tokens?.length) return;
  const MAX = 500;
  for (let i = 0; i < tokens.length; i += MAX) {
    const chunk = tokens.slice(i, i + MAX);
    const res = await admin.messaging().sendEachForMulticast({ tokens: chunk, notification, data, webpush, android });
    const invalid = [];
    res.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code || "";
        if (code.includes("registration-token-not-registered") || code.includes("UNREGISTERED")) {
          invalid.push(chunk[idx]);
        }
      }
    });
    if (invalid.length) await removeInvalidTokens(invalid);
  }
}

export async function sendToUsers({ userIds, title, body, image, url, type, extra = {}, priority = "high", ttlSec = 3600 }) {
  if (!userIds?.length) return;
  const tokens = await getUserTokens(userIds);
  if (!tokens.length) return;
  await sendMulticast({
    tokens,
    notification: { title, body, image },
    data: { type, url, ...Object.entries(extra).reduce((acc, [k, v]) => (acc[k] = String(v), acc), {}) },
    webpush: { headers: { Urgency: priority === "high" ? "high" : "normal" }, fcmOptions: url ? { link: url } : undefined, notification: { icon: image || "/icon-192.png" } },
    android: { priority, ttl: ttlSec * 1000 },
  });
}


