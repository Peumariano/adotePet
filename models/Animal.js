const mongoose = require('mongoose');

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

module.exports = mongoose.models.Animal || mongoose.model('Animal', animalSchema);