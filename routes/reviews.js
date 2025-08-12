const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// 獲取指定產品的所有評價
router.get('/product/:productName', async (req, res) => {
    try {
        const { productName } = req.params;
        const reviews = await Review.find({ productName })
            .sort({ date: -1 })
            .limit(50); // 限制返回數量

        res.json({
            success: true,
            data: reviews
        });
    } catch (error) {
        console.error('獲取評價失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取評價失敗'
        });
    }
});

// 獲取指定產品的評價統計
router.get('/stats/:productName', async (req, res) => {
    try {
        const { productName } = req.params;
        
        // 獲取評價統計
        const stats = await Review.aggregate([
            { $match: { productName } },
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: '$rating' },
                    ratingDistribution: {
                        $push: '$rating'
                    }
                }
            }
        ]);

        if (stats.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalReviews: 0,
                    averageRating: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                }
            });
        }

        const stat = stats[0];
        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        // 計算評分分佈
        stat.ratingDistribution.forEach(rating => {
            ratingDistribution[rating]++;
        });

        res.json({
            success: true,
            data: {
                totalReviews: stat.totalReviews,
                averageRating: Math.round(stat.averageRating * 10) / 10,
                ratingDistribution
            }
        });
    } catch (error) {
        console.error('獲取評價統計失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取評價統計失敗'
        });
    }
});

// 提交新評價
router.post('/', async (req, res) => {
    try {
        const { productName, rating, text, reviewerName = '匿名用戶' } = req.body;

        // 驗證輸入
        if (!productName || !rating || !text) {
            return res.status(400).json({
                success: false,
                message: '缺少必要參數'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: '評分必須在1-5之間'
            });
        }

        if (text.length > 500) {
            return res.status(400).json({
                success: false,
                message: '評價內容不能超過500字'
            });
        }

        // 創建新評價
        const newReview = new Review({
            productName,
            reviewerName,
            rating,
            text
        });

        await newReview.save();

        res.json({
            success: true,
            message: '評價提交成功',
            data: newReview
        });
    } catch (error) {
        console.error('提交評價失敗:', error);
        res.status(500).json({
            success: false,
            message: '提交評價失敗'
        });
    }
});

// 獲取所有產品的評價統計
router.get('/all-stats', async (req, res) => {
    try {
        const stats = await Review.aggregate([
            {
                $group: {
                    _id: '$productName',
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: '$rating' }
                }
            },
            {
                $project: {
                    productName: '$_id',
                    totalReviews: 1,
                    averageRating: { $round: ['$averageRating', 1] }
                }
            },
            { $sort: { productName: 1 } }
        ]);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('獲取所有評價統計失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取評價統計失敗'
        });
    }
});

module.exports = router;
