const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, '用戶名是必需的'],
        unique: true,
        trim: true,
        minlength: [3, '用戶名至少需要3個字符'],
        maxlength: [20, '用戶名不能超過20個字符']
    },
    email: {
        type: String,
        required: [true, '電子郵件是必需的'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '請輸入有效的電子郵件地址']
    },
    password: {
        type: String,
        required: [true, '密碼是必需的'],
        minlength: [6, '密碼至少需要6個字符'],
        select: false
    },
    phone: {
        type: String,
        match: [/^09\d{8}$/, '請輸入有效的台灣手機號碼']
    },
    address: {
        street: String,
        city: String,
        postalCode: String
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    avatar: {
        type: String,
        default: 'default-avatar.jpg'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 密碼加密中間件
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 驗證密碼方法
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        // 確保 this.password 存在
        if (!this.password) {
            console.error('密碼字段不存在');
            return false;
        }
        
        // 使用 bcrypt.compare 驗證密碼
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        return isMatch;
    } catch (error) {
        console.error('密碼驗證錯誤:', error);
        return false;
    }
};

// 隱藏敏感信息
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

module.exports = mongoose.model('User', userSchema); 