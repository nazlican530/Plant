const express = require('express');
const router = express.Router();
const Favorites = require('../models/Favorites');

/**
 * GET /api/favorites
 * Herkesin favorilerini getir (user + plant populated)
 */
router.get('/', async (req, res) => {
  try {
    const favorites = await Favorites.find()
      .populate('userId', 'firstName lastName email')       // favorileyen kullanıcı
      .populate('plantId', 'name image description');       // favorilenen bitki

    res.status(200).json({ success: true, data: favorites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 📌 Kullanıcının favorilerini getir (giriş yapmamış kullanıcı için de çalışır)
router.get('/user/:userId', async (req, res) => {
  try {
    const favorites = await Favorites.find({ userId: req.params.userId })
      .populate('plantId', 'name image description');

    const favoritePlants = favorites.map(f => f.plantId);
    res.status(200).json({ success: true, data: favoritePlants });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 📌 Favori kontrol
router.get('/check', async (req, res) => {
  try {
    const { userId, plantId } = req.query;
    const exists = await Favorites.exists({ userId, plantId });
    res.status(200).json({ success: true, isFavorited: !!exists });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 📌 Favori ekleme (giriş yapmamış kullanıcı için guestId ile)
router.post('/', async (req, res) => {
  try {
    let { userId, plantId } = req.body;
    if (!plantId) {
      return res.status(400).json({ success: false, message: 'plantId zorunludur.' });
    }
    if (!userId) {
      userId = `guest_${Date.now()}`;
    }

    const fav = await Favorites.findOneAndUpdate(
      { userId, plantId },
      { $setOnInsert: { userId, plantId } },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: fav });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(200).json({ success: true, message: 'Zaten favorilerde' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// 📌 Favoriden çıkarma
router.delete('/', async (req, res) => {
  try {
    let { userId, plantId } = req.body;
    if (!plantId) {
      return res.status(400).json({ success: false, message: 'plantId zorunludur.' });
    }
    if (!userId) {
      userId = `guest_${Date.now()}`;
    }

    const deleted = await Favorites.findOneAndDelete({ userId, plantId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Favori bulunamadı' });
    }

    res.status(200).json({ success: true, message: 'Favoriden çıkarıldı' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router; 