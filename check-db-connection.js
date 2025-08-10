const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 數據庫連接診斷工具');
console.log('========================');

// 檢查環境變量
console.log('\n📋 環境變量檢查:');
console.log('NODE_ENV:', process.env.NODE_ENV || '未設置');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '已設置' : '❌ 未設置');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '已設置' : '❌ 未設置');

if (!process.env.MONGODB_URI) {
    console.log('\n❌ 錯誤: MONGODB_URI 環境變量未設置');
    console.log('請在 Vercel 的環境變量中設置正確的 MONGODB_URI');
    process.exit(1);
}

// 測試數據庫連接
async function testDatabaseConnection() {
    console.log('\n🔗 開始測試數據庫連接...');
    
    try {
        // 設置連接選項
        const connectionOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            retryWrites: true,
            w: 'majority'
        };
        
        console.log('📡 嘗試連接到 MongoDB...');
        console.log('🔗 URI:', process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // 隱藏密碼
        
        const startTime = Date.now();
        
        await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
        
        const connectionTime = Date.now() - startTime;
        console.log(`✅ 數據庫連接成功！耗時: ${connectionTime}ms`);
        
        // 檢查連接狀態
        const dbStatus = mongoose.connection.readyState;
        const dbStatusText = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        console.log(`📊 連接狀態: ${dbStatusText[dbStatus]} (${dbStatus})`);
        
        // 測試查詢
        console.log('\n🧪 測試數據庫查詢...');
        
        // 導入模型
        const Order = require('./models/Order');
        const Product = require('./models/Product');
        const User = require('./models/User');
        
        // 測試查詢訂單
        const orderCount = await Order.countDocuments();
        console.log(`📋 訂單數量: ${orderCount}`);
        
        // 測試查詢產品
        const productCount = await Product.countDocuments();
        console.log(`🍵 產品數量: ${productCount}`);
        
        // 測試查詢用戶
        const userCount = await User.countDocuments();
        console.log(`👥 用戶數量: ${userCount}`);
        
        // 測試創建測試數據
        console.log('\n📝 測試創建數據...');
        
        const testOrder = new Order({
            user: null,
            items: [{
                name: '測試商品',
                price: 1,
                quantity: 1,
                subtotal: 1
            }],
            totalAmount: 1,
            paymentMethod: 'cash',
            deliveryMethod: 'pickup',
            notes: '數據庫連接測試 - ' + new Date().toISOString()
        });
        
        const savedOrder = await testOrder.save();
        console.log(`✅ 測試訂單創建成功: ${savedOrder._id}`);
        
        // 清理測試數據
        await Order.findByIdAndDelete(savedOrder._id);
        console.log('🧹 測試數據已清理');
        
        console.log('\n🎉 所有測試通過！數據庫連接正常');
        
    } catch (error) {
        console.error('\n❌ 數據庫連接失敗:');
        console.error('錯誤類型:', error.constructor.name);
        console.error('錯誤信息:', error.message);
        
        // 提供具體的錯誤解決方案
        if (error.message.includes('ENOTFOUND')) {
            console.log('\n💡 解決方案:');
            console.log('1. 檢查 MONGODB_URI 中的主機名是否正確');
            console.log('2. 檢查網路連接');
            console.log('3. 如果是 Atlas，檢查 IP 白名單設置');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 解決方案:');
            console.log('1. 檢查 MongoDB 服務是否運行');
            console.log('2. 檢查端口是否正確');
            console.log('3. 檢查防火牆設置');
        } else if (error.message.includes('Authentication failed')) {
            console.log('\n💡 解決方案:');
            console.log('1. 檢查用戶名和密碼是否正確');
            console.log('2. 檢查用戶是否有正確的權限');
            console.log('3. 檢查資料庫名稱是否正確');
        } else if (error.message.includes('Server selection timed out')) {
            console.log('\n💡 解決方案:');
            console.log('1. 檢查網路連接');
            console.log('2. 如果是 Atlas，檢查 IP 白名單');
            console.log('3. 嘗試增加 serverSelectionTimeoutMS');
        }
        
        process.exit(1);
    } finally {
        // 關閉連接
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('\n🔌 數據庫連接已關閉');
        }
    }
}

// 運行測試
testDatabaseConnection().catch(console.error);
