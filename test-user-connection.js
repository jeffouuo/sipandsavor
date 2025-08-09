const mongoose = require('mongoose');

// 用戶提供的連接字串
const userUri = 'mongodb+srv://jeffouuo:ou2128211@cluster0.o4rppyz.mongodb.net/?retryWrites=true&w=majority&sipandsavor=Cluster0';

// 修正後的連接字串
const correctedUri = 'mongodb+srv://jeffouuo:ou2128211@cluster0.o4rppyz.mongodb.net/sipandsavor?retryWrites=true&w=majority';

async function testConnections() {
    console.log('🧪 測試用戶提供的連接字串...\n');
    
    // 測試原始連接字串
    console.log('1️⃣ 測試原始連接字串:');
    console.log('URI:', userUri.replace(':ou2128211@', ':****@'));
    
    try {
        await mongoose.connect(userUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000
        });
        
        console.log('✅ 原始連接字串：連接成功');
        console.log('📍 資料庫名稱:', mongoose.connection.name || '未指定');
        await mongoose.connection.close();
        
    } catch (error) {
        console.log('❌ 原始連接字串：連接失敗');
        console.log('錯誤:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 測試修正後的連接字串
    console.log('2️⃣ 測試修正後的連接字串:');
    console.log('URI:', correctedUri.replace(':ou2128211@', ':****@'));
    
    try {
        await mongoose.connect(correctedUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000
        });
        
        console.log('✅ 修正連接字串：連接成功');
        console.log('📍 資料庫名稱:', mongoose.connection.name || '未指定');
        
        // 檢查集合
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📁 集合:', collections.map(c => c.name).join(', ') || '無');
        
        // 檢查產品數量
        try {
            const Product = require('./models/Product');
            const productCount = await Product.countDocuments();
            console.log('📦 產品數量:', productCount);
        } catch (modelError) {
            console.log('⚠️ 無法檢查產品:', modelError.message);
        }
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.log('❌ 修正連接字串：連接失敗');
        console.log('錯誤:', error.message);
    }
    
    console.log('\n🎯 結論:');
    console.log('正確的 Vercel 環境變數應該設置為:');
    console.log('MONGODB_URI=' + correctedUri);
}

testConnections().catch(console.error);
