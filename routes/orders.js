const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// 生成訂單號碼的函數
function generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${timestamp}${random}`;
}

// 產品查詢緩存
const productCache = new Map();
const PRODUCT_CACHE_DURATION = 5 * 60 * 1000; // 5分鐘緩存

// 緩存產品查詢
async function getCachedProduct(name) {
    const now = Date.now();
    const cached = productCache.get(name);
    
    if (cached && (now - cached.timestamp) < PRODUCT_CACHE_DURATION) {
        return cached.product;
    }
    
    try {
        const product = await Product.findOne({ name });
        productCache.set(name, {
            product,
            timestamp: now
        });
        return product;
    } catch (error) {
        console.error('產品查詢失敗:', error);
        return null;
    }
}

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

// 前台結帳（無需登入） - 高優先級路由
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
    console.log('🚀 結帳請求開始:', new Date().toISOString());
    const startTime = Date.now();
    
    // 檢查數據庫連接狀態
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    console.log('📊 數據庫連接狀態:', dbStatusText[dbStatus] || 'unknown', `(${dbStatus})`);
    
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
            notes = '前台結帳',
            orderNumber = ''
        } = req.body;

        // 快速驗證產品並更新庫存 - 優先使用內存數據
        const orderItems = [];
        let calculatedTotal = 0;
        
        // ⚡ 環境檢測 - 在外部定義一次
        const isProduction = process.env.NODE_ENV === 'production';
        console.log(`🌍 當前環境: ${isProduction ? '生產環境（極速模式）' : '開發環境'}`);

        console.log(`⚡ 開始處理 ${items.length} 個訂單項目`);

        for (const item of items) {
            const itemStartTime = Date.now();
            
            // 提取基礎產品名稱（移除客制化信息）
            let baseProductName = item.name
                .replace(/\s*\([^)]*\)/g, '') // 移除括号及其内容
                .replace(/\s*\+[^)]*$/g, '') // 移除 + 开头的加料信息
                .trim();
            
            // ⚡ 超高速產品查詢 - 生產環境優化
            let product = null;
            
            if (isProduction) {
                // 🚀 生產環境：優先使用內存數據（極速模式）
                product = memoryProducts.find(p => p.name === baseProductName) || 
                         memoryProducts.find(p => p.name.includes(baseProductName.split(' ')[0]));
                
                // 如果內存中沒有，才嘗試快速資料庫查詢
                if (!product) {
                    try {
                        const quickPromise = getCachedProduct(baseProductName);
                        const quickTimeout = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('快速查詢超時')), 500) // 僅500ms超時
                        );
                        product = await Promise.race([quickPromise, quickTimeout]);
                        console.log(`⚡ 快速DB查詢: ${baseProductName}`);
                    } catch (dbError) {
                        // 使用默認產品資料（確保結帳不會失敗）
                        product = { name: baseProductName, price: 50, isAvailable: true, stock: 100 };
                        console.log(`🔄 使用默認產品: ${baseProductName}`);
                    }
                }
            } else {
                // 🔄 開發環境：優先使用數據庫（確保資料正確性）
                try {
                    const productPromise = getCachedProduct(baseProductName);
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('數據庫查詢超時')), 3000)
                    );
                    
                    product = await Promise.race([productPromise, timeoutPromise]);
                    console.log(`✅ 從數據庫獲取產品: ${baseProductName}`);
                } catch (dbError) {
                    console.log(`⚠️ 數據庫查詢失敗，使用內存備用數據: ${baseProductName}`, dbError.message);
                    product = memoryProducts.find(p => p.name === baseProductName) || 
                             memoryProducts.find(p => p.name.includes(baseProductName.split(' ')[0]));
                }
            }
            
            console.log(`⏱️ 項目處理時間: ${Date.now() - itemStartTime}ms - ${baseProductName}`);
            
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

            // 處理產品ID - 如果是內存產品（字符串ID），則不設置product字段
            const orderItem = {
                name: item.name, // 保留原始名称（包含客制化信息）
                price: item.price, // 使用前端发送的价格（可能包含加料费用）
                quantity: item.quantity,
                subtotal,
                customizations: item.customizations || '', // 保存客制化信息
                specialRequest: item.specialRequest || '' // 保存特殊需求
            };
            
            // 只有當產品有有效的ObjectId時才設置product字段
            if (product._id && typeof product._id === 'object' && product._id.toString().length === 24) {
                orderItem.product = product._id;
            }
            
            orderItems.push(orderItem);

            // 更新庫存
            try {
                if (product._id && typeof product._id === 'object' && product._id.toString().length === 24) {
                    // 數據庫產品：直接更新資料庫
                    console.log(`📦 更新資料庫庫存: ${baseProductName}, 當前庫存: ${product.stock}, 減少: ${item.quantity}`);
                    
                    // 使用 findOneAndUpdate 確保原子性操作
                    const updatedProduct = await Product.findOneAndUpdate(
                        { _id: product._id },
                        { 
                            $inc: { 
                                stock: -item.quantity,
                                salesCount: item.quantity 
                            }
                        },
                        { new: true, runValidators: true }
                    );
                    
                    if (updatedProduct) {
                        console.log(`✅ 資料庫庫存更新成功: ${baseProductName}, 新庫存: ${updatedProduct.stock}`);
                        // 更新內存中的產品數據
                        product.stock = updatedProduct.stock;
                        product.salesCount = updatedProduct.salesCount;
                        
                        // 發送庫存變更通知到後台
                        try {
                            const serverModule = require('../server');
                            if (serverModule && typeof serverModule.notifyStockChange === 'function') {
                                serverModule.notifyStockChange(
                                    product._id,
                                    baseProductName,
                                    product.stock + item.quantity, // 舊庫存
                                    updatedProduct.stock, // 新庫存
                                    'decrease'
                                );
                            }
                        } catch (notifyError) {
                            console.log('⚠️ 庫存通知發送失敗:', notifyError.message);
                        }
                    } else {
                        console.error(`❌ 資料庫庫存更新失敗: ${baseProductName}`);
                    }
                } else {
                    // 內存產品：更新內存數據
                    console.log(`📦 更新內存庫存: ${baseProductName}, 當前庫存: ${product.stock}, 減少: ${item.quantity}`);
                    product.stock -= item.quantity;
                    product.salesCount = (product.salesCount || 0) + item.quantity;
                    
                                            // 嘗試同步到資料庫（如果產品名稱匹配）
                        try {
                            const dbProduct = await Product.findOne({ name: baseProductName });
                            if (dbProduct) {
                                const updatedDbProduct = await Product.findOneAndUpdate(
                                    { _id: dbProduct._id },
                                    { 
                                        $inc: { 
                                            stock: -item.quantity,
                                            salesCount: item.quantity 
                                        }
                                    },
                                    { new: true, runValidators: true }
                                );
                                console.log(`✅ 內存產品同步到資料庫成功: ${baseProductName}`);
                                
                                // 發送庫存變更通知到後台
                                try {
                                    const serverModule = require('../server');
                                    if (serverModule && typeof serverModule.notifyStockChange === 'function') {
                                        serverModule.notifyStockChange(
                                            dbProduct._id,
                                            baseProductName,
                                            dbProduct.stock, // 舊庫存
                                            updatedDbProduct.stock, // 新庫存
                                            'decrease'
                                        );
                                    }
                                } catch (notifyError) {
                                    console.log('⚠️ 內存產品庫存通知發送失敗:', notifyError.message);
                                }
                            }
                        } catch (syncError) {
                            console.log(`⚠️ 內存產品同步到資料庫失敗: ${baseProductName}`, syncError.message);
                        }
                }
            } catch (stockError) {
                console.error(`❌ 庫存更新失敗: ${baseProductName}`, stockError.message);
                // 不中斷訂單流程，只記錄錯誤
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

        // 智能訂單創建 - 快速響應 + 非同步保存
        console.log('💾 開始創建訂單...');
        const orderCreationStart = Date.now();
        
        // 生成訂單號碼（如果沒有提供）
        const finalOrderNumber = orderNumber || generateOrderNumber();
        
        // 創建訂單數據
        const orderData = {
            user: null,
            items: orderItems,
            totalAmount: totalAmount,
            paymentMethod,
            deliveryMethod,
            notes,
            orderNumber: finalOrderNumber,
            status: 'pending',
            paymentStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        let order = null;
        
        // 強化的訂單保存機制 - 多次重試
        const saveOrderWithRetry = async (orderData, maxRetries = 3) => {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`💾 嘗試保存訂單 (第 ${attempt}/${maxRetries} 次)...`);
                    const saveStart = Date.now();
                    
                    const newOrder = new Order(orderData);
                    const savedOrder = await newOrder.save();
                    
                    console.log(`✅ 訂單保存成功！耗時: ${Date.now() - saveStart}ms`);
                    return savedOrder;
                    
                } catch (error) {
                    console.error(`❌ 第 ${attempt} 次保存失敗:`, error.message);
                    
                    if (attempt === maxRetries) {
                        throw error; // 最後一次嘗試失敗，拋出錯誤
                    }
                    
                    // 等待一段時間後重試
                    const waitTime = attempt * 500; // 500ms, 1000ms, 1500ms
                    console.log(`⏳ 等待 ${waitTime}ms 後重試...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        };
        
        // ⚡ 超高速訂單保存策略
        if (isProduction) {
            // 🚀 生產環境：極速模式 - 立即響應，背景保存
            console.log('⚡ 啟用極速模式：立即響應客戶');
            
            order = {
                _id: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                ...orderData
            };
            
            // 非同步背景保存（不阻塞響應）
            setImmediate(async () => {
                console.log('🔄 背景保存訂單（極速模式）...');
                
                for (let retry = 1; retry <= 20; retry++) { // 增加重試次數
                    try {
                        const backgroundOrder = new Order(orderData);
                        const saved = await backgroundOrder.save();
                        console.log(`✅ 極速背景保存成功！真實 ID: ${saved._id} (第 ${retry} 次嘗試)`);
                        return;
                        
                    } catch (retryError) {
                        console.error(`❌ 極速背景保存第 ${retry} 次失敗:`, retryError.message);
                        
                        if (retry < 20) {
                            const waitTime = Math.min(retry * 500, 5000); // 更短的等待時間
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        } else {
                            console.error('💥 極速背景保存完全失敗！');
                        }
                    }
                }
            });
            
        } else {
            // 🔄 開發環境：嘗試正常保存
            try {
                order = await saveOrderWithRetry(orderData);
                console.log('🎉 開發環境訂單已保存到數據庫');
                
            } catch (dbError) {
                console.error('💥 開發環境數據庫保存失敗:', dbError.message);
                console.log('🔄 啟動開發環境後台保存...');
                
                order = {
                    _id: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    ...orderData
                };
                
                setImmediate(async () => {
                    for (let retry = 1; retry <= 10; retry++) {
                        try {
                            const backgroundOrder = new Order(orderData);
                            await backgroundOrder.save();
                            console.log(`🎉 開發環境後台保存成功！(第 ${retry} 次嘗試)`);
                            return;
                            
                        } catch (retryError) {
                            console.error(`❌ 開發環境後台保存第 ${retry} 次失敗:`, retryError.message);
                            
                            if (retry < 10) {
                                const waitTime = retry * 2000;
                                await new Promise(resolve => setTimeout(resolve, waitTime));
                            }
                        }
                    }
                    console.error('💥 開發環境所有後台保存嘗試都失敗了！');
                });
            }
        }
        
        console.log(`💾 訂單創建時間: ${Date.now() - orderCreationStart}ms`);
        
        const totalTime = Date.now() - startTime;
        console.log(`🎉 結帳完成，總處理時間: ${totalTime}ms`);

        res.status(201).json({
            success: true,
            message: '訂單創建成功',
            data: { 
                order,
                orderNumber: finalOrderNumber
            },
            processingTime: totalTime // 添加處理時間信息
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
            data: { 
                order,
                orderNumber: finalOrderNumber
            }
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
    body('status').optional().isIn(['pending', 'completed', 'cancelled']).withMessage('無效的訂單狀態')
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

        // 創建訂單項目並更新庫存
        const orderItems = [];
        
        for (const item of items) {
            if (process.env.NODE_ENV === 'development') {
                console.log('🔍 內用訂單項目:', item);
                console.log('🔍 內用訂單客制化信息:', item.customizations);
                console.log('🔍 內用訂單特殊需求:', item.specialRequest);
            }
            
            // 提取基礎產品名稱（移除客制化信息）
            let baseProductName = item.name
                .replace(/\s*\([^)]*\)/g, '') // 移除括号及其内容
                .replace(/\s*\+[^)]*$/g, '') // 移除 + 开头的加料信息
                .trim();
            
            // 查找產品
            let product = null;
            try {
                product = await getCachedProduct(baseProductName);
                if (!product) {
                    product = memoryProducts.find(p => p.name === baseProductName) || 
                             memoryProducts.find(p => p.name.includes(baseProductName.split(' ')[0]));
                }
            } catch (error) {
                console.log(`⚠️ 產品查詢失敗: ${baseProductName}`, error.message);
                product = memoryProducts.find(p => p.name === baseProductName) || 
                         memoryProducts.find(p => p.name.includes(baseProductName.split(' ')[0]));
            }
            
            const orderItem = {
                name: item.name,
                price: parseFloat(item.price) || 0,
                quantity: parseInt(item.quantity) || 1,
                subtotal: (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
                customizations: item.customizations || '', // 保存客制化信息
                specialRequest: item.specialRequest || '' // 保存特殊需求
            };
            
            // 只有當產品有有效的ObjectId時才設置product字段
            if (product && product._id && typeof product._id === 'object' && product._id.toString().length === 24) {
                orderItem.product = product._id;
            }
            
            orderItems.push(orderItem);
            
            // 更新庫存
            if (product) {
                try {
                    if (product._id && typeof product._id === 'object' && product._id.toString().length === 24) {
                        // 數據庫產品：直接更新資料庫
                        console.log(`📦 內用訂單更新資料庫庫存: ${baseProductName}, 當前庫存: ${product.stock}, 減少: ${item.quantity}`);
                        
                        const updatedProduct = await Product.findOneAndUpdate(
                            { _id: product._id },
                            { 
                                $inc: { 
                                    stock: -item.quantity,
                                    salesCount: item.quantity 
                                }
                            },
                            { new: true, runValidators: true }
                        );
                        
                        if (updatedProduct) {
                            console.log(`✅ 內用訂單資料庫庫存更新成功: ${baseProductName}, 新庫存: ${updatedProduct.stock}`);
                            product.stock = updatedProduct.stock;
                            product.salesCount = updatedProduct.salesCount;
                            
                            // 發送庫存變更通知到後台
                            try {
                                const serverModule = require('../server');
                                if (serverModule && typeof serverModule.notifyStockChange === 'function') {
                                    serverModule.notifyStockChange(
                                        product._id,
                                        baseProductName,
                                        product.stock + item.quantity, // 舊庫存
                                        updatedProduct.stock, // 新庫存
                                        'decrease'
                                    );
                                }
                            } catch (notifyError) {
                                console.log('⚠️ 內用訂單庫存通知發送失敗:', notifyError.message);
                            }
                        } else {
                            console.error(`❌ 內用訂單資料庫庫存更新失敗: ${baseProductName}`);
                        }
                    } else {
                        // 內存產品：更新內存數據
                        console.log(`📦 內用訂單更新內存庫存: ${baseProductName}, 當前庫存: ${product.stock}, 減少: ${item.quantity}`);
                        product.stock -= item.quantity;
                        product.salesCount = (product.salesCount || 0) + item.quantity;
                        
                                                        // 嘗試同步到資料庫
                                try {
                                    const dbProduct = await Product.findOne({ name: baseProductName });
                                    if (dbProduct) {
                                        const updatedDbProduct = await Product.findOneAndUpdate(
                                            { _id: dbProduct._id },
                                            { 
                                                $inc: { 
                                                    stock: -item.quantity,
                                                    salesCount: item.quantity 
                                                }
                                            },
                                            { new: true, runValidators: true }
                                        );
                                        console.log(`✅ 內用訂單內存產品同步到資料庫成功: ${baseProductName}`);
                                        
                                        // 發送庫存變更通知到後台
                                        try {
                                            const serverModule = require('../server');
                                            if (serverModule && typeof serverModule.notifyStockChange === 'function') {
                                                serverModule.notifyStockChange(
                                                    dbProduct._id,
                                                    baseProductName,
                                                    dbProduct.stock, // 舊庫存
                                                    updatedDbProduct.stock, // 新庫存
                                                    'decrease'
                                                );
                                            }
                                        } catch (notifyError) {
                                            console.log('⚠️ 內用訂單內存產品庫存通知發送失敗:', notifyError.message);
                                        }
                                    }
                                } catch (syncError) {
                                    console.log(`⚠️ 內用訂單內存產品同步到資料庫失敗: ${baseProductName}`, syncError.message);
                                }
                    }
                } catch (stockError) {
                    console.error(`❌ 內用訂單庫存更新失敗: ${baseProductName}`, stockError.message);
                }
            }
            
            console.log('📝 創建的訂單項目:', orderItem);
        }

        // 創建內用訂單 - 使用智能保存機制
        console.log('🍽️ 開始創建內用訂單，桌號:', tableNumber);
        
        const orderData = {
            tableNumber,
            area,
            items: orderItems,
            totalAmount: parseFloat(total) || 0,
            orderType,
            status,
            deliveryMethod: 'dine-in',
            paymentMethod: 'cash',
            notes: '前台結帳',
            orderTime: orderTime ? new Date(orderTime) : new Date()
        };
        
        console.log('📤 準備保存的訂單數據:', JSON.stringify(orderData, null, 2));
        
        let order = null;
        
        // 嘗試快速保存到數據庫
        try {
            const newOrder = new Order(orderData);
            console.log('📝 創建的 Order 實例:', newOrder);
            
            const savedOrder = await newOrder.save();
            console.log('✅ 內用訂單已快速保存到數據庫');
            console.log('📥 保存後的數據:', JSON.stringify(savedOrder.toObject(), null, 2));
            
            order = savedOrder;
            
        } catch (dbError) {
            console.log('⚠️ 內用訂單數據庫保存失敗:', dbError.message);
            
            // 創建內存訂單（包含完整數據）
            order = {
                _id: 'dine_order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                ...orderData,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            // 非同步保存到數據庫
            setImmediate(async () => {
                try {
                    console.log('🔄 開始後台保存內用訂單...');
                    const backgroundOrder = new Order(orderData);
                    const savedOrder = await backgroundOrder.save();
                    console.log('✅ 內用訂單已成功後台保存到數據庫');
                    console.log('📥 後台保存的數據:', JSON.stringify(savedOrder.toObject(), null, 2));
                } catch (backgroundError) {
                    console.error('❌ 內用訂單後台保存失敗:', backgroundError.message);
                }
            });
        }

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
    query('status').optional().isIn(['pending', 'completed', 'cancelled']).withMessage('無效的訂單狀態')
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





// 查詢最近的訂單（用於自動刷新）- 無需認證
router.get('/recent', async (req, res) => {
    console.log('🔍 /recent 端點被調用，無認證要求');
    try {
        console.log('🔍 查詢最近的訂單...');
        
        // 檢查資料庫連接狀態
        const mongoose = require('mongoose');
        const dbStatus = mongoose.connection.readyState;
        const dbStatusText = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        console.log(`📊 資料庫狀態: ${dbStatusText[dbStatus]} (${dbStatus})`);
        
        // 如果資料庫未連接，返回空數據而不是錯誤
        if (dbStatus !== 1) {
            console.warn('⚠️ 資料庫未連接，返回空數據');
            return res.json({
                success: true,
                count: 0,
                data: [],
                databaseStatus: dbStatusText[dbStatus],
                message: '資料庫連接中，暫時無訂單數據'
            });
        }
        
        // 查詢最近 10 個訂單，返回完整數據用於分析
        const queryPromise = Order.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
            
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('查詢超時')), 3000) // 減少超時時間
        );
        
        const recentOrders = await Promise.race([queryPromise, timeoutPromise]);
            
        console.log(`📊 找到 ${recentOrders.length} 個最近訂單`);
        
        res.json({
            success: true,
            count: recentOrders.length,
            data: recentOrders,
            databaseStatus: 'connected'
        });
        
    } catch (error) {
        console.error('❌ 查詢最近訂單失敗:', error);
        
        // 提供更詳細的錯誤信息
        let errorMessage = error.message;
        if (error.message.includes('buffering')) {
            errorMessage = '資料庫連接中，請稍後重試';
        } else if (error.message.includes('timeout')) {
            errorMessage = '查詢超時，請檢查網路連接';
        } else if (error.message.includes('ECONNREFUSED')) {
            errorMessage = '無法連接到資料庫服務器';
        } else if (error.message.includes('ENOTFOUND')) {
            errorMessage = '資料庫主機名無法解析';
        }
        
        // 返回200狀態碼而不是500，避免前端停止自動刷新
        res.json({
            success: false,
            count: 0,
            data: [],
            error: errorMessage,
            databaseStatus: 'error',
            timestamp: new Date().toISOString()
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
        // 邏輯：只計算在前端"特殊需求"欄位會顯示內容的訂單
        // 包含：1) 有 specialRequest 字段 2) 有加料(+) 3) 有其他非標準客製化
        const allOrders = await Order.find({}).lean();
        let ordersWithNotes = 0;
        
        allOrders.forEach(order => {
            const hasSpecialRequest = order.items.some(item => {
                // 檢查 specialRequest 字段
                if (item.specialRequest && item.specialRequest.trim() !== '') {
                    return true;
                }
                
                // 檢查 customizations 字段
                if (item.customizations && item.customizations.trim() !== '') {
                    const customizations = item.customizations.trim();
                    const standardCustomizations = ['無糖', '微糖', '半糖', '少糖', '全糖', '去冰', '微冰', '少冰', '正常冰', '熱飲'];
                    
                    // 檢查是否有加料
                    if (customizations.includes('+')) {
                        return true;
                    }
                    
                    // 檢查是否有其他特殊需求（非標準客製化）
                    const hasOtherSpecialRequests = customizations.split(',').some(part => {
                        const trimmedPart = part.trim();
                        return trimmedPart && 
                               !standardCustomizations.some(standard => trimmedPart.includes(standard)) &&
                               !trimmedPart.includes('+');
                    });
                    
                    if (hasOtherSpecialRequests) {
                        return true;
                    }
                }
                
                return false;
            });
            
            if (hasSpecialRequest) {
                ordersWithNotes++;
            }
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
        
        // 計算總收入（只計算已完成的訂單）
        const totalRevenue = await Order.aggregate([
            {
                $match: {
                    status: 'completed'
                }
            },
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
    query('status').optional().isIn(['pending', 'completed', 'cancelled']).withMessage('無效的訂單狀態'),
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

        if (process.env.NODE_ENV === 'development') {
            console.log('🟢 後台API回傳的訂單資料:', orders.map(order => ({
                _id: order._id,
                tableNumber: order.tableNumber,
                orderType: order.orderType
            })));
        }

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
    body('status').isIn(['pending', 'completed', 'cancelled']).withMessage('無效的訂單狀態'),
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



// 測試數據庫連接的簡單端點
router.get('/test-db', async (req, res) => {
    try {
        console.log('🧪 開始測試數據庫連接...');
        
        const mongoose = require('mongoose');
        const dbStatus = mongoose.connection.readyState;
        const dbStatusText = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        
        // 嘗試創建一個測試訂單
        const testOrder = new Order({
            user: null,
            items: [{
                name: '測試商品',
                price: 1,
                quantity: 1,
                subtotal: 1
            }],
            totalAmount: 1,
            paymentMethod: 'cash',
            deliveryMethod: 'pickup',
            notes: '數據庫連接測試 - ' + new Date().toISOString()
        });
        
        const savedOrder = await testOrder.save();
        console.log('✅ 測試訂單保存成功:', savedOrder._id);
        
        res.json({
            success: true,
            message: '數據庫連接正常',
            database: {
                status: dbStatusText[dbStatus],
                readyState: dbStatus
            },
            testOrder: {
                id: savedOrder._id,
                createdAt: savedOrder.createdAt
            }
        });
        
    } catch (error) {
        console.error('❌ 數據庫測試失敗:', error);
        res.status(500).json({
            success: false,
            message: '數據庫連接失敗',
            error: error.message,
            stack: error.stack
        });
    }
});

module.exports = router; 