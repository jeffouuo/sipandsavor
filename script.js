const initHamburgerMenu = () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (!hamburgerBtn || !mobileMenu) {
        console.error('錯誤：未找到漢堡按鈕或菜單元素！');
        return;
    }
    
    const toggleMenu = () => {
        mobileMenu.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    };
    
    // 點擊漢堡按鈕時切換選單
    hamburgerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
    });
    
    // 點擊選單內的連結時關閉選單
    const menuLinks = mobileMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        });
    });
    
    // 點擊選單外部時關閉選單
    document.addEventListener('click', (e) => {
        if (mobileMenu.classList.contains('active') && 
            !mobileMenu.contains(e.target) && 
            !hamburgerBtn.contains(e.target)) {
            mobileMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });
    
    // 按 ESC 鍵時關閉選單
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });
};

// 初始化 Swiper（如果存在 Swiper 容器）
const initSwiper = () => {
    const swiperContainer = document.querySelector('.swiper-container');
    if (swiperContainer && typeof Swiper !== 'undefined') {
        new Swiper('.swiper-container', {
            slidesPerView: 'auto',
            spaceBetween: 10,
            centeredSlides: true,
            loop: true,
            autoplay: {
                delay: 3000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            breakpoints: {
                320: {
                    slidesPerView: 2.5,
                },
                768: {
                    slidesPerView: 4,
                },
                1024: {
                    slidesPerView: 6,
                }
            }
        });
    }
};

// 圖片載入優化
const initImageLoading = () => {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.1
    });

    images.forEach(img => {
        imageObserver.observe(img);
        
        img.onerror = function() {
            this.classList.add('error');
        };
    });
};

// 購物車功能變數
let cart = [];
let cartIcon, cartSidebar, closeCart, cartItems, cartTotal, cartCount, checkoutBtn;

// 更新購物車數量顯示
function updateCartCount() {
    if (!cartCount) return;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    
    // 保存到 localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
}

// 更新購物車總金額
function updateCartTotal() {
    if (!cartTotal) return;
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `總金額: NT$ ${total.toLocaleString()}`;
}

// 渲染購物車商品
function renderCartItems() {
    if (!cartItems) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart">購物車是空的</div>';
        return;
    }
    
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">NT$ ${item.price.toLocaleString()}</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn minus">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn plus">+</button>
            </div>
        </div>
    `).join('');
    
    // 添加數量按鈕事件監聽
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // 防止事件冒泡
            const cartItem = this.closest('.cart-item');
            const itemId = cartItem.dataset.id;
            const item = cart.find(item => item.id === itemId);
            
            if (this.classList.contains('plus')) {
                item.quantity++;
            } else if (this.classList.contains('minus')) {
                item.quantity--;
                if (item.quantity <= 0) {
                    cart = cart.filter(item => item.id !== itemId);
                }
            }
            
            updateCartCount();
            updateCartTotal();
            renderCartItems();
        });
    });
}

// 顯示通知
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 2000);
}

// 關閉購物車側邊欄
function closeCartSidebar() {
    if (cartSidebar) {
        cartSidebar.classList.remove('active');
    }
}

// 添加到購物車
window.addToCart = function(id, name, price) {
    // 檢查購物車中是否已存在相同商品
    const existingItem = cart.find(item => item.name === name);
    
    if (existingItem) {
        // 如果存在，增加數量
        existingItem.quantity++;
    } else {
        // 如果不存在，添加新商品
        cart.push({
            id: id,
            name: name,
            price: price,
            quantity: 1
        });
    }
    
    updateCartCount();
    showNotification(`${name} 已添加到購物車`);
}

// 全局購物車同步函數
function syncCartState() {
    const cartCount = document.querySelector('.cart-count');
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// 初始化所有功能
document.addEventListener('DOMContentLoaded', () => {
    // 初始化購物車
    cartIcon = document.querySelector('.cart-icon');
    cartSidebar = document.querySelector('.cart-sidebar');
    closeCart = document.querySelector('.close-cart');
    cartItems = document.querySelector('.cart-items');
    cartTotal = document.querySelector('.cart-total');
    cartCount = document.querySelector('.cart-count');
    checkoutBtn = document.querySelector('.checkout-btn');
    
    // 從 localStorage 獲取購物車數據
    cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // 初始化購物車事件
    if (cartIcon) {
        cartIcon.addEventListener('click', function(e) {
            e.stopPropagation(); // 防止事件冒泡
            cartSidebar.classList.add('active');
            renderCartItems();
            updateCartTotal();
        });
    }
    
    if (closeCart) {
        closeCart.addEventListener('click', function(e) {
            e.stopPropagation(); // 防止事件冒泡
            closeCartSidebar();
        });
    }
    
    // 防止點擊購物車內部時關閉
    if (cartSidebar) {
        cartSidebar.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // 點擊購物車外部區域關閉購物車
    document.addEventListener('click', function(event) {
        if (cartSidebar && cartSidebar.classList.contains('active') && 
            !cartSidebar.contains(event.target) && 
            !cartIcon.contains(event.target)) {
            closeCartSidebar();
        }
    });
    
    // 結帳功能
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // 防止事件冒泡
            if (cart.length === 0) {
                showNotification('購物車是空的，無法結帳');
                return;
            }
            
            // 顯示感謝信息
            showNotification('感謝您的購買！');
            
            // 清空購物車
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            
            // 更新購物車顯示
            updateCartCount();
            updateCartTotal();
            renderCartItems();
            
            // 關閉購物車側邊欄
            closeCartSidebar();
        });
    }
    
    // 初始化購物車顯示
    updateCartCount();
    updateCartTotal();
    renderCartItems();
    
    // 初始化其他功能
    initHamburgerMenu();
    initSwiper();
    initImageLoading();
    
    // 同步購物車狀態
    syncCartState();
    
    // 監聽 localStorage 變化
    window.addEventListener('storage', (e) => {
        if (e.key === 'cart') {
            syncCartState();
        }
    });
    
    // 初始化商品圖片點擊事件
    const productImages = document.querySelectorAll('.product-image');
    productImages.forEach(img => {
        img.addEventListener('click', () => {
            const name = img.getAttribute('data-name');
            const price = parseInt(img.getAttribute('data-price'));
            const id = Date.now().toString(); // 生成唯一ID
            
            if (name && price) {
                window.addToCart(id, name, price);
                showNotification(`${name} 已添加到購物車`);
                syncCartState(); // 更新購物車狀態
            } else {
                console.error('錯誤：商品資訊不完整');
            }
        });
    });
});

