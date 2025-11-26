# 綠界金流 React/Vue 整合指南

## 概述

本指南提供 React 和 Vue 版本的函數，用於動態創建表單並提交到綠界金流支付頁面。

## 文件說明

- `ecpay-submit-react.jsx` - React 版本
- `ecpay-submit-vue.js` - Vue 版本

## React 版本使用

### 方法 1: 使用 Hook（自動提交）

```jsx
import { useState, useEffect } from 'react';
import { useECPaySubmit } from './ecpay-submit-react';

function PaymentPage() {
  const [orderParams, setOrderParams] = useState(null);
  
  // 從後端獲取訂單參數
  useEffect(() => {
    fetch('/api/ecpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        items: [
          { name: '商品1', price: 100, quantity: 2 }
        ],
        totalAmount: 200
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setOrderParams(data.params);
      }
    })
    .catch(error => console.error('獲取訂單參數失敗:', error));
  }, []);
  
  // 自動提交到綠界（當 orderParams 有值時）
  useECPaySubmit(orderParams);
  
  return (
    <div>
      {orderParams ? (
        <p>準備跳轉到支付頁面...</p>
      ) : (
        <p>正在準備訂單...</p>
      )}
    </div>
  );
}
```

### 方法 2: 直接調用函數

```jsx
import { submitToECPay } from './ecpay-submit-react';

function PaymentButton() {
  const handlePayment = async () => {
    try {
      // 從後端獲取訂單參數
      const response = await fetch('/api/ecpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: [
            { name: '商品1', price: 100, quantity: 2 }
          ],
          totalAmount: 200
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 提交到綠界
        submitToECPay(data.params);
      }
    } catch (error) {
      console.error('支付處理失敗:', error);
    }
  };
  
  return (
    <button onClick={handlePayment}>
      前往支付
    </button>
  );
}
```

### 方法 3: 使用組件

```jsx
import { ECPaySubmitButton } from './ecpay-submit-react';

function PaymentPage() {
  const [orderParams, setOrderParams] = useState(null);
  
  useEffect(() => {
    // 獲取訂單參數...
    fetch('/api/ecpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [...] })
    })
    .then(res => res.json())
    .then(data => setOrderParams(data.params));
  }, []);
  
  return (
    <div>
      {orderParams && (
        <ECPaySubmitButton 
          orderParams={orderParams}
          onError={(error) => console.error('提交失敗:', error)}
        >
          前往支付
        </ECPaySubmitButton>
      )}
    </div>
  );
}
```

## Vue 版本使用

### 方法 1: Vue 3 Composition API（自動提交）

```vue
<template>
  <div>
    <p v-if="orderParams">準備跳轉到支付頁面...</p>
    <p v-else>正在準備訂單...</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useECPaySubmit } from './ecpay-submit-vue.js';

const orderParams = ref(null);

onMounted(async () => {
  // 從後端獲取訂單參數
  const response = await fetch('/api/ecpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      items: [
        { name: '商品1', price: 100, quantity: 2 }
      ],
      totalAmount: 200
    })
  });
  
  const data = await response.json();
  if (data.success) {
    orderParams.value = data.params;
  }
});

// 自動提交到綠界（當 orderParams 有值時）
useECPaySubmit(orderParams);
</script>
```

### 方法 2: Vue 3 Composition API（手動觸發）

```vue
<template>
  <button @click="handlePayment">前往支付</button>
</template>

<script setup>
import { submitToECPay } from './ecpay-submit-vue.js';

const handlePayment = async () => {
  try {
    // 從後端獲取訂單參數
    const response = await fetch('/api/ecpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        items: [
          { name: '商品1', price: 100, quantity: 2 }
        ],
        totalAmount: 200
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 提交到綠界
      submitToECPay(data.params);
    }
  } catch (error) {
    console.error('支付處理失敗:', error);
  }
};
</script>
```

### 方法 3: Vue 2/3 選項式 API

```vue
<template>
  <div>
    <ECPaySubmitButton 
      v-if="orderParams"
      :order-params="orderParams" 
      @error="handleError"
    >
      前往支付
    </ECPaySubmitButton>
  </div>
</template>

<script>
import { ECPaySubmitButton } from './ecpay-submit-vue.js';

export default {
  components: {
    ECPaySubmitButton
  },
  data() {
    return {
      orderParams: null
    };
  },
  async mounted() {
    // 從後端獲取訂單參數
    const response = await fetch('/api/ecpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        items: [
          { name: '商品1', price: 100, quantity: 2 }
        ],
        totalAmount: 200
      })
    });
    
    const data = await response.json();
    if (data.success) {
      this.orderParams = data.params;
    }
  },
  methods: {
    handleError(error) {
      console.error('支付提交失敗:', error);
      // 顯示錯誤訊息給用戶
    }
  }
};
</script>
```

## 後端 API 範例

後端需要提供一個 API 來生成綠界金流的訂單參數：

```javascript
// routes/ecpay.js (Node.js/Express 範例)
router.post('/create-order', async (req, res) => {
  try {
    const { items, totalAmount } = req.body;
    
    // 生成訂單編號
    const merchantTradeNo = 'EC' + Date.now() + Math.floor(Math.random() * 1000);
    
    // 格式化交易時間
    const now = new Date();
    const merchantTradeDate = now.getFullYear() + '/' + 
      String(now.getMonth() + 1).padStart(2, '0') + '/' + 
      String(now.getDate()).padStart(2, '0') + ' ' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0') + ':' + 
      String(now.getSeconds()).padStart(2, '0');
    
    // 商品名稱
    const itemNames = items.map(item => `${item.name} x${item.quantity}`).join('#');
    const itemName = itemNames.length > 400 ? itemNames.substring(0, 400) : itemNames;
    
    // 準備參數
    const params = {
      MerchantID: process.env.ECPAY_MERCHANT_ID,
      MerchantTradeNo: merchantTradeNo,
      MerchantTradeDate: merchantTradeDate,
      PaymentType: 'aio',
      TotalAmount: Math.round(totalAmount),
      TradeDesc: '飲茶趣訂單',
      ItemName: itemName,
      ReturnURL: `${req.protocol}://${req.get('host')}/api/ecpay/return`,
      OrderResultURL: `${req.protocol}://${req.get('host')}/api/ecpay/result`,
      ChoosePayment: 'Credit',
      EncryptType: '1'
    };
    
    // 生成 CheckMacValue
    const checkMacValue = generateCheckMacValue(params);
    params.CheckMacValue = checkMacValue;
    
    res.json({
      success: true,
      params: params
    });
  } catch (error) {
    console.error('創建訂單失敗:', error);
    res.status(500).json({
      success: false,
      message: '創建訂單失敗'
    });
  }
});
```

## 參數說明

### 必要參數

- `MerchantID`: 商店代號
- `MerchantTradeNo`: 商店交易編號（唯一）
- `MerchantTradeDate`: 商店交易時間（格式：YYYY/MM/DD HH:mm:ss）
- `TotalAmount`: 交易金額（整數）
- `CheckMacValue`: 檢查碼（由後端生成）

### 可選參數

- `PaymentType`: 付款類型（預設：'aio'）
- `TradeDesc`: 交易描述
- `ItemName`: 商品名稱（最多 400 字元）
- `ReturnURL`: 回調 URL（後端處理）
- `OrderResultURL`: 訂單結果 URL（用戶重定向）
- `ChoosePayment`: 選擇的付款方式（'Credit' 表示信用卡）
- `EncryptType`: 加密類型（預設：'1'）

## 注意事項

1. **安全性**：CheckMacValue 必須由後端生成，不要在前端生成
2. **環境變數**：MerchantID、HashKey、HashIV 應該保存在後端的環境變數中
3. **測試環境**：預設使用測試環境 URL，生產環境需要更改
4. **錯誤處理**：建議添加適當的錯誤處理和用戶提示

## 測試

使用測試環境的信用卡資訊：
- 卡號：`4311-9522-2222-2222`
- 安全碼：`222`
- 有效期限：未來的日期（例如：`12/30`）

