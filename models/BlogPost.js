const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
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
    content: {
        type: String,
        required: true
    },
    excerpt: {
        type: String
    },
    image: {
        type: String
    },
    images: [String],
    video: String,
    author: {
        type: String,
        default: 'Admin'
    },
    tags: [String],
    isPublished: {
        type: Boolean,
        default: true
    },
    publishedAt: {
        type: Date,
        default: Date.now
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

// Generate slug from title
function generateSlug(title, counter = 0) {
    let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    if (counter > 0) {
        slug = `${slug}-${counter}`;
    }

    return slug;
}

// Pre-save hook to generate slug
// Pre-save hook to generate slug
blogPostSchema.pre('save', async function () {
    // Only generate if new or title changed
    if (!this.isNew && !this.isModified('title')) {
        return;
    }

    try {
        let counter = 0;
        let slug = generateSlug(this.title, counter);

        // Check for duplicates
        while (true) {
            const existingPost = await this.constructor.findOne({
                slug: slug,
                _id: { $ne: this._id }
            });

            if (!existingPost) {
                this.slug = slug;
                break;
            }

            counter++;
            slug = generateSlug(this.title, counter);

            // Safety limit to prevent infinite loop
            if (counter > 100) {
                throw new Error('Could not generate unique slug');
            }
        }
    } catch (error) {
        throw error;
    }
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

module.exports = BlogPost;