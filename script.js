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

// 初始化 Swiper
const initSwiper = () => {
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

// 購物車功能
const cartIcon = document.getElementById('cartIcon');
const cartSidebar = document.getElementById('cartSidebar');
const closeCart = document.getElementById('closeCart');
const cartItems = document.querySelector('.cart-items');
const cartCount = document.querySelector('.cart-count');
const totalAmount = document.querySelector('.total-amount');
const checkoutBtn = document.querySelector('.checkout-btn');

// 使用 localStorage 保存購物車數據
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// 打開購物車
cartIcon.addEventListener('click', () => {
    cartSidebar.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// 關閉購物車
closeCart.addEventListener('click', () => {
    cartSidebar.classList.remove('active');
    document.body.style.overflow = '';
});

// 點擊購物車外部關閉
document.addEventListener('click', (e) => {
    if (cartSidebar.classList.contains('active') && 
        !cartSidebar.contains(e.target) && 
        !cartIcon.contains(e.target)) {
        cartSidebar.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// 更新購物車數量
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    // 保存到 localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
}

// 更新購物車總金額
function updateTotalAmount() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalAmount.textContent = `NT$ ${total}`;
}

// 添加商品到購物車
function addToCart(name, price) {
    const productId = Date.now().toString(); // 生成唯一ID
    const existingItem = cart.find(item => item.name === name);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: name,
            price: price,
            quantity: 1
        });
    }
    
    updateCartCount();
    updateTotalAmount();
    renderCartItems();
    showNotification(`已將 ${name} 加入購物車`);
}

// 從購物車移除商品
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartCount();
    updateTotalAmount();
    renderCartItems();
}

// 更新商品數量
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartCount();
            updateTotalAmount();
            renderCartItems();
        }
    }
}

// 顯示通知
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// 渲染購物車項目
function renderCartItems() {
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">NT$ ${item.price}</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" data-id="${item.id}" data-action="decrease">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" data-id="${item.id}" data-action="increase">+</button>
            </div>
        </div>
    `).join('');
    
    // 為所有數量按鈕添加事件監聽器
    const quantityBtns = cartItems.querySelectorAll('.quantity-btn');
    quantityBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');
            const change = action === 'increase' ? 1 : -1;
            updateQuantity(id, change);
        });
    });
}

// 結帳功能
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        alert('購物車是空的！');
        return;
    }
    // 這裡可以添加結帳邏輯
    alert('感謝您的購買！');
    cart = [];
    updateCartCount();
    updateTotalAmount();
    renderCartItems();
    cartSidebar.classList.remove('active');
    document.body.style.overflow = '';
});

// 初始化購物車
updateCartCount();
updateTotalAmount();
renderCartItems();

// 初始化產品圖片點擊事件
function initializeProductImages() {
    const productImages = document.querySelectorAll('.swiper-slide img');
    productImages.forEach(img => {
        img.addEventListener('click', () => {
            const name = img.getAttribute('data-name');
            const price = parseFloat(img.getAttribute('data-price'));
            addToCart(name, price);
        });
    });
}

// 當 DOM 載入完成時初始化所有功能
document.addEventListener('DOMContentLoaded', () => {
    initHamburgerMenu();
    initSwiper();
    initImageLoading();
    initializeProductImages();
});

