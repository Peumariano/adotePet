require('dotenv').config();
const express      = require('express');
const mongoose     = require('mongoose');
const cors         = require('cors');
const animalRoutes = require('./routes/animalRoutes');

const app = express();

// ─── MIDDLEWARES GLOBAIS ───────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── ROTAS SEM DB — vêm ANTES de tudo ─────────────────────────

// Health check — nunca depende de DB, Cloudinary ou Multer
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ts: new Date(),
    adminConfigured: !!process.env.ADMIN_PASSWORD,
    mongoConfigured: !!process.env.MONGODB_URI,
    cloudinaryConfigured: !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
  });
});

// Login do admin — só compara string, sem DB
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({
      success: false,
      message: 'ADMIN_PASSWORD não configurada nas env vars da Vercel.',
    });
  }
  if (password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, message: 'Senha incorreta.' });
});

// ─── MIDDLEWARE DE UPLOAD (lazy — só instancia quando necessário)
app.post('/api/animais', (req, res, next) => {
  try {
    const cloudinary            = require('cloudinary').v2;
    const multer                = require('multer');
    const { CloudinaryStorage } = require('multer-storage-cloudinary');

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const storage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder:          'adotepet',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation:  [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
      },
    });

    const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });
    upload.single('foto')(req, res, next);
  } catch (err) {
    console.error('Upload init error:', err);
    res.status(500).json({ message: 'Erro ao inicializar upload: ' + err.message });
  }
});

// ─── DB SINGLETON ─────────────────────────────────────────────
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS:          45000,
  });
  isConnected = true;
  console.log('✅ MongoDB conectado');
}

// Middleware de DB — apenas para rotas /api/* abaixo
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error:', err);
    res.status(503).json({ message: 'Banco de dados indisponível. Tente novamente.' });
  }
});

// ─── ROTAS COM DB ─────────────────────────────────────────────
app.use('/api', animalRoutes);

// ─── LOCAL DEV ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
}

module.exports = app;