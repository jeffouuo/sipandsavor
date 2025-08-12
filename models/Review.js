const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        index: true
    },
    reviewerName: {
        type: String,
        required: true,
        default: '匿名用戶'
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    text: {
        type: String,
        required: true,
        maxlength: 500
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 創建複合索引以提高查詢性能
reviewSchema.index({ productName: 1, date: -1 });

module.exports = mongoose.model('Review', reviewSchema);
