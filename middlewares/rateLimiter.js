const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({ //Yeni bir rate limiter objesi tanımlanır (apiLimiter).
  windowMs: 15 * 60 * 1000,
  max: 1000,  //Belirtilen süre içinde (15 dakika) aynı IP’den atılabilecek maksimum istek sayısı.
  message: {
    success: false,
    message: 'Çok fazla istek. Lütfen birkaç dakika sonra tekrar deneyin.'
  },
  standardHeaders: true,  // RateLimit-Remaining: Kalan hakkı ,RateLimit-Reset: Ne zaman sıfırlanacağı  görürsün
    legacyHeaders: true,   //  X-RateLimit-* başlıklarını da açar 
});

module.exports = apiLimiter;
