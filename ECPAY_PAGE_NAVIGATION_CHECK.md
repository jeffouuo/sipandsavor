# 綠界金流頁面跳轉檢查指南

## 正確的現象

當您點擊「前往支付」按鈕時，應該看到以下現象：

### 1. Network 記錄被清空
- ✅ **正確**：點擊按鈕的瞬間，瀏覽器 Network 面板中的所有記錄會被清空
- ❌ **錯誤**：Network 記錄沒有被清空，繼續顯示之前的請求

### 2. 頁面跳轉
- ✅ **正確**：瀏覽器地址欄的 URL 會改變
  - 首先跳轉到：`/api/ecpay/checkout?...`
  - 然後自動跳轉到：`https://payment-stage.ecpay.com.tw/...`
- ❌ **錯誤**：URL 沒有改變，仍然停留在原頁面

### 3. 加載綠界資源
- ✅ **正確**：Network 面板中會出現綠界服務器的資源請求
  - `https://payment-stage.ecpay.com.tw/...`
  - 各種 `.js`、`.css` 文件
- ❌ **錯誤**：看到 `_actions.js` 等文件嘗試從當前域名加載（這表示使用了 innerHTML）

## 錯誤的現象（使用 innerHTML）

如果您看到以下現象，說明代碼有問題：

1. **Network 記錄沒有被清空**
   - 點擊按鈕後，Network 面板中的記錄仍然存在
   - 這表示沒有真正的頁面跳轉

2. **看到 `_actions.js` 等文件加載失敗**
   - 錯誤信息顯示從當前域名嘗試加載綠界的資源
   - 例如：`http://localhost:3000/_actions.js` 404
   - 這表示使用了 `innerHTML` 或類似方法在當前頁面渲染 HTML

3. **URL 沒有改變**
   - 瀏覽器地址欄的 URL 保持不變
   - 這表示沒有真正的頁面跳轉

## 我們的代碼流程（確認正確）

### 前端（payment.html）
```javascript
// 使用 window.location.href 觸發真正的頁面跳轉
window.location.href = `/api/ecpay/checkout?items=...&totalAmount=...`;
```
✅ **這會觸發瀏覽器整頁跳轉，Network 記錄會被清空**

### 後端（routes/ecpay.js）
```javascript
// 返回完整的 HTML 頁面
res.send(html);
```
✅ **這會讓瀏覽器載入新的 HTML 頁面，再次觸發頁面跳轉**

### HTML 中的自動提交
```html
<script>
    document.getElementById("ecpay-form").submit();
</script>
```
✅ **這會讓瀏覽器提交表單到綠界，再次觸發頁面跳轉**

## 檢查清單

請確認以下幾點：

- [ ] 前端使用 `window.location.href`（不是 `fetch`、`axios` 或 `innerHTML`）
- [ ] 後端使用 `res.send(html)` 返回完整的 HTML（不是 `res.json()`）
- [ ] HTML 中包含完整的 `<form>` 和自動提交的 `<script>`
- [ ] 沒有使用 `innerHTML` 或 `insertAdjacentHTML` 渲染 HTML
- [ ] 點擊按鈕後，Network 記錄被清空
- [ ] 瀏覽器地址欄的 URL 會改變

## 如何測試

1. **打開瀏覽器開發者工具**
   - 按 F12 或右鍵 → 檢查

2. **切換到 Network 面板**
   - 確保可以看到所有網路請求

3. **點擊「前往支付」按鈕**
   - 觀察 Network 面板

4. **確認現象**
   - ✅ Network 記錄應該被清空
   - ✅ 然後出現新的請求（後端路由）
   - ✅ 然後出現綠界服務器的請求

5. **檢查 URL**
   - ✅ 地址欄應該顯示 `/api/ecpay/checkout?...`
   - ✅ 然後自動跳轉到 `https://payment-stage.ecpay.com.tw/...`

## 如果看到錯誤現象

如果 Network 記錄沒有被清空，或看到 `_actions.js` 從當前域名加載失敗：

1. **檢查前端代碼**
   - 確認使用 `window.location.href`（不是 `fetch`）
   - 確認沒有使用 `innerHTML` 渲染 HTML

2. **檢查後端代碼**
   - 確認使用 `res.send(html)`（不是 `res.json()`）
   - 確認返回的是完整的 HTML 頁面

3. **檢查瀏覽器控制台**
   - 查看是否有 JavaScript 錯誤
   - 查看 Network 面板中的請求類型

## 常見問題

### Q: 為什麼會看到 `_actions.js` 加載失敗？
A: 這表示使用了 `innerHTML` 在當前頁面渲染 HTML，而不是真正的頁面跳轉。

### Q: 如何確認是真正的頁面跳轉？
A: 點擊按鈕後，Network 記錄應該被清空，然後出現新的請求。

### Q: 為什麼 Network 記錄會被清空？
A: 因為 `window.location.href` 會觸發瀏覽器整頁跳轉，這會清空當前的 Network 記錄。

