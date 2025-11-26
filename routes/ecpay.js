const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');

// 綠界金流設定（從環境變數讀取）
const ECPAY_CONFIG = {
    merchantID: process.env.ECPAY_MERCHANT_ID || '3002607',
    hashKey: process.env.ECPAY_HASH_KEY || 'pwFHCqoQZGmho4w6',
    hashIV: process.env.ECPAY_HASH_IV || 'EkRm7iFT261dpevs',
    actionUrl: process.env.ECPAY_ACTION_URL || 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
};

/**
 * 綠界專用編碼函式
 * 必須完全符合 .NET 的 UrlEncode 行為
 */
function ecpayEncode(text) {
    return encodeURIComponent(text)
        .replace(/%20/g, '+') // 關鍵！綠界要求空白變成 +
        .replace(/%2d/g, '-')
        .replace(/%5f/g, '_')
        .replace(/%2e/g, '.')
        .replace(/%21/g, '!')
        .replace(/%2a/g, '*')
        .replace(/%28/g, '(')
        .replace(/%29/g, ')')
        .toLowerCase(); // 最後轉小寫
}

// 生成 CheckMacValue（依照綠界官方文件）
// 加密流程：
// 1. 排序參數
// 2. 串接 HashKey & HashIV
// 3. ecpayEncode( rawString )  <-- 這裡最容易錯
// 4. SHA256
// 5. toUpperCase
function generateCheckMacValue(params) {
    // 步驟 1：將參數按 A-Z 排序（排除 CheckMacValue）
    const sortedKeys = Object.keys(params).sort();
    
    // 步驟 2：組成字串（HashKey 在頭，HashIV 在尾）
    let checkString = `HashKey=${ECPAY_CONFIG.hashKey}&`;
    sortedKeys.forEach(key => {
        if (key !== 'CheckMacValue') {
            checkString += `${key}=${params[key]}&`;
        }
    });
    checkString += `HashIV=${ECPAY_CONFIG.hashIV}`;

    // 🔍 調試：印出原始字串
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 CheckMacValue 生成過程：');
    console.log('───────────────────────────────────────────────────────────');
    console.log('1. 原始參數（已排序）：', sortedKeys.filter(k => k !== 'CheckMacValue'));
    console.log('2. 組成字串（HashKey 在頭，HashIV 在尾）：');
    console.log('   ', checkString);
    
    // 步驟 3：使用 ecpayEncode 編碼（關鍵！）
    const encoded = ecpayEncode(checkString);
    console.log('3. ecpayEncode 後（SHA256 之前的完整字串）：');
    console.log('   ', encoded);
    console.log('───────────────────────────────────────────────────────────');
    console.log('📋 請將上面的「SHA256 之前的完整字串」與綠界後台比對');
    console.log('═══════════════════════════════════════════════════════════');
    
    // 步驟 4：SHA256 加密（不是 MD5！）
    const hash = crypto.createHash('sha256').update(encoded, 'utf8').digest('hex');
    
    // 步驟 5：轉大寫
    const checkMacValue = hash.toUpperCase();
    
    console.log('4. SHA256 加密後（最終 CheckMacValue）：', checkMacValue);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    return checkMacValue;
}

// 驗證 CheckMacValue
function verifyCheckMacValue(params) {
    const receivedCheckMac = params.CheckMacValue;
    const calculatedCheckMac = generateCheckMacValue(params);
    return receivedCheckMac === calculatedCheckMac;
}

// 綠界金流回調處理（ReturnURL）
router.post('/return', async (req, res) => {
    console.log('📥 綠界金流回調（ReturnURL）:', req.body);
    
    try {
        const params = req.body;
        
        // 驗證 CheckMacValue
        if (!verifyCheckMacValue(params)) {
            console.error('❌ CheckMacValue 驗證失敗');
            return res.status(400).send('CheckMacValue verification failed');
        }

        // 驗證 MerchantID
        if (params.MerchantID !== ECPAY_CONFIG.merchantID) {
            console.error('❌ MerchantID 不匹配');
            return res.status(400).send('Invalid MerchantID');
        }

        // 處理訂單狀態
        const tradeStatus = params.TradeStatus || params.RtnCode;
        const merchantTradeNo = params.MerchantTradeNo;
        const totalAmount = parseInt(params.TradeAmt || params.TotalAmount);

        console.log('📊 訂單資訊:', {
            merchantTradeNo,
            tradeStatus,
            totalAmount
        });

        // 根據交易狀態更新訂單
        if (tradeStatus === '1' || params.RtnCode === '1') {
            // 交易成功
            console.log('✅ 交易成功');
            
            // 這裡可以更新訂單狀態到資料庫
            // 由於我們使用 MerchantTradeNo，需要從中提取原始訂單資訊
            // 或者可以將訂單資訊存儲在 session 或臨時存儲中
            
            // 返回成功響應給綠界
            res.send('1|OK');
        } else {
            // 交易失敗
            console.log('❌ 交易失敗:', params.RtnMsg || 'Unknown error');
            res.send('0|Fail');
        }
    } catch (error) {
        console.error('❌ 處理綠界回調時發生錯誤:', error);
        res.status(500).send('Internal server error');
    }
});

// 獲取綠界金流參數（返回 JSON，供前端創建表單）
router.post('/get-params', (req, res) => {
    try {
        const { items, totalAmount, paymentMethod = 'Credit' } = req.body;
        
        // 驗證必要參數
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: '商品列表不能為空' 
            });
        }
        
        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ 
                success: false,
                error: '交易金額必須大於 0' 
            });
        }

        // 生成訂單編號（使用時間戳 + 隨機數）
        const merchantTradeNo = 'EC' + Date.now() + Math.floor(Math.random() * 1000);
        
        // 格式化交易時間
        const now = new Date();
        const merchantTradeDate = now.getFullYear() + '/' + 
            String(now.getMonth() + 1).padStart(2, '0') + '/' + 
            String(now.getDate()).padStart(2, '0') + ' ' + 
            String(now.getHours()).padStart(2, '0') + ':' + 
            String(now.getMinutes()).padStart(2, '0') + ':' + 
            String(now.getSeconds()).padStart(2, '0');

        // 商品名稱（最多 400 字元）
        const itemNames = items.map(item => `${item.name} x${item.quantity}`).join('#');
        const itemName = itemNames.length > 400 ? itemNames.substring(0, 400) : itemNames;

        // 交易描述
        const tradeDesc = '飲茶趣訂單';

        // 取得當前網站的基礎 URL
        const baseUrl = req.protocol + '://' + req.get('host');
        const returnURL = `${baseUrl}/api/ecpay/return`;
        const orderResultURL = `${baseUrl}/api/ecpay/result`;

        // 準備表單參數（不包含 CheckMacValue）
        const params = {
            MerchantID: ECPAY_CONFIG.merchantID,
            MerchantTradeNo: merchantTradeNo,
            MerchantTradeDate: merchantTradeDate,
            PaymentType: 'aio',
            TotalAmount: Math.round(totalAmount),
            TradeDesc: tradeDesc,
            ItemName: itemName,
            ReturnURL: returnURL,
            OrderResultURL: orderResultURL,
            ChoosePayment: paymentMethod || 'Credit',
            EncryptType: '1'
        };

        // 生成 CheckMacValue
        const checkMacValue = generateCheckMacValue(params);
        params.CheckMacValue = checkMacValue;

        console.log('✅ 創建綠界訂單參數:', {
            merchantTradeNo,
            totalAmount: Math.round(totalAmount)
        });

        // 返回 JSON 參數（不是 HTML）
        res.json({
            success: true,
            ...params  // 直接返回所有參數
        });
    } catch (error) {
        console.error('❌ 創建綠界訂單參數失敗:', error);
        res.status(500).json({ 
            success: false,
            error: '創建訂單參數失敗',
            message: error.message 
        });
    }
});

// 綠界金流支付頁面（返回自動提交的 HTML）- 保留作為備用
router.get('/checkout', (req, res) => {
    try {
        // 從 query 參數獲取訂單數據（或從 session/資料庫獲取）
        const { items, totalAmount, paymentMethod = 'Credit' } = req.query;
        
        // 如果沒有參數，嘗試從 body 獲取（POST 請求）
        let orderData = null;
        if (!items && req.body && req.body.items) {
            orderData = req.body;
        } else if (items) {
            // 從 query 參數解析（JSON 字串）
            try {
                orderData = {
                    items: JSON.parse(decodeURIComponent(items)),
                    totalAmount: parseFloat(totalAmount),
                    paymentMethod: paymentMethod || 'Credit'
                };
            } catch (e) {
                return res.status(400).send('訂單數據格式錯誤');
            }
        } else {
            return res.status(400).send('缺少訂單數據');
        }

        const { items: orderItems, totalAmount: orderTotal, paymentMethod: orderPaymentMethod } = orderData;
        
        // 驗證必要參數
        if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
            return res.status(400).send('商品列表不能為空');
        }
        
        if (!orderTotal || orderTotal <= 0) {
            return res.status(400).send('交易金額必須大於 0');
        }

        // 生成訂單編號（使用時間戳 + 隨機數）
        const merchantTradeNo = 'EC' + Date.now() + Math.floor(Math.random() * 1000);
        
        // 格式化交易時間
        const now = new Date();
        const merchantTradeDate = now.getFullYear() + '/' + 
            String(now.getMonth() + 1).padStart(2, '0') + '/' + 
            String(now.getDate()).padStart(2, '0') + ' ' + 
            String(now.getHours()).padStart(2, '0') + ':' + 
            String(now.getMinutes()).padStart(2, '0') + ':' + 
            String(now.getSeconds()).padStart(2, '0');

        // 商品名稱（最多 400 字元）
        const itemNames = orderItems.map(item => `${item.name} x${item.quantity}`).join('#');
        const itemName = itemNames.length > 400 ? itemNames.substring(0, 400) : itemNames;

        // 交易描述
        const tradeDesc = '飲茶趣訂單';

        // 取得當前網站的基礎 URL
        const baseUrl = req.protocol + '://' + req.get('host');
        const returnURL = `${baseUrl}/api/ecpay/return`;
        const orderResultURL = `${baseUrl}/api/ecpay/result`;

        // 準備表單參數（不包含 CheckMacValue）
        const params = {
            MerchantID: ECPAY_CONFIG.merchantID,
            MerchantTradeNo: merchantTradeNo,
            MerchantTradeDate: merchantTradeDate,
            PaymentType: 'aio',
            TotalAmount: Math.round(orderTotal),
            TradeDesc: tradeDesc,
            ItemName: itemName,
            ReturnURL: returnURL,
            OrderResultURL: orderResultURL,
            ChoosePayment: orderPaymentMethod || 'Credit',
            EncryptType: '1'
        };

        // 生成 CheckMacValue
        const checkMacValue = generateCheckMacValue(params);
        params.CheckMacValue = checkMacValue;

        // 綠界網址
        const actionUrl = ECPAY_CONFIG.actionUrl;

        console.log('✅ 創建綠界訂單並返回自動提交 HTML:', {
            merchantTradeNo,
            totalAmount: orderTotal
        });

        // 組裝自動送出的 HTML
        // 注意：不設置 CSP，讓表單提交可以正常工作
        let html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>正在跳轉到支付頁面...</title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }
        .loading {
            text-align: center;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #2ed573;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <p>正在跳轉到支付頁面...</p>
    </div>
    <form id="ecpay-form" action="${actionUrl}" method="POST">`;

        // 把參數變成 input
        for (const [key, value] of Object.entries(params)) {
            // 轉義 HTML 特殊字符
            const escapedValue = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            html += `\n        <input type="hidden" name="${key}" value="${escapedValue}" />`;
        }

        // 加上自動送出的 script（立即執行，不等待任何事件）
        html += `
    </form>
    <script>
        // 立即提交表單，不等待任何事件
        // 這會導致瀏覽器立即跳轉到綠界支付頁面
        (function() {
            try {
                document.getElementById("ecpay-form").submit();
            } catch(e) {
                // 如果表單還沒載入，使用 DOMContentLoaded
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function() {
                        document.getElementById("ecpay-form").submit();
                    });
                } else {
                    // 如果已經載入完成，立即提交
                    document.getElementById("ecpay-form").submit();
                }
            }
        })();
    </script>
</body>
</html>`;

        // 直接把這段 HTML 送給瀏覽器
        res.send(html);
    } catch (error) {
        console.error('❌ 創建支付頁面失敗:', error);
        res.status(500).send(`<html><body><h1>支付處理失敗</h1><p>${error.message}</p></body></html>`);
    }
});

// 創建綠界金流訂單（計算所有參數包括 CheckMacValue）- 保留用於 API 調用
router.post('/create-order', (req, res) => {
    try {
        const { items, totalAmount, paymentMethod = 'Credit' } = req.body;
        
        // 驗證必要參數
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: '商品列表不能為空' 
            });
        }
        
        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ 
                success: false,
                error: '交易金額必須大於 0' 
            });
        }

        // 生成訂單編號（使用時間戳 + 隨機數）
        const merchantTradeNo = 'EC' + Date.now() + Math.floor(Math.random() * 1000);
        
        // 格式化交易時間
        const now = new Date();
        const merchantTradeDate = now.getFullYear() + '/' + 
            String(now.getMonth() + 1).padStart(2, '0') + '/' + 
            String(now.getDate()).padStart(2, '0') + ' ' + 
            String(now.getHours()).padStart(2, '0') + ':' + 
            String(now.getMinutes()).padStart(2, '0') + ':' + 
            String(now.getSeconds()).padStart(2, '0');

        // 商品名稱（最多 400 字元）
        const itemNames = items.map(item => `${item.name} x${item.quantity}`).join('#');
        const itemName = itemNames.length > 400 ? itemNames.substring(0, 400) : itemNames;

        // 交易描述
        const tradeDesc = '飲茶趣訂單';

        // 取得當前網站的基礎 URL
        const baseUrl = req.protocol + '://' + req.get('host');
        const returnURL = `${baseUrl}/api/ecpay/return`;
        const orderResultURL = `${baseUrl}/api/ecpay/result`;

        // 準備表單參數（不包含 CheckMacValue）
        const formParams = {
            MerchantID: ECPAY_CONFIG.merchantID,
            MerchantTradeNo: merchantTradeNo,
            MerchantTradeDate: merchantTradeDate,
            PaymentType: 'aio',
            TotalAmount: Math.round(totalAmount),
            TradeDesc: tradeDesc,
            ItemName: itemName,
            ReturnURL: returnURL,
            OrderResultURL: orderResultURL,
            ChoosePayment: paymentMethod,
            EncryptType: '1'
        };

        // 生成 CheckMacValue
        const checkMacValue = generateCheckMacValue(formParams);
        formParams.CheckMacValue = checkMacValue;

        console.log('✅ 創建綠界訂單:', {
            merchantTradeNo,
            totalAmount,
            checkMacValue: checkMacValue.substring(0, 10) + '...'
        });

        // 返回完整的參數（包含 CheckMacValue）
        res.json({
            success: true,
            params: formParams,
            actionUrl: ECPAY_CONFIG.actionUrl
        });
    } catch (error) {
        console.error('❌ 創建綠界訂單失敗:', error);
        res.status(500).json({ 
            success: false,
            error: '創建訂單失敗',
            message: error.message 
        });
    }
});

// 獲取綠界金流配置（僅返回前端需要的非敏感資訊）
router.get('/config', (req, res) => {
    // 只返回前端需要的配置，不包含 HashKey 和 HashIV
    res.json({
        merchantID: ECPAY_CONFIG.merchantID,
        actionUrl: ECPAY_CONFIG.actionUrl
    });
});

// 綠界金流訂單結果查詢（OrderResultURL）
router.get('/result', async (req, res) => {
    console.log('📥 綠界金流訂單結果查詢:', req.query);
    
    try {
        const params = req.query;
        
        // 驗證 CheckMacValue
        if (!verifyCheckMacValue(params)) {
            console.error('❌ CheckMacValue 驗證失敗');
            return res.redirect('/payment-result.html?status=failed&message=驗證失敗');
        }

        const tradeStatus = params.TradeStatus || params.RtnCode;
        const merchantTradeNo = params.MerchantTradeNo;
        const totalAmount = params.TradeAmt || params.TotalAmount;

        if (tradeStatus === '1' || params.RtnCode === '1') {
            // 交易成功，重定向到成功頁面
            return res.redirect(`/payment-result.html?status=success&orderNo=${merchantTradeNo}&amount=${totalAmount}`);
        } else {
            // 交易失敗
            return res.redirect(`/payment-result.html?status=failed&message=${encodeURIComponent(params.RtnMsg || '交易失敗')}`);
        }
    } catch (error) {
        console.error('❌ 處理訂單結果時發生錯誤:', error);
        return res.redirect('/payment-result.html?status=error&message=系統錯誤');
    }
});

module.exports = router;

