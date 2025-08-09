const mongoose = require('mongoose');
require('dotenv').config();

async function checkAtlasConnection() {
    console.log('🔍 檢查 MongoDB Atlas 連接配置...\n');
    
    // 檢查環境變數
    console.log('📋 環境變數檢查:');
    console.log('- NODE_ENV:', process.env.NODE_ENV || '未設置');
    console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '✅ 已設置' : '❌ 未設置');
    console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '✅ 已設置' : '❌ 未設置');
    
    if (!process.env.MONGODB_URI) {
        console.log('\n❌ MONGODB_URI 未設置！');
        console.log('\n💡 如何設置 MongoDB Atlas:');
        console.log('1. 訪問 https://www.mongodb.com/atlas');
        console.log('2. 註冊/登入帳戶');
        console.log('3. 創建免費集群');
        console.log('4. 點擊 "Connect" 獲取連接字串');
        console.log('5. 連接字串格式: mongodb+srv://用戶名:密碼@cluster.mongodb.net/sipandsavor');
        console.log('\n🔧 在 Vercel 中設置:');
        console.log('1. 登入 https://vercel.com');
        console.log('2. 選擇 sipandsavor 專案');
        console.log('3. Settings > Environment Variables');
        console.log('4. 添加 MONGODB_URI 變數');
        return;
    }
    
    // 檢查連接字串格式
    const uri = process.env.MONGODB_URI;
    console.log('\n🔗 MongoDB URI 格式檢查:');
    
    if (uri.startsWith('mongodb+srv://')) {
        console.log('✅ 使用 MongoDB Atlas (SRV 格式)');
    } else if (uri.startsWith('mongodb://')) {
        console.log('⚠️  使用傳統 MongoDB (可能是本地)');
    } else {
        console.log('❌ 無效的 MongoDB URI 格式');
        return;
    }
    
    // 隱藏敏感資訊的 URI 顯示
    const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
    console.log('📍 連接到:', maskedUri);
    
    // 嘗試連接
    console.log('\n🔌 嘗試連接 MongoDB Atlas...');
    
    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 15000, // 15秒超時
            socketTimeoutMS: 45000
        });
        
        console.log('✅ MongoDB Atlas 連接成功！');
        console.log('📊 連接詳情:');
        console.log('- 資料庫名稱:', mongoose.connection.name || '預設');
        console.log('- 連接狀態:', mongoose.connection.readyState);
        console.log('- 主機:', mongoose.connection.host || '集群');
        
        // 測試資料庫操作
        console.log('\n🧪 測試資料庫操作...');
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📁 現有集合:', collections.map(c => c.name).join(', ') || '無');
        
        // 檢查產品數量
        try {
            const Product = require('./models/Product');
            const productCount = await Product.countDocuments();
            console.log('📦 產品數量:', productCount);
            
            if (productCount === 0) {
                console.log('⚠️  資料庫中沒有產品資料！');
                console.log('💡 執行: node init-atlas-db.js 來初始化資料');
            } else {
                console.log('✅ 產品資料已存在');
                
                // 顯示前5個產品
                const products = await Product.find().limit(5);
                console.log('\n📋 前5個產品:');
                products.forEach((p, i) => {
                    console.log(`${i + 1}. ${p.name} - NT$ ${p.price}`);
                });
            }
        } catch (modelError) {
            console.log('⚠️  無法檢查產品資料:', modelError.message);
        }
        
    } catch (error) {
        console.log('❌ MongoDB Atlas 連接失敗!');
        console.log('錯誤:', error.message);
        
        if (error.message.includes('authentication failed')) {
            console.log('\n💡 認證失敗解決方案:');
            console.log('1. 檢查用戶名和密碼是否正確');
            console.log('2. 確保資料庫用戶有讀寫權限');
            console.log('3. 在 MongoDB Atlas 中重新生成密碼');
        }
        
        if (error.message.includes('connection') || error.message.includes('timeout')) {
            console.log('\n💡 連接問題解決方案:');
            console.log('1. 檢查網路連接');
            console.log('2. 在 MongoDB Atlas 中設置 IP 白名單為 0.0.0.0/0');
            console.log('3. 確保集群狀態正常');
        }
        
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 連接已關閉');
    }
}

// 執行檢查
checkAtlasConnection().catch(console.error);
