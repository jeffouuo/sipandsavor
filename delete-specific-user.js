// 直接從數據庫刪除特定用戶（繞過安全限制）
// ⚠️ 警告：此腳本會直接刪除用戶，請謹慎使用！
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function deleteSpecificUser() {
    try {
        const userEmail = process.argv[2];
        
        if (!userEmail) {
            console.log('❌ 請提供用戶郵箱');
            console.log('使用方式: node delete-specific-user.js 用戶郵箱');
            console.log('例如: node delete-specific-user.js user@example.com');
            console.log('\n⚠️ 警告：此操作將直接從數據庫刪除用戶，無法撤銷！\n');
            process.exit(1);
        }
        
        console.log('🗑️  準備刪除用戶...\n');
        
        // 連接數據庫
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ 數據庫連接成功\n');
        
        // 查找用戶
        const user = await User.findOne({ email: userEmail });
        
        if (!user) {
            console.log(`❌ 找不到郵箱為 ${userEmail} 的用戶`);
            await mongoose.connection.close();
            process.exit(1);
        }
        
        console.log('📋 用戶信息:');
        console.log(`   用戶名: ${user.username}`);
        console.log(`   郵箱: ${user.email}`);
        console.log(`   角色: ${user.role}`);
        console.log(`   狀態: ${user.isActive ? '啟用' : '禁用'}\n`);
        
        // 警告提示
        console.log('⚠️  警告：您即將刪除此用戶！');
        console.log('⚠️  此操作無法撤銷！');
        console.log('⚠️  如果這是您當前登入的帳號，刪除後將無法再登入！\n');
        
        // 等待5秒讓用戶有機會取消（Ctrl+C）
        console.log('按 Ctrl+C 取消操作，或等待 5 秒自動繼續...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 刪除用戶
        await User.findByIdAndDelete(user._id);
        
        console.log('\n✅ 用戶已成功刪除！');
        console.log(`   已刪除用戶: ${user.username} (${user.email})\n`);
        
        // 檢查剩餘管理員數量
        const remainingAdmins = await User.countDocuments({ role: 'admin' });
        console.log(`📊 剩餘管理員數量: ${remainingAdmins}`);
        
        if (remainingAdmins === 0) {
            console.log('\n⚠️  警告：系統中已無管理員帳號！');
            console.log('請盡快創建新的管理員帳號：');
            console.log('node init-admin.js\n');
        }
        
        // 關閉連接
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('❌ 錯誤:', error);
        process.exit(1);
    }
}

deleteSpecificUser();

