const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'academia_jiujitsu',
  waitForConnections: true,
  connectionLimit: 10
});

function gerarMatriculaUnica() {
  const ano = new Date().getFullYear();
  const randomHash = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `JJ-${ano}-${randomHash}`;
}

app.post('/api/alunos', async (req, res) => {
  try {
    const {
      nome_completo,
      data_nascimento,
      veio_outra_academia,
      tempo_treino_anterior,
      faixa_anterior,
      possui_graus,
      quantidade_graus,
      nome_mestre_anterior
    } = req.body;

    if (!nome_completo || !data_nascimento) {
      return res.status(400).json({ erro: 'Nome completo e data de nascimento são obrigatórios.' });
    }

    const hoje = new Date();
    const nascimento = new Date(data_nascimento);
    if (nascimento > hoje) {
      return res.status(400).json({ erro: 'A data de nascimento não pode ser futura.' });
    }

    const numero_matricula = gerarMatriculaUnica();
    const grausFinal = veio_outra_academia && possui_graus ? Number(quantidade_graus || 0) : 0;

    const sql = `
      INSERT INTO alunos (
        numero_matricula, nome_completo, data_nascimento,
        veio_outra_academia, tempo_treino_anterior, faixa_anterior,
        possui_graus, quantidade_graus, nome_mestre_anterior
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      numero_matricula,
      nome_completo.trim(),
      data_nascimento,
      Boolean(veio_outra_academia),
      veio_outra_academia ? tempo_treino_anterior || null : null,
      veio_outra_academia ? faixa_anterior || null : null,
      veio_outra_academia ? Boolean(possui_graus) : false,
      grausFinal,
      veio_outra_academia ? nome_mestre_anterior || null : null
    ];

    const [result] = await pool.execute(sql, values);

    res.status(201).json({
      id: result.insertId,
      numero_matricula,
      nome_completo,
      data_nascimento
    });
  } catch (error) {
    console.error('Erro ao cadastrar aluno:', error);
    res.status(500).json({ erro: 'Erro interno ao salvar matrícula.' });
  }
});

app.get('/api/alunos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM alunos ORDER BY data_cadastro DESC');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar alunos:', error);
    res.status(500).json({ erro: 'Erro interno ao buscar alunos.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
