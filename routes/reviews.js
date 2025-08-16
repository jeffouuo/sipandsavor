const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// 简单的内存缓存
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存（延长缓存时间）

// 缓存工具函数
function getCachedData(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    return null;
}

function setCachedData(key, data) {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
}

// 获取指定产品的评价和统计（高度优化版本）
router.get('/product/:productName', async (req, res) => {
    try {
        const { productName } = req.params;
        const cacheKey = `product_${productName}`;
        
        // 检查缓存
        const cached = getCachedData(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: cached,
                fromCache: true
            });
        }

        // 高度优化聚合查询：使用索引，限制结果数量
        const result = await Review.aggregate([
            { $match: { productName } },
            {
                $facet: {
                    reviews: [
                        { $sort: { date: -1 } },
                        { $limit: 10 }, // 只获取最新10条评价
                        {
                            $project: {
                                reviewerName: 1,
                                rating: 1,
                                text: 1,
                                date: 1
                            }
                        }
                    ],
                    stats: [
                        {
                            $group: {
                                _id: null,
                                totalReviews: { $sum: 1 },
                                averageRating: { $avg: '$rating' },
                                ratingDistribution: { $push: '$rating' }
                            }
                        }
                    ]
                }
            }
        ]);

        const data = {
            reviews: result[0].reviews.map(review => ({
                name: review.reviewerName,
                rating: review.rating,
                text: review.text,
                date: new Date(review.date).toISOString().split('T')[0]
            })),
            stats: result[0].stats.length > 0 ? {
                totalReviews: result[0].stats[0].totalReviews,
                averageRating: Math.round(result[0].stats[0].averageRating * 10) / 10,
                ratingDistribution: result[0].stats[0].ratingDistribution.reduce((acc, rating) => {
                    acc[rating] = (acc[rating] || 0) + 1;
                    return acc;
                }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
            } : {
                totalReviews: 0,
                averageRating: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            }
        };

        // 设置缓存（延长缓存时间）
        setCachedData(cacheKey, data);

        res.json({
            success: true,
            data,
            fromCache: false,
            queryTime: Date.now()
        });
    } catch (error) {
        console.error('獲取評價失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取評價失敗'
        });
    }
});

// 獲取指定產品的評價統計（保留原有接口以兼容）
router.get('/stats/:productName', async (req, res) => {
    try {
        const { productName } = req.params;
        const cacheKey = `stats_${productName}`;
        
        // 检查缓存
        const cached = getCachedData(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: cached
            });
        }
        
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

        let data;
        if (stats.length === 0) {
            data = {
                totalReviews: 0,
                averageRating: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            };
        } else {
            const stat = stats[0];
            const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            
            // 計算評分分佈
            stat.ratingDistribution.forEach(rating => {
                ratingDistribution[rating]++;
            });

            data = {
                totalReviews: stat.totalReviews,
                averageRating: Math.round(stat.averageRating * 10) / 10,
                ratingDistribution
            };
        }

        // 设置缓存
        setCachedData(cacheKey, data);

        res.json({
            success: true,
            data
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

        // 清除相关缓存
        cache.delete(`product_${productName}`);
        cache.delete(`stats_${productName}`);
        cache.delete('all_stats');

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

// 獲取所有產品的評價統計（高度優化版本）
router.get('/all-stats', async (req, res) => {
    try {
        const cacheKey = 'all_stats';
        
        // 检查缓存
        const cached = getCachedData(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: cached,
                fromCache: true
            });
        }

        // 高度優化聚合查詢：使用索引，限制結果數量
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
            { $sort: { productName: 1 } },
            { $limit: 20 } // 限制結果數量，提升查詢速度
        ]);

        // 设置缓存（延长缓存时间到10分钟）
        setCachedData(cacheKey, stats);

        res.json({
            success: true,
            data: stats,
            fromCache: false,
            queryTime: Date.now()
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
