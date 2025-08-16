const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true,
        index: true  // 单字段索引
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
        max: 5,
        index: true  // 为评分添加索引，便于统计查询
    },
    text: {
        type: String,
        required: true,
        maxlength: 500
    },
    date: {
        type: Date,
        default: Date.now,
        index: true  // 为日期添加索引，便于排序
    }
}, {
    timestamps: true
});

// 创建复合索引以提高查询性能
// 1. 产品名称 + 日期的复合索引（用于获取特定产品的评价，按日期排序）
reviewSchema.index({ productName: 1, date: -1 });

// 2. 产品名称 + 评分的复合索引（用于统计查询）
reviewSchema.index({ productName: 1, rating: 1 });

// 3. 产品名称 + 创建时间的复合索引（用于时间范围查询）
reviewSchema.index({ productName: 1, createdAt: -1 });

// 4. 产品名称 + 更新时间的复合索引（用于最新评价查询）
reviewSchema.index({ productName: 1, updatedAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
