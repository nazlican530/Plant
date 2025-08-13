// Mongoose kütüphanesini import ediyoruz
// Mongoose: MongoDB ile Node.js arasında köprü görevi gören ODM kütüphanesi
const mongoose = require('mongoose');

// Database bağlantı fonksiyonu
// Async function: Asynchronous (eşzamansız) fonksiyon - await kullanabilmek için
const connectDB = async () => {
    try {
        // Environment variable'dan MongoDB URI'sini alıyoruz
        // process.env: Node.js'de ortam değişkenlerine erişim sağlar
        // .env dosyasındaki MONGODB_URI değişkenini okur
        const MONGODB_URI = process.env.MONGODB_URI;
        
        // MongoDB'ye bağlantı kuruyoruz
        // await: Promise'in resolve olmasını bekler (asynchronous işlem)
        // mongoose.connect(): MongoDB'ye bağlantı kuran fonksiyon
        await mongoose.connect(MONGODB_URI);
        
        // Başarılı bağlantı mesajı
        console.log('✅ MongoDB bağlantısı başarılı');
        
    } catch (err) {
        // Hata yakalama (Error Handling)
        // try-catch: Hata yönetimi için kullanılır
        console.error('❌ MongoDB bağlantı hatası:', err);
        
        // process.exit(1): Uygulamayı hata koduyla sonlandırır
        // 0: Başarılı çıkış, 1: Hata ile çıkış
        // Database bağlantısı olmadan uygulama çalışamaz
        process.exit(1);
    }
};

// Fonksiyonu dışa aktarıyoruz (export)
// module.exports: CommonJS modül sistemi
// Bu sayede başka dosyalarda require() ile kullanılabilir
module.exports = connectDB; 