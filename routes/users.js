const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// 獲取用戶個人資料
router.get('/profile', auth, async (req, res) => {
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
            data: { user }
        });

    } catch (error) {
        console.error('獲取用戶資料錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取用戶資料失敗'
        });
    }
});

// 更新用戶個人資料
router.put('/profile', auth, [
    body('username')
        .optional()
        .isLength({ min: 3, max: 20 })
        .withMessage('用戶名長度必須在3-20個字符之間'),
    body('phone')
        .optional()
        .matches(/^09\d{8}$/)
        .withMessage('請輸入有效的台灣手機號碼'),
    body('address.street')
        .optional()
        .isLength({ max: 100 })
        .withMessage('街道地址不能超過100個字符'),
    body('address.city')
        .optional()
        .isLength({ max: 50 })
        .withMessage('城市名稱不能超過50個字符'),
    body('address.postalCode')
        .optional()
        .matches(/^\d{3,5}$/)
        .withMessage('郵遞區號格式錯誤')
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

        // 更新用戶資料
        if (username) user.username = username;
        if (phone) user.phone = phone;
        if (address) user.address = address;

        await user.save();

        res.json({
            success: true,
            message: '個人資料更新成功',
            data: { user }
        });

    } catch (error) {
        console.error('更新用戶資料錯誤:', error);
        res.status(500).json({
            success: false,
            message: '更新個人資料失敗'
        });
    }
});

// 更改密碼
router.put('/change-password', auth, [
    body('currentPassword')
        .notEmpty()
        .withMessage('當前密碼不能為空'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('新密碼至少需要6個字符')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('新密碼必須包含至少一個小寫字母、一個大寫字母和一個數字')
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

        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.userId).select('+password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用戶不存在'
            });
        }

        // 驗證當前密碼
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: '當前密碼錯誤'
            });
        }

        // 更新密碼
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: '密碼更改成功'
        });

    } catch (error) {
        console.error('更改密碼錯誤:', error);
        res.status(500).json({
            success: false,
            message: '更改密碼失敗'
        });
    }
});

// 獲取用戶統計信息
router.get('/admin/stats', adminAuth, async (req, res) => {
    try {
        const [totalUsers, activeUsers, adminUsers, newUsersThisMonth] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isActive: true }),
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            })
        ]);

        res.json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                adminUsers,
                newUsersThisMonth
            }
        });

    } catch (error) {
        console.error('獲取用戶統計錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取用戶統計失敗'
        });
    }
});

// 管理員：獲取所有用戶
router.get('/admin/all', adminAuth, [
    query('page').optional().isInt({ min: 1 }).withMessage('頁碼必須是正整數'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('每頁數量必須在1-50之間'),
    query('role').optional().isIn(['user', 'admin']).withMessage('無效的用戶角色'),
    query('isActive').optional().isBoolean().withMessage('isActive參數必須是布爾值'),
    query('search').optional().isString().withMessage('搜索關鍵字必須是字符串')
], async (req, res) => {
    try {
        // 驗證查詢參數
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { page = 1, limit = 20, role, isActive, search } = req.query;

        // 構建查詢條件
        const query = {};
        if (role) query.role = role;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // 執行查詢
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [users, total] = await Promise.all([
            User.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(query)
        ]);

        // 計算分頁信息
        const totalPages = Math.ceil(total / parseInt(limit));
        const hasNext = parseInt(page) < totalPages;
        const hasPrev = parseInt(page) > 1;

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    hasNext,
                    hasPrev,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('獲取用戶列表錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取用戶列表失敗'
        });
    }
});

// 管理員：獲取單個用戶詳情
router.get('/admin/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用戶不存在'
            });
        }

        res.json({
            success: true,
            data: { user }
        });

    } catch (error) {
        console.error('獲取用戶詳情錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取用戶詳情失敗'
        });
    }
});

// 管理員：更新用戶狀態
router.put('/admin/:id/status', adminAuth, [
    body('isActive').isBoolean().withMessage('isActive必須是布爾值'),
    body('role').optional().isIn(['user', 'admin']).withMessage('無效的用戶角色')
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

        const { isActive, role } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用戶不存在'
            });
        }

        // 防止管理員禁用自己
        if (user._id.toString() === req.user.userId && !isActive) {
            return res.status(400).json({
                success: false,
                message: '不能禁用自己的帳戶'
            });
        }

        // 更新用戶狀態
        user.isActive = isActive;
        if (role) user.role = role;

        await user.save();

        res.json({
            success: true,
            message: '用戶狀態更新成功',
            data: { user }
        });

    } catch (error) {
        console.error('更新用戶狀態錯誤:', error);
        res.status(500).json({
            success: false,
            message: '更新用戶狀態失敗'
        });
    }
});

// 管理員：刪除用戶
router.delete('/admin/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用戶不存在'
            });
        }

        // 防止管理員刪除自己
        if (user._id.toString() === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: '不能刪除自己的帳戶'
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: '用戶刪除成功'
        });

    } catch (error) {
        console.error('刪除用戶錯誤:', error);
        res.status(500).json({
            success: false,
            message: '刪除用戶失敗'
        });
    }
});

module.exports = router; 