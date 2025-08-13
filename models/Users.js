// Mongoose kütüphanesini import ediyoruz
const mongoose = require('mongoose');

// Kullanıcılar için şema tanımı (schema)
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true // Zorunlu alan
  },
  lastName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true // Aynı e-posta tekrar kayıt olamaz
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  image: {
    type: String, // Dosya adı (örnek: profile1.jpg)
    default: null
  },
  password: {
    type: String,
    required: true,
    select: false // Bu alan find() gibi sorgularda görünmez (güvenlik)
  }
}, {
  timestamps: true // createdAt ve updatedAt otomatik oluşturulur
});

// Mongoose modelini oluştur ve dışa aktar
module.exports = mongoose.model('User', userSchema);
