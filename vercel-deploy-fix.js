const https = require('https');
const http = require('http');

console.log('🚀 Vercel 部署修復工具');
console.log('========================');

const BASE_URL = 'https://sipandsavor.vercel.app';

// 測試端點函數
function testEndpoint(path, description) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}${path}`;
        console.log(`\n🔍 測試: ${description}`);
        console.log(`📡 URL: ${url}`);
        
        const client = url.startsWith('https') ? https : http;
        
        const req = client.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Vercel-Fix-Tool/1.0'
            }
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log(`✅ 狀態碼: ${res.statusCode}`);
                    console.log(`📊 響應:`, JSON.stringify(jsonData, null, 2));
                    resolve({ statusCode: res.statusCode, data: jsonData });
                } catch (error) {
                    console.log(`✅ 狀態碼: ${res.statusCode}`);
                    console.log(`📄 響應: ${data}`);
                    resolve({ statusCode: res.statusCode, data: data });
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ 錯誤: ${error.message}`);
            reject(error);
        });
        
        req.on('timeout', () => {
            console.log(`⏰ 請求超時`);
            req.destroy();
            reject(new Error('請求超時'));
        });
    });
}

// 主要測試函數
async function runTests() {
    console.log('開始測試 Vercel 部署...\n');
    
    try {
        // 測試1: 健康檢查
        await testEndpoint('/api/health', '健康檢查端點');
        
        // 測試2: 最近訂單端點
        await testEndpoint('/api/orders/recent', '最近訂單端點');
        
        // 測試3: 產品列表
        await testEndpoint('/api/products', '產品列表端點');
        
        // 測試4: 主頁
        await testEndpoint('/', '主頁');
        
        console.log('\n🎉 所有測試完成！');
        console.log('\n📋 修復建議:');
        console.log('1. 如果健康檢查失敗，檢查 Vercel 環境變量');
        console.log('2. 如果訂單端點返回 500，檢查 MongoDB Atlas 連接');
        console.log('3. 如果產品端點失敗，檢查數據庫權限');
        console.log('4. 如果主頁無法訪問，檢查 Vercel 部署狀態');
        
    } catch (error) {
        console.error('\n❌ 測試過程中發生錯誤:', error.message);
    }
}

// 環境變量檢查
console.log('📋 環境變量檢查:');
console.log('BASE_URL:', BASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV || '未設置');

// 運行測試
runTests();
