import mongoose from "mongoose";

const pushTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    token: { type: String, required: true, index: true },
    platform: { type: String, enum: ["web", "ios", "android"], default: "web" },
    deviceId: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pushTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

export default mongoose.model("PushToken", pushTokenSchema);


