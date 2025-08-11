import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRoutes from "./routes/AuthRoutes.js";
import contactsRoutes from "./routes/ContactRoutes.js";
import messageRoutes from "./routes/MessageRoutes.js";
import setupSocket from "./socket.js";
import channelRoutes from "./routes/ChannelRoutes.js";

dotenv.config();

if (!process.env.JWT_KEY) {
  console.error("FATAL: JWT_KEY is not set in environment variables.");
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3001;
const databaseURL = process.env.DATABASE_URL;

const allowedOrigins = [
  process.env.ORIGIN,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://chat-app-frontend.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use("/profiles", express.static("uploads/profiles"));
app.use("/uploads/files", express.static("uploads/files"));
app.use("/files", express.static("uploads/files"));

app.get("/",(req,res) => {
    res.json("Hello")
})

app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/channel", channelRoutes)

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Deployed URL: https://chat-app-backend-r3v4.onrender.com`);
});

setupSocket(server)

mongoose.connect(databaseURL)
.then(()=>console.log("DB connection successful"))
.catch((err) => console.log(err.message));
