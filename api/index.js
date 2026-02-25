require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const multer     = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

// ─── CLOUDINARY ───────────────────────────────────────────────
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

// ─── MIDDLEWARES ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── MODEL ───────────────────────────────────────────────────
const animalSchema = new mongoose.Schema({
  nome:          { type: String, required: true },
  especie:       { type: String, enum: ['Gato', 'Cachorro', 'Outro'], required: true },
  raca:          String,
  idade:         { type: String, enum: ['Filhote', 'Jovem', 'Adulto', 'Idoso'], required: true },
  porte:         { type: String, enum: ['Pequeno', 'Médio', 'Grande'], required: true },
  descricao:     String,
  imagemUrl:     String,
  nomeDoador:    { type: String, required: true },
  contatoDoador: { type: String, required: true },
  dataCriacao:   { type: Date, default: Date.now },
});
const Animal = mongoose.models.Animal || mongoose.model('Animal', animalSchema);

// ─── DB SINGLETON ─────────────────────────────────────────────
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS:          45000,
  });
  isConnected = true;
}

// ─── AUTH ─────────────────────────────────────────────────────
function auth(req, res, next) {
  if (req.headers['x-admin-password'] === process.env.ADMIN_PASSWORD) return next();
  res.status(401).json({ message: 'Senha incorreta.' });
}

// ══════════════════════════════════════════════════════════════
// ROTAS — sem DB
// ══════════════════════════════════════════════════════════════

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ts: new Date(),
    adminConfigured:     !!process.env.ADMIN_PASSWORD,
    mongoConfigured:     !!process.env.MONGODB_URI,
    cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
  });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ success: false, message: 'ADMIN_PASSWORD não configurada na Vercel.' });
  }
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, message: 'Senha incorreta.' });
});

// ══════════════════════════════════════════════════════════════
// ROTAS — com DB
// ══════════════════════════════════════════════════════════════

// GET /api/animais
app.get('/api/animais', async (req, res) => {
  try {
    await connectDB();
    const animais = await Animal.find().sort({ dataCriacao: -1 });
    res.json(animais);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/animais
app.post('/api/animais', upload.single('foto'), async (req, res) => {
  try {
    await connectDB();
    const animal = new Animal({
      ...req.body,
      imagemUrl: req.file?.path || '',
    });
    const saved = await animal.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/animais/:id
app.delete('/api/animais/:id', auth, async (req, res) => {
  try {
    await connectDB();
    const animal = await Animal.findByIdAndDelete(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal não encontrado.' });

    if (animal.imagemUrl?.includes('cloudinary')) {
      try {
        const parts    = animal.imagemUrl.split('/');
        const filename = parts[parts.length - 1].split('.')[0];
        const folder   = parts[parts.length - 2];
        await cloudinary.uploader.destroy(`${folder}/${filename}`);
      } catch (_) {}
    }

    res.json({ message: 'Removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── LOCAL DEV ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
}

module.exports = app;