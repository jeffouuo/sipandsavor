const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 開始測試...');

// 檢查環境變量
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '已設置' : '未設置');

// 定義 Order Schema
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
        enum: ['pending', 'completed', 'cancelled'],
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
    notes: {
        type: String,
        maxlength: [200, '備註不能超過200個字符']
    }
});

// 創建 Order 模型
const Order = mongoose.model('Order', orderSchema);

// 連接到數據庫
async function connectDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sipandsavor';
        console.log('🔗 嘗試連接到數據庫...');
        
        await mongoose.connect(mongoUri);
        console.log('✅ 數據庫連接成功');
    } catch (error) {
        console.error('❌ 數據庫連接失敗:', error.message);
        process.exit(1);
    }
}

// 測試數據庫保存
async function testDBSave() {
    console.log('🧪 測試數據庫保存...');
    
    const testOrderData = {
        tableNumber: "C3",
        area: "測試區域",
        items: [
            {
                name: "測試咖啡",
                price: 50,
                quantity: 2,
                subtotal: 100,
                customizations: "無糖,去冰",
                specialRequest: "測試特殊需求"
            }
        ],
        totalAmount: 100,
        orderType: "dine-in",
        status: "pending",
        deliveryMethod: "dine-in",
        paymentMethod: "cash",
        notes: "測試訂單"
    };
    
    console.log('📤 準備保存的數據:', JSON.stringify(testOrderData, null, 2));
    
    try {
        const newOrder = new Order(testOrderData);
        console.log('📝 創建的 Order 實例:', newOrder);
        
        const savedOrder = await newOrder.save();
        console.log('✅ 保存成功');
        console.log('📥 保存後的數據:', JSON.stringify(savedOrder.toObject(), null, 2));
        
        // 重新查詢確認數據
        const retrievedOrder = await Order.findById(savedOrder._id);
        console.log('🔍 重新查詢的數據:', JSON.stringify(retrievedOrder.toObject(), null, 2));
        
        return savedOrder;
        
    } catch (error) {
        console.error('❌ 保存失敗:', error.message);
        if (error.errors) {
            console.error('   驗證錯誤:', error.errors);
        }
        throw error;
    }
}

// 清理測試數據
async function cleanupTestData() {
    try {
        await Order.deleteMany({ tableNumber: "C3" });
        console.log('🧹 清理測試數據完成');
    } catch (error) {
        console.error('❌ 清理失敗:', error.message);
    }
}

// 主函數
async function main() {
    try {
        await connectDB();
        
        // 清理之前的測試數據
        await cleanupTestData();
        
        // 測試保存
        const savedOrder = await testDBSave();
        
        // 清理測試數據
        await cleanupTestData();
        
        console.log('✅ 測試完成');
        
    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 數據庫連接已關閉');
    }
}

// 運行測試
main().catch(console.error);
