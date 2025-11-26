# 綠界金流整合指南

## 功能概述

已成功整合綠界金流（ECPay）測試環境，當用戶選擇「信用卡」支付方式時，會自動跳轉到綠界金流的支付頁面進行付款。

## 環境變數設定

**重要**：敏感資訊（HashKey、HashIV）已移至環境變數中，請在 `.env` 文件中設定：

```env
ECPAY_MERCHANT_ID=3002607
ECPAY_HASH_KEY=pwFHCqoQZGmho4w6
ECPAY_HASH_IV=EkRm7iFT261dpevs
ECPAY_ACTION_URL=https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5
```

請參考 `.env.example` 文件進行設定。**請勿將 `.env` 文件提交到版本控制系統**。

## 測試信用卡資訊

在綠界金流測試環境中，可以使用以下測試信用卡資訊：

- **卡號**: `4311-9522-2222-2222`
- **安全碼 (CVV)**: `222`
- **有效期限**: 請輸入未來的日期（例如：`12/30`）

## 文件結構

### 前端文件

1. **ecpay-payment.html**
   - 綠界金流支付頁面
   - 自動生成支付表單並提交到綠界伺服器
   - 顯示測試環境說明和測試信用卡資訊

2. **payment.html**
   - 支付方式選擇頁面
   - 當選擇「信用卡」時，跳轉到 `ecpay-payment.html`

3. **payment-result.html**
   - 支付結果顯示頁面
   - 顯示支付成功或失敗的資訊
   - 自動清空購物車

### 後端文件

1. **routes/ecpay.js**
   - 綠界金流回調處理 API
   - `/api/ecpay/return` - 處理綠界伺服器的回調通知
   - `/api/ecpay/result` - 處理支付完成後的重定向

2. **server.js**
   - 已添加 `/api/ecpay` 路由

## 支付流程

1. **用戶選擇商品並加入購物車**
   - 在菜單頁面選擇商品

2. **點擊結帳**
   - 跳轉到支付方式選擇頁面 (`payment.html`)

3. **選擇信用卡支付**
   - 選擇「信用卡」支付方式
   - 點擊「前往支付」

4. **跳轉到綠界金流支付頁面**
   - 自動跳轉到 `ecpay-payment.html`
   - 顯示載入動畫和測試資訊
   - 自動生成支付表單並提交到綠界伺服器

5. **在綠界支付頁面完成付款**
   - 使用測試信用卡資訊完成支付
   - 綠界伺服器處理支付

6. **支付完成後重定向**
   - 綠界伺服器重定向到 `/api/ecpay/result`
   - 後端驗證支付結果
   - 重定向到 `payment-result.html` 顯示結果

7. **顯示支付結果**
   - 成功：顯示訂單資訊，清空購物車
   - 失敗：顯示錯誤訊息

## CheckMacValue 生成邏輯

綠界金流使用 CheckMacValue 來驗證交易資料的完整性。生成步驟：

1. 將參數按照字母順序排序（排除 CheckMacValue）
2. 組合字串：`HashKey={HashKey}&{參數1}={值1}&{參數2}={值2}&...&HashIV={HashIV}`
3. URL Encode（小寫）
4. 替換特殊字符
5. 解碼
6. 使用 MD5 加密並轉大寫

## 表單參數說明

綠界金流支付表單包含以下參數：

- `MerchantID`: 商店代號
- `MerchantTradeNo`: 商店交易編號（自動生成）
- `MerchantTradeDate`: 商店交易時間
- `PaymentType`: 付款類型（固定為 `aio`）
- `TotalAmount`: 交易金額
- `TradeDesc`: 交易描述
- `ItemName`: 商品名稱
- `ReturnURL`: 回調 URL（後端處理）
- `OrderResultURL`: 訂單結果 URL（用戶重定向）
- `ChoosePayment`: 選擇的付款方式（`Credit` 表示信用卡）
- `EncryptType`: 加密類型（固定為 `1`）
- `CheckMacValue`: 檢查碼（自動生成）

## 注意事項

1. **測試環境**
   - 目前使用的是綠界金流的測試環境
   - 測試環境不會產生真實的交易
   - 所有測試資料都不會影響真實帳戶

2. **生產環境**
   - 切換到生產環境時，需要在 `.env` 文件中更新：
     - `ECPAY_MERCHANT_ID` - 您的生產環境商店代號
     - `ECPAY_HASH_KEY` - 您的生產環境 HashKey
     - `ECPAY_HASH_IV` - 您的生產環境 HashIV
     - `ECPAY_ACTION_URL` - 生產環境 URL: `https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5`
   - 確保 SSL 憑證正確配置

3. **安全性**
   - ✅ HashKey 和 HashIV 已保存在環境變數中（`.env` 文件）
   - ✅ `.env` 文件已加入 `.gitignore`，不會提交到版本控制系統
   - ✅ 前端代碼不包含敏感資訊，所有敏感操作都在後端完成
   - ✅ 生產環境應該使用 HTTPS

4. **錯誤處理**
   - 如果支付失敗，用戶可以返回重新選擇支付方式
   - 所有錯誤都會記錄在後端日誌中

## 測試步驟

1. 啟動伺服器
   ```bash
   npm start
   ```

2. 訪問菜單頁面
   - 選擇商品並加入購物車

3. 點擊結帳
   - 選擇「信用卡」支付方式
   - 點擊「前往支付」

4. 在綠界支付頁面
   - 使用測試信用卡資訊完成支付
   - 卡號：`4311-9522-2222-2222`
   - 安全碼：`222`
   - 有效期限：未來的日期

5. 查看支付結果
   - 支付成功後會顯示訂單資訊
   - 購物車會自動清空

## 疑難排解

### 問題：無法跳轉到綠界支付頁面

- 檢查 `ecpay-payment.html` 是否存在
- 檢查瀏覽器控制台是否有錯誤
- 確認訂單數據是否正確

### 問題：CheckMacValue 驗證失敗

- 檢查 HashKey 和 HashIV 是否正確
- 確認參數順序是否按照字母順序
- 檢查 URL Encode 和特殊字符替換是否正確

### 問題：支付完成後無法重定向

- 檢查 `/api/ecpay/result` 路由是否正確配置
- 檢查 OrderResultURL 是否正確設置
- 查看後端日誌確認是否有錯誤

## 未來擴展

1. **支援其他支付方式**
   - ATM 轉帳
   - 超商代碼
   - 其他第三方支付

2. **訂單狀態管理**
   - 將支付結果保存到資料庫
   - 實現訂單狀態追蹤

3. **支付通知處理**
   - 實現完整的支付通知處理邏輯
   - 處理支付失敗和退款情況

