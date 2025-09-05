import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required : true,
    },
    recipient : {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required : false,
    },
    messageType:{
        type: String,
        enum: ["text","file"],
        required: true,
    },
    content: {
        type: String,
        required: function() {
            return this.messageType === "text";
        },
    },
    fileUrl: {
        type: String,
        required: function() {
            return this.messageType === "file";
        },
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        default: "sent",
        index: true,
    },
    read: {
        type: Boolean,
        default: false,
    },
});

// Define a sub-schema for a message (reuse existing fields)
const singleMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  messageType: { type: String, enum: ["text", "file"], required: true },
  content: { type: String, required: function() { return this.messageType === "text"; } },
  fileUrl: { type: String, required: function() { return this.messageType === "file"; } },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ["sent", "delivered", "read"], default: "sent", index: true },
  read: { type: Boolean, default: false }
}, { _id: false });

// Universe schema
const universeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  messages: [singleMessageSchema]
}, { _id: true });

// DM schema
const dmSchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }], // always 2
  universes: [universeSchema],
  createdAt: { type: Date, default: Date.now }
});

const DM = mongoose.model("DM", dmSchema);

export default DM;