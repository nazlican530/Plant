/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Kategori işlemleri (oluşturma, listeleme, silme, hiyerarşi)
 */

const express = require('express');
const router = express.Router();
const Categories = require('../models/Categories');
const Plants = require('../models/Plants');
const upload = require('../config/multer');
const queryBuilder = require('../utils/queryBuilder');
const Favorites = require('../models/Favorites');




/**
 * @swagger
 * /categories/popular:
 *   get:
 *     summary: Son 30 günde en çok favorilenmiş ilk 5 kategori
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: En popüler kategoriler getirildi
 */
router.get('/popular', async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

    const result = await Favorites.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $lookup: {
          from: 'plants',
          localField: 'plantId',
          foreignField: '_id',
          as: 'plant'
        }
      },
      { $unwind: '$plant' },
      { $unwind: '$plant.categoriesIds' },
      {
        $group: {
          _id: '$plant.categoriesIds',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          _id: '$category._id',
          name: '$category.name',
          count: 1
        }
      }
    ]);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Yeni bir kategori oluştur
 *     tags: [Categories]
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
 *               icon:
 *                 type: string
 *               parentId:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Kategori başarıyla oluşturuldu
 *       400:
 *         description: Geçersiz istek veya doğrulama hatası
 */

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const categories = new Categories({
      name: req.body.name,
      description: req.body.description,
      icon: req.body.icon,
      image: req.file ? req.file.filename : null,
      parentId: req.body.parentId || null
    });
    await categories.save();
    res.status(201).json({ success: true, data: categories });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Tüm kategorileri getir (isteğe bağlı arama desteği)
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Kategori adına göre arama yapar
 *     responses:
 *       200:
 *         description: Kategoriler başarıyla listelendi
 */
router.get('/', async (req, res) => {
  try {
    const search = req.query.search;
    const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
    const categories = await Categories.find(filter);
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /categories/hierarchy:
 *   get:
 *     summary: Alt kategori hiyerarşisini getir (recursive children)
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Hiyerarşi başarıyla listelendi
 */
router.get('/hierarchy', async (req, res) => {
  try {
    const categories = await Categories.find();
    const categoriesMap = {};
    categories.forEach(cat => {
      categoriesMap[cat._id] = { ...cat._doc, children: [] };
    });

    const roots = [];
    categories.forEach(cat => {
      if (cat.parentId) {
        categoriesMap[cat.parentId]?.children.push(categoriesMap[cat._id]);
      } else {
        roots.push(categoriesMap[cat._id]);
      }
    });

    res.json({ success: true, data: roots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /categories/most-used:
 *   get:
 *     summary: En çok kullanılan ilk 5 kategoriyi getir
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: En çok kullanılan kategoriler başarıyla listelendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: Kategori ID’si
 *                       name:
 *                         type: string
 *                         description: Kategori adı
 *                       count:
 *                         type: integer
 *                         description: Bu kategoriye ait bitki sayısı
 *       500:
 *         description: Sunucu hatası
 */

router.get('/most-used', async (req, res) => {
  try {
    const mostUsed = await Plants.aggregate([
      { $unwind: '$categoriesIds' }, 
      {
        $group: {
          _id: '$categoriesIds',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categories'
        }
      },
      { $unwind: '$categories' },
      {
        $project: {
          _id: '$categories._id',
          name: '$categories.name',
          count: 1
        }
      }
    ]);

    res.status(200).json({ success: true, data: mostUsed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


/**
 * @swagger
 * /categories/with-count:
 *   get:
 *     summary: Her kategorideki bitki sayısını getir
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Bitki sayılarıyla birlikte kategoriler listelendi
 */
router.get('/with-count', async (req, res) => {
  try {
    const counts = await Plants.aggregate([
      { $unwind: '$categoriesId' },
      { $group: { _id: '$categoriesId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    counts.forEach(item => {
      countMap[item._id.toString()] = item.count;
    });

    const categories = await Categories.find();
    const result = categories.map(cat => ({
      _id: cat._id,
      name: cat.name,
      description: cat.description,
      plantsCount: countMap[cat._id.toString()] || 0
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /categories/{id}/plants:
 *   get:
 *     summary: Belirli kategoriye ait bitkileri getir (gelişmiş sorgu destekli)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Kategori ID'si
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kategoriye ait bitkiler getirildi
 */
router.get('/:id/plants', async (req, res) => {
  try {
    req.query['filter[categoriesIds]'] = req.params.id;

    const result = await queryBuilder(Plants, req, {
      defaultLimit: 5,
      maxLimit: 50,
      defaultSort: 'createdAt',
      allowedSortFields: ['name', 'status', 'createdAt'],
      allowedFilterFields: ['name', 'description', 'status', 'categoriesIds'],
      searchFields: ['name', 'description'],
      dateField: 'createdAt',
      populate: { path: 'categoriesIds', select: 'name description' }
    });

    const dataWithImageUrls = result.data.map(plant => ({
      ...plant.toObject(),
      imageUrl: `${req.protocol}://${req.get('host')}/images/${plant.image}`
    }));

    res.json({ ...result, data: dataWithImageUrls, success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Kategoriyi sil ve ilişkili bitkileri yönet
 *     description: >
 *       Belirtilen kategoriyi siler. İlgili bitkilerde şu işlemler yapılır:  
 *       - Eğer bitki yalnızca bu kategoriye sahipse, bitki ve resmi tamamen silinir.  
 *       - Eğer bitkinin başka kategorileri de varsa, sadece bu kategori çıkarılır.
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Silinecek kategori ID’si
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kategori silindi ve ilişkili bitkiler yönetildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Kategori silindi ve ilişkili bitkiler güncellendi
 *       404:
 *         description: Kategori bulunamadı
 *       500:
 *         description: Sunucu hatası
 */


const fs = require('fs');
const path = require('path');

router.delete('/:id', async (req, res) => {
  try {
    const category = await Categories.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
    }

    // Kategoriyi sil
    await Categories.findByIdAndDelete(req.params.id);

    // Etkilenen bitkileri bul
    const affectedPlants = await Plants.find({ categoriesIds: req.params.id });

    for (const plant of affectedPlants) {
      const remainingCategories = plant.categoriesIds.filter(
        catId => catId.toString() !== req.params.id
      );

      if (remainingCategories.length === 0) {
        // Kategorisi tamamen silinmiş bitkiyi sil + resmini de sil
        await Plants.findByIdAndDelete(plant._id);

        // Resmi sil
        const imagePath = path.join('public/images', plant.image);
        fs.unlink(imagePath, err => {
          if (err) console.error('Resim silme hatası:', err);
        });
      } else {
        // Sadece kategoriyi çıkar, bitkiyi güncelle
        plant.categoriesIds = remainingCategories;
        await plant.save();
      }
    }

    res.json({
      success: true,
      message: 'Kategori silindi, ilişkili bitkiler güncellendi .'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



module.exports = router;
