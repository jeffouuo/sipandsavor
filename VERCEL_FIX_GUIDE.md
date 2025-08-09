# 🚨 Vercel 緊急修復指南

## 問題診斷

1. ✅ **前端 API 配置已修復** - login.html 現在正確使用生產環境 API
2. ❌ **後端資料庫連接失敗** - MongoDB Atlas 連接 "disconnected"
3. ❌ **登入 500 錯誤** - 因為無法查詢用戶資料

## 🔧 立即修復步驟

### 步驟1：檢查 Vercel 環境變數

1. 登入 https://vercel.com
2. 選擇 `sipandsavor` 專案
3. **Settings** > **Environment Variables**
4. 檢查 `MONGODB_URI` 是否正確設置

### 步驟2：正確的環境變數值

**使用用戶指定的最小修正版本 URI**：

```
MONGODB_URI=mongodb+srv://jeffouuo:ou2128211@cluster0.o4rppyz.mongodb.net/sipandsavor?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-here-at-least-32-characters-long
NODE_ENV=production
```

**修正說明**：
- 保持您的認證資訊完全不變
- 僅添加必需的資料庫名稱 `/sipandsavor`
- 確保連接參數正確有效

### 步驟3：重新部署

設置完環境變數後：
1. 回到 **Deployments** 標籤
2. 點擊最新部署的 **⋯** 按鈕  
3. 選擇 **Redeploy**
4. 等待 2-3 分鐘

### 步驟4：驗證修復

部署完成後測試：

```bash
curl https://sipandsavor.vercel.app/api/health
```

應該看到：
```json
{
  "database": {
    "status": "connected",
    "readyState": 1
  }
}
```

## ⚠️ 常見問題

### 問題1：密碼中的特殊字符
如果密碼包含特殊字符，需要進行 URL 編碼：
- `@` → `%40`
- `#` → `%23`  
- `$` → `%24`
- `%` → `%25`

### 問題2：資料庫名稱
確保 URI 中包含資料庫名稱 `/sipandsavor`

### 問題3：IP 白名單
在 MongoDB Atlas 中：
1. **Network Access** > **IP Access List**
2. 添加 `0.0.0.0/0` 允許所有 IP

## 🎯 修復確認

修復成功後，您應該能夠：
1. ✅ 訪問 https://sipandsavor.vercel.app/admin.html
2. ✅ 成功登入 admin@sipandsavor.com / admin123
3. ✅ 看到管理後台的所有資料（12個產品）
