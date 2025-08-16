const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, '產品名稱是必需的'],
        trim: true,
        maxlength: [100, '產品名稱不能超過100個字符'],
        index: true // 單字段索引
    },
    description: {
        type: String,
        required: [true, '產品描述是必需的'],
        maxlength: [500, '產品描述不能超過500個字符']
    },
    price: {
        type: Number,
        required: [true, '產品價格是必需的'],
        min: [0, '價格不能為負數'],
        index: true // 為價格添加索引，便於排序和篩選
    },
    image: {
        type: String,
        required: [true, '產品圖片是必需的']
    },
    category: {
        type: String,
        required: [true, '產品分類是必需的'],
        enum: ['咖啡', '茶類'],
        index: true // 為分類添加索引
    },
    tags: [{
        type: String,
        trim: true
    }],
    isAvailable: {
        type: Boolean,
        default: true,
        index: true // 為可用性添加索引
    },
    stock: {
        type: Number,
        default: 0,
        min: [0, '庫存不能為負數'],
        index: true // 為庫存添加索引
    },
    salesCount: {
        type: Number,
        default: 0,
        index: true // 為銷量添加索引
    },
    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
            index: true // 為評分添加索引
        },
        count: {
            type: Number,
            default: 0
        }
    },
    featured: {
        type: Boolean,
        default: false,
        index: true // 為特色產品添加索引
    },
    sortOrder: {
        type: Number,
        default: 0,
        index: true // 為排序添加索引
    }
}, {
    timestamps: true
});

// 複合索引 - 提升查詢性能
productSchema.index({ name: 'text', description: 'text' }); // 全文搜索
productSchema.index({ category: 1, isAvailable: 1 }); // 分類和可用性
productSchema.index({ featured: 1, sortOrder: 1 }); // 特色產品排序
productSchema.index({ isAvailable: 1, sortOrder: 1, createdAt: -1 }); // 可用產品排序
productSchema.index({ category: 1, isAvailable: 1, price: 1 }); // 分類篩選和價格排序
productSchema.index({ isAvailable: 1, rating: { average: -1 } }); // 按評分排序
productSchema.index({ isAvailable: 1, salesCount: -1 }); // 按銷量排序

// 虛擬字段：格式化價格
productSchema.virtual('formattedPrice').get(function() {
    return `NT$ ${this.price.toLocaleString()}`;
});

// 確保虛擬字段在JSON中顯示
productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema); 