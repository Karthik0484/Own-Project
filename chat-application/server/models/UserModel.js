/* User models is using for a table like*/
import mongoose from "mongoose";
/* this below package is help to Encrypt the password*/
import { genSalt } from "bcrypt";

const userSchema = new mongoose.Schema({
  
    email: {
        type: String,
        required: [true, "Email is Required"],
        unique: true,
    },
    password: {
        type: String,
        required:[true, "Password is Required"],
    },
    firstName: {
        type: String,
        required:false,
    },
    lastName:{
        type: String,
        required:false,
    },
    image: {
        type: String,
       required:false,
    },
    color: {
        type: Number,
        required: false,
    },
    profileSetup: {
        type: Boolean,
        default: false,
    },
});

/* This Below code is going to encrypt the password*/

userSchema.pre("save", async function (next) {
    const salt = await genSalt
});