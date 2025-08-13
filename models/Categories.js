const mongoose = require('mongoose');

// Categories (Kategori) için schema tanımı
const categoriesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    image:{
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    icon:{
        type: String,
        required:true
    },
    parentId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Categories',
        default: null
    }
}, {timestamps: true});


// Model oluşturup dışa aktarıyoruz
module.exports = mongoose.model('Categories', categoriesSchema);
