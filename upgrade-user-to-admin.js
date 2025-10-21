// 將用戶升級為管理員
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function upgradeUserToAdmin() {
    try {
        const userEmail = process.argv[2];
        
        if (!userEmail) {
            console.log('❌ 請提供用戶郵箱');
            console.log('使用方式: node upgrade-user-to-admin.js 用戶郵箱');
            console.log('例如: node upgrade-user-to-admin.js jeffouuo@gmail.com');
            process.exit(1);
        }
        
        console.log('🔧 將用戶升級為管理員...\n');
        
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
        console.log(`   當前角色: ${user.role}`);
        console.log(`   狀態: ${user.isActive ? '啟用' : '禁用'}\n`);
        
        if (user.role === 'admin') {
            console.log('ℹ️  此用戶已經是管理員了');
            await mongoose.connection.close();
            return;
        }
        
        // 升級為管理員
        user.role = 'admin';
        await user.save();
        
        console.log('✅ 用戶已成功升級為管理員！');
        console.log(`   新角色: ${user.role}\n`);
        console.log('🎉 現在您可以使用此帳號登入管理後台了\n');
        
        // 關閉連接
        await mongoose.connection.close();
        
    } catch (error) {
        console.error('❌ 錯誤:', error);
        process.exit(1);
    }
}

upgradeUserToAdmin();


