require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const app = express();

// 1. CONFIGURAÇÃO CLOUDINARY
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { 
    folder: 'animais_adocao', 
    allowed_formats: ['jpg', 'png', 'jpeg'] 
  },
});
const upload = multer({ storage });

// 2. MIDDLEWARES
app.use(cors());
app.use(express.json());


// Middleware de segurança para o Admin
const auth = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    if (password === process.env.ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ message: "Acesso negado: Senha incorreta." });
    }
};

// 3. CONEXÃO MONGODB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Conectado ao MongoDB!"))
  .catch(err => console.error("❌ Erro ao conectar:", err));

// 4. MODELO (Animal)
const Animal = mongoose.model('Animal', new mongoose.Schema({
    nome: { type: String, required: true },
    especie: { type: String, required: true },
    raca: String,
    idade: String,
    porte: String,
    descricao: String,
    imagemUrl: String,
    nomeDoador: String,
    contatoDoador: String,
    dataCriacao: { type: Date, default: Date.now }
}));

// 5. ROTAS PÚBLICAS
// Listar animais
app.get('/api/animais', async (req, res) => {
    const animais = await Animal.find().sort({ dataCriacao: -1 });
    res.json(animais);
});

// Cadastrar animal (com upload de foto)
app.post('/api/animais', upload.single('foto'), async (req, res) => {
    try {
        const novoAnimal = new Animal({
            ...req.body,
            imagemUrl: req.file ? req.file.path : 'https://via.placeholder.com/300'
        });
        await novoAnimal.save();
        res.status(201).json({ message: "Cadastrado com sucesso!" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 6. ROTAS ADMINISTRATIVAS
// Validar login do Admin
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// Deletar animal (Protegida)
app.delete('/api/animais/:id', auth, async (req, res) => {
    try {
        await Animal.findByIdAndDelete(req.params.id);
        res.json({ message: "Animal removido com sucesso!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// INICIAR SERVIDOR

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
}

module.exports = app; // ESSENCIAL para a Vercel