const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// 简单的内存缓存
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 缓存中间件
const cacheMiddleware = (duration = CACHE_DURATION) => {
    return (req, res, next) => {
        const key = req.originalUrl;
        const cached = cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < duration) {
            return res.json(cached.data);
        }
        
        const originalSend = res.json;
        res.json = function(data) {
            cache.set(key, {
                data: data,
                timestamp: Date.now()
            });
            originalSend.call(this, data);
        };
        
        next();
    };
};

const app = express();
const PORT = process.env.PORT || 3000;

// 調試信息：檢查環境變量
console.log('🔍 環境變量檢查:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '已設置' : '未設置');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '已設置' : '未設置');
console.log('PORT:', process.env.PORT || 3000);

// 安全中间件
app.use(helmet({
    contentSecurityPolicy: false // 暫時禁用 CSP 以便開發
}));

// 动态CORS配置
const corsOptions = {
    origin: function (origin, callback) {
        // 允许所有本地端口
        if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            callback(null, true);
        } else {
            callback(new Error('不允許的來源'));
        }
    },
    credentials: true
};
app.use(cors(corsOptions));

// 速率限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分鐘
    max: 1000 // 增加限制，避免误判
});

// 为登录端点设置更宽松的限制
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分鐘
    max: 100 // 增加登录限制
});

// 为结账端点设置更宽松的限制
const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分鐘
    max: 200 // 结账端点限制更宽松
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/orders/checkout', checkoutLimiter);
app.use('/api', limiter);

// 解析JSON和URL编码的数据
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



// 数据库连接
console.log('🔗 嘗試連接數據庫...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sipandsavor', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB 連接成功'))
.catch(err => console.error('❌ MongoDB 連接失敗:', err));

// API 路由（在静态文件服务之前）
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/news', require('./routes/news'));
app.use('/api/users', require('./routes/users'));

// 静态文件服务（除了admin.html和admin.js）
app.use(express.static(path.join(__dirname), {
    setHeaders: (res, path) => {
        console.log('📁 靜態文件請求:', path);
        if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            console.log('✅ 設置HTML MIME類型:', path);
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            console.log('✅ 設置JS MIME類型:', path);
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            console.log('✅ 設置CSS MIME類型:', path);
        }
    }
}));
app.use('/images', express.static('images'));

// 管理页面路由
app.get('/admin', async (req, res) => {
    try {
        const token = req.cookies?.adminToken || req.query.token;
        console.log('【/admin】收到請求');
        console.log('【/admin】cookie adminToken:', req.cookies?.adminToken);
        console.log('【/admin】query token:', req.query.token);
        
        if (!token) {
            console.log('【/admin】沒有 token，重導到 login.html');
            return res.redirect('login.html?redirect=admin');
        }

        // 驗證token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('【/admin】token 驗證成功:', decoded);
        } catch (err) {
            console.log('【/admin】token 驗證失敗:', err.message);
            return res.redirect('login.html?redirect=admin');
        }
        
        // 檢查用戶是否存在且為管理員
        const user = await User.findById(decoded.userId);
        console.log('【/admin】查詢用戶:', user);
        
        if (!user || user.role !== 'admin' || !user.isActive) {
            console.log('【/admin】用戶不存在/不是管理員/被停用，重導到 login.html');
            return res.redirect('login.html?redirect=admin');
        }

        // 驗證通過，返回管理頁面
        console.log('【/admin】驗證通過，顯示 admin.html');
        res.sendFile(path.join(__dirname, 'admin.html'));
    } catch (error) {
        console.error('【/admin】管理页面访问失败:', error);
        res.redirect('login.html?redirect=admin');
    }
});

// 保护admin.html和admin.js文件
app.get('/admin.html', async (req, res) => {
    try {
        const token = req.cookies?.adminToken || req.query.token;
        
        if (!token) {
            return res.redirect('login.html?redirect=admin');
        }

        // 验证token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.redirect('login.html?redirect=admin');
        }
        
        // 检查用户是否存在且为管理员
        const user = await User.findById(decoded.userId);
        
        if (!user || user.role !== 'admin' || !user.isActive) {
            return res.redirect('login.html?redirect=admin');
        }

        // 验证通过，返回admin.html文件
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.sendFile(path.join(__dirname, 'admin.html'));
    } catch (error) {
        console.error('admin.html访问失败:', error);
        res.redirect('login.html?redirect=admin');
    }
});

app.get('/admin.js', async (req, res) => {
    try {
        const token = req.cookies?.adminToken || req.query.token;
        
        if (!token) {
            return res.status(403).json({ error: '未授权访问' });
        }

        // 验证token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(403).json({ error: '无效的token' });
        }
        
        // 检查用户是否存在且为管理员
        const user = await User.findById(decoded.userId);
        
        if (!user || user.role !== 'admin' || !user.isActive) {
            return res.status(403).json({ error: '权限不足' });
        }

        // 验证通过，返回admin.js文件
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.sendFile(path.join(__dirname, 'admin.js'));
    } catch (error) {
        console.error('admin.js访问失败:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: '飲茶趣API運行正常',
        timestamp: new Date().toISOString()
    });
});

// 首頁路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 登錄頁面路由
app.get('/login.html', (req, res) => {
    console.log('🔐 登錄頁面請求');
    console.log('🔍 請求URL:', req.url);
    console.log('🔍 請求方法:', req.method);
    console.log('🔍 請求頭:', req.headers);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(path.join(__dirname, 'login.html'));
});

// 404处理
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: '找不到請求的資源',
        path: req.originalUrl 
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('❌ 服務器錯誤:', err);
    res.status(500).json({ 
        error: '內部服務器錯誤',
        message: process.env.NODE_ENV === 'development' ? err.message : '請稍後再試'
    });
});

// 启动服务器
const startServer = (port, maxRetries = 10) => {
    // 确保端口是数字类型
    port = parseInt(port);
    
    // 检查重试次数
    if (maxRetries <= 0) {
        console.error('❌ 無法找到可用端口，請手動指定端口或停止占用端口的程序');
        process.exit(1);
    }
    
    app.listen(port, () => {
        console.log(`🚀 服務器運行在 http://localhost:${port}`);
        console.log(`📊 健康檢查: http://localhost:${port}/api/health`);
        console.log(`🏠 首頁: http://localhost:${port}`);
        console.log(`🔧 後台入口: http://localhost:${port}/admin.html`);
        console.log(`🔐 登錄頁面: http://localhost:${port}/login.html`);
        console.log(`📋 菜單頁面: http://localhost:${port}/menu.html`);
        console.log(`🍽️ 內用點餐: http://localhost:${port}/dine-in-order.html`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️ 端口 ${port} 已被占用，嘗試端口 ${port + 1}`);
            startServer(port + 1, maxRetries - 1);
        } else {
            console.error('❌ 服務器啟動失敗:', err);
        }
    });
};

startServer(PORT);

module.exports = app; 