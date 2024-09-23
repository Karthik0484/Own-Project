import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const databaseURL = process.env.DATABASE_URL;


const server = app.listen(port, () => {
    console.log(`server is running at http://localhost:${port}`);
});

mongoose
.connnect(databaseURL)
.then(() => console.log("Database Connection Successfull"))
.catch((err) => console.log(err.message));