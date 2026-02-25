require('dotenv').config();
const express               = require('express');
const mongoose              = require('mongoose');
const cors                  = require('cors');
const multer                = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary            = require('cloudinary').v2;
const animalRoutes          = require('./routes/animalRoutes');

const app = express();

// ─── CLOUDINARY ────────────────────────────────────────────────
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

// ─── MIDDLEWARES ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer injetado APENAS no POST de animais (antes de chegar no router)
app.post('/api/animais', upload.single('foto'), (req, res, next) => next());

// ─── DB (lazy singleton — essencial para serverless) ───────────
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

// Conecta antes de qualquer rota /api
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error:', err);
    res.status(503).json({ message: 'Serviço indisponível. Tente novamente.' });
  }
});

// ─── ROUTES ────────────────────────────────────────────────────
app.use('/api', animalRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date() }));

// ─── LOCAL DEV ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
}

module.exports = app;