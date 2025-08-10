const http = require('http');

// 創建測試訂單並詳細檢查
function createTestOrder() {
    return new Promise((resolve, reject) => {
        const orderData = {
            tableNumber: "E5",
            area: "測試區域",
            items: [
                {
                    name: "美式咖啡",
                    price: 45,
                    quantity: 2,
                    customizations: "無糖,去冰",
                    specialRequest: "請加熱一點"
                },
                {
                    name: "拿鐵咖啡",
                    price: 60,
                    quantity: 1,
                    customizations: "微糖,正常冰",
                    specialRequest: ""
                }
            ],
            total: 150,
            orderType: "dine-in"
        };

        console.log('📤 發送訂單數據:', JSON.stringify(orderData, null, 2));

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
                console.log('📥 服務器回應狀態:', res.statusCode);
                console.log('📥 服務器回應:', data);
                
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

// 詳細分析訂單數據
function analyzeOrderData(orders) {
    console.log('\n📊 詳細訂單數據分析:');
    console.log('='.repeat(80));
    
    if (!orders || orders.length === 0) {
        console.log('❌ 沒有找到訂單數據');
        return;
    }
    
    // 只分析最新的訂單
    const latestOrder = orders[0];
    console.log(`\n🔍 最新訂單: ${latestOrder._id}`);
    console.log(`   狀態: ${latestOrder.status || 'undefined'}`);
    console.log(`   總金額: NT$ ${latestOrder.totalAmount || 'undefined'}`);
    console.log(`   訂單類型: ${latestOrder.orderType || 'undefined'}`);
    console.log(`   桌號: ${latestOrder.tableNumber || 'N/A'}`);
    console.log(`   區域: ${latestOrder.area || 'N/A'}`);
    console.log(`   創建時間: ${latestOrder.createdAt || 'undefined'}`);
    
    console.log(`\n   商品項目 (${latestOrder.items ? latestOrder.items.length : 0} 項):`);
    if (latestOrder.items && latestOrder.items.length > 0) {
        latestOrder.items.forEach((item, itemIndex) => {
            console.log(`     ${itemIndex + 1}. ${item.name || 'undefined'}`);
            console.log(`        數量: ${item.quantity || 'undefined'}`);
            console.log(`        價格: NT$ ${item.price || 'undefined'}`);
            console.log(`        小計: NT$ ${item.subtotal || 'undefined'}`);
            console.log(`        客製化: "${item.customizations || 'undefined'}"`);
            console.log(`        特殊需求: "${item.specialRequest || 'undefined'}"`);
            console.log(`        產品ID: ${item.product || 'undefined'}`);
        });
    } else {
        console.log('     ❌ 沒有商品項目數據');
    }
    
    console.log(`\n   原始訂單數據:`);
    console.log(JSON.stringify(latestOrder, null, 4));
    
    console.log('\n' + '='.repeat(80));
}

// 主函數
async function main() {
    console.log('🚀 創建測試訂單並詳細分析...');
    
    try {
        // 創建測試訂單
        const createResponse = await createTestOrder();
        
        if (createResponse.success) {
            console.log('✅ 測試訂單創建成功');
            console.log(`   訂單ID: ${createResponse.data.orderId}`);
            
            // 等待一下讓數據庫更新
            console.log('⏳ 等待數據庫更新...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
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
            if (createResponse.errors) {
                console.log('   驗證錯誤:', createResponse.errors);
            }
        }
        
    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
    }
}

// 運行測試
main().catch(console.error);
