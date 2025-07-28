const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, '產品名稱是必需的'],
        trim: true,
        maxlength: [100, '產品名稱不能超過100個字符']
    },
    description: {
        type: String,
        required: [true, '產品描述是必需的'],
        maxlength: [500, '產品描述不能超過500個字符']
    },
    price: {
        type: Number,
        required: [true, '產品價格是必需的'],
        min: [0, '價格不能為負數']
    },
    image: {
        type: String,
        required: [true, '產品圖片是必需的']
    },
    category: {
        type: String,
        required: [true, '產品分類是必需的'],
        enum: ['咖啡', '茶類']
    },
    tags: [{
        type: String,
        trim: true
    }],
    isAvailable: {
        type: Boolean,
        default: true
    },
    stock: {
        type: Number,
        default: 0,
        min: [0, '庫存不能為負數']
    },
    salesCount: {
        type: Number,
        default: 0
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0
        }
    },
    featured: {
        type: Boolean,
        default: false
    },
    sortOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// 索引
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, isAvailable: 1 });
productSchema.index({ featured: 1, sortOrder: 1 });

// 虛擬字段：格式化價格
productSchema.virtual('formattedPrice').get(function() {
    return `NT$ ${this.price.toLocaleString()}`;
});

// 確保虛擬字段在JSON中顯示
productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema); 