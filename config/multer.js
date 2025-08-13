// Multer kütüphanesini import ediyoruz
// Multer: multipart/form-data formatındaki dosya upload'larını handle eder
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload dizinini kontrol et ve yoksa oluştur
const uploadDir = 'public/images';
if (!fs.existsSync(uploadDir)) {
    // Dizin yoksa oluştur (recursive: true ile parent dizinler de oluşur)
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 Upload dizini oluşturuldu: ${uploadDir}`);
}

// Storage konfigürasyonu - dosyaların nereye kaydedileceğini belirler
const storage = multer.diskStorage({
    // Dosyanın kaydedileceği dizin
    destination: function (req, file, cb) {
        // cb: callback function (error, destination)
        // null: hata yok, uploadDir: dinamik hedef dizin
        cb(null, uploadDir);
    },
    
    // Dosyanın adının nasıl oluşturulacağı
    filename: function (req, file, cb) {
        // Unique filename oluşturma: timestamp + original extension
        // Date.now(): Şu anki zaman (milisaniye)
        // path.extname(): Dosya uzantısını alır (.jpg, .png vb.)
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// Dosya filtresi - hangi dosya tiplerinin kabul edileceği
const fileFilter = (req, file, cb) => {
    // MIME type kontrolü - sadece resim dosyaları
    if (file.mimetype.startsWith('image/')) {
        // Dosya kabul edildi
        cb(null, true);
    } else {
        // Dosya reddedildi - hata mesajı
        cb(new Error('Sadece resim dosyaları kabul edilir!'), false);
    }
};

// Multer instance'ı oluşturuyoruz
const upload = multer({
    storage: storage,           // Storage konfigürasyonu
    fileFilter: fileFilter,     // Dosya filtresi
    limits: {
        fileSize: 5 * 1024 * 1024  // 5MB dosya boyutu limiti
    }
});


// upload.single('fieldName'): Tek dosya upload'u
// upload.array('fieldName'): Çoklu dosya upload'u
// upload.fields([{name: 'field1'}, {name: 'field2'}]): Farklı field'lardan dosya upload'u

module.exports = upload; 