const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const Users = require('../models/Users');
const queryBuilder = require('../utils/queryBuilder');

// Multer ayarları (resim yükleme için)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `user-${uniqueName}${ext}`);
  }
});
const upload = multer({ storage });

/**
 * @swagger
 * tags:
 *   name: User
 *   description: Kullanıcı işlemleri (CRUD + arama, filtreleme)
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Kullanıcıları listele (arama, sıralama, filtreleme, sayfalama)
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Kullanıcılar başarıyla listelendi
 */
router.get('/', async (req, res) => {
  try {
    const result = await queryBuilder(Users, req, {
      allowedSortFields: ['firstName', 'lastName', 'createdAt'],
      allowedFilterFields: ['status'],
      searchFields: ['firstName', 'lastName', 'email'],
      defaultLimit: 10,
      maxLimit: 100
    });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: ID'ye göre kullanıcı getir
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Kullanıcının MongoDB ID'si
 *     responses:
 *       200:
 *         description: Kullanıcı bulundu
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await Users.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Yeni kullanıcı oluştur
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Kullanıcı oluşturuldu
 *       400:
 *         description: Hatalı istek
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const userData = req.body;
    if (req.file) {
      userData.image = req.file.filename;
    }
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    const user = new Users(userData);
    await user.save();
    res.status(201).json({ success: true, message: 'Kullanıcı oluşturuldu', data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Kullanıcıyı güncelle
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Güncellenecek kullanıcı ID'si
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Kullanıcı başarıyla güncellendi
 *       400:
 *         description: Hatalı istek
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const updateData = req.body;
    if (req.file) {
      updateData.image = req.file.filename;
    }
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    const user = await Users.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    res.json({ success: true, message: 'Kullanıcı güncellendi', data: user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /users/{id}/upload:
 *   put:
 *     summary: Kullanıcının profil fotoğrafını güncelle
 *     tags: [User]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Kullanıcı ID'si
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Fotoğraf başarıyla yüklendi
 *       400:
 *         description: Yükleme hatası
 */
router.put('/:id/upload', upload.single('image'), async (req, res) => {
  try {
    const userId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Resim dosyası eksik' });
    }

    const updatedUser = await Users.findByIdAndUpdate(
      userId,
      { image: req.file.filename },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    res.status(200).json({ success: true, message: 'Fotoğraf yüklendi', data: updatedUser });
  } catch (error) {
    console.error("Fotoğraf yükleme hatası:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});


/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Kullanıcıyı sil
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Silinecek kullanıcı ID'si
 *     responses:
 *       200:
 *         description: Kullanıcı silindi
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.delete('/:id', async (req, res) => {
  try {
    const user = await Users.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    res.json({ success: true, message: 'Kullanıcı silindi' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;