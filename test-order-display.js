const http = require('http');

// 測試配置
const BASE_URL = 'http://localhost:3001';

// 檢查服務器狀態
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

// 獲取最近的訂單
function getRecentOrders() {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3001,
            path: '/api/orders/recent',
            method: 'GET'
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve(response);
                } catch (e) {
                    reject(new Error('解析回應失敗: ' + e.message));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('請求超時'));
        });

        req.end();
    });
}

// 分析訂單數據
function analyzeOrderData(orders) {
    console.log('\n📊 訂單數據分析:');
    console.log('='.repeat(60));
    
    if (!orders || orders.length === 0) {
        console.log('❌ 沒有找到訂單數據');
        return;
    }
    
    orders.forEach((order, index) => {
        console.log(`\n🔍 訂單 ${index + 1}: ${order._id}`);
        console.log(`   狀態: ${order.status}`);
        console.log(`   總金額: NT$ ${order.totalAmount}`);
        console.log(`   訂單類型: ${order.orderType || 'regular'}`);
        console.log(`   桌號: ${order.tableNumber || 'N/A'}`);
        
        console.log(`\n   商品項目:`);
        order.items.forEach((item, itemIndex) => {
            console.log(`     ${itemIndex + 1}. ${item.name}`);
            console.log(`        數量: ${item.quantity || '未設置'}`);
            console.log(`        價格: NT$ ${item.price}`);
            console.log(`        小計: NT$ ${item.subtotal}`);
            console.log(`        客製化: ${item.customizations || '無'}`);
            console.log(`        特殊需求: ${item.specialRequest || '無'}`);
        });
        
        console.log(`\n   特殊需求分析:`);
        const specialRequests = [];
        
        order.items.forEach(item => {
            if (item.specialRequest && item.specialRequest.trim() !== '') {
                specialRequests.push(`${item.name}: ${item.specialRequest.trim()}`);
            } else if (item.customizations && item.customizations.trim() !== '') {
                const customizations = item.customizations.trim();
                const standardCustomizations = ['無糖', '微糖', '半糖', '少糖', '全糖', '去冰', '微冰', '少冰', '正常冰', '熱飲'];
                
                const hasToppings = customizations.includes('+');
                const hasOtherSpecialRequests = customizations.split(',').some(part => {
                    const trimmedPart = part.trim();
                    return trimmedPart && 
                           !standardCustomizations.some(standard => trimmedPart.includes(standard)) &&
                           !trimmedPart.includes('+');
                });
                
                if (hasToppings || hasOtherSpecialRequests) {
                    specialRequests.push(`${item.name}: ${customizations}`);
                }
            }
        });
        
        if (specialRequests.length > 0) {
            console.log(`     ✅ 發現特殊需求: ${specialRequests.join('; ')}`);
        } else {
            console.log(`     ❌ 無特殊需求`);
        }
        
        console.log('   ' + '-'.repeat(50));
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
    
    try {
        console.log('📋 獲取最近訂單...');
        const response = await getRecentOrders();
        
        if (response.success) {
            console.log(`✅ 成功獲取 ${response.data.length} 個訂單`);
            analyzeOrderData(response.data);
        } else {
            console.log(`❌ 獲取訂單失敗: ${response.message}`);
        }
        
    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
    }
}

// 運行測試
main().catch(console.error);
