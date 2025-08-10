const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// 内存中的产品数据（当MongoDB不可用时使用）
const memoryProducts = [
    {
        _id: '1',
        name: '美式咖啡',
        description: '經典美式咖啡，香濃醇厚',
        price: 45,
        image: 'images/americano.webp',
        category: '咖啡',
        tags: ['經典', '熱門'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.5, count: 120 },
        featured: true,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '2',
        name: '拿鐵咖啡',
        description: '香濃拿鐵，奶香四溢',
        price: 60,
        image: 'images/latte.webp',
        category: '咖啡',
        tags: ['奶香', '熱門'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.7, count: 95 },
        featured: true,
        sortOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '3',
        name: '紅茶',
        description: '精選紅茶，回甘醇厚',
        price: 30,
        image: 'images/blacktea.webp',
        category: '茶類',
        tags: ['經典', '回甘'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.3, count: 88 },
        featured: false,
        sortOrder: 3,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '4',
        name: '綠茶',
        description: '清香綠茶，清新怡人',
        price: 30,
        image: 'images/greentea.webp',
        category: '茶類',
        tags: ['清香', '健康'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.4, count: 76 },
        featured: false,
        sortOrder: 4,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '5',
        name: '星辰奶茶',
        description: '香濃奶茶，甜而不膩',
        price: 50,
        image: 'images/milk tea.webp',
        category: '茶類',
        tags: ['奶香', '甜味'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.6, count: 150 },
        featured: true,
        sortOrder: 5,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '6',
        name: '夢幻檸茶',
        description: '檸檬紅茶，酸甜清爽',
        price: 60,
        image: 'images/lemon black tea.webp',
        category: '茶類',
        tags: ['酸甜', '清爽'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.5, count: 92 },
        featured: false,
        sortOrder: 6,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '7',
        name: '綠霧奶綠',
        description: '綠茶奶茶，清香奶香',
        price: 55,
        image: 'images/milkgreen.webp',
        category: '茶類',
        tags: ['清香', '奶香'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.4, count: 85 },
        featured: false,
        sortOrder: 7,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '8',
        name: '冷萃烏龍',
        description: '冷萃烏龍茶，醇厚回甘',
        price: 65,
        image: 'images/coldtea.webp',
        category: '茶類',
        tags: ['冷萃', '烏龍'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.6, count: 78 },
        featured: true,
        sortOrder: 8,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '9',
        name: '翡翠紅茶',
        description: '翡翠紅茶，色澤翠綠',
        price: 30,
        image: 'images/blacktea1.webp',
        category: '茶類',
        tags: ['翡翠', '紅茶'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.2, count: 65 },
        featured: false,
        sortOrder: 9,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '10',
        name: '芒果冰茶',
        description: '芒果冰茶，果香濃郁',
        price: 70,
        image: 'images/mango-iced.webp',
        category: '茶類',
        tags: ['果香', '冰飲'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.8, count: 78 },
        featured: true,
        sortOrder: 10,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '11',
        name: '桂花烏龍',
        description: '桂花烏龍茶，花香四溢',
        price: 55,
        image: 'images/Osmanthus Oolong Tea.webp',
        category: '茶類',
        tags: ['花香', '烏龍'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.4, count: 55 },
        featured: false,
        sortOrder: 11,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '12',
        name: '莓果氣泡飲',
        description: '莓果氣泡飲，清爽解暑',
        price: 75,
        image: 'images/berry-sparkling.webp',
        category: '茶類',
        tags: ['氣泡', '果香'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.6, count: 68 },
        featured: true,
        sortOrder: 12,
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

// 獲取所有產品（管理員專用）
router.get('/admin/all', adminAuth, [
    query('page').optional().isInt({ min: 1 }).withMessage('頁碼必須是正整數'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('每頁數量必須在1-50之間'),
    query('category').optional().isIn(['咖啡', '茶類']).withMessage('無效的分類'),
    query('search').optional().isString().withMessage('搜索關鍵字必須是字符串'),
    query('status').optional().isIn(['available', 'unavailable', 'all']).withMessage('無效的狀態')
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

        const {
            page = 1,
            limit = 10,
            category,
            search,
            status = 'all'
        } = req.query;

        let products, total;
        
        try {
            // 嘗試使用數據庫
            // 構建查詢條件
            const query = {};

            if (category) {
                query.category = category;
            }

            if (status === 'available') {
                query.isAvailable = true;
            } else if (status === 'unavailable') {
                query.isAvailable = false;
            }

            if (search) {
                query.$text = { $search: search };
            }

            // 執行查詢
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            [products, total] = await Promise.all([
                Product.find(query)
                    .sort({ sortOrder: 1, createdAt: -1 })
                    .skip(skip)
                    .limit(parseInt(limit)),
                Product.countDocuments(query)
            ]);
        } catch (dbError) {
            console.log('數據庫查詢失敗，使用內存數據:', dbError.message);
            
            // 使用內存數據
            let filteredProducts = [...memoryProducts];
            
            // 應用過濾條件
            if (category) {
                filteredProducts = filteredProducts.filter(p => p.category === category);
            }
            
            if (status === 'available') {
                filteredProducts = filteredProducts.filter(p => p.isAvailable);
            } else if (status === 'unavailable') {
                filteredProducts = filteredProducts.filter(p => !p.isAvailable);
            }
            
            if (search) {
                const searchLower = search.toLowerCase();
                filteredProducts = filteredProducts.filter(p => 
                    p.name.toLowerCase().includes(searchLower) ||
                    p.description.toLowerCase().includes(searchLower)
                );
            }

            // 分頁
            const skip = (parseInt(page) - 1) * parseInt(limit);
            products = filteredProducts.slice(skip, skip + parseInt(limit));
            total = filteredProducts.length;
        }

        // 計算分頁信息
        const totalPages = Math.ceil(total / parseInt(limit));
        const hasNext = parseInt(page) < totalPages;
        const hasPrev = parseInt(page) > 1;

        res.json({
            success: true,
            data: {
                products,
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
        console.error('獲取產品列表錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取產品列表失敗'
        });
    }
});

// 獲取產品統計（管理員專用）
router.get('/admin/stats', adminAuth, async (req, res) => {
    try {
        console.log('📊 開始獲取產品統計...');
        
        let totalProducts, availableProducts, unavailableProducts;
        
        try {
            totalProducts = await Product.countDocuments({});
            availableProducts = await Product.countDocuments({ isAvailable: true });
            unavailableProducts = await Product.countDocuments({ isAvailable: false });
        } catch (dbError) {
            console.log('數據庫查詢失敗，使用內存數據統計:', dbError.message);
            totalProducts = memoryProducts.length;
            availableProducts = memoryProducts.filter(p => p.isAvailable).length;
            unavailableProducts = memoryProducts.filter(p => !p.isAvailable).length;
        }
        
        console.log('📊 產品統計結果:', {
            totalProducts,
            availableProducts,
            unavailableProducts
        });
        
        res.json({
            success: true,
            data: {
                totalProducts,
                availableProducts,
                unavailableProducts
            }
        });
    } catch (error) {
        console.error('獲取產品統計錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取產品統計失敗'
        });
    }
});

// 獲取產品總數（快速統計）
router.get('/count', adminAuth, async (req, res) => {
    try {
        let total;
        
        try {
            total = await Product.countDocuments({});
        } catch (dbError) {
            console.log('數據庫查詢失敗，使用內存數據:', dbError.message);
            total = memoryProducts.length;
        }
        
        res.json({
            success: true,
            data: {
                total
            }
        });
    } catch (error) {
        console.error('獲取產品總數錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取產品總數失敗'
        });
    }
});

// 獲取產品列表
router.get('/', [
    query('page').optional().isInt({ min: 1 }).withMessage('頁碼必須是正整數'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('每頁數量必須在1-50之間'),
    query('category').optional().isIn(['咖啡', '茶類']).withMessage('無效的分類'),
    query('search').optional().isString().withMessage('搜索關鍵字必須是字符串'),
    query('sort').optional().isIn(['price_asc', 'price_desc', 'name_asc', 'name_desc', 'created_desc']).withMessage('無效的排序方式'),
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

        const {
            page = 1,
            limit = 12,
            category,
            search,
            sort = 'sortOrder',
            featured
        } = req.query;

        let products, total;
        
        try {
            // 嘗試使用數據庫
            // 構建查詢條件
            const query = { isAvailable: true };

            if (category) {
                query.category = category;
            }

            if (featured !== undefined) {
                query.featured = featured === 'true';
            }

            if (search) {
                query.$text = { $search: search };
            }

            // 構建排序條件
            let sortOption = {};
            switch (sort) {
                case 'price_asc':
                    sortOption = { price: 1 };
                    break;
                case 'price_desc':
                    sortOption = { price: -1 };
                    break;
                case 'name_asc':
                    sortOption = { name: 1 };
                    break;
                case 'name_desc':
                    sortOption = { name: -1 };
                    break;
                case 'created_desc':
                    sortOption = { createdAt: -1 };
                    break;
                default:
                    sortOption = { sortOrder: 1 };
            }

            // 執行查詢
            const skip = (parseInt(page) - 1) * parseInt(limit);
            
            [products, total] = await Promise.all([
                Product.find(query)
                    .sort(sortOption)
                    .skip(skip)
                    .limit(parseInt(limit)),
                Product.countDocuments(query)
            ]);
        } catch (dbError) {
            console.log('數據庫查詢失敗，使用內存數據:', dbError.message);
            
            // 使用內存數據
            let filteredProducts = memoryProducts.filter(p => p.isAvailable);
            
            // 應用過濾條件
            if (category) {
                filteredProducts = filteredProducts.filter(p => p.category === category);
            }
            
            if (featured !== undefined) {
                filteredProducts = filteredProducts.filter(p => p.featured === (featured === 'true'));
            }
            
            if (search) {
                const searchLower = search.toLowerCase();
                filteredProducts = filteredProducts.filter(p => 
                    p.name.toLowerCase().includes(searchLower) ||
                    p.description.toLowerCase().includes(searchLower)
                );
            }
            
            // 應用排序
            switch (sort) {
                case 'price_asc':
                    filteredProducts.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    filteredProducts.sort((a, b) => b.price - a.price);
                    break;
                case 'name_asc':
                    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'name_desc':
                    filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
                    break;
                case 'created_desc':
                    filteredProducts.sort((a, b) => b.createdAt - a.createdAt);
                    break;
                default:
                    filteredProducts.sort((a, b) => a.sortOrder - b.sortOrder);
            }
            
            total = filteredProducts.length;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            products = filteredProducts.slice(skip, skip + parseInt(limit));
        }

        // 計算分頁信息
        const totalPages = Math.ceil(total / parseInt(limit));
        const hasNext = parseInt(page) < totalPages;
        const hasPrev = parseInt(page) > 1;

        res.json({
            success: true,
            data: {
                products,
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
        console.error('獲取產品列表錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取產品列表失敗'
        });
    }
});

// 獲取單個產品
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: '產品不存在'
            });
        }

        if (!product.isAvailable) {
            return res.status(404).json({
                success: false,
                message: '產品已下架'
            });
        }

        res.json({
            success: true,
            data: { product }
        });

    } catch (error) {
        console.error('獲取產品詳情錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取產品詳情失敗'
        });
    }
});

// 添加產品（管理員）
router.post('/', adminAuth, [
    body('name')
        .isLength({ min: 1, max: 100 })
        .withMessage('產品名稱長度必須在1-100個字符之間'),
    body('description')
        .isLength({ min: 1, max: 500 })
        .withMessage('產品描述長度必須在1-500個字符之間'),
    body('price')
        .isFloat({ min: 0 })
        .withMessage('價格必須是非負數'),
    body('image')
        .notEmpty()
        .withMessage('產品圖片是必需的'),
    body('category')
        .isIn(['咖啡', '茶類'])
        .withMessage('無效的產品分類'),
    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('庫存必須是非負整數'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('標籤必須是數組格式'),
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

        const {
            name,
            description,
            price,
            image,
            category,
            tags = [],
            stock = 0,
            featured = false,
            sortOrder = 0
        } = req.body;

        // 檢查產品名稱是否已存在
        const existingProduct = await Product.findOne({ name });
        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: '產品名稱已存在'
            });
        }

        // 創建新產品
        const product = new Product({
            name,
            description,
            price,
            image,
            category,
            tags,
            stock,
            featured,
            sortOrder
        });

        await product.save();

        res.status(201).json({
            success: true,
            message: '產品添加成功',
            data: { product }
        });

    } catch (error) {
        console.error('添加產品錯誤:', error);
        res.status(500).json({
            success: false,
            message: '添加產品失敗'
        });
    }
});

// 更新產品（管理員）
router.put('/:id', adminAuth, [
    body('name')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('產品名稱長度必須在1-100個字符之間'),
    body('description')
        .optional()
        .isLength({ min: 1, max: 500 })
        .withMessage('產品描述長度必須在1-500個字符之間'),
    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('價格必須是非負數'),
    body('category')
        .optional()
        .isIn(['咖啡', '茶類'])
        .withMessage('無效的產品分類'),
    body('stock')
        .optional()
        .isInt({ min: 0 })
        .withMessage('庫存必須是非負整數'),
    body('isAvailable')
        .optional()
        .isBoolean()
        .withMessage('isAvailable必須是布爾值'),
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

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: '產品不存在'
            });
        }

        // 檢查產品名稱是否已被其他產品使用
        if (req.body.name && req.body.name !== product.name) {
            const existingProduct = await Product.findOne({ 
                name: req.body.name,
                _id: { $ne: req.params.id }
            });
            
            if (existingProduct) {
                return res.status(400).json({
                    success: false,
                    message: '產品名稱已被使用'
                });
            }
        }

        // 更新產品
        Object.keys(req.body).forEach(key => {
            if (req.body[key] !== undefined) {
                product[key] = req.body[key];
            }
        });

        await product.save();

        res.json({
            success: true,
            message: '產品更新成功',
            data: { product }
        });

    } catch (error) {
        console.error('更新產品錯誤:', error);
        res.status(500).json({
            success: false,
            message: '更新產品失敗'
        });
    }
});

// 刪除產品（管理員）
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: '產品不存在'
            });
        }

        await Product.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: '產品刪除成功'
        });

    } catch (error) {
        console.error('刪除產品錯誤:', error);
        res.status(500).json({
            success: false,
            message: '刪除產品失敗'
        });
    }
});

// 獲取產品分類
router.get('/categories/list', async (req, res) => {
    try {
        const categories = await Product.distinct('category');
        
        res.json({
            success: true,
            data: { categories }
        });

    } catch (error) {
        console.error('獲取產品分類錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取產品分類失敗'
        });
    }
});

// 獲取熱門產品
router.get('/featured/list', async (req, res) => {
    try {
        const products = await Product.find({ 
            featured: true, 
            isAvailable: true 
        })
        .sort({ sortOrder: 1, salesCount: -1 })
        .limit(6)
        .lean();

        res.json({
            success: true,
            data: { products }
        });

    } catch (error) {
        console.error('獲取熱門產品錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取熱門產品失敗'
        });
    }
});

module.exports = router; 