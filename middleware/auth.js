const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // 從請求頭獲取token
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: '請提供認證令牌'
            });
        }

        // 驗證token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 檢查用戶是否存在
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用戶不存在'
            });
        }

        // 檢查用戶是否被禁用
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: '帳戶已被禁用'
            });
        }

        // 將用戶信息添加到請求對象
        req.user = decoded;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '無效的認證令牌'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '認證令牌已過期'
            });
        }

        console.error('認證中間件錯誤:', error);
        res.status(500).json({
            success: false,
            message: '認證失敗'
        });
    }
};

// 可選認證中間件（不強制要求登錄）
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            
            if (user && user.isActive) {
                req.user = decoded;
            }
        }
        
        next();
    } catch (error) {
        // 忽略認證錯誤，繼續執行
        next();
    }
};

// 管理員權限中間件
const adminAuth = async (req, res, next) => {
    try {
        // 從請求頭獲取token
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: '請提供認證令牌'
            });
        }

        // 驗證token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 檢查用戶是否存在
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用戶不存在'
            });
        }

        // 檢查用戶是否被禁用
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: '帳戶已被禁用'
            });
        }

        // 檢查是否為管理員
        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '需要管理員權限'
            });
        }

        // 將用戶信息添加到請求對象
        req.user = decoded;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '無效的認證令牌'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '認證令牌已過期'
            });
        }

        console.error('管理員認證中間件錯誤:', error);
        res.status(500).json({
            success: false,
            message: '認證失敗'
        });
    }
};

module.exports = { auth, optionalAuth, adminAuth }; 