const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// 内存中的产品数据（当MongoDB不可用时使用）
const memoryProducts = [
    {
        _id: '1',
        name: '美式咖啡',
        price: 45,
        isAvailable: true,
        stock: 100
    },
    {
        _id: '2',
        name: '拿鐵咖啡',
        price: 60,
        isAvailable: true,
        stock: 100
    },
    {
        _id: '3',
        name: '紅茶',
        price: 30,
        isAvailable: true,
        stock: 100
    },
    {
        _id: '4',
        name: '綠茶',
        price: 30,
        isAvailable: true,
        stock: 100
    },
    {
        _id: '5',
        name: '星辰奶茶',
        price: 50,
        isAvailable: true,
        stock: 100
    },
    {
        _id: '6',
        name: '夢幻檸茶',
        price: 60,
        isAvailable: true,
        stock: 100
    },
    {
        _id: '7',
        name: '綠霧奶綠',
        price: 55,
        isAvailable: true,
        stock: 100
    },
    {
        _id: '8',
        name: '冷萃烏龍',
        price: 65,
        isAvailable: true,
        stock: 100
    },
    {
        _id: '9',
        name: '翡翠紅茶',
        price: 30,
        isAvailable: true,
        stock: 100
    },
    {
        _id: '10',
        name: '芒果冰茶',
        price: 70,
        isAvailable: true,
        stock: 100
    },
    {
        _id: '11',
        name: '桂花烏龍',
        price: 55,
        isAvailable: true,
        stock: 100
    },
    {
        _id: '12',
        name: '莓果氣泡飲',
        price: 75,
        isAvailable: true,
        stock: 100
    }
];

// 前台結帳（無需登入）
router.post('/checkout', [
    body('items').isArray({ min: 1 }).withMessage('訂單必須包含至少一個商品'),
    body('items.*.name').notEmpty().withMessage('商品名稱不能為空'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('商品價格必須是非負數'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('商品數量至少為1'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('總金額必須是非負數'),
    body('paymentMethod').optional().isIn(['cash', 'credit_card', 'line_pay', 'apple_pay']).withMessage('無效的付款方式'),
    body('deliveryMethod').optional().isIn(['pickup', 'delivery']).withMessage('無效的取餐方式'),
    body('notes').optional().isLength({ max: 200 }).withMessage('備註不能超過200個字符')
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
            items,
            totalAmount,
            paymentMethod = 'cash',
            deliveryMethod = 'pickup',
            notes = '前台結帳'
        } = req.body;

        // 驗證產品並更新庫存
        const orderItems = [];
        let calculatedTotal = 0;

        for (const item of items) {
            console.log('🔍 處理訂單項目:', item);
            console.log('🔍 項目客制化信息:', item.customizations);
            console.log('🔍 項目特殊需求:', item.specialRequest);
            
            // 首先嘗試從數據庫查找產品
            let product = null;
            try {
                // 提取基礎產品名稱（移除客制化信息）
                let baseProductName = item.name;
                
                // 移除客制化信息，如 "(全糖)", "(正常冰)", "+珍珠,椰果" 等
                // 匹配模式：移除括号内的内容，以及 + 开头的加料信息
                baseProductName = baseProductName
                    .replace(/\s*\([^)]*\)/g, '') // 移除括号及其内容
                    .replace(/\s*\+[^)]*$/g, '') // 移除 + 开头的加料信息
                    .trim();
                
                console.log(`🔍 原始商品名稱: "${item.name}"`);
                console.log(`🔍 提取的基礎名稱: "${baseProductName}"`);
                
                product = await Product.findOne({ name: baseProductName });
            } catch (dbError) {
                console.log('數據庫查詢失敗，使用內存數據:', dbError.message);
            }
            
            // 如果數據庫查詢失敗，使用內存數據
            if (!product) {
                // 同樣提取基礎產品名稱
                let baseProductName = item.name
                    .replace(/\s*\([^)]*\)/g, '')
                    .replace(/\s*\+[^)]*$/g, '')
                    .trim();
                
                product = memoryProducts.find(p => p.name === baseProductName);
            }
            
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `產品 ${item.name} 不存在`
                });
            }

            if (!product.isAvailable) {
                return res.status(400).json({
                    success: false,
                    message: `產品 ${product.name} 已下架`
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `產品 ${product.name} 庫存不足，當前庫存: ${product.stock}`
                });
            }

            const subtotal = product.price * item.quantity;
            calculatedTotal += subtotal;

            orderItems.push({
                product: product._id,
                name: item.name, // 保留原始名称（包含客制化信息）
                price: item.price, // 使用前端发送的价格（可能包含加料费用）
                quantity: item.quantity,
                subtotal,
                customizations: item.customizations || '', // 保存客制化信息
                specialRequest: item.specialRequest || '' // 保存特殊需求
            });

            // 更新庫存（如果使用數據庫）
            if (product.save) {
                try {
                    product.stock -= item.quantity;
                    product.salesCount += item.quantity;
                    await product.save();
                } catch (saveError) {
                    console.log('庫存更新失敗:', saveError.message);
                }
            } else {
                // 更新內存中的庫存
                product.stock -= item.quantity;
                product.salesCount = (product.salesCount || 0) + item.quantity;
            }
        }

        // 驗證總金額
        // 注意：前端发送的价格可能包含加料费用，所以使用前端发送的价格计算
        const frontendTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        if (Math.abs(frontendTotal - totalAmount) > 0.01) {
            return res.status(400).json({
                success: false,
                message: '總金額計算錯誤',
                details: {
                    frontendTotal,
                    backendTotal: calculatedTotal,
                    receivedTotal: totalAmount
                }
            });
        }

        // 創建訂單（如果數據庫可用）
        let order = null;
        try {
            order = new Order({
                user: null, // 匿名訂單
                items: orderItems,
                totalAmount: totalAmount, // 使用前端发送的总金额
                paymentMethod,
                deliveryMethod,
                notes
            });

            await order.save();
            await order.populate('user', 'username email phone');
        } catch (orderError) {
            console.log('訂單保存失敗，創建內存訂單:', orderError.message);
            // 創建內存訂單
            order = {
                _id: 'order_' + Date.now(),
                user: null,
                items: orderItems,
                totalAmount: totalAmount, // 使用前端发送的总金额
                paymentMethod,
                deliveryMethod,
                notes,
                status: 'pending',
                paymentStatus: 'pending',
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }

        res.status(201).json({
            success: true,
            message: '訂單創建成功',
            data: { order }
        });

    } catch (error) {
        console.error('創建訂單錯誤:', error);
        console.error('錯誤詳情:', error.message);
        console.error('錯誤堆疊:', error.stack);
        // 在生產環境也顯示詳細錯誤信息以便調試
        res.status(500).json({
            success: false,
            message: '創建訂單失敗',
            error: error.message,
            errorType: error.constructor.name,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'unknown'
        });
    }
});

// 創建訂單（需要登入）
router.post('/', auth, [
    body('items').isArray({ min: 1 }).withMessage('訂單必須包含至少一個商品'),
    body('items.*.productId').isMongoId().withMessage('無效的產品ID'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('商品數量至少為1'),
    body('deliveryMethod').isIn(['pickup', 'delivery']).withMessage('無效的取餐方式'),
    body('paymentMethod').isIn(['cash', 'credit_card', 'line_pay', 'apple_pay']).withMessage('無效的付款方式'),
    body('pickupTime').optional().isISO8601().withMessage('無效的取餐時間'),
    body('deliveryAddress').optional().isObject().withMessage('配送地址格式錯誤'),
    body('notes').optional().isLength({ max: 200 }).withMessage('備註不能超過200個字符')
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
            items,
            deliveryMethod,
            paymentMethod,
            pickupTime,
            deliveryAddress,
            notes
        } = req.body;

        // 驗證產品並獲取產品信息
        const orderItems = [];
        let totalAmount = 0;

        for (const item of items) {
            const product = await Product.findById(item.productId);
            
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: `產品 ${item.productId} 不存在`
                });
            }

            if (!product.isAvailable) {
                return res.status(400).json({
                    success: false,
                    message: `產品 ${product.name} 已下架`
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `產品 ${product.name} 庫存不足`
                });
            }

            const subtotal = product.price * item.quantity;
            totalAmount += subtotal;

            orderItems.push({
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                subtotal
            });

            // 更新庫存
            product.stock -= item.quantity;
            product.salesCount += item.quantity;
            await product.save();
        }

        // 創建訂單
        const order = new Order({
            user: req.user.userId,
            items: orderItems,
            totalAmount,
            deliveryMethod,
            paymentMethod,
            pickupTime: pickupTime ? new Date(pickupTime) : undefined,
            deliveryAddress,
            notes
        });

        await order.save();

        // 填充用戶信息
        await order.populate('user', 'username email phone');

        res.status(201).json({
            success: true,
            message: '訂單創建成功',
            data: { order }
        });

    } catch (error) {
        console.error('創建訂單錯誤:', error);
        console.error('錯誤詳情:', error.message);
        console.error('錯誤堆疊:', error.stack);
        // 在生產環境也顯示詳細錯誤信息以便調試
        res.status(500).json({
            success: false,
            message: '創建訂單失敗',
            error: error.message,
            errorType: error.constructor.name,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'unknown'
        });
    }
});

// 內用點餐訂單（無需登入）
router.post('/dine-in', [
    body('tableNumber').notEmpty().withMessage('桌號不能為空'),
    body('area').optional().isString().withMessage('區域必須是字符串'),
    body('items').isArray({ min: 1 }).withMessage('訂單必須包含至少一個商品'),
    body('items.*.name').notEmpty().withMessage('商品名稱不能為空'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('商品價格必須大於等於0'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('商品數量至少為1'),
    body('total').isFloat({ min: 0 }).withMessage('總金額必須大於等於0'),
    body('orderType').isIn(['dine-in']).withMessage('訂單類型必須是dine-in'),
    body('status').optional().isIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']).withMessage('無效的訂單狀態')
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
            tableNumber,
            area,
            items,
            total,
            orderType,
            status = 'pending',
            orderTime
        } = req.body;
        console.log('🟢 後端收到桌號:', tableNumber);

        // 驗證總金額
        const calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        if (Math.abs(calculatedTotal - total) > 0.01) {
            return res.status(400).json({
                success: false,
                message: '訂單總金額計算錯誤'
            });
        }

        // 創建訂單項目
        const orderItems = items.map(item => {
            console.log('🔍 內用訂單項目:', item);
            console.log('🔍 內用訂單客制化信息:', item.customizations);
            console.log('🔍 內用訂單特殊需求:', item.specialRequest);
            
            return {
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                subtotal: item.price * item.quantity,
                customizations: item.customizations || '', // 保存客制化信息
                specialRequest: item.specialRequest || '' // 保存特殊需求
            };
        });

        // 創建內用訂單
        console.log('🟢 創建訂單時的tableNumber:', tableNumber);
        const order = new Order({
            tableNumber,
            area,
            items: orderItems,
            totalAmount: total,
            orderType,
            status,
            deliveryMethod: 'dine-in',
            paymentMethod: 'cash', // 內用默認現金付款
            notes: '前台結帳',
            orderTime: orderTime ? new Date(orderTime) : new Date()
        });
        console.log('🟢 創建的order物件:', order);
        await order.save();
        console.log('🟢 儲存後的order物件:', order);

        res.status(201).json({
            success: true,
            message: '內用訂單創建成功',
            data: { 
                orderId: order._id,
                tableNumber: order.tableNumber,
                total: order.totalAmount
            }
        });

    } catch (error) {
        console.error('創建內用訂單錯誤:', error);
        res.status(500).json({
            success: false,
            message: '創建內用訂單失敗',
            error: error.message
        });
    }
});

// 獲取用戶訂單列表
router.get('/my-orders', auth, [
    query('page').optional().isInt({ min: 1 }).withMessage('頁碼必須是正整數'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('每頁數量必須在1-20之間'),
    query('status').optional().isIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']).withMessage('無效的訂單狀態')
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

        const { page = 1, limit = 10, status } = req.query;

        // 構建查詢條件
        const query = { user: req.user.userId };
        if (status) {
            query.status = status;
        }

        // 執行查詢
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate('user', 'username email phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Order.countDocuments(query)
        ]);

        // 計算分頁信息
        const totalPages = Math.ceil(total / parseInt(limit));
        const hasNext = parseInt(page) < totalPages;
        const hasPrev = parseInt(page) > 1;

        res.json({
            success: true,
            data: {
                orders,
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
        console.error('獲取用戶訂單錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取訂單列表失敗'
        });
    }
});

// 獲取單個訂單詳情
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'username email phone');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '訂單不存在'
            });
        }

        // 檢查用戶權限
        if (order.user._id.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '無權限查看此訂單'
            });
        }

        res.json({
            success: true,
            data: { order }
        });

    } catch (error) {
        console.error('獲取訂單詳情錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取訂單詳情失敗'
        });
    }
});

// 取消訂單
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '訂單不存在'
            });
        }

        // 檢查用戶權限
        if (order.user.toString() !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: '無權限取消此訂單'
            });
        }

        // 檢查訂單狀態
        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: '只能取消待確認的訂單'
            });
        }

        // 更新訂單狀態
        order.status = 'cancelled';
        await order.save();

        // 恢復庫存
        for (const item of order.items) {
            const product = await Product.findById(item.product);
            if (product) {
                product.stock += item.quantity;
                product.salesCount -= item.quantity;
                await product.save();
            }
        }

        res.json({
            success: true,
            message: '訂單取消成功',
            data: { order }
        });

    } catch (error) {
        console.error('取消訂單錯誤:', error);
        res.status(500).json({
            success: false,
            message: '取消訂單失敗'
        });
    }
});

// 批量刪除已完成訂單（管理員專用）
router.delete('/admin/batch', adminAuth, [
    body('orderIds').optional().isArray().withMessage('orderIds必須是數組'),
    body('deleteAllCompleted').optional().isBoolean().withMessage('deleteAllCompleted必須是布爾值')
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

        const { orderIds, deleteAllCompleted } = req.body;

        let result;

        if (deleteAllCompleted) {
            // 刪除所有已完成的訂單
            result = await Order.deleteMany({ status: 'completed' });
        } else if (orderIds && orderIds.length > 0) {
            // 刪除指定的已完成訂單
            result = await Order.deleteMany({ 
                _id: { $in: orderIds },
                status: 'completed'
            });
        } else {
            return res.status(400).json({
                success: false,
                message: '必須提供orderIds或設置deleteAllCompleted為true'
            });
        }

        res.json({
            success: true,
            message: `成功刪除 ${result.deletedCount} 個已完成訂單`,
            data: {
                deletedCount: result.deletedCount
            }
        });

    } catch (error) {
        console.error('批量刪除訂單錯誤:', error);
        res.status(500).json({
            success: false,
            message: '批量刪除訂單失敗'
        });
    }
});

// 刪除已完成訂單（管理員專用）
router.delete('/admin/:id', adminAuth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '訂單不存在'
            });
        }

        // 檢查訂單狀態，只允許刪除已完成的訂單
        if (order.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: '只能刪除已完成的訂單'
            });
        }

        // 刪除訂單
        await Order.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: '訂單刪除成功'
        });

    } catch (error) {
        console.error('刪除訂單錯誤:', error);
        res.status(500).json({
            success: false,
            message: '刪除訂單失敗'
        });
    }
});

// 管理員：獲取訂單統計
router.get('/admin/stats', adminAuth, async (req, res) => {
    try {
        // 獲取總訂單數
        const totalOrders = await Order.countDocuments();
        
        // 獲取各狀態訂單數量
        const statusStats = await Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        // 轉換為更易用的格式
        const statusCounts = {};
        statusStats.forEach(stat => {
            statusCounts[stat._id] = stat.count;
        });
        
        // 獲取有特殊需求的訂單數量
        const ordersWithNotes = await Order.countDocuments({
            notes: { $exists: true, $ne: null, $ne: '' },
            $expr: { $ne: ['$notes', '前台結帳'] }
        });
        
        // 獲取今日訂單數量
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = await Order.countDocuments({
            createdAt: { $gte: today }
        });
        
        // 獲取本月訂單數量
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const thisMonthOrders = await Order.countDocuments({
            createdAt: { $gte: thisMonth }
        });
        
        // 計算總收入
        const totalRevenue = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);
        
        res.json({
            success: true,
            data: {
                totalOrders,
                statusCounts,
                ordersWithNotes,
                todayOrders,
                thisMonthOrders,
                totalRevenue: totalRevenue[0]?.total || 0
            }
        });
        
    } catch (error) {
        console.error('獲取訂單統計失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取訂單統計失敗'
        });
    }
});

// 管理員：獲取所有訂單
router.get('/admin/all', adminAuth, [
    query('page').optional().isInt({ min: 1 }).withMessage('頁碼必須是正整數'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('每頁數量必須在1-50之間'),
    query('status').optional().isIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']).withMessage('無效的訂單狀態'),
    query('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded']).withMessage('無效的付款狀態')
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

        const { page = 1, limit = 20, status, paymentStatus } = req.query;

        // 構建查詢條件
        const query = {};
        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;

        // 執行查詢
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate('user', 'username email phone')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Order.countDocuments(query)
        ]);

        console.log('🟢 後台API回傳的訂單資料:', orders.map(order => ({
            _id: order._id,
            tableNumber: order.tableNumber,
            orderType: order.orderType
        })));

        // 計算分頁信息
        const totalPages = Math.ceil(total / parseInt(limit));
        const hasNext = parseInt(page) < totalPages;
        const hasPrev = parseInt(page) > 1;

        res.json({
            success: true,
            data: {
                orders,
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
        console.error('獲取所有訂單錯誤:', error);
        res.status(500).json({
            success: false,
            message: '獲取訂單列表失敗'
        });
    }
});

// 管理員：更新訂單狀態
router.put('/admin/:id/status', adminAuth, [
    body('status').isIn(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']).withMessage('無效的訂單狀態'),
    body('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded']).withMessage('無效的付款狀態')
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

        const { status, paymentStatus } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '訂單不存在'
            });
        }

        // 更新訂單狀態
        order.status = status;
        if (paymentStatus) {
            order.paymentStatus = paymentStatus;
        }

        await order.save();

        // 填充用戶信息
        await order.populate('user', 'username email phone');

        res.json({
            success: true,
            message: '訂單狀態更新成功',
            data: { order }
        });

    } catch (error) {
        console.error('更新訂單狀態錯誤:', error);
        res.status(500).json({
            success: false,
            message: '更新訂單狀態失敗'
        });
    }
});

module.exports = router; 