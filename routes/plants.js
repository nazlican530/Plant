/**
 * @swagger
 * tags:
 *   name: Plants
 *   description: Bitki işlemleri (oluştur, listele, güncelle, sil, kategori ata, stok)
 */

const express = require('express');
const router = express.Router();

const Plants = require('../models/Plants');
const upload = require('../config/multer');
const queryBuilder = require('../utils/queryBuilder');
const fs = require('fs');
const path = require('path');

// string/number -> boolean normalize
const toBool = (v) =>
  v === true ||
  v === 1 ||
  v === '1' ||
  (typeof v === 'string' && ['true', 'on', 'yes', 'y'].includes(v.toLowerCase()));

// number normalize (int, min0)
const toNonNegIntOrNull = (v) => {
  if (typeof v === 'undefined' || v === null || v === '') return null;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0) return 'INVALID';
  return n;
};

// Tam URL helper
const toImageUrl = (req, filename) =>
  `${req.protocol}://${req.get('host')}/images/${filename}`;

/**
 * LIST
 * Optional filters:
 *  - forSale=true/false
 *  - availableOnly=true  (yalnızca forSale && stockCount > 0)
 *
 * @swagger
 * /plants:
 *   get:
 *     summary: Bitkileri listele
 *     tags: [Plants]
 *     parameters:
 *       - in: query
 *         name: forSale
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: availableOnly
 *         schema:
 *           type: boolean
 *         description: true ise yalnızca forSale && stockCount>0 döner
 *     responses:
 *       200:
 *         description: Liste döndü
 */
router.get('/', async (req, res) => {
  try {
    const result = await queryBuilder(Plants, req, {
      defaultLimit: 20,
      maxLimit: 100,
      defaultSort: 'createdAt',
      allowedSortFields: ['name', 'status', 'createdAt', 'updatedAt', 'price', 'stockCount'],
      allowedFilterFields: [
        'name', 'description', 'status', 'categoriesIds',
        'height', 'humidity', 'temperature', 'watering', 'sunlight', 'nutrients',
        'forSale', 'price', 'stockCount',
      ],
      searchFields: ['name', 'description', 'height', 'humidity', 'temperature'],
      dateField: 'createdAt',
    });

    if (typeof req.query.forSale !== 'undefined') {
      const want = toBool(req.query.forSale);
      result.data = result.data.filter((p) => Boolean(p.forSale) === want);
    }

    if (toBool(req.query.availableOnly || false)) {
      result.data = result.data.filter((p) => Boolean(p.forSale) && Number(p.stockCount) > 0);
    }

    await Plants.populate(result.data, { path: 'categoriesIds' });

    const dataWithImageUrls = result.data.map((plant) => ({
      ...plant.toObject(),
      imageUrl: toImageUrl(req, plant.image),
    }));

    res.json({ ...result, data: dataWithImageUrls, success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /plants/{id}:
 *   get:
 *     summary: ID ile bitki getir
 *     tags: [Plants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bulunan bitki
 *       404:
 *         description: Bulunamadı
 */
router.get('/:id', async (req, res) => {
  try {
    const plant = await Plants.findById(req.params.id).populate('categoriesIds', 'name description');
    if (!plant) {
      return res.status(404).json({ success: false, message: 'Bitki bulunamadı' });
    }

    res.json({
      success: true,
      data: {
        ...plant.toObject(),
        imageUrl: toImageUrl(req, plant.image),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /plants/{id}/related:
 *   get:
 *     summary: Aynı kategorideki diğer bitkileri getir
 *     tags: [Plants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Referans alınacak bitkinin ID’si
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: İlgili bitkiler
 *       404:
 *         description: Bitki bulunamadı
 */
router.get('/:id/related', async (req, res) => {
  try {
    const current = await Plants.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Bitki bulunamadı' });
    }

    const related = await Plants.find({
      _id: { $ne: current._id },
      categoriesIds: { $in: current.categoriesIds },
    }).limit(10);

    res.status(200).json({ success: true, data: related });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /plants/user/{userId}:
 *   get:
 *     summary: Kullanıcıya ait bitkileri getir
 *     tags: [Plants]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kullanıcının bitkileri
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const plants = await Plants.find({ createdBy: req.params.userId });

    const dataWithImageUrls = plants.map((p) => ({
      ...p.toObject(),
      imageUrl: toImageUrl(req, p.image),
    }));

    res.status(200).json({ success: true, data: dataWithImageUrls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /plants:
 *   post:
 *     summary: Yeni bitki oluştur
 *     tags: [Plants]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               categoriesIds:
 *                 type: string
 *                 example: "id1,id2"
 *               height:
 *                 type: string
 *               humidity:
 *                 type: string
 *               temperature:
 *                 type: string
 *               createdBy:
 *                 type: string
 *               watering:
 *                 type: boolean
 *                 default: false
 *               sunlight:
 *                 type: boolean
 *                 default: false
 *               nutrients:
 *                 type: boolean
 *                 default: false
 *               price:
 *                 type: number
 *               forSale:
 *                 type: boolean
 *                 description: "Stok yoksa otomatik false olur"
 *               stockCount:
 *                 type: integer
 *                 minimum: 0
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Oluşturuldu
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    let categoriesIds = req.body.categoriesIds;
    if (!categoriesIds) {
      return res.status(400).json({ success: false, message: 'Kategori seçilmedi' });
    }
    if (typeof categoriesIds === 'string') {
      categoriesIds = categoriesIds.split(',').map((s) => s.trim()).filter(Boolean);
    }

    const createdBy = req.body.createdBy;
    if (!createdBy) {
      return res.status(400).json({ success: false, message: 'createdBy (userId) eksik' });
    }

    const payload = {
      name: req.body.name,
      description: req.body.description,
      categoriesIds,
      image: req.file?.filename,
      createdBy,
      height: req.body.height,
      humidity: req.body.humidity,
      temperature: req.body.temperature,
    };

    if (typeof req.body.watering  !== 'undefined') payload.watering  = toBool(req.body.watering);
    if (typeof req.body.sunlight  !== 'undefined') payload.sunlight  = toBool(req.body.sunlight);
    if (typeof req.body.nutrients !== 'undefined') payload.nutrients = toBool(req.body.nutrients);

    if (typeof req.body.price !== 'undefined' && req.body.price !== '') {
      const n = Number(req.body.price);
      if (Number.isNaN(n) || n < 0) {
        return res.status(400).json({ success: false, message: 'Invalid price' });
      }
      payload.price = n;
    }

    if (typeof req.body.stockCount !== 'undefined' && req.body.stockCount !== '') {
      const sc = toNonNegIntOrNull(req.body.stockCount);
      if (sc === 'INVALID') {
        return res.status(400).json({ success: false, message: 'Invalid stockCount' });
      }
      if (sc !== null) payload.stockCount = sc;
    }

    if (typeof req.body.forSale !== 'undefined') {
      const fsale = toBool(req.body.forSale);
      payload.forSale = fsale && (payload.stockCount || 0) > 0;
    }

    const plant = new Plants(payload);
    await plant.save();

    res.status(201).json({
      success: true,
      data: {
        ...plant.toObject(),
        imageUrl: toImageUrl(req, plant.image),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /plants/{id}:
 *   put:
 *     summary: Bitki güncelle
 *     tags: [Plants]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               categoriesIds:
 *                 type: string
 *               height:
 *                 type: string
 *               humidity:
 *                 type: string
 *               temperature:
 *                 type: string
 *               watering:
 *                 type: boolean
 *               sunlight:
 *                 type: boolean
 *               nutrients:
 *                 type: boolean
 *               price:
 *                 type: number
 *               forSale:
 *                 type: boolean
 *               stockCount:
 *                 type: integer
 *                 minimum: 0
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Güncellendi
 */
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const existing = await Plants.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Bitki bulunamadı' });
    }

    let categoriesIds = req.body.categoriesIds || existing.categoriesIds;
    if (typeof categoriesIds === 'string') {
      categoriesIds = categoriesIds.split(',').map((s) => s.trim()).filter(Boolean);
    }

    const updateData = {
      name: req.body.name || existing.name,
      description: req.body.description || existing.description,
      status: req.body.status || existing.status,
      categoriesIds,
      height: req.body.height || existing.height,
      humidity: req.body.humidity || existing.humidity,
      temperature: req.body.temperature || existing.temperature,
      image: existing.image,
      price: typeof existing.price === 'number' ? existing.price : null,
      forSale: typeof existing.forSale === 'boolean' ? existing.forSale : false,
      stockCount: Number.isFinite(existing.stockCount) ? existing.stockCount : 0,
    };

    if (typeof req.body.watering  !== 'undefined') updateData.watering  = toBool(req.body.watering);
    if (typeof req.body.sunlight  !== 'undefined') updateData.sunlight  = toBool(req.body.sunlight);
    if (typeof req.body.nutrients !== 'undefined') updateData.nutrients = toBool(req.body.nutrients);

    if (typeof req.body.price !== 'undefined' && req.body.price !== '') {
      const n = Number(req.body.price);
      if (Number.isNaN(n) || n < 0) {
        return res.status(400).json({ success: false, message: 'Invalid price' });
      }
      updateData.price = n;
    }
    if (typeof req.body.stockCount !== 'undefined' && req.body.stockCount !== '') {
      const sc = toNonNegIntOrNull(req.body.stockCount);
      if (sc === 'INVALID') {
        return res.status(400).json({ success: false, message: 'Invalid stockCount' });
      }
      if (sc !== null) updateData.stockCount = sc;
    }

    if (typeof req.body.forSale !== 'undefined') {
      const wantSale = toBool(req.body.forSale);
      updateData.forSale = wantSale && updateData.stockCount > 0;
    } else {
      if (updateData.stockCount === 0) updateData.forSale = false;
    }

    if (req.file) {
      const oldPath = path.join('public/images', existing.image);
      fs.unlink(oldPath, (err) => { if (err) console.error('Eski dosya silinemedi:', err); });
      updateData.image = req.file.filename;
    }

    const updated = await Plants.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Bitki güncellendi',
      data: {
        ...updated.toObject(),
        imageUrl: toImageUrl(req, updated.image),
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /plants/{id}/buy:
 *   post:
 *     summary: Satın al (stok atomik düşer, 0 olursa satıştan kalkar)
 *     tags: [Plants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               qty:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *     responses:
 *       200:
 *         description: Satın alma başarılı
 *       400:
 *         description: Yetersiz stok
 */
router.post('/:id/buy', async (req, res) => {
  try {
    const qtyRaw = req.body?.qty;
    const qty = Number.parseInt(qtyRaw, 10);
    const amount = Number.isFinite(qty) && qty > 0 ? qty : 1;

    const after = await Plants.findOneAndUpdate(
      { _id: req.params.id, stockCount: { $gte: amount } },
      { $inc: { stockCount: -amount } },
      { new: true }
    );

    if (!after) {
      return res.status(400).json({ success: false, message: 'Yetersiz stok' });
    }

    if (after.stockCount === 0 && after.forSale === true) {
      await Plants.updateOne({ _id: after._id }, { $set: { forSale: false } });
      after.forSale = false;
    }

    res.json({
      success: true,
      message: 'Satın alma başarılı, stok güncellendi',
      data: {
        ...after.toObject(),
        imageUrl: toImageUrl(req, after.image),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /plants/{id}:
 *   delete:
 *     summary: Bitki sil
 *     tags: [Plants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Silinecek bitki ID'si
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Silindi
 *       404:
 *         description: Bulunamadı
 */
router.delete('/:id', async (req, res) => {
  try {
    const plant = await Plants.findById(req.params.id);
    if (!plant) {
      return res.status(404).json({ success: false, message: 'Bitki bulunamadı' });
    }

    await Plants.findByIdAndDelete(req.params.id);

    const imagePath = path.join('public/images', plant.image);
    fs.unlink(imagePath, (err) => {
      if (err) console.error('Resim silme hatası:', err);
    });

    res.json({
      success: true,
      message: 'Bitki ve resmi silindi',
      deletedData: {
        id: plant._id,
        name: plant.name,
        deletedImage: plant.image,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /plants/assign-categories:
 *   post:
 *     summary: Birden fazla kategori, birden fazla bitkiye ata
 *     tags: [Plants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               categoriesIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Atandı
 */
router.post('/assign-categories', async (req, res) => {
  try {
    const plantsIds = req.body.plantsIds || req.body.plantIds;
    const { categoriesIds } = req.body;

    if (!Array.isArray(plantsIds) || !Array.isArray(categoriesIds)) {
      return res.status(400).json({
        success: false,
        message: 'plantsIds/plantIds ve categoriesIds diziler olmalıdır.',
      });
    }

    await Plants.updateMany(
      { _id: { $in: plantsIds } },
      { $addToSet: { categoriesIds: { $each: categoriesIds } } }
    );

    res.status(200).json({
      success: true,
      message: 'Kategoriler bitkilere başarıyla atandı.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /plants/{id}/sale:
 *   patch:
 *     summary: Satış bilgilerini güncelle (yalnızca price / forSale)
 *     tags: [Plants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *               forSale:
 *                 type: boolean
 *                 description: "true istenirse stok>0 şart"
 *     responses:
 *       200:
 *         description: Güncellendi
 */
router.patch('/:id/sale', async (req, res) => {
  try {
    const payload = {};
    if (typeof req.body.price !== 'undefined' && req.body.price !== '') {
      const n = Number(req.body.price);
      if (Number.isNaN(n) || n < 0) {
        return res.status(400).json({ success: false, message: 'Invalid price' });
      }
      payload.price = n;
    }
    if (typeof req.body.forSale !== 'undefined') {
      payload.forSale = toBool(req.body.forSale);
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    if (payload.forSale === true) {
      const p = await Plants.findById(req.params.id).select('stockCount');
      if (!p) return res.status(404).json({ success: false, message: 'Plant not found' });
      if ((p.stockCount || 0) <= 0) {
        payload.forSale = false;
      }
    }

    const updated = await Plants.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Plant not found' });
    }

    res.json({
      success: true,
      data: {
        ...updated.toObject(),
        imageUrl: toImageUrl(req, updated.image),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /plants/{id}/stock:
 *   patch:
 *     summary: Stok bilgisini güncelle (yalnızca stockCount)
 *     tags: [Plants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stockCount:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Stok güncellendi
 */
router.patch('/:id/stock', async (req, res) => {
  try {
    if (typeof req.body.stockCount === 'undefined') {
      return res.status(400).json({ success: false, message: 'stockCount required' });
    }
    const sc = toNonNegIntOrNull(req.body.stockCount);
    if (sc === 'INVALID') {
      return res.status(400).json({ success: false, message: 'Invalid stockCount' });
    }

    const updated = await Plants.findByIdAndUpdate(
      req.params.id,
      { $set: { stockCount: sc } },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Plant not found' });
    }

    if (updated.stockCount === 0 && updated.forSale === true) {
      updated.forSale = false;
      await updated.save();
    }

    res.json({
      success: true,
      data: {
        ...updated.toObject(),
        imageUrl: toImageUrl(req, updated.image),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
