const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 開始測試 Order 模型...');

// 檢查環境變量
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '已設置' : '未設置');

// 引入 Order 模型
const Order = require('./models/Order');

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

// 測試 Order 模型保存
async function testOrderModel() {
    console.log('🧪 測試 Order 模型保存...');
    
    const testOrderData = {
        tableNumber: "D4",
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
        
        // 檢查 pre-save 中間件是否會修改數據
        console.log('🔍 檢查 pre-save 中間件前的數據:');
        console.log('  totalAmount:', newOrder.totalAmount);
        console.log('  items:', newOrder.items);
        
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
        await Order.deleteMany({ tableNumber: "D4" });
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
        const savedOrder = await testOrderModel();
        
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
