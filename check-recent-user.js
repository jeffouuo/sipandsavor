// 檢查最近創建的用戶
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkRecentUser() {
    try {
        console.log('🔍 檢查最近創建的用戶...\n');
        
        // 連接數據庫
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ 數據庫連接成功\n');
        
        // 獲取最近創建的用戶（按創建時間排序）
        const users = await User.find({})
            .select('+password')  // 包含密碼字段以檢查
            .sort({ createdAt: -1 })
            .limit(5);
        
        console.log(`📊 找到 ${users.length} 個用戶:\n`);
        
        users.forEach((user, index) => {
            console.log(`👤 用戶 ${index + 1}:`);
            console.log(`   ID: ${user._id}`);
            console.log(`   用戶名: ${user.username}`);
            console.log(`   郵箱: ${user.email}`);
            console.log(`   角色: ${user.role}`);
            console.log(`   狀態: ${user.isActive ? '✅ 啟用' : '❌ 禁用'}`);
            console.log(`   密碼已加密: ${user.password ? '✅ 是' : '❌ 否'}`);
            console.log(`   密碼長度: ${user.password ? user.password.length : 0} 字符`);
            console.log(`   是否為 bcrypt 哈希: ${user.password && user.password.startsWith('$2') ? '✅ 是' : '❌ 否'}`);
            console.log(`   手機: ${user.phone || '未提供'}`);
            console.log(`   創建時間: ${user.createdAt}`);
            console.log(`   最後登入: ${user.lastLogin || '從未登入'}`);
            console.log('');
        });
        
        // 關閉連接
        await mongoose.connection.close();
        console.log('✅ 檢查完成');
        
    } catch (error) {
        console.error('❌ 錯誤:', error);
        process.exit(1);
    }
}

checkRecentUser();


