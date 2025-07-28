# Vercel 部署指南

## 🚀 快速部署步驟

### 步驟1：準備 GitHub 倉庫

1. **創建 GitHub 帳號**（如果還沒有的話）
2. **上傳程式碼到 GitHub**：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/您的用戶名/sipandsavor.git
   git push -u origin main
   ```

### 步驟2：註冊 Vercel

1. 訪問 https://vercel.com/
2. 點擊 "Sign Up"
3. 選擇 "Continue with GitHub"
4. 授權 Vercel 訪問您的 GitHub

### 步驟3：部署專案

1. **在 Vercel 儀表板中**：
   - 點擊 "New Project"
   - 選擇您的 GitHub 倉庫 `sipandsavor`
   - 點擊 "Import"

2. **配置設定**：
   - **Framework Preset**: 選擇 "Node.js"
   - **Root Directory**: 保持空白（使用根目錄）
   - **Build Command**: 保持預設
   - **Output Directory**: 保持預設

3. **環境變數設定**：
   - 點擊 "Environment Variables"
   - 添加以下變數：
     ```
     MONGODB_URI=您的MongoDB連接字串
     JWT_SECRET=您的JWT密鑰
     ```

4. **點擊 "Deploy"**

### 步驟4：獲取部署網址

部署完成後，您會得到類似這樣的網址：
```
https://sipandsavor-xxx.vercel.app
```

## 🔧 重要配置

### MongoDB 設定

由於 Vercel 是無伺服器環境，您需要：

1. **使用 MongoDB Atlas**（雲端資料庫）
   - 註冊 https://www.mongodb.com/atlas
   - 創建免費叢集
   - 獲取連接字串

2. **更新環境變數**：
   ```
   MONGODB_URI=mongodb+srv://用戶名:密碼@cluster.mongodb.net/sipandsavor
   ```

### 環境變數清單

在 Vercel 儀表板中添加以下環境變數：

```
MONGODB_URI=mongodb+srv://您的MongoDB連接字串
JWT_SECRET=您的JWT密鑰（至少32字符）
NODE_ENV=production
```

## 📱 部署後測試

### 1. 測試基本功能
- 訪問首頁：`https://您的網址.vercel.app`
- 測試內用點餐：`https://您的網址.vercel.app/dine-in-order.html`
- 測試管理後台：`https://您的網址.vercel.app/admin.html`

### 2. 生成QR碼
- 訪問：`https://您的網址.vercel.app/qr-generator.html`
- 輸入您的 Vercel 網址
- 生成QR碼並測試

### 3. 測試API
- 測試訂單API：`https://您的網址.vercel.app/api/orders`
- 測試產品API：`https://您的網址.vercel.app/api/products`

## 🎯 自定義網域名稱

### 免費網域
Vercel 提供免費的 `.vercel.app` 網域

### 自定義網域
1. 購買網域名稱（如：sipandsavor.com）
2. 在 Vercel 儀表板中添加自定義網域
3. 更新 DNS 設定

## 🔄 自動部署

每次推送到 GitHub 主分支時，Vercel 會自動重新部署。

## 📊 監控和日誌

- **Vercel 儀表板**：查看部署狀態
- **Function Logs**：查看伺服器日誌
- **Analytics**：查看網站流量

## 🛠️ 故障排除

### 常見問題

**問題1：MongoDB 連接失敗**
- 檢查 MONGODB_URI 環境變數
- 確認 MongoDB Atlas 網路存取設定

**問題2：API 路由無法訪問**
- 檢查 vercel.json 配置
- 確認路由設定正確

**問題3：靜態檔案無法載入**
- 確認檔案路徑正確
- 檢查 vercel.json 中的靜態檔案配置

### 重新部署
```bash
# 推送新程式碼到 GitHub
git add .
git commit -m "Update code"
git push

# Vercel 會自動重新部署
```

## 💡 最佳實踐

1. **環境變數**：不要在程式碼中硬編碼敏感資訊
2. **錯誤處理**：確保所有 API 都有適當的錯誤處理
3. **日誌記錄**：使用 console.log 進行除錯
4. **測試**：部署前在本地充分測試

## 🎉 部署完成後

1. **更新QR碼**：使用新的 Vercel 網址生成QR碼
2. **測試所有功能**：確保點餐、管理後台都正常
3. **分享給客戶**：可以開始使用QR碼點餐系統

您的網站現在可以通過 Vercel 網址訪問，並且可以生成永久有效的QR碼！ 