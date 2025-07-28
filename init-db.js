const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

// 产品数据
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
        rating: { average: 4.3, count: 88 },
        featured: false,
        sortOrder: 3
    },
    {
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
        sortOrder: 4
    },
    {
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
        sortOrder: 5
    },
    {
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
        sortOrder: 6
    },
    {
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
        sortOrder: 7
    },
    {
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
        sortOrder: 8
    },
    {
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
        sortOrder: 9
    },
    {
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
        sortOrder: 10
    },
    {
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
        sortOrder: 11
    },
    {
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
        sortOrder: 12
    }
];

async function initDatabase() {
    try {
        console.log('🔗 連接MongoDB...');
        
        // 連接MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sipandsavor', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ MongoDB 連接成功');
        
        // 清空現有產品數據
        console.log('🗑️ 清空現有產品數據...');
        await Product.deleteMany({});
        console.log('✅ 產品數據已清空');
        
        // 插入新產品數據
        console.log('📝 插入產品數據...');
        const result = await Product.insertMany(products);
        console.log(`✅ 成功插入 ${result.length} 個產品`);
        
        // 顯示插入的產品
        console.log('\n📋 已插入的產品列表:');
        result.forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} - NT$ ${product.price}`);
        });
        
        console.log('\n🎉 數據庫初始化完成！');
        
    } catch (error) {
        console.error('❌ 數據庫初始化失敗:', error);
    } finally {
        // 關閉數據庫連接
        await mongoose.connection.close();
        console.log('🔌 數據庫連接已關閉');
        process.exit(0);
    }
}

// 執行初始化
initDatabase(); 