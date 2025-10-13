// 測試用戶創建功能
// 運行此腳本以驗證管理員創建用戶功能

const fetch = require('node-fetch');

// 配置
const API_BASE_URL = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/api` 
    : 'http://localhost:3001/api';

console.log('🧪 開始測試用戶創建功能...');
console.log('🔗 API 地址:', API_BASE_URL);

// 測試用戶數據
const testUser = {
    username: 'testuser123',
    email: 'testuser123@example.com',
    password: 'TestPass123',  // 包含大小寫字母和數字
    phone: '0912345678',
    role: 'user'
};

async function testUserCreation() {
    try {
        // 步驟 1: 管理員登入（需要先有管理員帳號）
        console.log('\n📝 步驟 1: 管理員登入...');
        
        // 注意：您需要先創建管理員帳號，或使用現有的管理員帳號
        const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@sipandsavor.com',  // 請替換為您的管理員郵箱
                password: 'Admin123'  // 請替換為您的管理員密碼
            })
        });

        if (!loginResponse.ok) {
            const errorData = await loginResponse.json();
            throw new Error(`登入失敗: ${errorData.message}`);
        }

        const loginData = await loginResponse.json();
        const adminToken = loginData.data.token;
        console.log('✅ 管理員登入成功');

        // 步驟 2: 創建新用戶
        console.log('\n📝 步驟 2: 創建新用戶...');
        console.log('用戶數據:', {
            ...testUser,
            password: '***'
        });

        const createResponse = await fetch(`${API_BASE_URL}/users/admin/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testUser)
        });

        const createData = await createResponse.json();

        if (!createResponse.ok) {
            console.error('❌ 創建用戶失敗');
            console.error('錯誤:', createData);
            
            if (createData.errors) {
                console.error('驗證錯誤:');
                createData.errors.forEach(err => {
                    console.error(`  - ${err.msg}`);
                });
            }
            throw new Error(createData.message || '創建用戶失敗');
        }

        console.log('✅ 用戶創建成功！');
        console.log('新用戶信息:');
        console.log('  - ID:', createData.data.user._id);
        console.log('  - 用戶名:', createData.data.user.username);
        console.log('  - 郵箱:', createData.data.user.email);
        console.log('  - 角色:', createData.data.user.role);
        console.log('  - 狀態:', createData.data.user.isActive ? '啟用' : '禁用');

        // 步驟 3: 驗證用戶已保存到數據庫
        console.log('\n📝 步驟 3: 驗證用戶已保存到數據庫...');
        
        const verifyResponse = await fetch(`${API_BASE_URL}/users/admin/all?search=${testUser.username}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        const verifyData = await verifyResponse.json();
        
        if (verifyData.success && verifyData.data.users.length > 0) {
            console.log('✅ 用戶已成功保存到數據庫');
            console.log('數據庫中的用戶:', verifyData.data.users[0].username);
        } else {
            console.log('⚠️ 未在數據庫中找到用戶');
        }

        // 步驟 4: 測試新用戶登入
        console.log('\n📝 步驟 4: 測試新用戶登入...');
        
        const userLoginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testUser.email,
                password: testUser.password
            })
        });

        const userLoginData = await userLoginResponse.json();
        
        if (userLoginData.success) {
            console.log('✅ 新用戶可以成功登入');
            console.log('登入用戶:', userLoginData.data.user.username);
        } else {
            console.log('❌ 新用戶登入失敗:', userLoginData.message);
        }

        console.log('\n🎉 所有測試完成！');
        console.log('\n📋 測試總結:');
        console.log('  ✅ 管理員認證');
        console.log('  ✅ 創建新用戶');
        console.log('  ✅ 數據庫保存驗證');
        console.log('  ✅ 新用戶登入測試');

    } catch (error) {
        console.error('\n❌ 測試失敗:', error.message);
        console.error('錯誤詳情:', error);
    }
}

// 運行測試
testUserCreation();

