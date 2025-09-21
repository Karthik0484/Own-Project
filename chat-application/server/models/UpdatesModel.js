import mongoose from "mongoose";

const updatesSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
        maxLength: [200, "Title cannot exceed 200 characters"]
    },
    description: {
        type: String,
        trim: true,
        maxLength: [500, "Description cannot exceed 500 characters"]
    },
    link: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                if (!v) return true; // Optional field
                return /^https?:\/\/.+/.test(v);
            },
            message: "Link must be a valid URL starting with http:// or https://"
        }
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    priority: {
        type: Number,
        default: 0, // Higher numbers = higher priority
        min: 0,
        max: 10
    },
    expiresAt: {
        type: Date,
        default: null // Optional expiration date
    }
}, {
    timestamps: true
});

// Index for efficient querying
updatesSchema.index({ createdAt: -1 });
updatesSchema.index({ groupId: 1, isActive: 1, priority: -1, createdAt: -1 });
updatesSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for formatted creation date
updatesSchema.virtual('formattedDate').get(function() {
    return this.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Ensure virtual fields are serialized
updatesSchema.set('toJSON', { virtuals: true });
updatesSchema.set('toObject', { virtuals: true });

const Updates = mongoose.model("Updates", updatesSchema);
export default Updates;



