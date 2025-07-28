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

// 购物车功能
document.addEventListener('DOMContentLoaded', function() {
    // 初始化购物车
    const cartIcon = document.querySelector('.cart-icon');
    const cartSidebar = document.querySelector('.cart-sidebar');
    const closeCart = document.querySelector('.close-cart');
    const cartItems = document.querySelector('.cart-items');
    const cartTotal = document.querySelector('.cart-total');
    const cartCount = document.querySelector('.cart-count');
    const checkoutBtn = document.querySelector('.checkout-btn');
    
    // 从 localStorage 获取购物车数据
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // 更新购物车数量显示
    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        
        // 保存到 localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
    }
    
    // 更新购物车总金额
    function updateCartTotal() {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.textContent = `總金額: NT$ ${total.toLocaleString()}`;
    }
    
    // 渲染购物车商品
    function renderCartItems() {
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
        
        // 添加数量按钮事件监听
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
    
    // 显示通知
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
    
    // 打开购物车
    cartIcon.addEventListener('click', function(e) {
        e.stopPropagation(); // 防止事件冒泡
        cartSidebar.classList.add('active');
        renderCartItems();
        updateCartTotal();
    });
    
    // 关闭购物车
    function closeCartSidebar() {
        cartSidebar.classList.remove('active');
    }
    
    // 点击关闭按钮关闭购物车
    closeCart.addEventListener('click', function(e) {
        e.stopPropagation(); // 防止事件冒泡
        closeCartSidebar();
    });
    
    // 防止点击购物车内部时关闭
    cartSidebar.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // 点击购物车外部区域关闭购物车
    document.addEventListener('click', function(event) {
        if (cartSidebar.classList.contains('active') && 
            !cartSidebar.contains(event.target) && 
            !cartIcon.contains(event.target)) {
            closeCartSidebar();
        }
    });
    
    // 结账功能
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // 防止事件冒泡
            if (cart.length === 0) {
                showNotification('購物車是空的，無法結帳');
                return;
            }
            
            // 显示感谢信息
            showNotification('感謝您的購買！');
            
            // 清空购物车
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            
            // 更新购物车显示
            updateCartCount();
            updateCartTotal();
            renderCartItems();
            
            // 关闭购物车侧边栏
            closeCartSidebar();
        });
    }
    
    // 初始化购物车显示
    updateCartCount();
    updateCartTotal();
    renderCartItems();
    
    // 添加到购物车
    window.addToCart = function(id, name, price) {
        // 检查购物车中是否已存在相同商品
        const existingItem = cart.find(item => item.name === name);
        
        if (existingItem) {
            // 如果存在，增加数量
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
});

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

