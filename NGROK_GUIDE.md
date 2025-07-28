# Ngrok 本地開發指南

## 為什麼需要 ngrok？

在本地開發時，手機無法直接訪問電腦的 `localhost:3000`，ngrok 可以創建一個公開的網址讓手機訪問您的本地網站。

## 安裝 ngrok

### 方法1：使用 npm（推薦）
```bash
npm install -g ngrok
```

### 方法2：直接下載
1. 訪問 https://ngrok.com/
2. 註冊免費帳號
3. 下載 ngrok
4. 解壓縮到任意資料夾

## 使用步驟

### 1. 啟動您的伺服器
```bash
npm start
```
或
```bash
node server.js
```

### 2. 開啟新的終端機視窗，執行 ngrok
```bash
ngrok http 3000
```

### 3. 複製公開網址
ngrok 會顯示類似這樣的網址：
```
Forwarding    https://abc123.ngrok.io -> http://localhost:3000
```

### 4. 使用公開網址生成 QR碼
在 QR碼生成器中輸入：`https://abc123.ngrok.io`

## 完整操作流程

1. **啟動伺服器**
   ```bash
   npm start
   ```

2. **開啟新終端機**
   ```bash
   ngrok http 3000
   ```

3. **複製 ngrok 網址**
   例如：`https://abc123.ngrok.io`

4. **生成 QR碼**
   - 訪問：`http://localhost:3000/qr-generator.html`
   - 輸入網址：`https://abc123.ngrok.io`
   - 選擇：內用點餐
   - 生成 QR碼

5. **手機測試**
   - 用手機掃描 QR碼
   - 應該可以正常訪問點餐頁面

## 注意事項

### ✅ 優點
- 免費使用
- 即時生效
- 支援 HTTPS
- 可以讓任何人訪問

### ⚠️ 限制
- 免費版每次重啟會改變網址
- 有流量限制
- 適合測試，不適合正式使用

### 🔧 故障排除

**問題1：ngrok 命令找不到**
```bash
# 重新安裝
npm install -g ngrok

# 或使用完整路徑
C:\Users\YourName\AppData\Roaming\npm\ngrok.exe http 3000
```

**問題2：端口被佔用**
```bash
# 檢查端口
netstat -ano | findstr :3000

# 使用不同端口
ngrok http 3001
```

**問題3：手機無法連接**
- 檢查防火牆設定
- 確認網路連線
- 嘗試重新生成 ngrok 網址

## 替代方案

### 方案1：使用 localtunnel
```bash
npm install -g localtunnel
lt --port 3000
```

### 方案2：使用 serveo
```bash
ssh -R 80:localhost:3000 serveo.net
```

### 方案3：部署到免費平台
- Vercel
- Netlify
- GitHub Pages

## 正式部署建議

當您準備正式使用時，建議：

1. **購買網域名稱**
2. **部署到雲端服務**
   - Vercel（免費）
   - Netlify（免費）
   - Heroku（付費）
3. **使用正式網址生成 QR碼**

這樣 QR碼就可以永久使用，不會因為重啟而失效。 