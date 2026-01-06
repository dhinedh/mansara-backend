const mongoose = require('mongoose');

const pressReleaseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true
    },
    summary: {
        type: String,
        required: true
    },
    content: {
        type: String, // Full content or external link description
    },
    externalLink: {
        type: String // Link to original source if applicable
    },
    image: {
        type: String
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    isPublished: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Auto-generate slug
pressReleaseSchema.pre('save', function (next) {
    if (!this.slug && this.title) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    next();
});

module.exports = mongoose.model('PressRelease', pressReleaseSchema);
