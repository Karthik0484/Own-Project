import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Email is Required."],
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, "Password is Required."]
    },
    firstName: {
        type: String,
        required: false
    },
    lastName: {
        type: String,
        required: false
    },
    image: {
        type: String,
        required: false
    },
    color: {
        type: String,
        required: false
    },
    profileSetup: {
        type: Boolean,
        default: false
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    online: {
        type: Boolean,
        default: false
    }
});

<<<<<<< HEAD

userSchema.pre("save", async function(next){
    const salt = await genSalt();
    this.password = await hash(this.password, salt); 
    next();
=======
userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        return next(err);
    }
>>>>>>> 5dce6386bfcc0970d75381a4c4f67b2783b49f7a
});

const User = mongoose.model("User", userSchema);

export default User;
