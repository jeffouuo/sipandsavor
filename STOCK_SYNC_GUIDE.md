# 📦 庫存同步功能說明

## 功能概述

本系統實現了實時庫存同步功能，當客戶下單時，後台管理頁面的商品數量會即時變動，無需手動刷新頁面。

## 🚀 實現原理

### 1. Server-Sent Events (SSE)
- 使用 SSE 技術建立服務器與客戶端的實時連接
- 當庫存發生變更時，服務器會主動推送通知給所有連接的後台管理頁面

### 2. 庫存變更監聽
- 在訂單創建時自動更新商品庫存
- 在管理員手動修改庫存時發送通知
- 支持前台結帳和內用點餐兩種訂單類型

### 3. 實時界面更新
- 後台管理頁面接收 SSE 消息後自動更新表格顯示
- 提供視覺反饋（顏色變化）來突出顯示變更的庫存
- 支持桌面通知提醒

## 📋 功能特點

### ✅ 實時同步
- 下單後庫存立即更新，無需刷新頁面
- 支持多個後台管理頁面同時連接

### ✅ 視覺反饋
- 庫存減少時顯示紅色背景
- 庫存增加時顯示綠色背景
- 2秒後自動恢復正常顏色

### ✅ 通知系統
- 頁面內通知提示
- 桌面通知（需用戶授權）
- 詳細的變更記錄

### ✅ 自動重連
- SSE 連接斷開時自動重連
- 最多重試5次，每次間隔3秒

## 🔧 技術實現

### 服務器端 (server.js)
```javascript
// SSE 客戶端管理
const sseClients = new Set();

// SSE 端點
app.get('/api/sse', (req, res) => {
    // 設置 SSE 頭部
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    
    // 將客戶端添加到集合中
    sseClients.add(res);
});

// 庫存變更通知函數
function notifyStockChange(productId, productName, oldStock, newStock, changeType) {
    const notification = {
        type: 'stock_change',
        productId,
        productName,
        oldStock,
        newStock,
        changeType,
        timestamp: new Date().toISOString()
    };
    
    broadcastToSSE(notification);
}
```

### 客戶端 (admin.js)
```javascript
// 建立 SSE 連接
function connectSSE() {
    sseConnection = new EventSource(`${API_BASE_URL}/sse`);
    
    sseConnection.onmessage = function(event) {
        const data = JSON.parse(event.data);
        handleSSEMessage(data);
    };
}

// 處理庫存變更
function handleStockChange(data) {
    updateProductStockInTable(data.productId, data.newStock, data.changeType);
    showStockChangeNotification(data);
}
```

## 🧪 測試方法

### 1. 使用測試頁面
訪問 `http://localhost:3001/test-stock-sync.html` 進行功能測試：

- **SSE 連接測試**: 測試實時連接是否正常
- **模擬下單測試**: 模擬客戶下單，觀察庫存變更
- **手動更新測試**: 模擬管理員手動修改庫存
- **後台管理測試**: 打開後台管理頁面觀察同步效果

### 2. 實際測試步驟

1. **打開後台管理頁面**
   ```
   http://localhost:3001/admin.html
   ```

2. **記錄初始庫存**
   - 進入「產品管理」頁面
   - 記錄某個商品的當前庫存數量

3. **模擬下單**
   - 打開菜單頁面或內用點餐頁面
   - 選擇商品並下單

4. **觀察同步效果**
   - 返回後台管理頁面
   - 觀察商品庫存是否即時更新
   - 查看是否有通知提示

## 📊 監控和調試

### 瀏覽器控制台
- 查看 SSE 連接狀態
- 監控庫存變更消息
- 檢查錯誤信息

### 服務器日誌
```bash
# 查看 SSE 連接建立
🔗 新的 SSE 連接建立

# 查看庫存變更通知
📦 發送庫存變更通知: {type: 'stock_change', ...}

# 查看庫存更新
✅ 資料庫庫存更新成功: 美式咖啡, 新庫存: 95
```

## ⚠️ 注意事項

### 1. 瀏覽器兼容性
- SSE 需要現代瀏覽器支持
- 不支持 IE 瀏覽器

### 2. 網絡連接
- 需要穩定的網絡連接
- 連接斷開時會自動重連

### 3. 權限設置
- 桌面通知需要用戶授權
- 首次使用時會彈出權限請求

### 4. 性能考慮
- SSE 連接會持續保持
- 建議在不需要時關閉後台管理頁面

## 🔄 故障排除

### 問題：SSE 連接失敗
**解決方案：**
1. 檢查服務器是否正常運行
2. 確認防火牆設置
3. 檢查瀏覽器控制台錯誤信息

### 問題：庫存不同步
**解決方案：**
1. 檢查 SSE 連接狀態
2. 確認服務器日誌中的庫存更新記錄
3. 手動刷新後台管理頁面

### 問題：通知不顯示
**解決方案：**
1. 檢查瀏覽器通知權限
2. 確認 SSE 消息是否正常接收
3. 查看控制台錯誤信息

## 📈 未來改進

### 計劃功能
- [ ] 支持庫存變更歷史記錄
- [ ] 添加庫存預警功能
- [ ] 支持批量庫存更新
- [ ] 添加庫存變更統計報表

### 性能優化
- [ ] 實現 SSE 連接池管理
- [ ] 添加消息過濾和節流
- [ ] 優化大量客戶端連接的處理

## 📞 技術支持

如果遇到問題，請檢查：
1. 服務器日誌
2. 瀏覽器控制台
3. 網絡連接狀態
4. 瀏覽器兼容性

---

**版本**: 1.0.0  
**更新日期**: 2024年12月  
**作者**: 飲茶趣開發團隊
