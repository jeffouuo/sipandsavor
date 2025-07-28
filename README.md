# 飲茶趣 - 動態網站

這是一個從靜態網站轉換為動態網站的完整解決方案，使用 Node.js + Express + MongoDB 技術棧。

## 🚀 功能特色

### 用戶功能
- ✅ 用戶註冊/登錄系統
- ✅ JWT 身份驗證
- ✅ 個人資料管理
- ✅ 密碼更改
- ✅ 購物車功能
- ✅ 訂單管理
- ✅ 訂單狀態追蹤

### 產品功能
- ✅ 產品列表展示
- ✅ 產品分類篩選
- ✅ 產品搜索
- ✅ 產品詳情
- ✅ 庫存管理
- ✅ 銷售統計

### 管理員功能
- ✅ 產品管理（增刪改查）
- ✅ 訂單管理
- ✅ 用戶管理
- ✅ 新聞管理
- ✅ 數據統計

### 其他功能
- ✅ 響應式設計
- ✅ 圖片懶加載
- ✅ 分頁功能
- ✅ 數據驗證
- ✅ 錯誤處理
- ✅ 安全防護

## 📁 項目結構

```
sipandsavor/
├── models/                 # 數據模型
│   ├── User.js            # 用戶模型
│   ├── Product.js         # 產品模型
│   └── Order.js           # 訂單模型
├── routes/                # API 路由
│   ├── auth.js            # 認證路由
│   ├── products.js        # 產品路由
│   ├── orders.js          # 訂單路由
│   ├── news.js            # 新聞路由
│   └── users.js           # 用戶路由
├── middleware/            # 中間件
│   └── auth.js            # JWT 認證中間件
├── images/                # 圖片資源
├── index.html             # 首頁
├── about.html             # 關於我們
├── news.html              # 最新消息
├── stores.html            # 門市據點
├── style.css              # 樣式文件
├── script.js              # 前端 JavaScript
├── server.js              # 服務器主文件
├── package.json           # 項目配置
├── .env.example           # 環境變量示例
└── README.md              # 項目說明
```

## 🛠️ 安裝與設置

### 1. 安裝依賴

```bash
npm install
```

### 2. 環境配置

複製 `.env.example` 為 `.env` 並配置：

```bash
cp .env.example .env
```

編輯 `.env` 文件：

```env
# 服務器配置
PORT=3000
NODE_ENV=development

# 數據庫配置
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sipandsavor?retryWrites=true&w=majority

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# 前端URL
FRONTEND_URL=http://localhost:5000
```

### 3. 數據庫設置

確保已安裝並運行 MongoDB：

```bash
# 啟動 MongoDB
mongod
```

### 4. 啟動服務器

```bash
# 開發模式
npm run dev

# 生產模式
npm start
```

服務器將在 `http://localhost:3000` 運行。

## 📚 API 文檔

### 認證 API

#### 註冊
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "Password123",
  "phone": "0912345678"
}
```

#### 登錄
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Password123"
}
```

#### 獲取用戶信息
```
GET /api/auth/me
Authorization: Bearer <token>
```

### 產品 API

#### 獲取產品列表
```
GET /api/products?page=1&limit=12&category=奶茶&search=奶茶&sort=price_asc
```

#### 獲取單個產品
```
GET /api/products/:id
```

#### 添加產品（管理員）
```
POST /api/products
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "新產品",
  "description": "產品描述",
  "price": 50,
  "image": "images/product.jpg",
  "category": "奶茶",
  "tags": ["熱門", "推薦"],
  "stock": 100,
  "featured": true
}
```

### 訂單 API

#### 創建訂單
```
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productId": "product_id",
      "quantity": 2
    }
  ],
  "deliveryMethod": "pickup",
  "paymentMethod": "cash",
  "notes": "備註"
}
```

#### 獲取用戶訂單
```
GET /api/orders/my-orders?page=1&limit=10&status=pending
Authorization: Bearer <token>
```

### 新聞 API

#### 獲取新聞列表
```
GET /api/news?page=1&limit=10&featured=true
```

#### 添加新聞（管理員）
```
POST /api/news
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "新聞標題",
  "content": "新聞內容",
  "image": "images/news.jpg",
  "featured": true
}
```

## 🔧 前端整合

### 1. 修改前端 JavaScript

在 `script.js` 中添加 API 調用：

```javascript
// API 基礎 URL
const API_BASE_URL = 'http://localhost:3000/api';

// 獲取產品列表
async function fetchProducts(params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/products?${queryString}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('獲取產品失敗:', error);
        return null;
    }
}

// 用戶登錄
async function loginUser(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('登錄失敗:', error);
        return null;
    }
}

// 創建訂單
async function createOrder(orderData) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('創建訂單失敗:', error);
        return null;
    }
}
```

### 2. 添加登錄/註冊頁面

創建 `login.html` 和 `register.html` 頁面。

### 3. 添加管理員後台

創建管理員專用的後台管理頁面。

## 🚀 部署

### 本地部署

1. 確保 MongoDB 正在運行
2. 配置環境變量
3. 運行 `npm start`

### 雲端部署

推薦使用以下平台：

- **Vercel**: 適合前端部署
- **Heroku**: 適合全棧應用
- **Railway**: 簡單易用
- **DigitalOcean**: 完全控制

### 數據庫部署

- **MongoDB Atlas**: 雲端 MongoDB 服務
- **本地 MongoDB**: 自建數據庫

## 🔒 安全考慮

- ✅ JWT 身份驗證
- ✅ 密碼加密（bcrypt）
- ✅ 輸入驗證
- ✅ CORS 配置
- ✅ 速率限制
- ✅ Helmet 安全頭
- ✅ 環境變量保護

## 📈 性能優化

- ✅ 數據庫索引
- ✅ 圖片懶加載
- ✅ 分頁查詢
- ✅ 緩存策略
- ✅ 壓縮響應

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 許可證

MIT License

## 📞 聯繫

如有問題，請聯繫開發團隊。

---

**注意**: 這是一個完整的動態網站解決方案，包含了從靜態到動態的完整轉換過程。請根據實際需求調整配置和功能。 

## 📌 管理後台使用指南

### 📌 後台入口位置

你的管理後台可以通過以下方式訪問：

1. **直接訪問登錄頁面**：
   ```
   http://localhost:3000/login.html
   ```

2. **通過入口頁面**：
   ```
   http://localhost:3000/admin-entry.html
   ```

3. **直接訪問後台**（如果已登錄）：
   ```
   http://localhost:3000/admin.html
   ```

### 📌 管理員帳號設置

首先需要創建管理員帳號：

1. **啟動後端服務器**：
   ```bash
   npm start
   ```

2. **在瀏覽器控制台執行初始化**：
   - 打開瀏覽器開發者工具（F12）
   - 在控制台中執行：
   ```javascript
   // 載入初始化腳本
   fetch('init-admin.js').then(r => r.text()).then(eval);
   
   // 創建管理員帳號
   createAdminAccount();
   ```

3. **或者手動註冊**：
   - 訪問：`http://localhost:3000/api/auth/register`
   - 使用 POST 方法，Body：
   ```json
   {
     "username": "admin",
     "email": "admin@sipandsavor.com", 
     "password": "Admin123456",
     "phone": "0912345678",
     "role": "admin"
   }
   ```

**注意：密碼必須符合以下規則：**
- 至少 6 個字符
- 至少一個小寫字母 (a-z)
- 至少一個大寫字母 (A-Z)
- 至少一個數字 (0-9)

**預設管理員帳號：**
- 帳號：`admin@sipandsavor.com`
- 密碼：`Admin123456`

### 📌️ 後台功能

登錄後你可以管理：

1. **產品管理**：
   - 新增/編輯/刪除產品
   - 設置價格、庫存、分類
   - 上架/下架產品

2. **訂單管理**：
   - 查看所有訂單
   - 更新訂單狀態
   - 篩選訂單

3. **用戶管理**：
   - 查看用戶列表
   - 啟用/禁用用戶
   - 管理用戶權限

4. **新聞管理**：
   - 新增/編輯/刪除新聞
   - 設置特色新聞

### 📊 統計面板

後台首頁顯示：
- 總產品數
- 總訂單數  
- 總用戶數
- 待處理訂單數

### 📌 技術特點

- **響應式設計**：支援手機和桌面
- **實時更新**：數據即時同步
- **安全認證**：JWT token 驗證
- **權限控制**：只有管理員可訪問

### 📌 快速開始

1. 確保後端服務器運行在 `http://localhost:3000`
2. 訪問 `http://localhost:3000/admin-entry.html`
3. 點擊「前往登錄」
4. 使用管理員帳號登錄
5. 開始管理你的網站！

這樣你就可以完整地管理你的飲茶趣網站了！有任何問題都可以問我。 