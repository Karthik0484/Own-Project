import mongoose from "mongoose";
import { genSalt, hash } from "bcryptjs";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true,"Email is Required."],
        unique: true,
    },
    password: {
        type: String,
        required: [true,"Password is Required."],
    },
    firstName: {
        type: String,
        required: false,
    },
    lastName: {
        type: String,
        required: false,
    },
    image: {
        type: String,
        required: false,
    },
    color: {
        type: String,
        required: false,
    },
    profileSetup:{
        type: Boolean,
        default: false,
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
    online: {
        type: Boolean,
        default: false,
    },
});


userSchema.pre("save", async function(next){
    const salt =  await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt); 
    next();
});

const User = mongoose.model("User", userSchema);

export default User;