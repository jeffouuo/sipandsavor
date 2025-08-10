const https = require('https');

console.log('🧪 測試 /api/orders/recent 端點修復');
console.log('=====================================');

const BASE_URL = 'https://sipandsavor.vercel.app';

function testRecentEndpoint() {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}/api/orders/recent`;
        console.log(`\n🔍 測試最近訂單端點`);
        console.log(`📡 URL: ${url}`);
        
        const req = https.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Test-Tool/1.0'
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
                    
                    if (res.statusCode === 200) {
                        console.log('\n🎉 修復成功！端點現在可以正常訪問');
                        if (jsonData.success) {
                            console.log(`📋 找到 ${jsonData.count} 個訂單`);
                            console.log(`📊 數據庫狀態: ${jsonData.databaseStatus}`);
                        }
                    } else {
                        console.log('\n❌ 端點仍有問題');
                    }
                    
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

// 運行測試
async function runTest() {
    try {
        await testRecentEndpoint();
        console.log('\n📋 測試完成！');
        console.log('\n💡 如果狀態碼是 200，說明修復成功');
        console.log('💡 如果狀態碼是 401，說明仍有認證問題');
        console.log('💡 如果狀態碼是 500，說明有服務器錯誤');
    } catch (error) {
        console.error('\n❌ 測試失敗:', error.message);
    }
}

runTest();
