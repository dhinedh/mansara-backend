const mongoose = require('mongoose');
const careerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        index: true
    },
    slug: {
        type: String,
        unique: true,
        index: true
    },
    description: String,
    requirements: [String],
    responsibilities: [String],
    location: {
        type: String,
        index: true
    },
    department: {
        type: String,
        index: true
    },
    employmentType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
        index: true
    },
    experience: String,
    salary: {
        min: Number,
        max: Number,
        currency: {
            type: String,
            default: 'INR'
        }
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    applicationDeadline: {
        type: Date,
        index: true
    },
    postedDate: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

careerSchema.index({ isActive: 1, postedDate: -1 });
careerSchema.index({ department: 1, isActive: 1 });

careerSchema.pre('save', function (next) {
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
    }
    next();
});


module.exports = mongoose.model('Career', careerSchema);
