// === GEREKLİ MODÜLLER ===
const express = require('express');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const connectDB = require('./config/database');
const rateLimiter = require('./middlewares/rateLimiter');

// === EXPRESS APP OLUŞTUR ===
const app = express();
const PORT = process.env.PORT || 3000;

// === DATABASE BAĞLANTISI ===
connectDB();

// === GEREKLİ DİZİNLERİ OLUŞTUR ===
['public', 'public/images'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Dizin oluşturuldu: ${dir}`);
  }
});

// === MIDDLEWARE TANIMLARI ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ✅ Profil resimleri için özel static route
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// === SWAGGER DÖKÜMANTASYONU ===
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bitki API',
      version: '1.0.0',
      description: 'Bitki yönetimi API dokümantasyonu (Swagger)'
    },
    servers: [{ url: 'http://localhost:3000/api' }],
    components: {
      schemas: {
        Plants: {
          type: 'object',
          required: ['name', 'description', 'image', 'categoriesIds'],
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            image: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive'] },
            categoriesIds: {
              type: 'array',
              items: { type: 'string' }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js']
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// === ROUTE'LARI BAĞLA ===
const routes = require('./routes');
const userRoutes = require('./routes/users');
const plantsRoutes = require('./routes/plants');
const favoritesRoutes = require('./routes/favorites');
const authRoute = require('./routes/auth');

app.use('/api/users', rateLimiter, userRoutes);
app.use('/api/plants', rateLimiter, plantsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api', rateLimiter, routes); // Diğer tüm routes (kategori vs)
app.use('/api/auth', authRoute);

// === SUNUCUYU BAŞLAT ===
app.listen(PORT, () => {
  console.log(`🚀 Sunucu ${PORT} portunda başlatıldı`);
  console.log(`📱 API Base URL: http://localhost:${PORT}/api`);
  console.log(`📚 Postman Test için Hazır`);
  console.log(`📖 Swagger UI: http://localhost:${PORT}/api-docs`);
});
