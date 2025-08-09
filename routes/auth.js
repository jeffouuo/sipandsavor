const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

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
            console.error('❌ 登入時資料庫查詢失敗:', dbError.message);
            return res.status(500).json({
                success: false,
                message: '資料庫連接失敗，請稍後再試',
                error: dbError.message,
                timestamp: new Date().toISOString()
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '電子郵件或密碼錯誤'
            });
        }

        // 檢查用戶是否被禁用
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: '帳戶已被禁用，請聯繫客服'
            });
        }

        // 驗證密碼
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: '電子郵件或密碼錯誤'
            });
        }

        // 更新最後登錄時間
        user.lastLogin = new Date();
        await user.save();

        // 生成Token
        const token = generateToken(user._id);

        res.json({
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
        console.error('登錄錯誤:', error);
        res.status(500).json({
            success: false,
            message: '登錄失敗，請稍後再試'
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