const http = require('http');

// 測試配置
const BASE_URL = 'http://localhost:3001';
const TEST_TOKEN = 'your-test-token-here'; // 需要有效的管理員token

// 性能測試函數
async function testEndpoint(endpoint, description) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: endpoint,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TEST_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                console.log(`⏱️  ${description}: ${duration}ms`);
                
                try {
                    const response = JSON.parse(data);
                    if (response.success) {
                        console.log(`   ✅ 成功 - 狀態碼: ${res.statusCode}`);
                    } else {
                        console.log(`   ❌ 失敗 - ${response.message}`);
                    }
                } catch (e) {
                    console.log(`   ⚠️  解析回應失敗: ${e.message}`);
                }
                
                resolve(duration);
            });
        });

        req.on('error', (error) => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            console.log(`❌ ${description}: ${duration}ms - 錯誤: ${error.message}`);
            resolve(duration);
        });

        req.setTimeout(30000, () => {
            console.log(`⏰ ${description}: 超時 (30秒)`);
            req.destroy();
            resolve(30000);
        });

        req.end();
    });
}

// 主要測試函數
async function runPerformanceTests() {
    console.log('🚀 開始後台性能測試...\n');
    
    const tests = [
        { endpoint: '/api/auth/me', description: '認證檢查' },
        { endpoint: '/api/products/count', description: '產品總數統計' },
        { endpoint: '/api/users/count', description: '用戶總數統計' },
        { endpoint: '/api/products/admin/all?page=1&limit=10', description: '產品列表 (第一頁)' },
        { endpoint: '/api/orders/admin/all?page=1&limit=20', description: '訂單列表 (第一頁)' },
        { endpoint: '/api/users/admin/all?page=1&limit=10', description: '用戶列表 (第一頁)' }
    ];
    
    const results = {};
    
    for (const test of tests) {
        results[test.description] = await testEndpoint(test.endpoint, test.description);
        // 等待1秒再進行下一個測試
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📊 性能測試結果總結:');
    console.log('='.repeat(50));
    
    let totalTime = 0;
    for (const [description, duration] of Object.entries(results)) {
        totalTime += duration;
        const status = duration < 1000 ? '✅ 優秀' : duration < 3000 ? '⚠️  一般' : '❌ 較慢';
        console.log(`${description.padEnd(20)}: ${duration.toString().padStart(5)}ms ${status}`);
    }
    
    console.log('='.repeat(50));
    console.log(`總時間: ${totalTime}ms`);
    console.log(`平均時間: ${Math.round(totalTime / Object.keys(results).length)}ms`);
    
    // 性能建議
    console.log('\n💡 性能建議:');
    if (totalTime > 10000) {
        console.log('⚠️  整體響應時間較長，建議:');
        console.log('   - 檢查數據庫連接和索引');
        console.log('   - 考慮增加緩存機制');
        console.log('   - 優化數據庫查詢');
    } else if (totalTime > 5000) {
        console.log('⚠️  響應時間一般，可以進一步優化');
    } else {
        console.log('✅ 性能表現良好！');
    }
}

// 檢查服務器是否運行
function checkServerStatus() {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3001,
            path: '/api/health',
            method: 'GET'
        }, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => {
            resolve(false);
        });

        req.setTimeout(5000, () => {
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

// 主函數
async function main() {
    console.log('🔍 檢查服務器狀態...');
    
    const serverRunning = await checkServerStatus();
    if (!serverRunning) {
        console.log('❌ 服務器未運行，請先啟動服務器: node server.js');
        return;
    }
    
    console.log('✅ 服務器正在運行\n');
    
    if (TEST_TOKEN === 'your-test-token-here') {
        console.log('⚠️  請設置有效的管理員token來進行完整測試');
        console.log('   您可以在登入後台後從瀏覽器開發者工具中獲取token');
        console.log('   或者直接測試不需要認證的端點\n');
        
        // 測試健康檢查端點
        await testEndpoint('/api/health', '健康檢查');
        return;
    }
    
    await runPerformanceTests();
}

// 運行測試
main().catch(console.error);
