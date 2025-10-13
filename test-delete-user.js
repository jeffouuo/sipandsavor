// 測試刪除用戶功能
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function testDeleteUser() {
    try {
        console.log('🧪 測試刪除用戶功能...\n');
        
        // 連接數據庫
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ 數據庫連接成功\n');
        
        // 步驟 1: 創建測試用戶
        console.log('步驟 1: 創建測試用戶...');
        const testUser = new User({
            username: 'test_delete_user',
            email: 'test_delete@example.com',
            password: 'Test123',
            role: 'user',
            isActive: true
        });
        
        await testUser.save();
        console.log('✅ 測試用戶已創建');
        console.log(`   用戶 ID: ${testUser._id}`);
        console.log(`   用戶名: ${testUser.username}\n`);
        
        // 步驟 2: 驗證用戶存在
        console.log('步驟 2: 驗證用戶存在...');
        const foundUser = await User.findById(testUser._id);
        if (foundUser) {
            console.log('✅ 用戶存在於數據庫中\n');
        } else {
            console.log('❌ 找不到用戶\n');
            return;
        }
        
        // 步驟 3: 刪除用戶
        console.log('步驟 3: 刪除用戶...');
        await User.findByIdAndDelete(testUser._id);
        console.log('✅ 用戶已刪除\n');
        
        // 步驟 4: 驗證用戶已被刪除
        console.log('步驟 4: 驗證用戶已被刪除...');
        const deletedUser = await User.findById(testUser._id);
        if (!deletedUser) {
            console.log('✅ 用戶已成功從數據庫中刪除\n');
        } else {
            console.log('❌ 用戶仍然存在於數據庫中\n');
            return;
        }
        
        console.log('🎉 所有測試通過！刪除功能正常工作\n');
        
        // 關閉連接
        await mongoose.connection.close();
        console.log('✅ 測試完成');
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

testDeleteUser();

