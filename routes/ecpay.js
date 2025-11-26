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

// 生成 CheckMacValue（與前端邏輯一致）
function generateCheckMacValue(params) {
    const sortedKeys = Object.keys(params).sort();
    let checkString = `HashKey=${ECPAY_CONFIG.hashKey}&`;
    sortedKeys.forEach(key => {
        if (key !== 'CheckMacValue') {
            checkString += `${key}=${params[key]}&`;
        }
    });
    checkString += `HashIV=${ECPAY_CONFIG.hashIV}`;

    let encoded = encodeURIComponent(checkString).toLowerCase();
    encoded = encoded.replace(/%20/g, '+')
                    .replace(/%2d/g, '-')
                    .replace(/%5f/g, '_')
                    .replace(/%2e/g, '.')
                    .replace(/%21/g, '!')
                    .replace(/%2a/g, '*')
                    .replace(/%28/g, '(')
                    .replace(/%29/g, ')')
                    .replace(/%2c/g, ',')
                    .replace(/%2f/g, '/')
                    .replace(/%3a/g, ':')
                    .replace(/%3b/g, ';')
                    .replace(/%3d/g, '=')
                    .replace(/%3f/g, '?')
                    .replace(/%40/g, '@')
                    .replace(/%5b/g, '[')
                    .replace(/%5d/g, ']');

    let decoded = decodeURIComponent(encoded);
    const hash = crypto.createHash('md5').update(decoded).digest('hex');
    return hash.toUpperCase();
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

// 創建綠界金流訂單（計算所有參數包括 CheckMacValue）
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

