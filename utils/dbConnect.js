const mongoose = require('mongoose');

/**
 * MongoDB 連線快取輔助函式
 * 在 Serverless 環境（如 Vercel）中，不能每次請求都建立新連線
 * 使用 global.mongoose 快取連線，避免重複連接
 */
async function dbConnect() {
    // 檢查是否已有快取的連線
    if (global.mongoose && global.mongoose.connection.readyState === 1) {
        console.log('✅ 使用現有的 MongoDB 連線（快取）');
        return global.mongoose;
    }

    // 如果沒有連線或連線已斷開，建立新連線
    if (!global.mongoose) {
        console.log('🔗 建立新的 MongoDB 連線...');
        
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sipandsavor';
        
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 15000, // 15秒超時
            socketTimeoutMS: 45000, // 45秒socket超時
            maxPoolSize: 10, // 最大連接池大小
            retryWrites: true, // 啟用重試寫入
            w: 'majority' // 寫入確認
        };

        try {
            global.mongoose = await mongoose.connect(mongoUri, options);
            console.log('✅ MongoDB 連線成功（已快取）');
            return global.mongoose;
        } catch (error) {
            console.error('❌ MongoDB 連線失敗:', error);
            throw error;
        }
    }

    // 如果連線存在但狀態不是已連接，嘗試重新連接
    if (global.mongoose.connection.readyState !== 1) {
        console.log('⚠️ MongoDB 連線狀態異常，嘗試重新連接...');
        try {
            await global.mongoose.connection.close();
            delete global.mongoose;
            return await dbConnect(); // 遞迴調用以建立新連線
        } catch (error) {
            console.error('❌ MongoDB 重新連線失敗:', error);
            throw error;
        }
    }

    return global.mongoose;
}

module.exports = dbConnect;

