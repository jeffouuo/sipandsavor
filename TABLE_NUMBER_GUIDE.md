# 桌號功能使用說明

## 功能概述

內用點餐系統現在支持輸入桌號，並在後台訂單管理中顯示桌號信息。

## 支持格式

桌號支持以下格式：
- **純數字**：5, 10, 25
- **純字母**：A, B, C
- **字母+數字**：A1, B2, C3
- **數字+字母**：1A, 2B

## 使用方法

### 1. 內用點餐頁面

1. 訪問 `dine-in-order.html`
2. 在桌號輸入框中輸入桌號
3. 系統會驗證桌號格式（只允許數字和字母）
4. 輸入正確後即可開始點餐

### 2. 後台訂單管理

1. 訪問 `admin.html` 並登入管理員帳號
2. 點擊「訂單管理」標籤
3. 在「用戶/桌號」列中可以看到：
   - 內用訂單：顯示「桌號: [桌號]」（綠色背景標籤）
   - 外帶訂單：顯示用戶名

## 技術實現

### 前端驗證
```javascript
// 桌號格式驗證（只允許數字和字母）
const tableNumberPattern = /^[A-Za-z0-9]+$/;
if (!tableNumberPattern.test(tableNumber)) {
    alert('桌號只能包含數字和字母，請重新輸入');
    return;
}
```

### 後台顯示
```javascript
// 後台訂單管理中的桌號顯示
<td>${order.orderType === 'dine-in' ? 
    `<span style="color: #4CAF50; font-weight: bold; background: #e8f5e8; padding: 4px 8px; border-radius: 4px;">桌號: ${order.tableNumber || 'N/A'}</span>` : 
    (order.user?.username || 'N/A')}</td>
```

## 數據庫結構

Order模型中的tableNumber字段：
```javascript
tableNumber: {
    type: String,
    required: false
}
```

## 注意事項

1. 桌號不能包含特殊字符（如空格、標點符號等）
2. 桌號不能為空
3. 內用訂單會自動設置orderType為'dine-in'
4. 後台會根據訂單類型決定顯示桌號還是用戶名

## 更新日誌

- ✅ 支持數字和字母組合的桌號輸入
- ✅ 添加桌號格式驗證
- ✅ 優化後台桌號顯示（綠色背景標籤）
- ✅ 添加輸入提示信息 