// 管理員後台 JavaScript
// 簡單而安全的 API 配置
const API_BASE_URL = window.location.hostname.includes('localhost') 
    ? `http://localhost:${window.location.port || '3001'}/api`
    : '/api';

console.log('🔧 管理後台已加載');
console.log('📍 當前環境:', window.location.hostname);
console.log('🔗 API地址:', API_BASE_URL);
console.log('🧪 特殊需求邏輯測試: 如果您看到這條消息，說明 admin.js 已正確加載');

// 自動刷新最新訂單
let autoRefreshInterval = null;

function startAutoRefresh() {
    // 每30秒自動檢查新訂單
    autoRefreshInterval = setInterval(async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) return;
            
            console.log('🔄 自動檢查新訂單...');
            const response = await fetch(`${API_BASE_URL}/orders/recent`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data?.length > 0) {
                    console.log(`✅ 發現 ${data.data.length} 個最新訂單`);
                    // 如果當前在訂單頁面，自動刷新
                    const ordersSection = document.getElementById('orders-section');
                    if (ordersSection && ordersSection.classList.contains('active')) {
                        console.log('🔄 自動刷新訂單列表...');
                        loadOrders(1, '', '');
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ 自動刷新失敗:', error.message);
        }
    }, 30000); // 30秒間隔
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
            console.log('🕐 Token 已過期');
            return false;
        }
        
        console.log('✅ Token 有效，過期時間:', new Date(payload.exp * 1000));
        return true;
    } catch (error) {
        console.error('❌ Token 解析錯誤:', error);
        return false;
    }
}

// 請求重試機制
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            
            if (response.status === 429) {
                // 如果是429錯誤，等待後重試
                const retryAfter = response.headers.get('Retry-After') || 5;
                console.log(`請求過於頻繁，等待 ${retryAfter} 秒後重試...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue;
            }
            
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            console.log(`請求失敗，${i + 1}/${maxRetries} 次重試...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

let currentUser = null;
let currentPage = {
    products: 1,
    orders: 1,
    users: 1,
    news: 1
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
        
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
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

    // 載入對應數據
    switch(sectionName) {
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders(1, '', '');
            break;
        case 'users':
            loadUsers();
            break;
        case 'news':
            loadNews();
            break;
    }
}

// 統計數據緩存
let statsCache = null;
let statsCacheTime = 0;
const STATS_CACHE_DURATION = 30 * 1000; // 30秒緩存

// 載入統計數據
async function loadStats(forceRefresh = false) {
    console.log('📊 開始載入統計數據...');
    console.log('🔗 使用API地址:', API_BASE_URL);
    
    try {
        // 檢查緩存（除非強制刷新）
        const now = Date.now();
        if (!forceRefresh && statsCache && (now - statsCacheTime) < STATS_CACHE_DURATION) {
            console.log('📋 使用緩存的統計數據');
            updateStatsDisplay(statsCache);
            return;
        }

        const token = localStorage.getItem('adminToken');
        console.log('🎫 Token狀態:', token ? '已找到' : '未找到');
        
        if (!token) {
            console.error('❌ 沒有token，無法載入統計數據');
            return;
        }
        
        console.log('📡 發送統計數據請求...');
        
        // ⚡ 優化並行請求 - 減少同時請求數量
        console.log('📡 載入核心統計數據...');
        
        const [productsResponse, ordersStatsResponse, usersResponse] = await Promise.all([
            fetchWithRetry(`${API_BASE_URL}/products/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetchWithRetry(`${API_BASE_URL}/orders/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetchWithRetry(`${API_BASE_URL}/users/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        // 單獨載入最新訂單（非阻塞）
        let ordersResponse = null;
        try {
            console.log('📡 載入最新訂單...');
            ordersResponse = await fetchWithRetry(`${API_BASE_URL}/orders/admin/all?limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (ordersError) {
            console.warn('⚠️ 訂單載入失敗，將稍後重試:', ordersError.message);
        }

        console.log('📥 統計數據回應狀態:', {
            products: productsResponse?.status,
            ordersStats: ordersStatsResponse?.status,
            orders: ordersResponse?.status,
            users: usersResponse?.status
        });

        const [productsData, ordersStatsData, ordersData, usersData] = await Promise.all([
            productsResponse.json(),
            ordersStatsResponse.json(),
            ordersResponse.json(),
            usersResponse.json()
        ]);

        console.log('📊 後台統計數據:', {
            productsData,
            ordersStatsData,
            ordersData,
            usersData
        });

        // 緩存結果
        statsCache = { productsData, ordersStatsData, ordersData, usersData };
        statsCacheTime = now;

        updateStatsDisplay(statsCache);

    } catch (error) {
        console.error('載入統計數據失敗:', error);
    }
}

// 更新統計顯示
function updateStatsDisplay(cache) {
    const { productsData, ordersStatsData, ordersData, usersData } = cache;
    
    document.getElementById('totalProducts').textContent = productsData.data?.totalProducts || 0;
    document.getElementById('totalOrders').textContent = ordersStatsData.data?.totalOrders || 0;
    document.getElementById('totalUsers').textContent = usersData.data?.totalUsers || 0;
    
    // 計算待處理訂單（使用統計數據）
    const pendingOrders = (ordersStatsData.data?.statusCounts?.pending || 0) + 
                         (ordersStatsData.data?.statusCounts?.confirmed || 0);
    document.getElementById('pendingOrders').textContent = pendingOrders;
    
    // 使用統計數據中的特殊需求訂單數量
    const ordersWithNotes = ordersStatsData.data?.ordersWithNotes || 0;
    
    // 如果有特殊需求統計元素存在，則更新它
    const notesStatsElement = document.getElementById('ordersWithNotes');
    if (notesStatsElement) {
        notesStatsElement.textContent = ordersWithNotes;
    }
    
    // 添加更多統計信息（如果HTML中有對應元素）
    const todayOrdersElement = document.getElementById('todayOrders');
    if (todayOrdersElement) {
        todayOrdersElement.textContent = ordersStatsData.data?.todayOrders || 0;
    }
    
    const thisMonthOrdersElement = document.getElementById('thisMonthOrders');
    if (thisMonthOrdersElement) {
        thisMonthOrdersElement.textContent = ordersStatsData.data?.thisMonthOrders || 0;
    }
    
    const totalRevenueElement = document.getElementById('totalRevenue');
    if (totalRevenueElement) {
        totalRevenueElement.textContent = `NT$ ${(ordersStatsData.data?.totalRevenue || 0).toLocaleString()}`;
    }
}

// 產品管理功能
async function loadProducts(page = 1) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/products/admin/all?page=${page}&limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('獲取產品失敗');

        const data = await response.json();
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
            <tr>
                <td><img src="${product.image}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>NT$ ${product.price}</td>
                <td>${product.stock}</td>
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
async function loadOrders(page = 1) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/orders/admin/all?page=${page}&limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('獲取訂單失敗');

        const data = await response.json();
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
                    <th>付款狀態</th>
                    <th>創建時間</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    orders.forEach(order => {
        console.log('🟢 後台渲染桌號:', order.tableNumber);
        const itemsText = order.items.map(item => `${item.name} x${item.quantity}`).join(', ');
        const statusClass = `status-${order.status}`;
        
        html += `
            <tr>
                <td>${order._id}</td>
                <td>${order.orderType === 'dine-in' ? 
                    `桌號: ${order.tableNumber || 'N/A'}` : 
                    (order.user?.username || 'N/A')}</td>
                <td>${itemsText}</td>
                <td>NT$ ${order.totalAmount}</td>
                <td style="max-width: 200px; word-wrap: break-word; line-height: 1.3; max-height: 2.6em; overflow: hidden;">
                    ${(() => {
                        console.log('🔍 處理訂單特殊需求:', order._id);
                        console.log('🔍 訂單項目:', order.items);
                        
                        // 首先檢查是否有來自 specialRequest 字段的特殊需求
                        const specialRequestsFromItems = order.items
                            .filter(item => item.specialRequest && item.specialRequest.trim() !== '')
                            .map(item => `${item.name}: ${item.specialRequest.trim()}`)
                            .join(', ');
                        
                        console.log('🔍 找到的特殊需求:', specialRequestsFromItems);
                        
                        if (specialRequestsFromItems) {
                            return `<span style="color: #e74c3c; font-weight: 500; font-size: 14px; display: block; word-break: break-all; white-space: normal;">${specialRequestsFromItems.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
                        }
                        
                        // 如果沒有 specialRequest，則檢查 customizations 字段中是否有真正的特殊需求
                        const customizationsWithSpecialRequests = order.items
                            .filter(item => {
                                if (!item.customizations || item.customizations.trim() === '') return false;
                                
                                // 檢查是否包含真正的特殊需求（不是標準客製化）
                                const customizations = item.customizations.trim();
                                const standardCustomizations = ['無糖', '微糖', '半糖', '少糖', '全糖', '去冰', '微冰', '少冰', '正常冰', '熱飲'];
                                
                                // 檢查是否有加料（+號）
                                const hasToppings = customizations.includes('+');
                                
                                // 檢查是否有其他特殊需求（非標準客製化且非加料）
                                const hasOtherSpecialRequests = customizations.split(',').some(part => {
                                    const trimmedPart = part.trim();
                                    return trimmedPart && 
                                           !standardCustomizations.some(standard => trimmedPart.includes(standard)) &&
                                           !trimmedPart.includes('+');
                                });
                                
                                return hasToppings || hasOtherSpecialRequests;
                            })
                            .map(item => `${item.name}: ${item.customizations.trim()}`)
                            .join(', ');
                        
                        console.log('🔍 找到的客制化特殊需求:', customizationsWithSpecialRequests);
                        
                        if (customizationsWithSpecialRequests) {
                            return `<span style="color: #e74c3c; font-weight: 500; font-size: 14px; display: block; word-break: break-all; white-space: normal;">${customizationsWithSpecialRequests.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
                        }
                        
                        // 如果沒有特殊需求，顯示"無"
                        return '<span style="color: #95a5a6; font-size: 14px;">無</span>';
                    })()}
                </td>
                <td><span class="status-badge ${statusClass}">${getStatusText(order.status)}</span></td>
                <td>${getPaymentStatusText(order.paymentStatus)}</td>
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
    
    // 重新載入訂單並應用篩選
    loadOrders(1, status, notesFilter);
}

// 載入訂單（支援篩選）
async function loadOrders(page = 1, statusFilter = '', notesFilter = '') {
    console.log('📋 載入訂單列表（優化版）...');
    const startTime = Date.now();
    
    try {
        const token = localStorage.getItem('adminToken');
        let url = `${API_BASE_URL}/orders/admin/all?page=${page}&limit=20`; // 增加每頁數量
        
        // 添加篩選參數
        if (statusFilter) {
            url += `&status=${statusFilter}`;
        }
        
        // 添加排序參數，確保最新的訂單在前面
        url += '&sort=-createdAt';
        
        console.log('📡 訂單請求 URL:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('獲取訂單失敗');

        const data = await response.json();
        
        // 客戶端篩選特殊需求
        let filteredOrders = data.data.orders;
        if (notesFilter === 'has_notes') {
            filteredOrders = filteredOrders.filter(order => 
                order.notes && order.notes !== '前台結帳'
            );
        } else if (notesFilter === 'no_notes') {
            filteredOrders = filteredOrders.filter(order => 
                !order.notes || order.notes === '前台結帳'
            );
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
    const newStatus = prompt('請輸入新狀態 (pending/confirmed/preparing/ready/completed/cancelled):');
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
        statsCache = null;
        statsCacheTime = 0;
        
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
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/users/admin/all?page=${page}&limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('獲取用戶失敗');

        const data = await response.json();
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
        loadUsers(currentPage.users);

    } catch (error) {
        console.error('更新用戶狀態失敗:', error);
        showAlert('更新用戶狀態失敗', 'error');
    }
}

// 新聞管理功能
async function loadNews(page = 1) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/news?page=${page}&limit=10`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('獲取新聞失敗');

        const data = await response.json();
        renderNewsTable(data.data.news, data.data.pagination);
        currentPage.news = page;

    } catch (error) {
        console.error('載入新聞失敗:', error);
        showAlert('載入新聞失敗', 'error');
    }
}

function renderNewsTable(news, pagination) {
    const tableContainer = document.getElementById('newsTable');
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>標題</th>
                    <th>內容</th>
                    <th>特色</th>
                    <th>發布日期</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    news.forEach(item => {
        const content = item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content;
        
        html += `
            <tr>
                <td>${item.title}</td>
                <td>${content}</td>
                <td>${item.featured ? '是' : '否'}</td>
                <td>${item.date}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="editNews('${item.id}')">編輯</button>
                    <button class="action-btn delete-btn" onclick="deleteNews('${item.id}')">刪除</button>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    if (pagination) {
        html += renderPagination(pagination, 'news');
    }

    tableContainer.innerHTML = html;
}

// 顯示新聞編輯模態框
function showNewsModal(newsId = null) {
    const modal = document.getElementById('newsModal');
    const title = document.getElementById('newsModalTitle');
    const form = document.getElementById('newsForm');

    if (newsId) {
        title.textContent = '編輯新聞';
        // 載入新聞數據
        loadNewsData(newsId);
    } else {
        title.textContent = '新增新聞';
        form.reset();
    }

    modal.style.display = 'block';
}

// 關閉新聞編輯模態框
function closeNewsModal() {
    document.getElementById('newsModal').style.display = 'none';
}

// 載入新聞數據
async function loadNewsData(newsId) {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/news/${newsId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('獲取新聞數據失敗');

        const data = await response.json();
        const news = data.data.news;

        // 填充表單
        document.getElementById('newsTitle').value = news.title;
        document.getElementById('newsContent').value = news.content;
        document.getElementById('newsImage').value = news.image;
        document.getElementById('newsFeatured').checked = news.featured;

    } catch (error) {
        console.error('載入新聞數據失敗:', error);
        showAlert('載入新聞數據失敗', 'error');
    }
}

// 編輯新聞
function editNews(newsId) {
    showNewsModal(newsId);
}

// 刪除新聞
async function deleteNews(newsId) {
    if (!confirm('確定要刪除此新聞嗎？')) return;

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/news/${newsId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('刪除新聞失敗');

        showAlert('新聞刪除成功', 'success');
        loadNews(currentPage.news);

    } catch (error) {
        console.error('刪除新聞失敗:', error);
        showAlert('刪除新聞失敗', 'error');
    }
}

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
        case 'news':
            loadNews(page);
            break;
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': '待確認',
        'confirmed': '已確認',
        'preparing': '製作中',
        'ready': '待取餐',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

function getPaymentStatusText(status) {
    const statusMap = {
        'pending': '待付款',
        'paid': '已付款',
        'failed': '付款失敗',
        'refunded': '已退款'
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

document.getElementById('newsForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('newsTitle').value,
        content: document.getElementById('newsContent').value,
        image: document.getElementById('newsImage').value,
        featured: document.getElementById('newsFeatured').checked
    };

    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/news`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('保存新聞失敗');

        showAlert('新聞保存成功', 'success');
        closeNewsModal();
        loadNews(currentPage.news);

    } catch (error) {
        console.error('保存新聞失敗:', error);
        showAlert('保存新聞失敗', 'error');
    }
});

// 點擊模態框外部關閉
window.onclick = function(event) {
    const productModal = document.getElementById('productModal');
    const newsModal = document.getElementById('newsModal');
    
    if (event.target === productModal) {
        closeProductModal();
    }
    if (event.target === newsModal) {
        closeNewsModal();
    }
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 後台頁面初始化開始...');
    
    try {
        // 檢查認證
        await checkAuth();
        
        // 載入統計數據
        await loadStats();
        
        // 載入產品列表
        await loadProducts();
        
        // 啟動自動刷新
        startAutoRefresh();
        console.log('🔄 已啟動自動刷新（每30秒檢查新訂單）');
        
        console.log('✅ 後台頁面初始化完成');
    } catch (error) {
        console.error('❌ 後台頁面初始化失敗:', error);
    }
});

// 頁面卸載時停止自動刷新
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
}); 