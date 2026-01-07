const mongoose = require('mongoose');
const blogPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    slug: {
        type: String,
        unique: true,
        index: true
    },
    content: {
        type: String,
        required: true
    },
    excerpt: String,
    featuredImage: String,
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    category: {
        type: String,
        index: true
    },
    tags: {
        type: [String],
        index: true
    },
    isPublished: {
        type: Boolean,
        default: false,
        index: true
    },
    publishedAt: {
        type: Date,
        index: true
    },
    viewCount: {
        type: Number,
        default: 0
    },
    metaTitle: String,
    metaDescription: String
}, { timestamps: true });

// Compound indexes
blogPostSchema.index({ isPublished: 1, publishedAt: -1 });
blogPostSchema.index({ category: 1, isPublished: 1 });
blogPostSchema.index({ title: 'text', content: 'text', excerpt: 'text' });

// Generate slug
blogPostSchema.pre('save', function (next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
    }
    next();
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

module.exports = BlogPost;