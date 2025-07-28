const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// 模擬新聞數據（實際應用中應該使用數據庫）
let newsData = [
    {
        id: '1',
        title: '茶葉產地認證',
        content: '我們榮獲國際茶葉產地認證，確保每一片茶葉都來自優質產區。從種植到採摘，全程嚴格把關，為您帶來最純淨的茶香。',
        image: 'images/tea-certification.webp',
        date: '2024-03-15',
        featured: true
    },
    {
        id: '2',
        title: '品質管理系統更新',
        content: '引進最新品質管理系統，從原料到成品，每個環節都經過嚴格檢驗。我們致力於為您提供最安全、最優質的茶飲體驗。',
        image: 'images/quality-system.webp',
        date: '2024-03-10',
        featured: false
    },
    {
        id: '3',
        title: '環保計畫',
        content: '推出全新環保計畫，使用可降解包裝材料，並鼓勵顧客自備環保杯。讓我們一起為地球盡一份心力。',
        image: 'images/eco-plan.webp',
        date: '2024-03-05',
        featured: true
    },
    {
        id: '4',
        title: '社區回饋',
        content: '定期舉辦社區茶藝活動，分享茶文化知識，並捐贈部分收益給當地慈善機構，回饋社會。',
        image: 'images/community.webp',
        date: '2024-03-01',
        featured: false
    }
];

// 獲取新聞列表
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('頁碼必須是正整數'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('每頁數量必須在1-20之間'),
    query('featured').optional().isBoolean().withMessage('featured參數必須是布爾值')
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

        const { page = 1, limit = 10, featured } = req.query;

        // 過濾新聞
        let filteredNews = [...newsData];
        if (featured !== undefined) {
            filteredNews = filteredNews.filter(news => news.featured === (featured === 'true'));
        }

        // 按日期排序
        filteredNews.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 分頁
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = filteredNews.length;
        const news = filteredNews.slice(skip, skip + parseInt(limit));

        // 計算分頁信息
        const totalPages = Math.ceil(total / parseInt(limit));
        const hasNext = parseInt(page) < totalPages;
        const hasPrev = parseInt(page) > 1;

        res.json({
            success: true,
            data: {
                news,
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
        console.error('獲取新聞列表錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取新聞列表失敗'
        });
    }
});

// 獲取單個新聞
router.get('/:id', async (req, res) => {
    try {
        const news = newsData.find(item => item.id === req.params.id);

        if (!news) {
            return res.status(404).json({
                success: false,
                message: '新聞不存在'
            });
        }

        res.json({
            success: true,
            data: { news }
        });

    } catch (error) {
        console.error('獲取新聞詳情錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取新聞詳情失敗'
        });
    }
});

// 管理員：添加新聞
router.post('/', adminAuth, [
    body('title')
        .isLength({ min: 1, max: 100 })
        .withMessage('標題長度必須在1-100個字符之間'),
    body('content')
        .isLength({ min: 1, max: 1000 })
        .withMessage('內容長度必須在1-1000個字符之間'),
    body('image')
        .notEmpty()
        .withMessage('圖片是必需的'),
    body('featured')
        .optional()
        .isBoolean()
        .withMessage('featured必須是布爾值')
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

        const { title, content, image, featured = false } = req.body;

        // 生成新ID
        const newId = (Math.max(...newsData.map(item => parseInt(item.id))) + 1).toString();

        // 創建新聞
        const news = {
            id: newId,
            title,
            content,
            image,
            date: new Date().toISOString().split('T')[0],
            featured
        };

        newsData.unshift(news); // 添加到開頭

        res.status(201).json({
            success: true,
            message: '新聞添加成功',
            data: { news }
        });

    } catch (error) {
        console.error('添加新聞錯誤:', error);
        res.status(500).json({
            success: false,
            message: '添加新聞失敗'
        });
    }
});

// 管理員：更新新聞
router.put('/:id', adminAuth, [
    body('title')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('標題長度必須在1-100個字符之間'),
    body('content')
        .optional()
        .isLength({ min: 1, max: 1000 })
        .withMessage('內容長度必須在1-1000個字符之間'),
    body('featured')
        .optional()
        .isBoolean()
        .withMessage('featured必須是布爾值')
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

        const newsIndex = newsData.findIndex(item => item.id === req.params.id);

        if (newsIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '新聞不存在'
            });
        }

        // 更新新聞
        const updatedNews = { ...newsData[newsIndex] };
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                updatedNews[key] = req.body[key];
            }
        });

        newsData[newsIndex] = updatedNews;

        res.json({
            success: true,
            message: '新聞更新成功',
            data: { news: updatedNews }
        });

    } catch (error) {
        console.error('更新新聞錯誤:', error);
        res.status(500).json({
            success: false,
            message: '更新新聞失敗'
        });
    }
});

// 管理員：刪除新聞
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const newsIndex = newsData.findIndex(item => item.id === req.params.id);

        if (newsIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '新聞不存在'
            });
        }

        const deletedNews = newsData.splice(newsIndex, 1)[0];

        res.json({
            success: true,
            message: '新聞刪除成功',
            data: { news: deletedNews }
        });

    } catch (error) {
        console.error('刪除新聞錯誤:', error);
        res.status(500).json({
            success: false,
            message: '刪除新聞失敗'
        });
    }
});

// 獲取特色新聞
router.get('/featured/list', async (req, res) => {
    try {
        const featuredNews = newsData
            .filter(news => news.featured)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 3);

        res.json({
            success: true,
            data: { news: featuredNews }
        });

    } catch (error) {
        console.error('獲取特色新聞錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取特色新聞失敗'
        });
    }
});

module.exports = router; 