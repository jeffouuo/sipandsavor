// 測試用戶登入功能
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function testLogin() {
    try {
        console.log('🔍 測試用戶登入功能...\n');
        
        // 連接數據庫
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ 數據庫連接成功\n');
        
        // 測試登入信息（請修改為您剛創建的帳號信息）
        const testEmail = 'jeffouuo@gmail.com';  // 您的郵箱
        const testPassword = process.argv[2];  // 從命令行參數獲取密碼
        
        if (!testPassword) {
            console.log('❌ 請提供密碼作為參數');
            console.log('使用方式: node test-login.js 您的密碼');
            process.exit(1);
        }
        
        console.log(`📧 測試郵箱: ${testEmail}`);
        console.log(`🔑 測試密碼: ${'*'.repeat(testPassword.length)}\n`);
        
        // 步驟 1: 查找用戶
        console.log('步驟 1: 查找用戶...');
        const user = await User.findOne({ email: testEmail }).select('+password');
        
        if (!user) {
            console.log('❌ 找不到此郵箱的用戶');
            await mongoose.connection.close();
            return;
        }
        
        console.log('✅ 找到用戶:', user.username);
        console.log(`   用戶 ID: ${user._id}`);
        console.log(`   角色: ${user.role}`);
        console.log(`   狀態: ${user.isActive ? '啟用' : '禁用'}\n`);
        
        // 步驟 2: 檢查用戶是否啟用
        console.log('步驟 2: 檢查用戶狀態...');
        if (!user.isActive) {
            console.log('❌ 帳戶已被禁用');
            await mongoose.connection.close();
            return;
        }
        console.log('✅ 帳戶已啟用\n');
        
        // 步驟 3: 驗證密碼
        console.log('步驟 3: 驗證密碼...');
        console.log(`   儲存的密碼哈希: ${user.password.substring(0, 20)}...`);
        console.log(`   密碼哈希長度: ${user.password.length}`);
        console.log(`   是否為 bcrypt: ${user.password.startsWith('$2') ? '是' : '否'}\n`);
        
        const isPasswordValid = await user.comparePassword(testPassword);
        
        if (isPasswordValid) {
            console.log('✅ 密碼驗證成功！');
            console.log('🎉 登入應該可以成功\n');
            
            // 測試直接使用 bcrypt.compare
            const directCompare = await bcrypt.compare(testPassword, user.password);
            console.log('   直接 bcrypt.compare 結果:', directCompare ? '✅ 成功' : '❌ 失敗');
            
        } else {
            console.log('❌ 密碼驗證失敗！');
            console.log('可能的原因:');
            console.log('1. 密碼輸入錯誤');
            console.log('2. 密碼加密時有問題');
            console.log('3. 比較方法有問題\n');
            
            // 嘗試直接使用 bcrypt.compare
            console.log('嘗試直接使用 bcrypt.compare...');
            const directCompare = await bcrypt.compare(testPassword, user.password);
            console.log('   結果:', directCompare ? '✅ 成功' : '❌ 失敗');
        }
        
        // 關閉連接
        await mongoose.connection.close();
        console.log('\n✅ 測試完成');
        
    } catch (error) {
        console.error('❌ 錯誤:', error);
        process.exit(1);
    }
}

testLogin();


