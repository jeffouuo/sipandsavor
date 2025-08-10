// 全局變量
window.cart = JSON.parse(localStorage.getItem('cart')) || [];
let swiper = null;

// 確保購物車數據正確載入
if (!Array.isArray(window.cart)) {
    window.cart = [];
    localStorage.setItem('cart', JSON.stringify(window.cart));
}

// 清理無效的購物車數據
window.cart = window.cart.filter(item => 
    item && 
    typeof item.name === 'string' && 
    item.name.trim() !== '' && 
    typeof item.price === 'number' && 
    item.price > 0 && 
    typeof item.quantity === 'number' && 
    item.quantity > 0
);

// 如果清理後購物車為空，更新localStorage
if (window.cart.length === 0) {
    localStorage.removeItem('cart');
} else {
    localStorage.setItem('cart', JSON.stringify(window.cart));
}

// DOM 加載完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 飲茶趣網站初始化開始');
    
    // 初始化所有功能
    initHamburgerMenu();
    initSwiper();
    initImageLoading();
    initCart();
    initAdminEntry();
    initProductInteraction();
    
    console.log('✅ 網站初始化完成');
});

// 漢堡菜單初始化
const initHamburgerMenu = () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (!hamburgerBtn || !mobileMenu) {
        console.error('❌ 未找到漢堡按鈕或菜單元素');
        return;
    }
    
    const toggleMenu = () => {
        mobileMenu.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        
        // 添加動畫效果
        const menuItems = mobileMenu.querySelectorAll('li');
        menuItems.forEach((item, index) => {
            if (mobileMenu.classList.contains('active')) {
                item.style.transitionDelay = `${index * 0.1}s`;
            } else {
                item.style.transitionDelay = '0s';
            }
        });
    };
    
    hamburgerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
    });
    
    // 點擊菜單連結時關閉菜單
    const menuLinks = mobileMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        });
    });
    
    // 點擊外部關閉菜單
    document.addEventListener('click', (e) => {
        if (mobileMenu.classList.contains('active') && 
            !mobileMenu.contains(e.target) && 
            !hamburgerBtn.contains(e.target)) {
            mobileMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });
    
    // ESC鍵關閉菜單
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });
};

// Swiper 輪播初始化
const initSwiper = () => {
    const swiperContainer = document.querySelector('.swiper-container');
    if (!swiperContainer) {
        console.log('⚠️ 未找到輪播容器，跳過輪播初始化');
        return;
    }
    
    try {
        swiper = new Swiper('.swiper-container', {
            slidesPerView: 'auto',
            spaceBetween: 20,
            centeredSlides: true,
            loop: false, // 改為false，因為滑塊數量不足
            autoplay: {
                delay: 4000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            breakpoints: {
                320: {
                    slidesPerView: 1.2,
                    spaceBetween: 10,
                },
                480: {
                    slidesPerView: 2.2,
                    spaceBetween: 15,
                },
                768: {
                    slidesPerView: 3.2,
                    spaceBetween: 20,
                },
                1024: {
                    slidesPerView: 4,
                    spaceBetween: 25,
                },
                1200: {
                    slidesPerView: 4,
                    spaceBetween: 30,
                }
            },
            on: {
                init: function() {
                    console.log('✅ Swiper 輪播初始化成功');
                },
                slideChange: function() {
                    // 可以添加滑動時的額外效果
                }
            }
        });
    } catch (error) {
        console.error('❌ Swiper 初始化失敗:', error);
    }
};

// 圖片載入優化
const initImageLoading = () => {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if (images.length === 0) {
        console.log('⚠️ 未找到載入圖片');
        return;
    }
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                
                // 確保圖片可見
                img.style.opacity = '1';
                img.style.transform = 'scale(1)';
                img.classList.add('loaded');
                
                // 避免重複綁定事件
                if (!img.hasAttribute('data-loaded')) {
                    img.setAttribute('data-loaded', 'true');
                    img.onload = () => {
                        img.style.opacity = '1';
                        img.style.transform = 'scale(1)';
                        img.classList.add('loaded');
                    };
                }
                
                img.onerror = () => {
                    img.classList.add('error');
                    img.alt = '圖片載入失敗';
                    console.warn('⚠️ 圖片載入失敗:', img.src);
                };
                
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.1
    });

    images.forEach(img => {
        // 立即顯示已載入的圖片
        if (img.complete) {
            img.style.opacity = '1';
            img.style.transform = 'scale(1)';
            img.classList.add('loaded');
        }
        imageObserver.observe(img);
    });
    
    console.log(`✅ 圖片載入初始化完成，共 ${images.length} 張圖片`);
    
    // 備用方案：確保所有圖片在2秒後可見
    setTimeout(() => {
        images.forEach(img => {
            if (!img.classList.contains('loaded')) {
                img.style.opacity = '1';
                img.style.transform = 'scale(1)';
                img.classList.add('loaded');
            }
        });
    }, 2000);
};

// 購物車功能初始化
const initCart = () => {
    const cartIcon = document.getElementById('cartIcon');
    const cartSidebar = document.getElementById('cartSidebar');
    const closeCart = document.getElementById('closeCart');
    
    if (!cartIcon || !cartSidebar || !closeCart) {
        console.error('❌ 購物車元素未找到');
        return;
    }
    
    // 確保購物車側邊欄初始狀態為隱藏
    cartSidebar.classList.remove('active');
    cartSidebar.style.right = '-100%';
    cartSidebar.style.transform = 'translateX(100%)';
    
    // 購物車圖標點擊事件
    cartIcon.addEventListener('click', () => {
        cartSidebar.classList.add('active');
        cartSidebar.style.right = '0';
        cartSidebar.style.transform = 'translateX(0)';
        document.body.style.overflow = 'hidden';
    });
    
    // 關閉購物車
    closeCart.addEventListener('click', () => {
        closeCartSidebar();
    });
    
    // 點擊外部關閉購物車
    document.addEventListener('click', (e) => {
        if (cartSidebar.classList.contains('active') && 
            !cartSidebar.contains(e.target) && 
            !cartIcon.contains(e.target)) {
            closeCartSidebar();
        }
    });
    
    // 更新購物車顯示
    updateCartDisplay();
    
    // 確保購物車數據正確
    if (window.cart.length > 0) {
        console.log('🔍 購物車初始化檢查:', window.cart);
        // 強制重新計算並顯示
        setTimeout(() => {
            updateCartDisplay();
        }, 100);
    }
    
    console.log('✅ 購物車功能初始化完成');
};

// 關閉購物車側邊欄
// 關閉購物車側邊欄
window.closeCartSidebar = () => {
    console.log('🚪 closeCartSidebar 被調用');
    console.trace('調用堆疊:'); // 顯示調用堆疊
    
    const cartSidebar = document.getElementById('cartSidebar');
    if (cartSidebar) {
        cartSidebar.classList.remove('active');
        cartSidebar.style.right = '-100%';
        cartSidebar.style.transform = 'translateX(100%)';
        document.body.style.overflow = '';
        console.log('✅ 購物車側邊欄已關閉');
    } else {
        console.error('❌ 找不到購物車側邊欄元素');
    }
};

// 更新購物車顯示
// 更新購物車顯示
window.updateCartDisplay = () => {
            console.log('更新購物車顯示，購物車內容:', window.cart);
    
    const cartCount = document.querySelector('.cart-count');
    const cartItems = document.querySelector('.cart-items');
    const totalAmount = document.querySelector('.total-amount');
    
    console.log('找到的元素:', { cartCount, cartItems, totalAmount });
    
    if (cartCount) {
        const totalItems = window.cart.reduce((sum, item) => {
            const quantity = parseInt(item.quantity) || 0;
            return sum + quantity;
        }, 0);
        cartCount.textContent = totalItems;
        console.log('更新購物車數量:', totalItems);
        
        // 添加動畫效果
        if (totalItems > 0) {
            cartCount.classList.add('updated');
            setTimeout(() => cartCount.classList.remove('updated'), 300);
        }
    }
    
    if (cartItems) {
        renderCartItems();
    }
    
    if (totalAmount) {
        const total = window.cart.reduce((sum, item) => {
            const price = parseFloat(item.price) || 0;
            const quantity = parseInt(item.quantity) || 0;
            return sum + (price * quantity);
        }, 0);
        totalAmount.textContent = `NT$ ${total.toLocaleString()}`;
        console.log('更新總金額:', total, '購物車項目:', window.cart);
    }
};

// 渲染購物車項目
// 渲染購物車項目
window.renderCartItems = () => {
    const cartItems = document.querySelector('.cart-items');
    if (!cartItems) {
        console.log('未找到購物車項目容器');
        return;
    }
    
            console.log('渲染購物車項目，項目數量:', window.cart.length);
        
        if (window.cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart">購物車是空的</div>';
        console.log('購物車為空，顯示空購物車訊息');
        return;
    }
    
            const cartHTML = window.cart.map((item, index) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 0;
        const name = String(item.name || '未知商品');
        
                        // 從 originalItem 中提取 customizations
                let customizations = item.customizations || '';
                if (!customizations && item.originalItem && item.originalItem.customizations) {
                    customizations = item.originalItem.customizations;
                }
                
                // 確保 customizations 不是 undefined
                if (customizations === undefined || customizations === null) {
                    customizations = '';
                }
                
                console.log(`渲染購物車項目 ${index}:`, { name, price, quantity, customizations, originalItem: item });
        // 構建完整的商品顯示名稱
        let displayName = name;
        if (customizations && customizations.trim()) {
            displayName += ` (${customizations.trim()})`;
        }
        
        // 如果有訂單號碼，添加到顯示名稱中
        if (item.orderNumber && item.orderNumber.trim()) {
            const orderNumberLast4 = item.orderNumber.slice(-4);
            displayName += ` [${orderNumberLast4}]`;
        }
        
        return `
            <div class="cart-item" data-index="${index}">
                <div class="cart-item-info">
                    <div class="cart-item-title">${displayName}</div>
                    <div class="cart-item-price">NT$ ${price}</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="event.stopPropagation(); updateQuantity(${index}, -1)">-</button>
                    <span>${quantity}</span>
                    <button class="quantity-btn" onclick="event.stopPropagation(); updateQuantity(${index}, 1)">+</button>
                </div>
            </div>
        `;
    }).join('');
    
    cartItems.innerHTML = cartHTML;
    console.log('購物車項目已渲染');
};

// 更新商品數量
window.updateQuantity = (index, change) => {
    console.log('🔄 updateQuantity 被調用:', { index, change, cartLength: window.cart.length });
    
    if (window.cart[index]) {
        // 確保數量是數字類型
        const currentQuantity = parseInt(window.cart[index].quantity) || 0;
        const newQuantity = currentQuantity + change;
        
        console.log('📊 數量更新:', { currentQuantity, newQuantity });
        
        if (newQuantity <= 0) {
            // 移除商品
            console.log('🗑️ 移除商品:', window.cart[index].name);
            window.cart.splice(index, 1);
            console.log('📦 移除後購物車長度:', window.cart.length);
            
            // 只有在購物車完全為空時才關閉側邊欄
            if (window.cart.length === 0) {
                console.log('🚪 購物車為空，關閉側邊欄');
                closeCartSidebar();
            } else {
                console.log('📦 購物車還有商品，保持開啟');
            }
        } else {
            window.cart[index].quantity = newQuantity;
            console.log('✅ 更新商品數量:', newQuantity);
        }
        
        localStorage.setItem('cart', JSON.stringify(window.cart));
        updateCartDisplay();
    } else {
        console.error('❌ 找不到購物車項目:', index);
    }
};

// 添加商品到購物車
// 全局購物車函數
window.addToCart = (name, price, customizations = '', specialRequest = '', showNotificationFlag = true, orderNumber = '') => {
    console.log('🔍 全局購物車 - 添加商品:', { name, price, customizations, showNotificationFlag });
    console.log('🔍 參數類型:', { 
        nameType: typeof name, 
        priceType: typeof price, 
        customizationsType: typeof customizations 
    });
    
    // 驗證輸入參數
    if (!name || String(name).trim() === '') {
        console.error('❌ 商品名稱不能為空');
        showNotification('商品名稱不能為空', 'error');
        return;
    }
    
    // 確保價格是數字
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
        console.error('❌ 商品價格無效:', price, '類型:', typeof price);
        showNotification('商品價格無效', 'error');
        return;
    }
    
    // 確保商品名稱是字符串
    const itemName = String(name || '未知商品');
    
            const existingItem = window.cart.find(item => 
        item.name === itemName && item.customizations === customizations
    );
    
    if (existingItem) {
        const currentQuantity = parseInt(existingItem.quantity) || 0;
        existingItem.quantity = currentQuantity + 1;
        console.log('更新現有商品數量:', existingItem.quantity);
    } else {
        window.cart.push({
            name: itemName,
            price: parseFloat(price) || 0,
            quantity: 1,
            customizations: customizations,
            specialRequest: specialRequest && specialRequest.trim() ? specialRequest.trim() : '',
            orderNumber: orderNumber || ''
        });
        console.log('添加新商品到購物車:', itemName);
        console.log('🔍 商品客制化信息:', customizations);
    }
    
    localStorage.setItem('cart', JSON.stringify(window.cart));
    console.log('購物車內容:', window.cart);
    
    // 驗證購物車狀態
            const totalItems = window.cart.reduce((sum, item) => {
        const quantity = parseInt(item.quantity) || 0;
        return sum + quantity;
    }, 0);
    
    console.log('購物車總項目數:', totalItems);
    
    if (totalItems === 0) {
        console.warn('⚠️ 購物車為空');
    }
    
    updateCartDisplay();
    
    // 只在需要時顯示通知
    if (showNotificationFlag) {
        showNotification(`${name} 已加入購物車`);
    }
    
    // 購物車圖標動畫
    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon) {
        cartIcon.style.animation = 'cartCountPulse 0.3s ease';
        setTimeout(() => {
            cartIcon.style.animation = '';
        }, 300);
    }
};

// 產品互動功能
const initProductInteraction = () => {
    const productImages = document.querySelectorAll('.product-image');
    
    productImages.forEach(img => {
        img.addEventListener('click', () => {
            const name = img.dataset.name;
            const price = parseFloat(img.dataset.price);
            
            // 顯示產品詳情或直接加入購物車
            showProductDetailModal(name, price);
        });
    });
};

// 產品詳情模態框
const showProductDetailModal = (name, price) => {
    // 創建模態框
    const modal = document.createElement('div');
    modal.className = 'product-modal';
    modal.innerHTML = `
        <div class="product-modal-content">
            <div class="product-modal-header">
                <h3>${name}</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="product-modal-body">
                <p>價格: NT$ ${price}</p>
                <div class="product-options">
                    <label>
                        <input type="radio" name="size" value="normal" checked>
                        正常杯
                    </label>
                    <label>
                        <input type="radio" name="size" value="large">
                        大杯 (+NT$ 10)
                    </label>
                </div>
                <div class="product-options">
                    <label>
                        <input type="radio" name="ice" value="normal" checked>
                        正常冰
                    </label>
                    <label>
                        <input type="radio" name="ice" value="less">
                        少冰
                    </label>
                    <label>
                        <input type="radio" name="ice" value="no">
                        去冰
                    </label>
                </div>
                <div class="product-options">
                    <label>
                        <input type="radio" name="sugar" value="normal" checked>
                        正常糖
                    </label>
                    <label>
                        <input type="radio" name="sugar" value="less">
                        少糖
                    </label>
                    <label>
                        <input type="radio" name="sugar" value="no">
                        無糖
                    </label>
                </label>
            </div>
            <div class="product-modal-footer">
                <button class="add-to-cart-modal">加入購物車</button>
                <button class="cancel-modal">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 關閉模態框
    const closeModal = () => {
        modal.remove();
    };
    
    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    modal.querySelector('.cancel-modal').addEventListener('click', closeModal);
    
    // 加入購物車
    modal.querySelector('.add-to-cart-modal').addEventListener('click', () => {
        const size = modal.querySelector('input[name="size"]:checked').value;
        const ice = modal.querySelector('input[name="ice"]:checked').value;
        const sugar = modal.querySelector('input[name="sugar"]:checked').value;
        
        let finalPrice = price;
        if (size === 'large') finalPrice += 10;
        
        const customizations = [];
        if (size !== 'normal') customizations.push(size === 'large' ? '大杯' : '正常杯');
        if (ice !== 'normal') customizations.push(ice === 'less' ? '少冰' : '去冰');
        if (sugar !== 'normal') customizations.push(sugar === 'less' ? '少糖' : '無糖');
        
        addToCart(name, finalPrice, customizations.join(', '), false);
        showNotification(`${name} 已加入購物車`);
        closeModal();
    });
    
    // 點擊外部關閉
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
};

// 管理員入口初始化
const initAdminEntry = () => {
    const adminEntryTrigger = document.getElementById('adminEntryTrigger');
    const adminEntryModal = document.getElementById('adminEntryModal');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const adminCancelBtn = document.getElementById('adminCancelBtn');
    
    if (!adminEntryTrigger || !adminEntryModal) {
        console.log('⚠️ 管理員入口元素未找到');
        return;
    }
    
    let clickCount = 0;
    let clickTimer = null;
    
    adminEntryTrigger.addEventListener('click', () => {
        clickCount++;
        
        if (clickCount === 1) {
            clickTimer = setTimeout(() => {
                clickCount = 0;
            }, 500);
        } else if (clickCount === 2) {
            clearTimeout(clickTimer);
            clickCount = 0;
            adminEntryModal.style.display = 'flex';
        }
    });
    
    adminLoginBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
    
    adminCancelBtn.addEventListener('click', () => {
        adminEntryModal.style.display = 'none';
    });
    
    // 點擊外部關閉
    adminEntryModal.addEventListener('click', (e) => {
        if (e.target === adminEntryModal) {
            adminEntryModal.style.display = 'none';
        }
    });
    
    console.log('✅ 管理員入口初始化完成');
};

// 顯示通知
window.showNotification = (message, type = 'success') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-message">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // 顯示動畫
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 自動隱藏
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
};

// 頁面性能監控
const initPerformanceMonitoring = () => {
    // 監控頁面載入時間
    window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`📊 頁面載入時間: ${loadTime}ms`);
        
        if (loadTime > 3000) {
            console.warn('⚠️ 頁面載入時間較長，建議優化');
        }
    });
    
    // 監控圖片載入錯誤
    document.addEventListener('error', (e) => {
        if (e.target.tagName === 'IMG') {
            console.warn('⚠️ 圖片載入失敗:', e.target.src);
        }
    }, true);
    
    // 監控JavaScript錯誤
    window.addEventListener('error', (e) => {
        console.error('❌ JavaScript錯誤:', e.error);
        console.error('❌ 錯誤位置:', e.filename, '行:', e.lineno);
    });
    
    // 監控未處理的Promise拒絕
    window.addEventListener('unhandledrejection', (e) => {
        console.error('❌ 未處理的Promise拒絕:', e.reason);
    });
};

// 初始化性能監控
initPerformanceMonitoring();

// 全局函數（供HTML調用）
window.goToDineIn = function() {
    const currentUrl = window.location.origin;
    const orderUrl = `${currentUrl}/dine-in-order.html`;
    window.location.href = orderUrl;
};

// 結帳功能
let isCheckingOut = false; // 防止重複點擊的標誌

const initCheckout = () => {
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            // 防止重複點擊
            if (isCheckingOut) {
                console.log('⚠️ 結帳進行中，忽略重複點擊');
                return;
            }
            
            if (window.cart.length === 0) {
                showNotification('購物車是空的，無法結帳', 'error');
                return;
            }
            
            // 設置結帳狀態
            isCheckingOut = true;
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = '處理中...';
            checkoutBtn.style.opacity = '0.6';
            

            
            // 檢查是否有外帶訂單號碼
            const orderNumbers = window.cart
                .map(item => item.orderNumber)
                .filter(orderNumber => orderNumber && orderNumber.trim());
            
            // 準備訂單數據
            let orderData = {
                items: window.cart.map(item => {
                    // 從 originalItem 中提取 customizations
                    let customizations = item.customizations || '';
                    if (!customizations && item.originalItem && item.originalItem.customizations) {
                        customizations = item.originalItem.customizations;
                    }
                    
                    console.log('🔍 結帳時的商品客制化信息:', customizations);
                    return {
                        name: item.name,
                        price: parseFloat(item.price) || 0,
                        quantity: parseInt(item.quantity) || 1,
                        customizations: customizations // 添加客制化信息
                    };
                }),
                totalAmount: parseFloat(window.cart.reduce((sum, item) => {
                    const price = parseFloat(item.price) || 0;
                    const quantity = parseInt(item.quantity) || 0;
                    return sum + (price * quantity);
                }, 0)) || 0,
                paymentMethod: 'cash',
                deliveryMethod: 'pickup',
                notes: '前台結帳'
            };
            
            // 如果有訂單號碼，添加到訂單數據中
            if (orderNumbers.length > 0) {
                orderData.orderNumber = orderNumbers[0]; // 使用第一個訂單號碼
                console.log('🔍 外帶訂單號碼:', orderData.orderNumber);
            }
            
            // 驗證數據格式
            console.log('🔍 購物車原始數據:', window.cart);
            console.log('🔍 處理後的訂單數據:', orderData);
            
            // 檢查是否有無效數據
            const invalidItems = orderData.items.filter(item => 
                !item.name || item.price <= 0 || item.quantity <= 0
            );
            
            if (invalidItems.length > 0) {
                console.error('❌ 發現無效商品數據:', invalidItems);
                console.log('🔍 詳細分析無效商品:');
                invalidItems.forEach((item, index) => {
                    console.log(`  商品 ${index + 1}:`, {
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        nameType: typeof item.name,
                        priceType: typeof item.price,
                        quantityType: typeof item.quantity
                    });
                });
                
                // 修復無效數據而不是清理
                console.log('🔧 修復購物車中的無效數據...');
                window.cart = window.cart.map(item => {
                    if (!item || typeof item.name !== 'string' || item.name.trim() === '') {
                        return null;
                    }
                    if (typeof item.price !== 'number' || item.price <= 0) {
                        item.price = parseFloat(item.price) || 0;
                    }
                    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
                        item.quantity = parseInt(item.quantity) || 1;
                    }
                    return item;
                }).filter(item => item !== null);
                
                localStorage.setItem('cart', JSON.stringify(window.cart));
                updateCartDisplay();
                
                if (window.cart.length === 0) {
                    showNotification('購物車中沒有有效商品，請重新選擇', 'error');
                    return;
                }
                
                // 重新準備訂單數據
                orderData = {
                    items: window.cart.map(item => {
                        // 從 originalItem 中提取 customizations
                        let customizations = item.customizations || '';
                        if (!customizations && item.originalItem && item.originalItem.customizations) {
                            customizations = item.originalItem.customizations;
                        }
                        
                        // 確保 customizations 不是 undefined
                        if (customizations === undefined || customizations === null) {
                            customizations = '';
                        }
                        
                        console.log('🔍 結帳時的商品客制化信息:', customizations);
                        console.log('🔍 結帳時的商品特殊需求:', item.specialRequest);
                        
                        return {
                            name: item.name,
                            price: parseFloat(item.price) || 0,
                            quantity: parseInt(item.quantity) || 1,
                            customizations: customizations, // 添加客制化信息
                            specialRequest: item.specialRequest || '' // 添加特殊需求
                        };
                    }),
                    totalAmount: parseFloat(window.cart.reduce((sum, item) => {
                        const price = parseFloat(item.price) || 0;
                        const quantity = parseInt(item.quantity) || 0;
                        return sum + (price * quantity);
                    }, 0)) || 0,
                    paymentMethod: 'cash',
                    deliveryMethod: 'pickup',
                    notes: '前台結帳'
                };
                
                console.log('🔧 修復後的訂單數據:', orderData);
            }
            
            // 檢查商品名稱是否與後端產品匹配
            const backendProducts = [
                '美式咖啡', '拿鐵咖啡', '紅茶', '綠茶', '星辰奶茶', 
                '夢幻檸茶', '綠霧奶綠', '冷萃烏龍', '翡翠紅茶', 
                '芒果冰茶', '桂花烏龍', '莓果氣泡飲'
            ];
            
            const unmatchedItems = orderData.items.filter(item => {
                // 移除客制化信息來匹配基礎產品名稱
                let baseName = item.name
                    .replace(/\s*\([^)]*\)/g, '') // 移除括號內容
                    .replace(/\s*\+[^)]*$/g, '') // 移除加料信息
                    .replace(/\s*無糖\s*/g, '') // 移除糖量
                    .replace(/\s*微糖\s*/g, '')
                    .replace(/\s*半糖\s*/g, '')
                    .replace(/\s*少糖\s*/g, '')
                    .replace(/\s*全糖\s*/g, '')
                    .replace(/\s*去冰\s*/g, '') // 移除冰量
                    .replace(/\s*微冰\s*/g, '')
                    .replace(/\s*少冰\s*/g, '')
                    .replace(/\s*正常冰\s*/g, '')
                    .replace(/\s*熱飲\s*/g, '')
                    .trim();
                
                console.log('🔍 商品名稱處理:', item.name, '→', baseName);
                return !backendProducts.includes(baseName);
            });
            
            if (unmatchedItems.length > 0) {
                console.error('❌ 發現不匹配的商品:', unmatchedItems);
                console.log('🔍 後端支持的產品:', backendProducts);
                showNotification('購物車中有不支持的商品，請重新選擇', 'error');
                return;
            }
            
            // 檢查是否在內用點餐頁面
            const isDineInPage = window.location.pathname.includes('dine-in-order.html');
            const tableNumber = localStorage.getItem('dineInTableNumber');
            
            let fetchPromise;
            
            if (isDineInPage && tableNumber) {
                // 內用訂單
                const dineInOrderData = {
                    tableNumber: tableNumber,
                    area: '內用區',
                    items: orderData.items,
                    total: orderData.totalAmount,
                    orderType: 'dine-in',
                    status: 'pending',
                    orderTime: new Date().toISOString()
                };
                
                console.log('📤 發送內用訂單數據:', dineInOrderData);
                fetchPromise = fetch('/api/orders/dine-in', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dineInOrderData)
                });
            } else {
                // 外帶訂單
                console.log('📤 發送外帶訂單數據:', orderData);
                fetchPromise = fetch('/api/orders/checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData)
                });
            }
            
            fetchPromise.then(response => {
                console.log('📥 後端回應狀態:', response.status);
                if (!response.ok) {
                    return response.json().then(errorData => {
                        console.error('❌ 後端錯誤:', errorData);
                        // 顯示詳細的錯誤信息
                        if (errorData.errors && errorData.errors.length > 0) {
                            const errorMessages = errorData.errors.map(err => `${err.path}: ${err.msg}`).join(', ');
                            throw new Error(`驗證錯誤: ${errorMessages}`);
                        }
                        throw new Error(errorData.message || '請求失敗');
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('✅ 後端回應數據:', data);
                if (data.success) {
                    showNotification('訂單已成功提交！', 'success');
                    // 清空購物車
                    window.cart.length = 0;
                    localStorage.removeItem('cart');
                    // 如果是內用訂單，清除桌號
                    if (isDineInPage) {
                        localStorage.removeItem('dineInTableNumber');
                    }
                    updateCartDisplay();
                    closeCartSidebar();
                } else {
                    showNotification(data.message || '訂單提交失敗，請重試', 'error');
                }
            })
            .catch(error => {
                console.error('❌ 結帳錯誤:', error);
                showNotification(error.message || '結帳時發生錯誤，請重試', 'error');
            })
            .finally(() => {
                // 重置結帳按鈕狀態
                isCheckingOut = false;
                const checkoutBtn = document.querySelector('.checkout-btn');
                if (checkoutBtn) {
                    checkoutBtn.disabled = false;
                    checkoutBtn.textContent = '結帳';
                    checkoutBtn.style.opacity = '1';
                }
            });
        });
    }
};

// 初始化結帳功能
initCheckout();

window.updateQuantity = updateQuantity;
window.addToCart = addToCart; 