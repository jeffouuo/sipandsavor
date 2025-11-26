const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const dbConnect = require('../utils/dbConnect');

const router = express.Router();

// 生成JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// 註冊
router.post('/register', [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('用戶名長度必須在3-20個字符之間')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('用戶名只能包含字母、數字和下劃線'),
    body('email')
        .isEmail()
        .withMessage('請輸入有效的電子郵件地址'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('密碼至少需要6個字符')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('密碼必須包含至少一個小寫字母、一個大寫字母和一個數字'),
    body('phone')
        .optional()
        .matches(/^09\d{8}$/)
        .withMessage('請輸入有效的台灣手機號碼'),
    body('role')
        .optional()
        .isIn(['user', 'admin'])
        .withMessage('角色只能是user或admin')
], async (req, res) => {
    try {
        // 驗證輸入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { username, email, password, phone, address, role } = req.body;

        // 檢查用戶是否已存在
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '用戶名或電子郵件已被使用'
            });
        }

        // 創建新用戶
        const user = new User({
            username,
            email,
            password,
            phone,
            address,
            role: role || 'user' // 如果沒有指定角色，默認為 user
        });

        await user.save();

        // 生成Token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: '註冊成功',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        console.error('註冊錯誤:', error);
        res.status(500).json({
            success: false,
            message: '註冊失敗，請稍後再試'
        });
    }
});

// 登錄
router.post('/login', [
    body('email')
        .isEmail()
        .withMessage('請輸入有效的電子郵件地址'),
    body('password')
        .notEmpty()
        .withMessage('密碼不能為空')
], async (req, res) => {
    // ⚠️ 關鍵：在 Serverless 環境中，確保資料庫連線已建立
    try {
        await dbConnect();
    } catch (dbConnectionError) {
        console.error('═══════════════════════════════════════════════════════════');
        console.error('❌ 登入時資料庫連線失敗:');
        console.error('錯誤名稱:', dbConnectionError.name);
        console.error('錯誤訊息:', dbConnectionError.message);
        console.error('錯誤堆疊:', dbConnectionError.stack);
        console.error('═══════════════════════════════════════════════════════════');
        
        return res.status(500).json({
            success: false,
            message: '資料庫連接失敗，請稍後再試',
            error: 'Database connection failed',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // 驗證輸入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // 查找用戶（包含密碼）- 增強錯誤處理
        let user;
        try {
            user = await User.findOne({ email }).select('+password');
        } catch (dbError) {
            console.error('═══════════════════════════════════════════════════════════');
            console.error('❌ 登入時資料庫查詢失敗:');
            console.error('錯誤名稱:', dbError.name);
            console.error('錯誤訊息:', dbError.message);
            console.error('錯誤堆疊:', dbError.stack);
            console.error('查詢條件:', { email });
            console.error('═══════════════════════════════════════════════════════════');
            
            return res.status(500).json({
                success: false,
                message: '資料庫查詢失敗，請稍後再試',
                error: 'Database query failed',
                timestamp: new Date().toISOString()
            });
        }

        // ⚠️ 關鍵：檢查用戶是否存在（避免對 null 進行密碼比對）
        if (!user) {
            console.log('⚠️ 登入失敗：用戶不存在', { email });
            return res.status(401).json({
                success: false,
                message: '電子郵件或密碼錯誤'
            });
        }

        // 檢查用戶是否被禁用
        if (!user.isActive) {
            console.log('⚠️ 登入失敗：帳戶已被禁用', { email, userId: user._id });
            return res.status(401).json({
                success: false,
                message: '帳戶已被禁用，請聯繫客服'
            });
        }

        // 驗證密碼 - 確保用戶存在後才進行比對
        let isPasswordValid = false;
        try {
            isPasswordValid = await user.comparePassword(password);
        } catch (passwordError) {
            console.error('═══════════════════════════════════════════════════════════');
            console.error('❌ 密碼比對時發生錯誤:');
            console.error('錯誤名稱:', passwordError.name);
            console.error('錯誤訊息:', passwordError.message);
            console.error('錯誤堆疊:', passwordError.stack);
            console.error('用戶ID:', user._id);
            console.error('═══════════════════════════════════════════════════════════');
            
            return res.status(500).json({
                success: false,
                message: '密碼驗證失敗，請稍後再試',
                error: 'Password verification failed',
                timestamp: new Date().toISOString()
            });
        }

        if (!isPasswordValid) {
            console.log('⚠️ 登入失敗：密碼錯誤', { email, userId: user._id });
            return res.status(401).json({
                success: false,
                message: '電子郵件或密碼錯誤'
            });
        }

        // 更新最後登錄時間
        try {
            user.lastLogin = new Date();
            await user.save();
        } catch (saveError) {
            // 即使保存失敗，也繼續登入流程（記錄錯誤但不中斷）
            console.error('⚠️ 更新最後登錄時間失敗:', saveError.message);
        }

        // 生成Token
        let token;
        try {
            token = generateToken(user._id);
        } catch (tokenError) {
            console.error('═══════════════════════════════════════════════════════════');
            console.error('❌ 生成 Token 時發生錯誤:');
            console.error('錯誤名稱:', tokenError.name);
            console.error('錯誤訊息:', tokenError.message);
            console.error('錯誤堆疊:', tokenError.stack);
            console.error('用戶ID:', user._id);
            console.error('═══════════════════════════════════════════════════════════');
            
            return res.status(500).json({
                success: false,
                message: 'Token 生成失敗，請稍後再試',
                error: 'Token generation failed',
                timestamp: new Date().toISOString()
            });
        }

        console.log('✅ 登入成功', { email, userId: user._id, role: user.role });

        return res.json({
            success: true,
            message: '登錄成功',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar
                },
                token
            }
        });

    } catch (error) {
        // 完整的錯誤處理 - 記錄所有錯誤詳情
        console.error('═══════════════════════════════════════════════════════════');
        console.error('❌ 登入時發生未預期的錯誤:');
        console.error('錯誤名稱:', error.name);
        console.error('錯誤訊息:', error.message);
        console.error('錯誤堆疊:', error.stack);
        console.error('請求資料:', { email: req.body.email });
        console.error('═══════════════════════════════════════════════════════════');
        
        return res.status(500).json({
            success: false,
            message: '登錄失敗，請稍後再試',
            error: 'Unexpected error occurred',
            timestamp: new Date().toISOString()
        });
    }
});

// 獲取當前用戶信息
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用戶不存在'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    address: user.address,
                    role: user.role,
                    avatar: user.avatar,
                    lastLogin: user.lastLogin
                }
            }
        });

    } catch (error) {
        console.error('獲取用戶信息錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取用戶信息失敗'
        });
    }
});

// 更新用戶信息
router.put('/profile', auth, [
    body('username')
        .optional()
        .isLength({ min: 3, max: 20 })
        .withMessage('用戶名長度必須在3-20個字符之間'),
    body('phone')
        .optional()
        .matches(/^09\d{8}$/)
        .withMessage('請輸入有效的台灣手機號碼')
], async (req, res) => {
    try {
        // 驗證輸入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { username, phone, address } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用戶不存在'
            });
        }

        // 檢查用戶名是否已被使用
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: '用戶名已被使用'
                });
            }
        }

        // 更新用戶信息
        if (username) user.username = username;
        if (phone) user.phone = phone;
        if (address) user.address = address;

        await user.save();

        res.json({
            success: true,
            message: '個人資料更新成功',
            data: {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    address: user.address,
                    role: user.role,
                    avatar: user.avatar
                }
            }
        });

    } catch (error) {
        console.error('更新用戶信息錯誤:', error);
        res.status(500).json({
            success: false,
            message: '更新失敗，請稍後再試'
        });
    }
});

// 登出（客戶端處理，這裡只是返回成功信息）
router.post('/logout', auth, (req, res) => {
    res.json({
        success: true,
        message: '登出成功'
    });
});

module.exports = router; 