import mongoose from "mongoose";

const channelSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    adminId: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.ObjectId, ref: "User", required: true }],
    createdBy: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    description: { type: String, default: "" },
    profilePicture: { type: String, default: null },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Messages" }],
}, { timestamps: true });

const Channel = mongoose.model("Channel", channelSchema);

export default Channel;