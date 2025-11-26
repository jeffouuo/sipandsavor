const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');

// 綠界金流測試環境設定
const ECPAY_CONFIG = {
    merchantID: '3002607',
    hashKey: 'pwFHCqoQZGmho4w6',
    hashIV: 'EkRm7iFT261dpevs'
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

