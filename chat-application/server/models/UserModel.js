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
    firstName: String,
    lastName: String,
    image: String,
    color: String,
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

// Only one pre-save hook for password hashing
userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        return next(err);
    }
});

const User = mongoose.model("User", userSchema);
export default User;
