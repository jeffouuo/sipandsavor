const initHamburgerMenu = () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (!hamburgerBtn || !mobileMenu) {
        console.error('錯誤：未找到漢堡按鈕或菜單元素！');
        return;
    }
    
    const toggleMenu = () => {
        mobileMenu.classList.toggle('active');
        hamburgerBtn.classList.toggle('active'); // 也切換漢堡按鈕的狀態
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : 'auto';
    };
    
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });
    
    // 點擊菜單內的連結時關閉菜單
    const menuLinks = mobileMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            hamburgerBtn.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    });
    
    document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            mobileMenu.classList.remove('active');
            hamburgerBtn.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
            hamburgerBtn.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
};

document.addEventListener('DOMContentLoaded', initHamburgerMenu);

