const http = require('http');

// 創建測試訂單
function createTestOrder() {
    return new Promise((resolve, reject) => {
        const orderData = {
            tableNumber: "A1",
            area: "室內",
            items: [
                {
                    name: "美式咖啡",
                    price: 45,
                    quantity: 2,
                    customizations: "無糖,去冰",
                    specialRequest: ""
                },
                {
                    name: "拿鐵咖啡",
                    price: 60,
                    quantity: 1,
                    customizations: "微糖,正常冰",
                    specialRequest: "請加熱一點"
                }
            ],
            total: 150,
            orderType: "dine-in"
        };

        const postData = JSON.stringify(orderData);

        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/orders/dine-in',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
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

        req.write(postData);
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
    console.log('🚀 創建測試訂單...');
    
    try {
        // 創建測試訂單
        const createResponse = await createTestOrder();
        
        if (createResponse.success) {
            console.log('✅ 測試訂單創建成功');
            console.log(`   訂單ID: ${createResponse.data._id}`);
            
            // 等待一下讓數據庫更新
            console.log('⏳ 等待數據庫更新...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 獲取最近的訂單
            console.log('\n📋 獲取最近訂單...');
            const response = await getRecentOrders();
            
            if (response.success) {
                console.log(`✅ 成功獲取 ${response.data.length} 個訂單`);
                analyzeOrderData(response.data);
            } else {
                console.log(`❌ 獲取訂單失敗: ${response.message}`);
            }
        } else {
            console.log(`❌ 創建訂單失敗: ${createResponse.message}`);
        }
        
    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
    }
}

// 運行測試
main().catch(console.error);
