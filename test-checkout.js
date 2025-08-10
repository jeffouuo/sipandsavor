const http = require('http');

console.log('🧪 測試結帳功能 - ObjectId 修復驗證');
console.log('=====================================');

const BASE_URL = 'http://localhost:3001';

function testCheckout() {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}/api/orders/checkout`;
        console.log(`\n🔍 測試結帳端點`);
        console.log(`📡 URL: ${url}`);
        
        const postData = JSON.stringify({
            items: [
                {
                    name: '美式咖啡',
                    price: 45,
                    quantity: 1,
                    customizations: '少冰',
                    specialRequest: '請快一點'
                },
                {
                    name: '拿鐵咖啡',
                    price: 60,
                    quantity: 2,
                    customizations: '正常冰',
                    specialRequest: ''
                }
            ],
            totalAmount: 165,
            paymentMethod: 'cash',
            deliveryMethod: 'pickup',
            notes: '測試訂單 - ObjectId 修復驗證'
        });
        
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/orders/checkout',
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
                    const jsonData = JSON.parse(data);
                    console.log(`✅ 狀態碼: ${res.statusCode}`);
                    console.log(`📊 響應:`, JSON.stringify(jsonData, null, 2));
                    
                    if (res.statusCode === 201) {
                        console.log('\n🎉 結帳成功！ObjectId 修復有效');
                        if (jsonData.success) {
                            console.log(`📋 訂單ID: ${jsonData.data?.order?._id || 'N/A'}`);
                            console.log(`💰 總金額: ${jsonData.data?.order?.totalAmount || 'N/A'}`);
                        }
                    } else {
                        console.log('\n❌ 結帳失敗');
                        if (jsonData.error) {
                            console.log(`❌ 錯誤: ${jsonData.error}`);
                        }
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
        
        req.write(postData);
        req.end();
    });
}

// 運行測試
async function runTest() {
    try {
        await testCheckout();
        console.log('\n📋 測試完成！');
        console.log('\n💡 如果狀態碼是 201，說明結帳成功且 ObjectId 修復有效');
        console.log('💡 如果狀態碼是 500，說明仍有 ObjectId 轉換問題');
        console.log('💡 如果狀態碼是 400，說明是其他驗證錯誤');
    } catch (error) {
        console.error('\n❌ 測試失敗:', error.message);
    }
}

runTest();
