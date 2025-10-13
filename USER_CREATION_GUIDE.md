# 用戶創建功能使用指南

## 功能概述

管理員現在可以在後台管理系統中直接創建新用戶帳號，創建的數據會自動保存到 MongoDB Atlas 數據庫（Vercel 部署環境）或本地數據庫，實現永久存儲。

## 主要功能

### 1. 後端 API

**路由**: `POST /api/users/admin/create`

**權限**: 僅限管理員

**請求參數**:
```json
{
  "username": "用戶名",        // 必填，3-20個字符，只能包含字母、數字和下劃線
  "email": "郵箱地址",         // 必填，有效的電子郵件格式
  "password": "密碼",          // 必填，至少6個字符，包含大小寫字母和數字
  "phone": "手機號碼",         // 選填，台灣手機號碼格式 09xxxxxxxx
  "role": "user/admin"       // 選填，默認為 user
}
```

**回應格式**:
```json
{
  "success": true,
  "message": "用戶創建成功",
  "data": {
    "user": {
      "_id": "用戶ID",
      "username": "用戶名",
      "email": "郵箱",
      "role": "角色",
      "isActive": true,
      "createdAt": "創建時間"
    }
  }
}
```

### 2. 前端界面

#### 訪問方式
1. 登入管理後台 (`admin.html`)
2. 點擊頂部導航的「用戶管理」標籤
3. 點擊右上角的「新增用戶」按鈕

#### 表單字段
- **用戶名** (必填): 3-20個字符，只能包含字母、數字和下劃線
- **電子郵件** (必填): 有效的郵箱地址
- **密碼** (必填): 至少6個字符，必須包含大寫字母、小寫字母和數字
- **手機號碼** (選填): 台灣手機號碼格式 (09xxxxxxxx)
- **角色** (必填): 普通用戶 或 管理員

## 使用步驟

### 步驟 1: 登入管理後台
```
1. 打開瀏覽器，訪問管理後台
   - 本地: http://localhost:3001/admin.html
   - Vercel: https://sipandsavor.vercel.app/admin.html

2. 使用管理員帳號登入
```

### 步驟 2: 進入用戶管理
```
1. 點擊頂部導航的「用戶管理」標籤
2. 點擊「新增用戶」按鈕
```

### 步驟 3: 填寫用戶信息
```
1. 輸入用戶名（例如：john_doe）
2. 輸入郵箱（例如：john@example.com）
3. 輸入密碼（例如：Pass123）
4. 選填手機號碼（例如：0912345678）
5. 選擇角色（普通用戶 或 管理員）
```

### 步驟 4: 提交創建
```
1. 點擊「創建用戶」按鈕
2. 等待系統處理
3. 看到成功提示：「用戶創建成功！數據已保存到數據庫」
```

## 數據驗證規則

### 用戶名驗證
- ✅ 長度：3-20個字符
- ✅ 字符：只能包含 a-z, A-Z, 0-9, _ (下劃線)
- ❌ 不能使用：空格、特殊符號、中文

**有效示例**:
- `john_doe`
- `user123`
- `Admin_2024`

**無效示例**:
- `jo` (太短)
- `this_is_a_very_long_username` (太長)
- `user@name` (含有特殊符號)

### 密碼驗證
- ✅ 長度：至少6個字符
- ✅ 必須包含：至少一個大寫字母 (A-Z)
- ✅ 必須包含：至少一個小寫字母 (a-z)
- ✅ 必須包含：至少一個數字 (0-9)

**有效示例**:
- `Pass123`
- `MyPassword1`
- `Admin2024`

**無效示例**:
- `pass` (太短)
- `password` (沒有大寫字母和數字)
- `PASSWORD123` (沒有小寫字母)

### 手機號碼驗證
- ✅ 格式：09xxxxxxxx (10位數字)
- ✅ 開頭：必須以 09 開頭
- ❌ 選填字段，可留空

**有效示例**:
- `0912345678`
- `0987654321`

**無效示例**:
- `912345678` (缺少0)
- `0212345678` (不是09開頭)
- `09123456` (位數不足)

## 數據存儲

### MongoDB Atlas (Vercel 環境)
```javascript
// 數據保存到 MongoDB Atlas 雲端數據庫
- 數據庫：您的 MongoDB Atlas 集群
- 集合：users
- 持久化：永久保存
```

### 本地數據庫 (開發環境)
```javascript
// 數據保存到本地 MongoDB 數據庫
- 數據庫：sipandsavor
- 集合：users
- 持久化：本地永久保存
```

## 安全特性

### 1. 密碼加密
- 使用 bcrypt 加密算法
- Salt rounds: 10
- 密碼永不以明文存儲

### 2. 權限控制
- 只有管理員可以創建用戶
- 使用 JWT token 驗證
- 中間件 `adminAuth` 保護路由

### 3. 輸入驗證
- 前端：HTML5 表單驗證 + JavaScript 驗證
- 後端：express-validator 驗證
- 雙重保護，防止惡意輸入

### 4. 防重複
- 檢查用戶名是否已存在
- 檢查郵箱是否已註冊
- 返回友好的錯誤提示

## 錯誤處理

### 常見錯誤及解決方案

#### 錯誤 1: "用戶名或電子郵件已被使用"
**原因**: 嘗試創建的用戶名或郵箱已存在於數據庫中

**解決方案**: 
- 更換不同的用戶名
- 使用不同的郵箱地址

#### 錯誤 2: "用戶名格式不正確"
**原因**: 用戶名不符合規則

**解決方案**: 
- 確保長度在 3-20 個字符
- 只使用字母、數字和下劃線
- 移除空格和特殊符號

#### 錯誤 3: "密碼格式不正確"
**原因**: 密碼不符合安全要求

**解決方案**: 
- 確保至少 6 個字符
- 包含至少一個大寫字母
- 包含至少一個小寫字母
- 包含至少一個數字

#### 錯誤 4: "手機號碼格式不正確"
**原因**: 手機號碼格式錯誤

**解決方案**: 
- 使用台灣手機號碼格式：09xxxxxxxx
- 確保是 10 位數字
- 或者留空此字段

## 測試功能

### 使用測試腳本
```bash
# 安裝依賴
npm install node-fetch

# 運行測試
node test-user-creation.js
```

### 手動測試
```
1. 訪問管理後台
2. 點擊「用戶管理」
3. 點擊「新增用戶」
4. 填寫測試數據：
   - 用戶名: test_user_001
   - 郵箱: test@example.com
   - 密碼: Test123
   - 手機: 0912345678
   - 角色: 普通用戶
5. 提交並驗證
```

## API 請求示例

### 使用 cURL
```bash
# 1. 管理員登入
curl -X POST https://sipandsavor.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sipandsavor.com",
    "password": "Admin123"
  }'

# 2. 創建用戶（使用上一步獲得的 token）
curl -X POST https://sipandsavor.vercel.app/api/users/admin/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "username": "newuser123",
    "email": "newuser@example.com",
    "password": "Pass123",
    "phone": "0912345678",
    "role": "user"
  }'
```

### 使用 JavaScript (Fetch API)
```javascript
// 創建用戶
async function createUser(adminToken) {
  const response = await fetch('https://sipandsavor.vercel.app/api/users/admin/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'newuser123',
      email: 'newuser@example.com',
      password: 'Pass123',
      phone: '0912345678',
      role: 'user'
    })
  });
  
  const data = await response.json();
  console.log('創建結果:', data);
}
```

## 注意事項

### ⚠️ 重要提醒
1. **管理員權限**: 只有管理員帳號才能創建用戶
2. **密碼安全**: 創建的密碼會被加密存儲，無法恢復
3. **郵箱唯一**: 每個郵箱只能註冊一次
4. **用戶名唯一**: 每個用戶名只能使用一次
5. **數據持久化**: 所有數據保存在 MongoDB 數據庫中

### 💡 最佳實踐
1. 為新用戶設置強密碼
2. 使用有意義的用戶名
3. 提供真實的聯繫方式
4. 謹慎授予管理員權限
5. 定期檢查用戶帳號狀態

## 常見問題 FAQ

**Q1: 創建的用戶可以立即登入嗎？**
A: 是的，創建成功後用戶可以立即使用郵箱和密碼登入系統。

**Q2: 如何重置用戶密碼？**
A: 目前需要通過數據庫直接修改，或者讓用戶重新註冊。

**Q3: 可以批量創建用戶嗎？**
A: 目前只支持單個創建，如需批量創建請使用 API 腳本。

**Q4: 數據保存在哪裡？**
A: Vercel 環境保存在 MongoDB Atlas 雲端數據庫，本地環境保存在本地 MongoDB。

**Q5: 如何刪除錯誤創建的用戶？**
A: 在用戶管理列表中，可以禁用用戶帳號（目前版本暫不支持刪除）。

## 技術支持

如有問題，請檢查：
1. 瀏覽器控制台錯誤信息
2. 服務器日誌
3. 數據庫連接狀態
4. JWT token 有效性

---

**版本**: 1.0.0  
**更新日期**: 2024年10月13日  
**作者**: Sip and Savor 開發團隊

