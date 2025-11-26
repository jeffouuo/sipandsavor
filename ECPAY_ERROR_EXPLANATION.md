# 綠界金流錯誤說明

## 錯誤信息分析

當您看到以下錯誤時：

```
V5:31 Executing inline script violates the following Content Security Policy directive...
36_actions.js:409 Uncaught TypeError: Cannot read properties of undefined (reading 'top')
```

### 這些錯誤來自哪裡？

**這些錯誤來自綠界金流服務器端的支付頁面，不是我們代碼的問題。**

1. **`V5:31`** - 這是綠界服務器端頁面的文件（可能是 `V5.js` 或類似文件）
2. **`36_actions.js:409`** - 這是綠界服務器端的 JavaScript 文件
3. 這些錯誤出現在綠界的支付頁面上（`https://payment-stage.ecpay.com.tw`）

### 為什麼會出現這些錯誤？

1. **CSP 錯誤**：
   - 綠界服務器端的支付頁面設置了嚴格的 Content Security Policy
   - 這是綠界的安全策略，我們無法控制
   - 這可能會導致一些內聯腳本無法執行

2. **JavaScript 錯誤**：
   - 這是綠界服務器端頁面內部的 JavaScript 問題
   - 可能是因為某些 DOM 元素在腳本執行時尚未載入

### 這些錯誤會影響支付功能嗎？

**不會！** 這些錯誤可以安全地忽略，因為：

1. ✅ **支付流程仍然可以正常完成**
2. ✅ **用戶可以正常輸入信用卡資訊**
3. ✅ **支付處理不會受到影響**
4. ✅ **這些只是瀏覽器控制台的警告訊息**

### 如何確認支付功能正常？

1. **檢查是否成功跳轉到綠界支付頁面**
   - 如果看到綠界的支付頁面，說明跳轉成功
   - URL 應該是 `https://payment-stage.ecpay.com.tw/...`

2. **測試支付流程**
   - 使用測試信用卡資訊完成支付
   - 如果支付成功，說明功能正常

3. **忽略控制台錯誤**
   - 這些錯誤是綠界服務器端的問題
   - 不影響實際的支付功能

## 我們的代碼流程

### 1. 前端（payment.html）
```javascript
// 用戶選擇信用卡支付
if (selectedMethod.value === 'credit_card') {
    // 直接跳轉到後端路由
    window.location.href = `/api/ecpay/checkout?items=...&totalAmount=...`;
}
```

### 2. 後端（routes/ecpay.js）
```javascript
// GET /api/ecpay/checkout
router.get('/checkout', (req, res) => {
    // 1. 計算所有參數（包括 CheckMacValue）
    const params = { ... };
    
    // 2. 返回包含自動提交表單的 HTML
    let html = `...<form>...</form><script>form.submit();</script>`;
    
    // 3. 發送 HTML 給瀏覽器
    res.send(html);
});
```

### 3. 瀏覽器
1. 收到後端返回的 HTML
2. 執行 HTML 中的 `<script>` 標籤
3. 自動提交表單到綠界服務器
4. 瀏覽器整頁跳轉到綠界支付頁面

## 確認清單

- ✅ 前端使用 `window.location.href` 跳轉（不是 fetch/axios）
- ✅ 後端返回包含表單和自動提交腳本的 HTML
- ✅ 表單使用 `method="POST"` 和正確的 `action` URL
- ✅ 所有參數都正確填入表單
- ✅ CheckMacValue 由後端計算
- ✅ 瀏覽器成功跳轉到綠界支付頁面

## 結論

**這些錯誤是正常的，可以安全地忽略。**

- 錯誤來自綠界服務器端，不是我們的代碼
- 支付功能仍然可以正常使用
- 如果支付流程可以完成，就表示一切正常

## 如果支付無法完成

如果支付流程無法完成（不是控制台錯誤），請檢查：

1. **後端日誌**：查看是否有錯誤訊息
2. **表單參數**：確認所有參數都正確
3. **CheckMacValue**：確認計算是否正確
4. **網路連線**：確認可以連接到綠界服務器

