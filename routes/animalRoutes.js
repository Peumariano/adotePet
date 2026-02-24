const express = require('express');
const router = express.Router();
const Animal = require('../models/Animal');

// Rota para listar todos os animais
router.get('/animais', async (req, res) => {
    try {
        const animais = await Animal.find().sort({ dataCriacao: -1 });
        res.json(animais);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Rota para cadastrar novo animal
router.post('/animais', async (req, res) => {
    const animal = new Animal(req.body);
    try {
        const novoAnimal = await animal.save();
        res.status(201).json(novoAnimal);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;