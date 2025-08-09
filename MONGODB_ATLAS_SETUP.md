# 🚀 MongoDB Atlas 設置指南

## ✅ 當前狀態檢查

根據檢查結果，您的 MongoDB Atlas 配置：

- ✅ **本地連接正常** - 可以成功連接到 Atlas
- ✅ **資料已存在** - 12 個產品已上傳到 Atlas
- ✅ **環境變數已設置** - MONGODB_URI 已配置
- ❌ **生產環境連接問題** - Vercel 顯示 "disconnected"

## 🔧 Vercel 環境變數設置

### 步驟1：登入 Vercel
1. 訪問 https://vercel.com
2. 登入您的帳戶
3. 選擇 `sipandsavor` 專案

### 步驟2：設置環境變數
1. 點擊 **Settings** 標籤
2. 點擊 **Environment Variables**
3. 確保以下變數已設置：

```
MONGODB_URI=mongodb+srv://jeffouuo:您的密碼@cluster0.o4rppyz.mongodb.net/sipandsavor?retryWrites=true&w=majority
JWT_SECRET=您的JWT密鑰
NODE_ENV=production
```

### 步驟3：重新部署
設置完環境變數後：
1. 回到 **Deployments** 標籤
2. 點擊最新部署右側的 **⋯** 按鈕
3. 選擇 **Redeploy**

## 🔍 故障排除

### 問題1：生產環境顯示 "disconnected"

**可能原因：**
- Vercel 環境變數未正確設置
- MongoDB Atlas IP 白名單限制
- 連接超時設置過短

**解決方案：**

1. **檢查 Vercel 環境變數**：
   - 確保 `MONGODB_URI` 完全正確
   - 檢查密碼中是否有特殊字符需要編碼

2. **MongoDB Atlas IP 白名單**：
   - 登入 MongoDB Atlas
   - 進入 **Network Access**
   - 添加 IP 地址 `0.0.0.0/0`（允許所有 IP）
   - 或添加 Vercel 的 IP 範圍

3. **重新生成密碼**：
   - 在 MongoDB Atlas 中重新生成資料庫用戶密碼
   - 避免使用特殊字符
   - 更新 Vercel 中的 `MONGODB_URI`

### 問題2：連接超時

**已修復：**
- 增加 `serverSelectionTimeoutMS` 到 15 秒
- 添加 Atlas 專用的連接選項
- 優化連接池設置

## 📊 驗證步驟

### 1. 檢查健康狀態
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

### 2. 檢查產品 API
```bash
curl https://sipandsavor.vercel.app/api/products
```

應該返回 12 個產品的列表

### 3. 測試管理後台
1. 訪問 https://sipandsavor.vercel.app/admin.html
2. 登入：admin@sipandsavor.com / admin123
3. 檢查是否能看到產品、訂單等資料

## 🎯 下一步

1. **立即檢查 Vercel 環境變數**
2. **重新部署專案**
3. **等待 2-3 分鐘**
4. **測試 /api/health 端點**
5. **測試管理後台**

## 💡 提示

- MongoDB Atlas 免費版本有連接限制
- 生產環境連接可能需要更長時間建立
- 確保資料庫用戶有完整的讀寫權限

---

您的資料已經在 MongoDB Atlas 中了！現在只需要確保 Vercel 能正確連接到它。
