const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, '數量至少為1']
    },
    subtotal: {
        type: Number,
        required: true
    },
    customizations: {
        type: String,
        required: false
    },
    specialRequest: {
        type: String,
        required: false
    }
});

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    items: [orderItemSchema],
    totalAmount: {
        type: Number,
        required: true,
        min: [0, '總金額不能為負數']
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'credit_card', 'line_pay', 'apple_pay'],
        default: 'cash'
    },
    deliveryMethod: {
        type: String,
        enum: ['pickup', 'delivery', 'dine-in'],
        default: 'pickup'
    },
    pickupTime: {
        type: Date
    },
    deliveryAddress: {
        street: String,
        city: String,
        postalCode: String,
        phone: String
    },
    notes: {
        type: String,
        maxlength: [200, '備註不能超過200個字符']
    },
    // 內用訂單相關字段
    tableNumber: {
        type: String,
        required: false
    },
    area: {
        type: String,
        required: false
    },
    orderType: {
        type: String,
        enum: ['regular', 'dine-in'],
        default: 'regular'
    },
    // 外帶訂單號碼
    orderNumber: {
        type: String,
        required: false
    },
    orderTime: {
        type: Date,
        default: Date.now
    },
    estimatedTime: {
        type: Number, // 預計完成時間（分鐘）
        default: 15
    }
}, {
    timestamps: true
});

// 索引
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });

// 計算總金額
orderSchema.pre('save', function(next) {
    // 只有在總金額未設置或為0時才重新計算
    if ((!this.totalAmount || this.totalAmount === 0) && this.items && this.items.length > 0) {
        this.totalAmount = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    }
    next();
});

// 虛擬字段：格式化總金額
orderSchema.virtual('formattedTotalAmount').get(function() {
    return `NT$ ${this.totalAmount.toLocaleString()}`;
});

// 虛擬字段：訂單狀態中文
orderSchema.virtual('statusText').get(function() {
    const statusMap = {
        'pending': '待確認',
        'confirmed': '已確認',
        'preparing': '製作中',
        'ready': '待取餐',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[this.status] || this.status;
});

// 確保虛擬字段在JSON中顯示
orderSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);