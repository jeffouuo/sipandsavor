const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');
require('dotenv').config();

// 從 init-db.js 複製產品資料
const products = [
    {
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
        sortOrder: 1
    },
    {
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
        sortOrder: 2
    },
    {
        name: '紅茶',
        description: '精選紅茶，回甘醇厚',
        price: 30,
        image: 'images/blacktea.webp',
        category: '茶類',
        tags: ['經典', '回甘'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.3, count: 80 },
        featured: false,
        sortOrder: 3
    },
    {
        name: '綠茶',
        description: '清香綠茶，清新自然',
        price: 30,
        image: 'images/greentea.webp',
        category: '茶類',
        tags: ['清香', '健康'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.2, count: 65 },
        featured: false,
        sortOrder: 4
    },
    {
        name: '星辰奶茶',
        description: '濃郁奶茶，星辰般美味',
        price: 50,
        image: 'images/milk tea.webp',
        category: '奶茶',
        tags: ['濃郁', '香甜'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.6, count: 110 },
        featured: true,
        sortOrder: 5
    },
    {
        name: '夢幻檸茶',
        description: '清新檸檬茶，夢幻口感',
        price: 60,
        image: 'images/lemon black tea.webp',
        category: '特調',
        tags: ['清新', '果香'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.4, count: 75 },
        featured: true,
        sortOrder: 6
    },
    {
        name: '綠霧奶綠',
        description: '抹茶奶綠，綠霧般朦朧',
        price: 55,
        image: 'images/milkgreen.webp',
        category: '奶茶',
        tags: ['抹茶', '奶香'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.5, count: 90 },
        featured: false,
        sortOrder: 7
    },
    {
        name: '冷萃烏龍',
        description: '冷萃烏龍茶，層次豐富',
        price: 65,
        image: 'images/coldtea.webp',
        category: '茶類',
        tags: ['冷萃', '層次'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.8, count: 55 },
        featured: true,
        sortOrder: 8
    },
    {
        name: '翡翠紅茶',
        description: '特級紅茶，翡翠般珍貴',
        price: 30,
        image: 'images/blacktea1.webp',
        category: '茶類',
        tags: ['特級', '珍貴'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.1, count: 45 },
        featured: false,
        sortOrder: 10
    },
    {
        name: '桂花烏龍',
        description: '桂花烏龍茶，花香怡人',
        price: 55,
        image: 'images/Osmanthus Oolong Tea.webp',
        category: '茶類',
        tags: ['花香', '烏龍'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.7, count: 85 },
        featured: true,
        sortOrder: 11
    },
    {
        name: '莓果氣泡飲',
        description: '新鮮莓果氣泡飲，酸甜爽口',
        price: 75,
        image: 'images/berry-sparkling.webp',
        category: '特調',
        tags: ['莓果', '氣泡', '新鮮'],
        isAvailable: true,
        stock: 100,
        salesCount: 0,
        rating: { average: 4.9, count: 125 },
        featured: true,
        sortOrder: 12
    }
];

async function initAtlasDatabase() {
    try {
        console.log('🔗 連接 MongoDB Atlas...');
        console.log('🌐 MONGODB_URI:', process.env.MONGODB_URI ? '已設置' : '未設置');
        console.log('🌍 NODE_ENV:', process.env.NODE_ENV || 'development');
        
        if (!process.env.MONGODB_URI) {
            throw new Error('❌ MONGODB_URI 環境變數未設置！請在 Vercel 中設置 MongoDB Atlas 連接字串');
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // 10秒超時
            socketTimeoutMS: 45000 // 45秒socket超時
        });

        console.log('✅ MongoDB Atlas 連接成功');
        console.log('📍 資料庫名稱:', mongoose.connection.name);
        console.log('🔗 連接狀態:', mongoose.connection.readyState);

        // 清空現有產品數據
        console.log('🗑️ 清空現有產品數據...');
        await Product.deleteMany({});
        console.log('✅ 產品數據已清空');

        // 插入產品數據
        console.log('📝 插入產品數據到 Atlas...');
        const insertedProducts = await Product.insertMany(products);
        console.log(`✅ 成功插入 ${insertedProducts.length} 個產品到 MongoDB Atlas`);

        // 顯示插入的產品
        console.log('\n📋 已上傳到 Atlas 的產品列表:');
        insertedProducts.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} - NT$ ${product.price}`);
        });

        // 檢查管理員用戶
        console.log('\n👤 檢查管理員用戶...');
        const adminEmail = 'admin@sipandsavor.com';
        let adminUser = await User.findOne({ email: adminEmail });

        if (!adminUser) {
            console.log('🔧 創建管理員用戶...');
            adminUser = new User({
                username: 'admin',
                email: adminEmail,
                password: 'admin123', // 會被 pre-save hook 加密
                role: 'admin',
                isActive: true
            });
            await adminUser.save();
            console.log('✅ 管理員用戶已創建');
        } else {
            console.log('✅ 管理員用戶已存在');
        }

        console.log('\n🎉 MongoDB Atlas 資料庫初始化完成！');
        console.log('🔗 您的資料現在存儲在雲端 MongoDB Atlas 中');

    } catch (error) {
        console.error('❌ Atlas 資料庫初始化失敗:', error);
        
        if (error.message.includes('MONGODB_URI')) {
            console.log('\n💡 解決方案:');
            console.log('1. 登入 https://vercel.com');
            console.log('2. 進入您的 sipandsavor 專案');
            console.log('3. 點擊 Settings > Environment Variables');
            console.log('4. 添加 MONGODB_URI 變數，值為您的 MongoDB Atlas 連接字串');
            console.log('5. 重新部署專案');
        }
        
        if (error.message.includes('authentication failed')) {
            console.log('\n💡 認證失敗解決方案:');
            console.log('1. 檢查 MongoDB Atlas 用戶名和密碼');
            console.log('2. 確保資料庫用戶有讀寫權限');
            console.log('3. 檢查 IP 白名單設定（建議設為 0.0.0.0/0 允許所有 IP）');
        }
        
        process.exit(1);
    } finally {
        console.log('🔌 關閉資料庫連接');
        await mongoose.connection.close();
    }
}

// 執行初始化
initAtlasDatabase();
