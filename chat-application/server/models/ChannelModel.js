import mongoose from "mongoose";

const channelSchema = new mongoose.Schema({
    name: { type: String, required: true },
    members: [{ type: mongoose.Schema.ObjectId, ref: "User", required: true }],
    createdBy: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Messages" }],
});

const Channel = mongoose.model("Channel", channelSchema);

export default Channel;