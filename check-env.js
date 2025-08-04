#!/usr/bin/env node

/**
 * 環境變量檢查腳本
 * 用於驗證必要的環境變量是否正確設置
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 檢查環境變量配置...\n');

// 檢查 .env 文件是否存在
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('⚠️  未找到 .env 文件');
    console.log('📝 請創建 .env 文件並添加以下配置：');
    console.log('');
    console.log('MONGODB_URI=mongodb://localhost:27017/sipandsavor');
    console.log('JWT_SECRET=your-secret-key-here');
    console.log('PORT=3000');
    console.log('');
    console.log('⚠️  警告：沒有 .env 文件，將使用默認配置');
    console.log('⚠️  建議創建 .env 文件以確保安全性');
    console.log('');
    return;
}

// 讀取 .env 文件
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

// 解析環境變量
envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
            envVars[key] = valueParts.join('=');
        }
    }
});

// 檢查必要的環境變量
const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET'
];

const optionalVars = [
    'PORT'
];

console.log('📋 環境變量檢查結果：\n');

let hasErrors = false;

// 檢查必要變量
requiredVars.forEach(varName => {
    if (!envVars[varName]) {
        console.log(`❌ 缺少必要環境變量: ${varName}`);
        hasErrors = true;
    } else {
        console.log(`✅ ${varName}: ${varName === 'JWT_SECRET' ? '***已設置***' : envVars[varName]}`);
    }
});

// 檢查可選變量
optionalVars.forEach(varName => {
    if (!envVars[varName]) {
        console.log(`⚠️  可選環境變量未設置: ${varName} (將使用默認值)`);
    } else {
        console.log(`✅ ${varName}: ${envVars[varName]}`);
    }
});

// 檢查 JWT_SECRET 強度
if (envVars.JWT_SECRET) {
    if (envVars.JWT_SECRET.length < 32) {
        console.log('⚠️  JWT_SECRET 長度不足，建議至少32個字符');
        console.log('⚠️  警告：這可能影響安全性，但不會阻止服務器啟動');
    }
}

// 檢查 MongoDB URI 格式
if (envVars.MONGODB_URI) {
    if (!envVars.MONGODB_URI.startsWith('mongodb://') && !envVars.MONGODB_URI.startsWith('mongodb+srv://')) {
        console.log('⚠️  MONGODB_URI 格式不正確');
        console.log('⚠️  警告：這可能導致數據庫連接失敗');
    }
}

console.log('');

if (hasErrors) {
    console.log('⚠️  環境變量配置有問題，但不會阻止服務器啟動');
    console.log('⚠️  建議修正配置以確保系統正常運行');
} else {
    console.log('✅ 環境變量配置正確');
}
console.log('🚀 可以啟動服務器了'); 