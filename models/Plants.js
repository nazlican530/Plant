const mongoose = require('mongoose');

const plantsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    image: { type: String, required: true },

    height: { type: String, default: 'N/A' },
    humidity: { type: String, default: 'N/A' },
    temperature: { type: String, default: 'N/A' },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },

    categoriesIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Categories',
        required: true,
      },
    ],

    watering: { type: Boolean, default: false },
    sunlight: { type: Boolean, default: false },
    nutrients: { type: Boolean, default: false },

    // Satış alanları
    price: { type: Number, default: null },
    forSale: { type: Boolean, default: false },

    
    stockCount: { type: Number, default: 0, min: 0 }, // stok adedi
  },
  {
    timestamps: true,
  }
);

// Opsiyonel: stok var mı yok mu sanal alan
plantsSchema.virtual('inStock').get(function () {
  return (this.stockCount || 0) > 0;
});

plantsSchema.set('toObject', { virtuals: true });
plantsSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Plants', plantsSchema);
