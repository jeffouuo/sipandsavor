const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function initAdmin() {
    try {
        console.log('🔗 連接MongoDB...');
        
        // 連接MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sipandsavor', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ MongoDB 連接成功');
        
        // 檢查是否已存在管理員
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('⚠️ 管理員已存在，跳過創建');
            console.log(`📧 管理員郵箱: ${existingAdmin.email}`);
            return;
        }
        
        // 創建管理員賬戶
        const adminData = {
            username: 'admin',
            email: 'admin@sipandsavor.com',
            password: 'admin123', // 請在生產環境中更改
            role: 'admin',
            isActive: true,
            phone: '0912345678'
        };
        
        // 加密密碼
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);
        
        // 創建管理員用戶
        const admin = new User({
            ...adminData,
            password: hashedPassword
        });
        
        await admin.save();
        
        console.log('✅ 管理員賬戶創建成功！');
        console.log('📧 郵箱:', adminData.email);
        console.log('🔑 密碼:', adminData.password);
        console.log('⚠️ 請在生產環境中更改密碼！');
        
    } catch (error) {
        console.error('❌ 管理員初始化失敗:', error);
    } finally {
        // 關閉數據庫連接
        await mongoose.connection.close();
        console.log('🔌 數據庫連接已關閉');
        process.exit(0);
    }
}

// 執行初始化
initAdmin(); 