// Express framework'ünü import ediyoruz
const express = require('express');

// Router instance oluşturuyoruz
// express.Router(): Modüler route handler'lar oluşturmak için kullanılır
// Mini-application gibi davranır, middleware ve route'ları gruplar
const router = express.Router();



const userRoutes = require('./users');           // Dosya adın 'users.js' olduğu için bu şekilde
const plantsRoutes = require('./plants');    // plantsRoutes.js dosyan varsa
const categoriesRoutes = require('./categories'); 
const favoritesRoutes = require('./favorites');
const authRoutes = require('./auth'); // Auth işlemleri için ayrı bir route dosyası
// Route modüllerini import ediyoruz
// Her resource (kullanıcı, bitki vb.) için ayrı route dosyaları
// DOĞRU: Tüm route'lar çoğul isimle tanımlanmalı
router.use('/users', userRoutes);
router.use('/plants', plantsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/auth', authRoutes);




// API ana sayfası (Root endpoint)
// GET /api - API hakkında genel bilgi verir
router.get('/', (req, res) => {
    // JSON response döndürüyoruz
    // req: Request object (gelen istek bilgileri)
    // res: Response object (gönderilecek yanıt)
    res.json({
        success: true,                          // İşlem durumu
        message: 'Express API\'ye hoş geldiniz!', // Karşılama mesajı
        project: 'Plants API',                   // Proje adı
        version: '1.0.0',                      // API versiyonu
        
        // Mevcut endpoint'lerin listesi
        // Client'ların hangi endpoint'leri kullanabileceğini gösterir
        endpoints: {
            users: '/api/users',      // Kullanıcı işlemleri
            plants: '/api/plants',    // Bitki işlemleri
            categories: '/api/categories',
             favorites:'/api/favorites',// 
            auth: '/api/auth'         // Kimlik doğrulama işlemleri
        }
    });
});

// Router'ı dışa aktarıyoruz
// Bu sayede app.js'de bu router'ı kullanabiliriz
module.exports = router;
