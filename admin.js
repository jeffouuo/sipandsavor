// 管理員後台 JavaScript
// 簡單而安全的 API 配置
const API_BASE_URL = window.location.hostname.includes('localhost') 
    ? `http://localhost:${window.location.port || '3001'}/api`
    : 'https://sipandsavor.vercel.app/api';

console.log('🔧 管理後台已加載');
console.log('📍 當前環境:', window.location.hostname);
console.log('🔗 API地址:', API_BASE_URL);
console.log('🧪 特殊需求邏輯測試: 如果您看到這條消息，說明 admin.js 已正確加載');

// 性能優化：添加緩存機制
const cache = {
    stats: null,
    products: null,
    orders: null,
    users: null,
    lastUpdate: {}
};

const ADMIN_STANDARD_SUGAR_LEVELS = ['無糖', '微糖', '半糖', '少糖', '全糖', '正常糖'];
const ADMIN_STANDARD_ICE_LEVELS = ['去冰', '微冰', '少冰', '正常冰', '熱飲'];

const normalizeAdminString = (value) => typeof value === 'string' ? value.trim() : '';

function parseAdminLegacyCustomizations(customizations = '') {
    const result = {
        sugarLevel: '',
        iceLevel: '',
        toppings: [],
        extras: []
    };

    if (!customizations || typeof customizations !== 'string') {
        return result;
    }

    const trimmed = customizations.trim();
    if (!trimmed) {
        return result;
    }

    let baseText = trimmed;
    const plusIndex = trimmed.indexOf('+');
    if (plusIndex >= 0) {
        const toppingsText = trimmed.slice(plusIndex + 1);
        toppingsText.split(/[,，]/).forEach(topping => {
            const clean = topping.trim();
            if (clean) {
                result.toppings.push(clean);
            }
        });
        baseText = trimmed.slice(0, plusIndex);
    }

    baseText.split(',').forEach(token => {
        const clean = token.trim();
        if (!clean) return;

        if (!result.sugarLevel && ADMIN_STANDARD_SUGAR_LEVELS.includes(clean)) {
            result.sugarLevel = clean;
        } else if (!result.iceLevel && ADMIN_STANDARD_ICE_LEVELS.includes(clean)) {
            result.iceLevel = clean;
        } else {
            result.extras.push(clean);
        }
    });

    return result;
}

function getAdminItemMeta(item = {}) {
    const meta = {
        sugarLevel: normalizeAdminString(item.sugarLevel),
        iceLevel: normalizeAdminString(item.iceLevel),
        toppings: Array.isArray(item.toppings) ? item.toppings.map(t => normalizeAdminString(t)).filter(Boolean) : [],
        extras: []
    };

    if (Array.isArray(item.extras)) {
        meta.extras = item.extras.map(extra => normalizeAdminString(extra)).filter(Boolean);
    }

    const needsLegacy = (!meta.sugarLevel || !meta.iceLevel || meta.toppings.length === 0) && item.customizations;
    if ((needsLegacy || meta.extras.length === 0) && item.customizations) {
        const legacy = parseAdminLegacyCustomizations(item.customizations);
        if (!meta.sugarLevel && legacy.sugarLevel) meta.sugarLevel = legacy.sugarLevel;
        if (!meta.iceLevel && legacy.iceLevel) meta.iceLevel = legacy.iceLevel;
        if (meta.toppings.length === 0 && legacy.toppings.length > 0) meta.toppings = legacy.toppings;
        if (meta.extras.length === 0 && legacy.extras.length > 0) meta.extras = legacy.extras;
    }

    return meta;
}

function formatOrderItemDisplay(item = {}) {
    const meta = getAdminItemMeta(item);
    const baseParts = [];
    if (meta.sugarLevel) baseParts.push(meta.sugarLevel);
    if (meta.iceLevel) baseParts.push(meta.iceLevel);

    let display = item?.name ? String(item.name) : '未知商品';
    if (baseParts.length) {
        display += ` (${baseParts.join(', ')})`;
    }

    return display;
}

function buildAdminItemNoteText(item = {}) {
    const meta = getAdminItemMeta(item);
    const noteSegments = [];

    if (meta.toppings.length) {
        noteSegments.push(`+ ${meta.toppings.join(', ')}`);
    }
    if (meta.extras.length) {
        noteSegments.push(meta.extras.join(', '));
    }

    const special = normalizeAdminString(item?.specialRequest || item?.note || item?.notes);
    if (special) {
        noteSegments.push(special);
    }

    const noteContent = noteSegments.join(' ').trim();
    return noteContent ? `備註：${noteContent}` : '';
}

// SSE 連接管理
let sseConnection = null;
let sseReconnectAttempts = 0;
const MAX_SSE_RECONNECT_ATTEMPTS = 5;

// 建立 SSE 連接
function connectSSE() {
    if (sseConnection) {
        sseConnection.close();
    }

    try {
        console.log('🔗 建立 SSE 連接...');
        sseConnection = new EventSource(`${API_BASE_URL}/sse`);
        
        sseConnection.onopen = function(event) {
            console.log('✅ SSE 連接已建立');
            sseReconnectAttempts = 0;
        };
        
        sseConnection.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                handleSSEMessage(data);
            } catch (error) {
                console.error('SSE 消息解析失敗:', error);
            }
        };
        
        sseConnection.onerror = function(event) {
            console.error('❌ SSE 連接錯誤:', event);
            sseConnection.close();
            
            // 自動重連
            if (sseReconnectAttempts < MAX_SSE_RECONNECT_ATTEMPTS) {
                sseReconnectAttempts++;
                console.log(`🔄 SSE 重連嘗試 ${sseReconnectAttempts}/${MAX_SSE_RECONNECT_ATTEMPTS}...`);
                setTimeout(connectSSE, 3000); // 3秒後重連
            } else {
                console.error('💥 SSE 重連失敗，停止嘗試');
            }
        };
        
    } catch (error) {
        console.error('SSE 連接建立失敗:', error);
    }
}

// 處理 SSE 消息
function handleSSEMessage(data) {
    console.log('📨 收到 SSE 消息:', data);
    
    switch (data.type) {
        case 'connected':
            console.log('✅ SSE 連接確認:', data.message);
            break;
            
        case 'stock_change':
            handleStockChange(data);
            break;
            
        default:
            console.log('📨 未知 SSE 消息類型:', data.type);
    }
}

// 處理庫存變更
function handleStockChange(data) {
    console.log('📦 處理庫存變更:', data);
    
    // 更新產品表格中的庫存顯示
    updateProductStockInTable(data.productId, data.newStock, data.changeType);
    
    // 如果當前在產品頁面，刷新產品列表
    const productsSection = document.getElementById('products-section');
    if (productsSection && productsSection.classList.contains('active')) {
        console.log('🔄 刷新產品列表...');
        loadProducts(currentPage.products);
    }
    
    // 顯示庫存變更通知
    showStockChangeNotification(data);
}

// 更新產品表格中的庫存顯示
function updateProductStockInTable(productId, newStock, changeType) {
    const table = document.querySelector('#productsTable .data-table');
    if (!table) return;
    
    // 使用 data-product-id 屬性查找對應的行
    const row = table.querySelector(`tr[data-product-id="${productId}"]`);
    if (row) {
        const stockCell = row.querySelector('.stock-cell');
        if (stockCell) {
            const oldStock = parseInt(stockCell.textContent);
            stockCell.textContent = newStock;
            
            // 添加視覺效果
            stockCell.style.transition = 'background-color 0.5s ease';
            stockCell.style.backgroundColor = changeType === 'decrease' ? '#ffebee' : '#e8f5e8';
            
            setTimeout(() => {
                stockCell.style.backgroundColor = '';
            }, 2000);
            
            console.log(`📦 產品 ${productId} 庫存已更新: ${oldStock} → ${newStock}`);
        }
    } else {
        console.log(`⚠️ 未找到產品 ${productId} 的表格行`);
    }
}

// 顯示庫存變更通知
function showStockChangeNotification(data) {
    const changeType = data.changeType === 'decrease' ? '減少' : '增加';
    const changeAmount = Math.abs(data.newStock - data.oldStock);
    const message = `商品「${data.productName}」庫存${changeType}了 ${changeAmount} 個，當前庫存: ${data.newStock}`;
    
    // 使用現有的通知系統
    showAlert(message, 'success');
    
    // 也可以添加桌面通知（如果瀏覽器支持）
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('庫存變更通知', {
            body: message,
            icon: '/images/sipandsavor.webp'
        });
    }
}

// 自動刷新最新訂單
let autoRefreshInterval = null;

function startAutoRefresh() {
    // 每60秒自動檢查新訂單（降低頻率，減少服務器壓力）
    autoRefreshInterval = setInterval(async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                console.log('⚠️ 自動刷新：沒有 token，跳過');
                return;
            }
            
            console.log('🔄 自動檢查新訂單...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超時
            
            const response = await fetch(`${API_BASE_URL}/orders/recent`, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            const data = await response.json();
            
            if (data.success) {
                if (data.data?.length > 0) {
                    console.log(`✅ 發現 ${data.data.length} 個最新訂單`);
                    
                    // 如果當前在訂單頁面，自動刷新
                    const ordersSection = document.getElementById('orders-section');
                    if (ordersSection && ordersSection.classList.contains('active')) {
                        console.log('🔄 自動刷新訂單列表...');
                        loadOrders(1, '', '');
                    }
                } else {
                    console.log('📋 沒有發現新訂單');
                    
                    // 如果資料庫狀態有問題，顯示提示
                    if (data.databaseStatus && data.databaseStatus !== 'connected') {
                        console.log(`⚠️ 資料庫狀態: ${data.databaseStatus}`);
                        if (data.message) {
                            console.log(`💡 ${data.message}`);
                        }
                    }
                }
            } else {
                console.warn(`⚠️ 自動刷新 API 回應錯誤: ${data.error || '未知錯誤'}`);
                
                // 檢查資料庫狀態
                if (data.databaseStatus === 'error') {
                    console.warn('🚨 檢測到資料庫錯誤，暫時停用自動刷新');
                    stopAutoRefresh();
                    
                    // 3分鐘後重新啟動
                    setTimeout(() => {
                        console.log('🔄 重新啟動自動刷新...');
                        startAutoRefresh();
                    }, 180000); // 3分鐘
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('⚠️ 自動刷新請求超時');
            } else {
                console.warn('⚠️ 自動刷新失敗:', error.message);
            }
        }
    }, 60000); // 改為60秒間隔
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// 檢查 token 是否有效（解碼但不驗證簽名）
function isTokenValid(token) {
    if (!token) return false;
    
    try {
        // JWT 由三部分組成：header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        // 解碼 payload
        const payload = JSON.parse(atob(parts[1]));
        
        // 檢查是否過期
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Token 解析失敗:', error);
        return false;
    }
}

// 帶重試的 fetch 函數
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超時
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            console.warn(`請求失敗，重試 ${i + 1}/${maxRetries}:`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 指數退避
        }
    }
}

// 顯示載入指示器
function showLoading(elementId, message = '載入中...') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4CAF50; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="margin-top: 20px; color: #666;">${message}</p>
            </div>
        `;
    }
}

// 檢查緩存是否有效（5分鐘內）
function isCacheValid(key) {
    const lastUpdate = cache.lastUpdate[key];
    return lastUpdate && (Date.now() - lastUpdate) < 5 * 60 * 1000; // 5分鐘
}

let currentUser = null;
let currentPage = {
    products: 1,
    orders: 1,
    users: 1
};

// 初始化 - 已移除重複的 DOMContentLoaded 監聽器

// 檢查認證
async function checkAuth() {
    console.log('🔍 開始檢查認證...');
    console.log('📍 當前頁面:', window.location.href);
    console.log('🔗 使用的API地址:', API_BASE_URL);
    
    const token = localStorage.getItem('adminToken');
    console.log('🎫 Token狀態:', token ? '已找到' : '未找到');
    
    if (!token) {
        console.log('🔐 沒有找到token，跳轉到登錄頁面');
        window.location.replace('login.html');
        return;
    }

    // 檢查 token 是否過期（本地檢查）
    if (!isTokenValid(token)) {
        console.log('🔐 Token 無效或已過期，清除並跳轉到登錄頁面');
        localStorage.removeItem('adminToken');
        document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.replace('login.html');
        return;
    }

    try {
        console.log('📡 發送認證請求到:', `${API_BASE_URL}/auth/me`);
        
        const response = await fetchWithRetry(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('📥 認證回應狀態:', response.status);
        console.log('📥 認證回應OK:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 認證失敗回應內容:', errorText);
            throw new Error(`認證失敗: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ 認證成功，用戶數據:', data);
        
        currentUser = data.data.user;

        if (currentUser.role !== 'admin') {
            console.error('❌ 用戶角色不是管理員:', currentUser.role);
            alert('您沒有管理員權限');
            window.location.href = 'index.html';
            return;
        }

        console.log('✅ 管理員認證通過:', currentUser.username);
        document.getElementById('adminName').textContent = currentUser.username;
    } catch (error) {
        console.error('❌ 認證檢查失敗:', error);
        console.error('❌ 錯誤詳情:', {
            message: error.message,
            stack: error.stack,
            API_BASE_URL: API_BASE_URL,
            token: token ? '存在' : '不存在'
        });
        
        localStorage.removeItem('adminToken');
        // 清除cookie
        document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        console.log('🔐 認證失敗，跳轉到登錄頁面');
        window.location.replace('login.html');
    }
}

// 登出
function logout() {
    localStorage.removeItem('adminToken');
    // 清除cookie
    document.cookie = 'adminToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = 'index.html';
}



// 顯示/隱藏內容區塊
function showSection(sectionName) {
    // 隱藏所有內容區塊
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // 移除所有標籤的active狀態
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // 顯示選中的內容區塊
    document.getElementById(`${sectionName}-section`).classList.add('active');
    
    // 設置對應標籤為active
    event.target.classList.add('active');

    // 根據選中的區塊載入對應數據
    switch (sectionName) {
        case 'stats':
            loadStats();
            break;
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

// 載入統計數據（帶緩存）
async function loadStats(forceRefresh = false) {
    try {
        // 檢查緩存
        if (!forceRefresh && cache.stats && isCacheValid('stats')) {
            console.log('📊 使用緩存的統計數據');
            updateStatsDisplay(cache.stats);
            return;
        }

        // 移除對不存在的 statsContent 元素的引用
        console.log('📊 載入統計數據中...');
        
        const token = localStorage.getItem('adminToken');
        
        // 並行請求多個統計數據
        const [productsResponse, ordersStatsResponse, usersResponse] = await Promise.all([
            fetchWithRetry(`${API_BASE_URL}/products/count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetchWithRetry(`${API_BASE_URL}/orders/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetchWithRetry(`${API_BASE_URL}/users/count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        const [productsData, ordersStatsData, usersData] = await Promise.all([
            productsResponse.json(),
            ordersStatsResponse.json(),
            usersResponse.json()
        ]);

        // 計算統計數據
        const stats = {
            totalProducts: productsData.success ? productsData.data.total : 0,
            totalOrders: ordersStatsData.success ? ordersStatsData.data.totalOrders : 0,
            totalUsers: usersData.success ? usersData.data.total : 0,
            pendingOrders: ordersStatsData.success ? (ordersStatsData.data.statusCounts?.pending || 0) : 0,
            ordersWithNotes: ordersStatsData.success ? ordersStatsData.data.ordersWithNotes : 0,
            todayOrders: ordersStatsData.success ? ordersStatsData.data.todayOrders : 0,
            thisMonthOrders: ordersStatsData.success ? ordersStatsData.data.thisMonthOrders : 0,
            totalRevenue: ordersStatsData.success ? ordersStatsData.data.totalRevenue : 0,
            databaseStatus: 'connected'
        };

        // 更新緩存
        cache.stats = stats;
        cache.lastUpdate.stats = Date.now();

        updateStatsDisplay(stats);
        
    } catch (error) {
        console.error('載入統計數據失敗:', error);
        showAlert('載入統計數據失敗', 'error');
    }
}

function updateStatsDisplay(stats) {
    // 更新統計數據到對應的元素
    const totalProductsEl = document.getElementById('totalProducts');
    const totalOrdersEl = document.getElementById('totalOrders');
    const totalUsersEl = document.getElementById('totalUsers');
    const pendingOrdersEl = document.getElementById('pendingOrders');
    const ordersWithNotesEl = document.getElementById('ordersWithNotes');
    const todayOrdersEl = document.getElementById('todayOrders');
    const thisMonthOrdersEl = document.getElementById('thisMonthOrders');
    const totalRevenueEl = document.getElementById('totalRevenue');
    
    // 檢查元素是否存在並更新內容
    if (totalProductsEl) totalProductsEl.textContent = stats.totalProducts || 0;
    if (totalOrdersEl) totalOrdersEl.textContent = stats.totalOrders || 0;
    if (totalUsersEl) totalUsersEl.textContent = stats.totalUsers || 0;
    if (pendingOrdersEl) pendingOrdersEl.textContent = stats.pendingOrders || 0;
    if (ordersWithNotesEl) ordersWithNotesEl.textContent = stats.ordersWithNotes || 0;
    if (todayOrdersEl) todayOrdersEl.textContent = stats.todayOrders || 0;
    if (thisMonthOrdersEl) thisMonthOrdersEl.textContent = stats.thisMonthOrders || 0;
    if (totalRevenueEl) totalRevenueEl.textContent = `NT$ ${stats.totalRevenue || 0}`;
}

// 載入產品列表（帶緩存和載入指示器）
async function loadProducts(page = 1) {
    try {
        // 檢查緩存（僅對第一頁）
        if (page === 1 && cache.products && isCacheValid('products')) {
            console.log('📦 使用緩存的產品數據');
            renderProductsTable(cache.products.data.products, cache.products.data.pagination);
            return;
        }

        showLoading('productsTable', '載入產品列表中...');
        
        const token = localStorage.getItem('adminToken');
        const response = await fetchWithRetry(`${API_BASE_URL}/products/admin/all?page=${page}&limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('獲取產品失敗');

        const data = await response.json();
        
        // 更新緩存（僅對第一頁）
        if (page === 1) {
            cache.products = data;
            cache.lastUpdate.products = Date.now();
        }
        
        renderProductsTable(data.data.products, data.data.pagination);
        currentPage.products = page;

    } catch (error) {
        console.error('載入產品失敗:', error);
        showAlert('載入產品失敗', 'error');
    }
}

function renderProductsTable(products, pagination) {
    const tableContainer = document.getElementById('productsTable');
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>圖片</th>
                    <th>名稱</th>
                    <th>分類</th>
                    <th>價格</th>
                    <th>庫存</th>
                    <th>狀態</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    products.forEach(product => {
        html += `
            <tr data-product-id="${product._id}">
                <td><img src="${product.image}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>NT$ ${product.price}</td>
                <td class="stock-cell">${product.stock}</td>
                <td>${product.isAvailable ? '上架' : '下架'}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editProduct('${product._id}')">編輯</button>
                    <button class="action-btn delete-btn" onclick="deleteProduct('${product._id}')">刪除</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    // 添加分頁
    if (pagination) {
        html += renderPagination(pagination, 'products');
    }

    tableContainer.innerHTML = html;
}

// 搜索產品
function searchProducts() {
    const searchTerm = document.getElementById('productSearch').value;
    // 實現搜索功能
    console.log('搜索產品:', searchTerm);
}

// 顯示產品編輯模態框
function showProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');

    if (productId) {
        title.textContent = '編輯產品';
        currentEditingProductId = productId; // 設定編輯狀態
        // 載入產品數據
        loadProductData(productId);
    } else {
        title.textContent = '新增產品';
        currentEditingProductId = null; // 重置編輯狀態
        form.reset();
    }

    modal.style.display = 'block';
}

// 關閉產品編輯模態框
function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
    currentEditingProductId = null; // 重置編輯狀態
}

// 載入產品數據
async function loadProductData(productId) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('獲取產品數據失敗');

        const data = await response.json();
        const product = data.data.product;

        // 填充表單
        document.getElementById('productName').value = product.name;
        document.getElementById('productDescription').value = product.description;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productImage').value = product.image;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productFeatured').checked = product.featured;

    } catch (error) {
        console.error('載入產品數據失敗:', error);
        showAlert('載入產品數據失敗', 'error');
    }
}

// 編輯產品
function editProduct(productId) {
    showProductModal(productId);
}

// 刪除產品
async function deleteProduct(productId) {
    if (!confirm('確定要刪除此產品嗎？')) return;

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('刪除產品失敗');

        showAlert('產品刪除成功', 'success');
        loadProducts(currentPage.products);

    } catch (error) {
        console.error('刪除產品失敗:', error);
        showAlert('刪除產品失敗', 'error');
    }
}

// 訂單管理功能
async function loadOrders(page = 1, statusFilter = '', notesFilter = '') {
    try {
        // 檢查緩存（僅對第一頁且無過濾條件）
        if (page === 1 && !statusFilter && !notesFilter && cache.orders && isCacheValid('orders')) {
            console.log('📋 使用緩存的訂單數據');
            renderOrdersTable(cache.orders.data.orders, cache.orders.data.pagination);
            return;
        }

        showLoading('ordersTable', '載入訂單列表中...');
        
        const token = localStorage.getItem('adminToken');
        let url = `${API_BASE_URL}/orders/admin/all?page=${page}&limit=20`; // 增加每頁數量
        
        // 添加過濾條件
        if (statusFilter) {
            url += `&status=${statusFilter}`;
        }
        if (notesFilter) {
            url += `&hasNotes=true`;
        }
        
        const response = await fetchWithRetry(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('獲取訂單失敗');

        const data = await response.json();
        
        // 更新緩存（僅對第一頁且無過濾條件）
        if (page === 1 && !statusFilter && !notesFilter) {
            cache.orders = data;
            cache.lastUpdate.orders = Date.now();
        }
        
        renderOrdersTable(data.data.orders, data.data.pagination);
        currentPage.orders = page;

    } catch (error) {
        console.error('載入訂單失敗:', error);
        showAlert('載入訂單失敗', 'error');
    }
}

function renderOrdersTable(orders, pagination) {
    const tableContainer = document.getElementById('ordersTable');
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>訂單編號</th>
                    <th>用戶/桌號</th>
                    <th>商品</th>
                    <th>總金額</th>
                    <th>特殊需求</th>
                    <th>狀態</th>
                    <th>創建時間</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    orders.forEach(order => {
        console.log('🟢 後台渲染訂單:', order._id);
        console.log('🟢 訂單項目:', order.items);
        console.log('檢查桌號:', order.tableNumber, '用餐模式:', order.diningMode);
        
        // 正確顯示商品和數量（包含甜度/冰塊與加料）
        const itemsHtml = (order.items || []).map(item => {
            const quantity = item.quantity || 1;
            const displayName = formatOrderItemDisplay(item);
            const noteText = buildAdminItemNoteText(item);
            const noteHtml = noteText
                ? `<div class="order-item-note text-red-500" style="color: #e74c3c; font-size: 12px; margin-top: 2px;">${noteText}</div>`
                : '';
            return `<div class="order-item-line">${displayName} x${quantity}</div>${noteHtml}`;
        }).join('');
        
        const statusClass = `status-${order.status}`;
        
        // 簡化特殊需求顯示邏輯
        const getSpecialRequests = () => {
            const specialRequests = [];
            
            (order.items || []).forEach(item => {
                const noteText = buildAdminItemNoteText(item);
                if (noteText) {
                    const plainText = noteText.replace(/^備註：\s*/, '').trim();
                    specialRequests.push(`${item.name}: ${plainText}`);
                }
            });
            
            // 注意：訂單級別的 specialRequest 將在下面單獨顯示，這裡只處理商品級別的特殊需求
            return specialRequests;
        };
        
        const specialRequests = getSpecialRequests();
        
        // 🔍 調試：檢查訂單級別的字段
        console.log('🔍 [後台前端] 訂單 ID:', order._id);
        console.log('🔍 [後台前端] order.specialRequest (客人輸入):', order.specialRequest);
        console.log('🔍 [後台前端] order.notes (系統備註):', order.notes);
        
        // 構建特殊需求顯示（只顯示訂單級別的 specialRequest，不顯示系統備註）
        const buildSpecialRequestDisplay = () => {
            // HTML 轉義函數（簡單版本）
            const escapeHtml = (text) => {
                if (!text) return '';
                return String(text)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            };
            
            const parts = [];
            
            // 1. 商品級別的特殊需求（如果有）
            if (specialRequests.length > 0) {
                const escapedItemRequests = specialRequests.map(req => escapeHtml(req)).join('; ');
                parts.push(`<span style="color: #e74c3c; font-weight: 500;">${escapedItemRequests}</span>`);
            }
            
            // 2. 訂單級別的特殊需求（order.specialRequest）
            // ⚠️ 重要：如果有內容才顯示，如果為空則完全不顯示
            if (order.specialRequest && order.specialRequest.trim() !== '') {
                const escapedSpecialRequest = escapeHtml(order.specialRequest.trim());
                parts.push(`<span style="color: #e74c3c; font-weight: bold;">${escapedSpecialRequest}</span>`);
            }
            
            // 如果沒有任何特殊需求，返回 null（不顯示）
            return parts.length > 0 ? parts.join('<br>') : null;
        };
        
        const specialRequestDisplayHtml = buildSpecialRequestDisplay();
        
        // 構建用戶/桌號/訂單號顯示
        let userDisplay = '';
        const isDineInDisplay = order.diningMode === 'dine-in' || order.orderType === 'dine-in' || order.deliveryMethod === 'dine-in';
        if (isDineInDisplay) {
            const tableLabel = order.tableNumber ? `內用: ${order.tableNumber}` : '內用: 未填寫';
            userDisplay = `<span class="text-blue-600 font-bold">${tableLabel}</span>`;
        } else if (order.pickupNumber && order.pickupNumber.trim()) {
            userDisplay = `<span class="text-green-600 font-bold">外帶: ${order.pickupNumber}</span>`;
        } else if (order.orderNumber && order.orderNumber.trim()) {
            const orderNumberLast4 = order.orderNumber.slice(-4);
            userDisplay = `<span class="text-green-600 font-bold">外帶: ${orderNumberLast4}</span>`;
        } else {
            userDisplay = order.user?.username || 'N/A';
        }
        
        html += `
            <tr>
                <td>${order._id}</td>
                <td>${userDisplay}</td>
                <td>${itemsHtml}</td>
                <td>NT$ ${order.totalAmount}</td>
                <td style="max-width: 300px; word-wrap: break-word; line-height: 1.5;">
                    ${specialRequestDisplayHtml 
                        ? `<div style="font-size: 13px; color: #2c3e50;">${specialRequestDisplayHtml}</div>`
                        : '<span style="color: #95a5a6; font-size: 13px;">—</span>'
                    }
                </td>
                <td><span class="status-badge ${statusClass}">${getStatusText(order.status)}</span></td>
                <td>${new Date(order.createdAt).toLocaleString()}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="updateOrderStatus('${order._id}')">更新狀態</button>
                    ${order.status === 'completed' ? 
                        `<button class="action-btn delete-btn" onclick="deleteOrder('${order._id}')" style="margin-left: 5px;">🗑️ 刪除</button>` : 
                        ''
                    }
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    if (pagination) {
        html += renderPagination(pagination, 'orders');
    }

    tableContainer.innerHTML = html;
}

// 篩選訂單
function filterOrders() {
    const status = document.getElementById('orderStatusFilter').value;
    const notesFilter = document.getElementById('orderNotesFilter').value;
    
    console.log('🔍 篩選訂單 - 狀態:', status, '特殊需求:', notesFilter);
    
    // 重新載入訂單並應用篩選
    loadOrders(1, status, notesFilter);
}

// 載入訂單（支援篩選）
async function loadOrders(page = 1, statusFilter = '', notesFilter = '') {
    console.log('📋 載入訂單列表（優化版）...');
    console.log('📋 狀態篩選:', statusFilter, '特殊需求篩選:', notesFilter);
    const startTime = Date.now();
    
    try {
        const token = localStorage.getItem('adminToken');
        let url = `${API_BASE_URL}/orders/admin/all?page=${page}&limit=20`; // 增加每頁數量
        
        // 添加篩選參數
        if (statusFilter) {
            url += `&status=${statusFilter}`;
            console.log('✅ 已添加狀態篩選參數:', statusFilter);
        } else {
            console.log('ℹ️ 無狀態篩選（顯示所有狀態）');
        }
        
        // 添加排序參數，確保最新的訂單在前面
        url += '&sort=-createdAt';
        
        console.log('📡 訂單請求 URL:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('獲取訂單失敗');

        const data = await response.json();
        
        console.log('📦 API返回訂單數量:', data.data.orders.length);
        console.log('📊 訂單狀態分佈:', data.data.orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {}));
        
        // 客戶端篩選特殊需求
        let filteredOrders = data.data.orders;
        if (notesFilter === 'has_notes') {
            filteredOrders = filteredOrders.filter(order => {
                // 檢查是否有特殊需求
                return order.items.some(item => {
                    // 檢查 specialRequest 字段
                    if (item.specialRequest && item.specialRequest.trim() !== '') {
                        return true;
                    }
                    // 檢查 customizations 字段（只檢查非標準客製化）
                    if (item.customizations && item.customizations.trim() !== '') {
                        const customizations = item.customizations.trim();
                        const standardCustomizations = ['無糖', '微糖', '半糖', '少糖', '全糖', '去冰', '微冰', '少冰', '正常冰', '熱飲'];
                        
                        // 檢查是否有加料或其他特殊需求
                        const hasToppings = customizations.includes('+');
                        const hasOtherSpecialRequests = customizations.split(',').some(part => {
                            const trimmedPart = part.trim();
                            return trimmedPart && 
                                   !standardCustomizations.some(standard => trimmedPart.includes(standard)) &&
                                   !trimmedPart.includes('+');
                        });
                        
                        return hasToppings || hasOtherSpecialRequests;
                    }
                    return false;
                });
            });
        } else if (notesFilter === 'no_notes') {
            filteredOrders = filteredOrders.filter(order => {
                // 檢查是否無特殊需求
                return order.items.every(item => {
                    // 檢查 specialRequest 字段
                    if (item.specialRequest && item.specialRequest.trim() !== '') {
                        return false;
                    }
                    // 檢查 customizations 字段（只檢查非標準客製化）
                    if (item.customizations && item.customizations.trim() !== '') {
                        const customizations = item.customizations.trim();
                        const standardCustomizations = ['無糖', '微糖', '半糖', '少糖', '全糖', '去冰', '微冰', '少冰', '正常冰', '熱飲'];
                        
                        // 檢查是否有加料或其他特殊需求
                        const hasToppings = customizations.includes('+');
                        const hasOtherSpecialRequests = customizations.split(',').some(part => {
                            const trimmedPart = part.trim();
                            return trimmedPart && 
                                   !standardCustomizations.some(standard => trimmedPart.includes(standard)) &&
                                   !trimmedPart.includes('+');
                        });
                        
                        return !(hasToppings || hasOtherSpecialRequests);
                    }
                    return true;
                });
            });
        }
        
        const loadTime = Date.now() - startTime;
        console.log(`⚡ 訂單載入完成，耗時: ${loadTime}ms，共 ${filteredOrders?.length || 0} 筆訂單`);
        
        renderOrdersTable(filteredOrders, data.data.pagination);
        currentPage.orders = page;

    } catch (error) {
        const loadTime = Date.now() - startTime;
        console.error(`❌ 載入訂單失敗 (耗時: ${loadTime}ms):`, error);
        showAlert('載入訂單失敗', 'error');
    }
}



// 更新訂單狀態
async function updateOrderStatus(orderId) {
    const newStatus = prompt('請輸入新狀態 (pending/completed/cancelled):');
    if (!newStatus) return;

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/orders/admin/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('更新訂單狀態失敗');

        showAlert('訂單狀態更新成功', 'success');
        loadOrders(currentPage.orders);

    } catch (error) {
        console.error('更新訂單狀態失敗:', error);
        showAlert('更新訂單狀態失敗', 'error');
    }
}

// 刪除訂單
async function deleteOrder(orderId) {
    if (!confirm('確定要刪除此訂單嗎？')) return;

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/orders/admin/${orderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('刪除訂單失敗');

        showAlert('訂單刪除成功', 'success');
        
        // 清除統計數據緩存
        cache.stats = null;
        cache.lastUpdate.stats = 0;
        
        // 重新載入訂單列表和統計數據
        await Promise.all([
            loadOrders(currentPage.orders),
            loadStats(true) // 強制刷新統計數據
        ]);

    } catch (error) {
        console.error('刪除訂單失敗:', error);
        showAlert('刪除訂單失敗', 'error');
    }
}

// 用戶管理功能
async function loadUsers(page = 1) {
    try {
        // 檢查緩存（僅對第一頁）
        if (page === 1 && cache.users && isCacheValid('users')) {
            console.log('👥 使用緩存的用戶數據');
            renderUsersTable(cache.users.data.users, cache.users.data.pagination);
            return;
        }

        showLoading('usersTable', '載入用戶列表中...');
        
        const token = localStorage.getItem('adminToken');
        const response = await fetchWithRetry(`${API_BASE_URL}/users/admin/all?page=${page}&limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('獲取用戶失敗');

        const data = await response.json();
        
        // 更新緩存（僅對第一頁）
        if (page === 1) {
            cache.users = data;
            cache.lastUpdate.users = Date.now();
        }
        
        renderUsersTable(data.data.users, data.data.pagination);
        currentPage.users = page;

    } catch (error) {
        console.error('載入用戶失敗:', error);
        showAlert('載入用戶失敗', 'error');
    }
}

function renderUsersTable(users, pagination) {
    const tableContainer = document.getElementById('usersTable');
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>用戶名</th>
                    <th>電子郵件</th>
                    <th>電話</th>
                    <th>角色</th>
                    <th>狀態</th>
                    <th>註冊時間</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(user => {
        html += `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${user.role === 'admin' ? '管理員' : '用戶'}</td>
                <td>${user.isActive ? '啟用' : '禁用'}</td>
                <td>${new Date(user.createdAt).toLocaleString()}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="toggleUserStatus('${user._id}', ${user.isActive})">
                        ${user.isActive ? '禁用' : '啟用'}
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    if (pagination) {
        html += renderPagination(pagination, 'users');
    }

    tableContainer.innerHTML = html;
}

// 搜索用戶
function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value;
    // 實現搜索功能
    console.log('搜索用戶:', searchTerm);
}

// 顯示用戶創建模態框
function showUserModal() {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    form.reset();
    modal.style.display = 'block';
}

// 關閉用戶創建模態框
function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

// 切換用戶狀態
async function toggleUserStatus(userId, currentStatus) {
    const action = currentStatus ? '禁用' : '啟用';
    if (!confirm(`確定要${action}此用戶嗎？`)) return;

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/users/admin/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isActive: !currentStatus })
        });

        if (!response.ok) throw new Error('更新用戶狀態失敗');

        showAlert(`用戶${action}成功`, 'success');
        
        // 清除緩存並重新載入
        cache.users = null;
        cache.lastUpdate.users = 0;
        loadUsers(currentPage.users);

    } catch (error) {
        console.error('更新用戶狀態失敗:', error);
        showAlert('更新用戶狀態失敗', 'error');
    }
}

// 新聞管理功能


// 通用功能
function renderPagination(pagination, section) {
    let html = '<div class="pagination">';
    
    // 上一頁
    html += `<button class="page-btn" ${!pagination.hasPrev ? 'disabled' : ''} onclick="changePage('${section}', ${pagination.currentPage - 1})">上一頁</button>`;
    
    // 頁碼
    for (let i = 1; i <= pagination.totalPages; i++) {
        const isActive = i === pagination.currentPage;
        html += `<button class="page-btn ${isActive ? 'active' : ''}" onclick="changePage('${section}', ${i})">${i}</button>`;
    }
    
    // 下一頁
    html += `<button class="page-btn" ${!pagination.hasNext ? 'disabled' : ''} onclick="changePage('${section}', ${pagination.currentPage + 1})">下一頁</button>`;
    
    html += '</div>';
    return html;
}

function changePage(section, page) {
    switch(section) {
        case 'products':
            loadProducts(page);
            break;
        case 'orders':
            loadOrders(page);
            break;
        case 'users':
            loadUsers(page);
            break;
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': '待確認',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.admin-container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// 表單提交處理
let currentEditingProductId = null; // 追蹤當前編輯的產品ID

// 點擊模態框外部關閉
window.onclick = function(event) {
    const productModal = document.getElementById('productModal');
    const userModal = document.getElementById('userModal');
    
    if (event.target === productModal) {
        closeProductModal();
    }
    if (event.target === userModal) {
        closeUserModal();
    }
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 後台頁面初始化開始...');
    
    try {
        // 檢查認證
        await checkAuth();
        
        // 載入統計數據（首頁顯示）
        await loadStats();
        
        // 載入產品數據（產品管理頁面默認顯示）
        await loadProducts();
        
        // 啟動自動刷新
        startAutoRefresh();
        console.log('🔄 已啟動自動刷新（每60秒檢查新訂單）');
        
        // 建立 SSE 連接
        connectSSE();
        console.log('🔗 已建立 SSE 連接');
        
        // 請求桌面通知權限
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        
        // 產品表單提交處理
        document.getElementById('productForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('productName').value,
                description: document.getElementById('productDescription').value,
                price: parseFloat(document.getElementById('productPrice').value),
                category: document.getElementById('productCategory').value,
                image: document.getElementById('productImage').value,
                stock: parseInt(document.getElementById('productStock').value),
                featured: document.getElementById('productFeatured').checked
            };

            try {
                const token = localStorage.getItem('adminToken');
                
                // 判斷是新增還是編輯
                const isEditing = currentEditingProductId !== null;
                const url = isEditing ? `${API_BASE_URL}/products/${currentEditingProductId}` : `${API_BASE_URL}/products`;
                const method = isEditing ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('API 錯誤回應:', errorData);
                    throw new Error(`保存產品失敗: ${errorData.message || response.statusText}`);
                }

                showAlert(isEditing ? '產品更新成功' : '產品保存成功', 'success');
                closeProductModal();
                loadProducts(currentPage.products);
                
                // 重置編輯狀態
                currentEditingProductId = null;

            } catch (error) {
                console.error('保存產品失敗:', error);
                showAlert(error.message || '保存產品失敗', 'error');
            }
        });
        
        // 用戶表單提交處理
        document.getElementById('userForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // 獲取表單數據
            const username = document.getElementById('userName').value.trim();
            const email = document.getElementById('userEmail').value.trim();
            const password = document.getElementById('userPassword').value;
            const phone = document.getElementById('userPhone').value.trim();
            const role = document.getElementById('userRole').value;
            
            // 構建表單數據（只包含非空字段）
            const formData = {
                username: username,
                email: email,
                password: password,
                role: role
            };
            
            // 只在手機號碼不為空時才添加到 formData
            if (phone && phone.length > 0) {
                formData.phone = phone;
            }
            
            // 驗證用戶名格式
            const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;
            if (!usernamePattern.test(formData.username)) {
                showAlert('用戶名格式不正確：只能包含字母、數字和下劃線，長度3-20個字符', 'error');
                return;
            }
            
            // 驗證密碼格式
            const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
            if (!passwordPattern.test(formData.password)) {
                showAlert('密碼格式不正確：至少6個字符，必須包含大寫字母、小寫字母和數字', 'error');
                return;
            }
            
            // 驗證手機號碼（如果填寫）
            if (formData.phone) {
                const phonePattern = /^09\d{8}$/;
                if (!phonePattern.test(formData.phone)) {
                    showAlert('手機號碼格式不正確：台灣手機號碼格式為09xxxxxxxx', 'error');
                    return;
                }
            }

            try {
                const token = localStorage.getItem('adminToken');
                
                console.log('🚀 創建用戶請求數據:', { ...formData, password: '***' });
                
                const response = await fetch(`${API_BASE_URL}/users/admin/create`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();
                
                if (!response.ok) {
                    // 處理驗證錯誤
                    if (data.errors && Array.isArray(data.errors)) {
                        const errorMessages = data.errors.map(err => err.msg).join(', ');
                        throw new Error(errorMessages);
                    }
                    throw new Error(data.message || '創建用戶失敗');
                }

                console.log('✅ 用戶創建成功:', data);
                showAlert('用戶創建成功！數據已保存到數據庫', 'success');
                closeUserModal();
                
                // 清除緩存
                cache.users = null;
                cache.lastUpdate.users = 0;
                cache.stats = null;
                cache.lastUpdate.stats = 0;
                
                // 重新載入用戶列表和統計數據
                await Promise.all([
                    loadUsers(1),
                    loadStats(true)
                ]);

            } catch (error) {
                console.error('❌ 創建用戶失敗:', error);
                showAlert(error.message || '創建用戶失敗，請檢查輸入信息', 'error');
            }
        });
        
        console.log('✅ 後台頁面初始化完成');
    } catch (error) {
        console.error('❌ 後台頁面初始化失敗:', error);
    }
});

// 頁面卸載時停止自動刷新
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
}); 