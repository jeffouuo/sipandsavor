const mongoose = require('mongoose');

// 用戶指定的確切 URI
const userExactUri = 'mongodb+srv://jeffouuo:ou2128211@cluster0.o4rppyz.mongodb.net/?retryWrites=true&w=majority&sipandsavor=Cluster0';

// 建議的修正版本
const suggestedUri = 'mongodb+srv://jeffouuo:ou2128211@cluster0.o4rppyz.mongodb.net/sipandsavor?retryWrites=true&w=majority';

async function testUserExactUri() {
    console.log('🧪 測試用戶指定的確切 URI...\n');
    
    // 測試用戶的確切 URI
    console.log('1️⃣ 測試用戶確切 URI:');
    console.log('URI:', userExactUri.replace(':ou2128211@', ':****@'));
    
    try {
        await mongoose.connect(userExactUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000
        });
        
        console.log('✅ 用戶確切 URI：連接成功');
        console.log('📍 資料庫名稱:', mongoose.connection.name || '未指定');
        
        // 檢查集合
        try {
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('📁 集合:', collections.map(c => c.name).join(', ') || '無');
            
            // 檢查產品
            const Product = require('./models/Product');
            const productCount = await Product.countDocuments();
            console.log('📦 產品數量:', productCount);
            
        } catch (collectionError) {
            console.log('⚠️ 無法檢查集合:', collectionError.message);
        }
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.log('❌ 用戶確切 URI：連接失敗');
        console.log('錯誤:', error.message);
        
        if (error.message.includes('no database specified')) {
            console.log('💡 問題：沒有指定資料庫名稱');
        }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 測試建議的修正版本
    console.log('2️⃣ 測試建議的修正版本:');
    console.log('URI:', suggestedUri.replace(':ou2128211@', ':****@'));
    
    try {
        await mongoose.connect(suggestedUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000
        });
        
        console.log('✅ 建議修正 URI：連接成功');
        console.log('📍 資料庫名稱:', mongoose.connection.name || '未指定');
        
        // 檢查集合和產品
        try {
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('📁 集合:', collections.map(c => c.name).join(', ') || '無');
            
            const Product = require('./models/Product');
            const productCount = await Product.countDocuments();
            console.log('📦 產品數量:', productCount);
            
        } catch (collectionError) {
            console.log('⚠️ 無法檢查集合:', collectionError.message);
        }
        
        await mongoose.connection.close();
        
    } catch (error) {
        console.log('❌ 建議修正 URI：連接失敗');
        console.log('錯誤:', error.message);
    }
    
    console.log('\n🎯 結論:');
    console.log('如果您的確切 URI 能正常工作，我們就使用它！');
    console.log('如果不行，建議使用修正版本以確保功能正常。');
}

testUserExactUri().catch(console.error);
