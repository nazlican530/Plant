// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); //  eklendi
const authRouter = express.Router();
const Users = require('../models/Users');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'; // JWT_SECRET, .env dosyasından alınır, yoksa dev-secret kullanılır
const JWT_EXPIRES = process.env.JWT_EXPIRES || '120d';

// REGISTER
authRouter.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    const existingUser = await Users.findOne({ email }); // (aynı mı ) email ile kullanıcıyı kontrol et
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email zaten kayıtlı' });
    }

    const hashedPassword = await bcrypt.hash(password, 10); //  bcrypt’in şifreyi hash’lerken yapacağı işlem turu sayısı.

    const newUser = new Users({  // Yeni kullanıcı oluştur hash’lenmiş parola ile kaydedilir.
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
    });

    await newUser.save();

    // (Opsiyonel) kayıt sonrası otomatik token
    const payload = { id: newUser._id, email: newUser.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES }); // Kayıt biter bitmez otomatik giriş için JWT üretir.

    const userObj = newUser.toObject();
    delete userObj.password;

    res.status(201).json({ success: true, message: 'Kayıt başarılı', data: userObj, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// LOGIN
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Users.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı' });

    const isMatch = await bcrypt.compare(password, user.password); // Parolayı kontrol et db
    if (!isMatch) return res.status(401).json({ success: false, message: 'Şifre hatalı' });

    const userObj = user.toObject();
    delete userObj.password; //Parolayı yanıttan temizler.

    // JWT üret
    const payload = { id: user._id, email: user.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // token'ı response'a ekle
    res.status(200).json({ success: true, message: 'Giriş başarılı', data: userObj, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

//  TÜM KULLANICILARI GETİR
authRouter.get('/users', async (req, res) => {
  try {
    const users = await Users.find().select('-password');  // Parolayı hariç tutar
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = authRouter;
