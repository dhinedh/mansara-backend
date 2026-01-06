const mongoose = require('mongoose');

const pressReleaseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true
    },
    summary: {
        type: String,
        required: true
    },
    content: {
        type: String
    },
    externalLink: {
        type: String
    },
    image: {
        type: String
    },
    images: [String],
    video: String,
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

// Helper to generate slug
const generateSlug = (title, counter) => {
    let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return counter > 0 ? `${slug}-${counter}` : slug;
};

// Pre-save hook to generate unique slug
pressReleaseSchema.pre('save', async function () {
    // Only generate if new or title changed
    if (!this.isNew && !this.isModified('title')) {
        return;
    }

    try {
        let counter = 0;
        let slug = generateSlug(this.title, counter);

        // Check for duplicates
        while (counter < 100) {
            const existing = await this.constructor.findOne({
                slug: slug,
                _id: { $ne: this._id }
            });

            if (!existing) {
                this.slug = slug;
                return;
            }

            counter++;
            slug = generateSlug(this.title, counter);
        }

        throw new Error('Could not generate unique slug');
    } catch (error) {
        throw error;
    }
});

module.exports = mongoose.model('PressRelease', pressReleaseSchema);