const express    = require('express');
const router     = express.Router();
const Animal     = require('../models/Animal');
const cloudinary = require('cloudinary').v2;

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────
const auth = (req, res, next) => {
  const pwd = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ message: 'ADMIN_PASSWORD não configurada.' });
  }
  if (pwd === process.env.ADMIN_PASSWORD) return next();
  res.status(401).json({ message: 'Acesso negado: senha incorreta.' });
};

// GET /api/animais — listar todos
router.get('/animais', async (req, res) => {
  try {
    const animais = await Animal.find().sort({ dataCriacao: -1 });
    res.json(animais);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/animais — cadastrar com foto
router.post('/animais', async (req, res) => {
  try {
    const animal = new Animal({
      ...req.body,
      imagemUrl: req.file?.path || 'https://placedog.net/800/600?r',
    });
    const novoAnimal = await animal.save();
    res.status(201).json(novoAnimal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/animais/:id — remover (protegida)
router.delete('/animais/:id', auth, async (req, res) => {
  try {
    const animal = await Animal.findByIdAndDelete(req.params.id);
    if (!animal) return res.status(404).json({ message: 'Animal não encontrado.' });

    // Remove imagem do Cloudinary sem bloquear resposta
    if (animal.imagemUrl?.includes('cloudinary')) {
      try {
        const parts    = animal.imagemUrl.split('/');
        const filename = parts[parts.length - 1].split('.')[0];
        const folder   = parts[parts.length - 2];
        await cloudinary.uploader.destroy(`${folder}/${filename}`);
      } catch (_) { /* falha silenciosa */ }
    }

    res.json({ message: 'Animal removido com sucesso.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;