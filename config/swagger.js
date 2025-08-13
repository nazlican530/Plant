const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Plants API',
      version: '1.0.0',
      description: 'Bitki API Dökümantasyonu',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
      },
    ],
  },
  apis: ['./routes/*.js', './models/*.js'], // 🔧 Models klasörü eklendi!
};
