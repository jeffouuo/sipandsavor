const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');

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

// 綠界金流背景通知回調（ReturnURL）
// 這是綠界背景呼叫的 API，用於更新訂單狀態
// ⚠️ 重要：必須返回純文字 '1|OK' 或 '0|Fail' 給綠界
router.post('/callback', async (req, res) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📥 綠界金流背景通知回調（ReturnURL /callback）:');
    console.log('───────────────────────────────────────────────────────────');
    console.log('req.body:', JSON.stringify(req.body, null, 2));
    console.log('req.headers.content-type:', req.headers['content-type']);
    console.log('───────────────────────────────────────────────────────────');
    
    try {
        const params = req.body;
        
        // 檢查是否有參數
        if (!params || typeof params !== 'object' || Object.keys(params).length === 0) {
            console.error('❌ 沒有收到任何參數');
            return res.send('0|Fail');
        }
        
        // 驗證 CheckMacValue
        if (!verifyCheckMacValue(params)) {
            console.error('❌ CheckMacValue 驗證失敗');
            console.error('收到的參數:', params);
            return res.send('0|Fail');
        }

        // 驗證 MerchantID
        if (params.MerchantID !== ECPAY_CONFIG.merchantID) {
            console.error('❌ MerchantID 不匹配');
            return res.send('0|Fail');
        }

        // 處理訂單狀態
        const tradeStatus = params.TradeStatus || params.RtnCode;
        const merchantTradeNo = params.MerchantTradeNo;
        const totalAmount = parseInt(params.TradeAmt || params.TotalAmount);

        console.log('📊 訂單資訊:', {
            merchantTradeNo,
            tradeStatus,
            totalAmount,
            rtnCode: params.RtnCode,
            rtnMsg: params.RtnMsg
        });

        // 根據交易狀態更新訂單
        if (tradeStatus === '1' || params.RtnCode === '1') {
            // 交易成功 - 更新訂單狀態為 Paid
            console.log('✅ 交易成功，開始更新訂單狀態...');
            
            try {
                // 根據 MerchantTradeNo（orderNumber）查找訂單
                const order = await Order.findOne({ orderNumber: merchantTradeNo });
                
                if (order) {
                    // ⚠️ 重要：只更新 paymentStatus 和 notes（系統備註），絕對不動 specialRequest
                    // 保存原有的 specialRequest（用戶輸入的特殊需求）
                    const originalSpecialRequest = order.specialRequest;
                    
                    order.paymentStatus = 'paid';
                    order.status = 'pending'; // 保持 pending，等待處理
                    order.notes = '綠界金流支付'; // 更新系統備註
                    // ⚠️ 絕對不要動 specialRequest，保持用戶輸入的原始值
                    order.updatedAt = new Date();
                    await order.save();
                    
                    console.log('🔍 [ECPay Callback] 更新後的訂單:');
                    console.log('  - notes (系統備註):', order.notes);
                    console.log('  - specialRequest (用戶輸入):', order.specialRequest);
                    console.log('  - 原始 specialRequest 是否保留:', order.specialRequest === originalSpecialRequest);
                    
                    console.log('✅ 訂單狀態已更新為 Paid:', {
                        orderId: order._id,
                        orderNumber: merchantTradeNo,
                        paymentStatus: 'paid'
                    });
                } else {
                    console.warn('⚠️ 未找到訂單，訂單編號:', merchantTradeNo);
                    // 即使找不到訂單，也返回成功（避免綠界重複通知）
                }
                
                // ⚠️ 重要：返回純文字 '1|OK' 給綠界
                return res.send('1|OK');
            } catch (updateError) {
                console.error('❌ 更新訂單狀態失敗:', updateError);
                // 即使更新失敗，也返回成功（避免綠界重複通知）
                // 可以稍後手動處理
                return res.send('1|OK');
            }
        } else {
            // 交易失敗
            console.log('❌ 交易失敗:', params.RtnMsg || 'Unknown error');
            
            // 更新訂單狀態為 Failed（如果訂單存在）
            // ⚠️ 重要：只更新 paymentStatus，不動 notes 和 specialRequest
            try {
                const order = await Order.findOne({ orderNumber: merchantTradeNo });
                if (order) {
                    const originalSpecialRequest = order.specialRequest;
                    const originalNotes = order.notes;
                    
                    order.paymentStatus = 'failed';
                    // ⚠️ 絕對不要動 notes 和 specialRequest
                    order.updatedAt = new Date();
                    await order.save();
                    
                    console.log('🔍 [ECPay Callback] 失敗訂單更新:');
                    console.log('  - notes 是否保留:', order.notes === originalNotes);
                    console.log('  - specialRequest 是否保留:', order.specialRequest === originalSpecialRequest);
                    console.log('✅ 訂單狀態已更新為 Failed');
                }
            } catch (updateError) {
                console.error('❌ 更新訂單狀態為失敗時發生錯誤:', updateError);
            }
            
            // 返回失敗響應給綠界
            return res.send('0|Fail');
        }
    } catch (error) {
        console.error('❌ 處理綠界回調時發生錯誤:');
        console.error('錯誤訊息:', error.message);
        console.error('錯誤堆疊:', error.stack);
        // 確保錯誤不會導致伺服器崩潰，返回響應給綠界
        return res.send('0|Fail');
    }
});

// 保留舊的 /return 路由作為備用（向後兼容）
router.post('/return', async (req, res) => {
    console.log('⚠️ 使用舊的 /return 路由，建議改用 /callback');
    // 重定向到新的 callback 路由
    req.url = '/callback';
    router.handle(req, res);
});

// 臨時存儲訂單資訊（用於支付成功後創建訂單）
// 注意：生產環境應該使用 Redis 或資料庫，這裡使用內存存儲作為簡單方案
const pendingOrders = new Map();

// 生成 4 碼隨機取餐號
function generatePickupNumber() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// 獲取綠界金流參數（返回 JSON，供前端創建表單）
router.post('/get-params', async (req, res) => {
    try {
        // 🔍 全鏈路調試：記錄前端傳來的完整 Body
        console.log('═══════════════════════════════════════════════════════════');
        console.log('📥 [ECPay] 前端傳來的 Body:', JSON.stringify(req.body, null, 2));
        console.log('📥 [ECPay] req.body.notes:', req.body.notes);
        console.log('📥 [ECPay] req.body.note:', req.body.note);
        console.log('[Debug] [ECPay] 接收到的特殊需求 (req.body.specialRequest):', req.body.specialRequest);
        console.log('[Debug] [ECPay] 接收到的特殊需求 (req.body.note):', req.body.note);
        console.log('═══════════════════════════════════════════════════════════');
        
        const { 
            items, 
            totalAmount, 
            paymentMethod = 'Credit', 
            deliveryMethod = 'pickup', 
            notes: notesFromBody = null,
            note: noteFromBody = null, // 兼容 note 字段
            specialRequest: specialRequestFromBody = null, // 訂單級別的特殊需求（用戶輸入）
            diningMode = 'takeout' 
        } = req.body;
        
        // 🔍 調試：處理 notes 和 specialRequest 字段
        // notes: 系統/金流備註（例如 "綠界金流支付"）
        // specialRequest: 用戶前台輸入的特殊需求（例如 "多冰"）
        const systemNotes = noteFromBody || notesFromBody || '綠界金流支付';
        // ⚠️ 重要：優先使用 specialRequest，如果沒有則嘗試 note（向後兼容）
        const userSpecialRequest = specialRequestFromBody || noteFromBody || null;
        
        console.log('[Debug] [ECPay] 接收到的特殊需求 (req.body.specialRequest):', req.body.specialRequest);
        console.log('[Debug] [ECPay] 接收到的特殊需求 (req.body.note):', req.body.note);
        console.log('🔍 [ECPay] 處理後的字段值:');
        console.log('  - systemNotes (notes):', systemNotes);
        console.log('  - userSpecialRequest (specialRequest):', userSpecialRequest);
        console.log('  - notesFromBody:', notesFromBody);
        console.log('  - noteFromBody:', noteFromBody);
        console.log('  - specialRequestFromBody:', specialRequestFromBody);
        
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
        
        // ⚠️ 關鍵：在產生綠界參數之前，先在資料庫建立訂單（狀態為 Unpaid）
        console.log('💾 開始在資料庫建立訂單（狀態：Unpaid）...');
        
        // 準備訂單項目
        const orderItems = [];
        for (const item of items) {
            orderItems.push({
                name: item.name,
                price: parseFloat(item.price) || 0,
                quantity: parseInt(item.quantity) || 1,
                subtotal: (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)
            });
        }
        
        // ⚠️ 如果是外帶 (takeout)，生成 4 碼隨機取餐號
        let pickupNumber = null;
        if (diningMode === 'takeout') {
            pickupNumber = generatePickupNumber();
            console.log('🎫 生成外帶取餐號:', pickupNumber);
        }
        
        // 創建訂單到資料庫（狀態為 Unpaid）
        // ⚠️ 重要：notes 存系統備註，specialRequest 存用戶輸入的特殊需求
        const orderData = {
            items: orderItems,
            totalAmount: parseFloat(totalAmount) || 0,
            paymentMethod: 'credit_card', // 綠界支付
            deliveryMethod: deliveryMethod || 'pickup',
            notes: systemNotes, // 系統/金流備註（例如 "綠界金流支付"）
            specialRequest: userSpecialRequest, // 訂單級別的特殊需求（用戶輸入，例如 "多冰"）
            orderNumber: merchantTradeNo, // 使用 MerchantTradeNo 作為訂單編號
            pickupNumber: pickupNumber, // 外帶取餐號（僅外帶訂單有）
            diningMode: diningMode || 'takeout', // 用餐模式
            status: 'pending',
            paymentStatus: 'pending', // Unpaid（未付款）
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        console.log('[Debug] [ECPay] 創建的訂單數據 (orderData):', {
            notes: orderData.notes,
            specialRequest: orderData.specialRequest,
            orderNumber: orderData.orderNumber
        });
        console.log('[Debug] [ECPay] 確認 specialRequest 是否正確賦值:', orderData.specialRequest);
        
        let order = null;
        try {
            order = new Order(orderData);
            const savedOrder = await order.save();
            
            // 🔍 全鏈路調試：記錄存入後的完整資料
            console.log('═══════════════════════════════════════════════════════════');
            console.log('💾 [ECPay] 存入後的資料:', JSON.stringify(savedOrder.toObject(), null, 2));
            console.log('[Debug] [ECPay] savedOrder.notes:', savedOrder.notes);
            console.log('[Debug] [ECPay] savedOrder.specialRequest:', savedOrder.specialRequest);
            console.log('[Debug] [ECPay] 確認 specialRequest 是否成功存入:', savedOrder.specialRequest);
            console.log('═══════════════════════════════════════════════════════════');
            
            console.log('✅ 訂單已建立到資料庫（狀態：Unpaid）:', {
                orderId: savedOrder._id,
                orderNumber: merchantTradeNo,
                pickupNumber: pickupNumber,
                diningMode: diningMode,
                totalAmount: totalAmount,
                notes: savedOrder.notes
            });
        } catch (dbError) {
            console.error('❌ 建立訂單到資料庫失敗:', dbError);
            // 如果資料庫保存失敗，仍然繼續流程（但記錄錯誤）
            // 可以選擇返回錯誤或繼續
        }
        
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
        // ⚠️ 關鍵：ReturnURL 指向 callback API（綠界背景通知）
        const returnURL = `${baseUrl}/api/ecpay/callback`;
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
        // ⚠️ 關鍵：ReturnURL 指向 callback API（綠界背景通知）
        const returnURL = `${baseUrl}/api/ecpay/callback`;
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
        // ⚠️ 關鍵：ReturnURL 指向 callback API（綠界背景通知）
        const returnURL = `${baseUrl}/api/ecpay/callback`;
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
// 注意：綠界使用 POST application/x-www-form-urlencoded 傳送資料
router.post('/result', async (req, res) => {
    // 🔍 調試：印出完整的請求資訊（用於 Vercel Logs 除錯）
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📥 綠界金流訂單結果查詢（OrderResultURL）:');
    console.log('───────────────────────────────────────────────────────────');
    console.log('req.method:', req.method);
    console.log('req.headers.content-type:', req.headers['content-type']);
    console.log('req.body:', JSON.stringify(req.body, null, 2));
    console.log('req.body type:', typeof req.body);
    console.log('req.body keys:', req.body ? Object.keys(req.body) : 'undefined');
    console.log('───────────────────────────────────────────────────────────');
    
    try {
        // 綠界使用 POST application/x-www-form-urlencoded，資料在 req.body
        const params = req.body;
        
        // 檢查是否有參數
        if (!params || typeof params !== 'object' || Object.keys(params).length === 0) {
            console.error('❌ 沒有收到任何參數或參數格式錯誤');
            console.error('req.body:', req.body);
            console.error('req.body type:', typeof req.body);
            // 返回 400 而不是 500，避免伺服器崩潰
            return res.status(400).redirect('/?status=error&message=' + encodeURIComponent('未收到訂單資料'));
        }
        
        // 驗證 CheckMacValue
        let checkMacValid = false;
        try {
            checkMacValid = verifyCheckMacValue(params);
        } catch (verifyError) {
            console.error('❌ CheckMacValue 驗證過程發生錯誤:', verifyError.message);
            console.error('錯誤堆疊:', verifyError.stack);
            // 返回 400 而不是 500
            return res.status(400).redirect('/?status=failed&message=' + encodeURIComponent('驗證過程發生錯誤'));
        }
        
        if (!checkMacValid) {
            console.error('❌ CheckMacValue 驗證失敗');
            console.error('收到的參數:', params);
            // 返回 400 而不是 500
            return res.status(400).redirect('/?status=failed&message=' + encodeURIComponent('驗證失敗'));
        }

        const tradeStatus = params.TradeStatus || params.RtnCode;
        const merchantTradeNo = params.MerchantTradeNo;
        const totalAmount = params.TradeAmt || params.TotalAmount;

        console.log('📊 訂單資訊:', {
            merchantTradeNo,
            tradeStatus,
            totalAmount,
            rtnCode: params.RtnCode,
            rtnMsg: params.RtnMsg
        });

        // 交易成功或失敗的處理
        if (tradeStatus === '1' || params.RtnCode === '1') {
            // 交易成功
            console.log('✅ 交易成功（OrderResultURL）');
            
            // 確認訂單狀態（訂單應該已經在 /callback 中更新為 Paid）
            // 查詢訂單的 pickupNumber
            let pickupNumber = null;
            try {
                const order = await Order.findOne({ orderNumber: merchantTradeNo });
                if (order) {
                    pickupNumber = order.pickupNumber || null;
                    console.log('📋 訂單狀態確認:', {
                        orderId: order._id,
                        orderNumber: merchantTradeNo,
                        pickupNumber: pickupNumber,
                        diningMode: order.diningMode,
                        paymentStatus: order.paymentStatus,
                        status: order.status
                    });
                } else {
                    console.warn('⚠️ 未找到訂單，訂單編號:', merchantTradeNo);
                }
            } catch (checkError) {
                console.error('❌ 確認訂單狀態時發生錯誤:', checkError);
            }
            
            // 重定向到首頁並帶上訂單參數
            // 如果有 pickupNumber，則帶在 URL 參數中
            let redirectUrl = `/?status=success&orderNo=${merchantTradeNo}&amount=${totalAmount}`;
            if (pickupNumber) {
                redirectUrl += `&pickupNumber=${pickupNumber}`;
            }
            return res.status(200).redirect(redirectUrl);
        } else {
            // 交易失敗，重定向到首頁並帶上錯誤訊息
            console.log('❌ 交易失敗:', params.RtnMsg || 'Unknown error');
            return res.status(200).redirect(`/?status=failed&message=${encodeURIComponent(params.RtnMsg || '交易失敗')}`);
        }
    } catch (error) {
        // 完整的錯誤處理，確保不會拋出 500
        console.error('═══════════════════════════════════════════════════════════');
        console.error('❌ 處理訂單結果時發生未預期的錯誤:');
        console.error('錯誤名稱:', error.name);
        console.error('錯誤訊息:', error.message);
        console.error('錯誤堆疊:', error.stack);
        console.error('req.body:', req.body);
        console.error('req.headers:', req.headers);
        console.error('═══════════════════════════════════════════════════════════');
        
        // 確保返回響應，不要讓伺服器拋出 500
        try {
            // 嘗試重定向
            return res.status(200).redirect('/?status=error&message=' + encodeURIComponent('系統錯誤'));
        } catch (redirectError) {
            // 如果重定向也失敗，返回 JSON 響應
            console.error('❌ 重定向也失敗:', redirectError.message);
            return res.status(200).json({ 
                success: false, 
                error: '系統錯誤',
                message: '處理訂單結果時發生錯誤，請聯繫客服'
            });
        }
    }
});


module.exports = router;

