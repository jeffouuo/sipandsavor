#!/usr/bin/env node

/**
 * 部署前檢查腳本
 * 檢查所有必要的檔案和配置是否正確
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 開始部署前檢查...\n');

// 檢查必要檔案
const requiredFiles = [
    'server.js',
    'package.json',
    'vercel.json',
    'models/User.js',
    'models/Product.js',
    'models/Order.js',
    'routes/auth.js',
    'routes/products.js',
    'routes/orders.js',
    'routes/news.js',
    'routes/users.js',
    'middleware/auth.js',
    'index.html',
    'dine-in-order.html',
    'admin.html',
    'qr-generator.html'
];

console.log('📁 檢查必要檔案...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - 檔案不存在`);
        allFilesExist = false;
    }
});

// 檢查 package.json
console.log('\n📦 檢查 package.json...');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.start) {
        console.log('✅ start 腳本已設定');
    } else {
        console.log('❌ 缺少 start 腳本');
    }
    
    if (packageJson.dependencies) {
        const requiredDeps = ['express', 'mongoose', 'cors', 'helmet'];
        requiredDeps.forEach(dep => {
            if (packageJson.dependencies[dep]) {
                console.log(`✅ ${dep} 依賴已安裝`);
            } else {
                console.log(`❌ 缺少 ${dep} 依賴`);
            }
        });
    }
} catch (error) {
    console.log('❌ package.json 解析失敗:', error.message);
}

// 檢查 vercel.json
console.log('\n⚙️ 檢查 vercel.json...');
try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    
    if (vercelConfig.builds && vercelConfig.routes) {
        console.log('✅ vercel.json 配置正確');
    } else {
        console.log('❌ vercel.json 配置不完整');
    }
} catch (error) {
    console.log('❌ vercel.json 解析失敗:', error.message);
}

// 檢查環境變數
console.log('\n🔐 檢查環境變數...');
const envVars = ['MONGODB_URI', 'JWT_SECRET'];
envVars.forEach(varName => {
    if (process.env[varName]) {
        console.log(`✅ ${varName} 已設定`);
    } else {
        console.log(`⚠️ ${varName} 未設定（部署時需要在 Vercel 中設定）`);
    }
});

// 部署建議
console.log('\n📋 部署建議:');
console.log('1. 確保已上傳程式碼到 GitHub');
console.log('2. 在 Vercel 中設定環境變數：');
console.log('   - MONGODB_URI: 您的 MongoDB Atlas 連接字串');
console.log('   - JWT_SECRET: 至少32字符的隨機字串');
console.log('3. 部署後測試以下功能：');
console.log('   - 首頁: /');
console.log('   - 內用點餐: /dine-in-order.html');
console.log('   - QR碼生成器: /qr-generator.html');
console.log('   - 管理後台: /admin.html');

if (allFilesExist) {
    console.log('\n🎉 檢查完成！您的專案已準備好部署到 Vercel。');
} else {
    console.log('\n⚠️ 檢查完成，但發現一些問題需要修復。');
}

console.log('\n📚 詳細部署指南請參考 VERCEL_DEPLOY_GUIDE.md'); 