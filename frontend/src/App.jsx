import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function App() {
  const [formData, setFormData] = useState({
    nome_completo: '',
    data_nascimento: '',
    veio_outra_academia: false,
    tempo_treino_anterior: '',
    faixa_anterior: '',
    possui_graus: false,
    quantidade_graus: 1,
    nome_mestre_anterior: ''
  });

  const [alunoCadastrado, setAlunoCadastrado] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const response = await fetch('http://localhost:3001/api/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || 'Erro ao realizar cadastro.');
      }

      setAlunoCadastrado(data);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  const novoCadastro = () => {
    setAlunoCadastrado(null);
    setFormData({
      nome_completo: '',
      data_nascimento: '',
      veio_outra_academia: false,
      tempo_treino_anterior: '',
      faixa_anterior: '',
      possui_graus: false,
      quantidade_graus: 1,
      nome_mestre_anterior: ''
    });
  };

  const styles = {
    container: { maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif', padding: '24px', border: '1px solid #ddd', borderRadius: '8px' },
    field: { marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '5px' },
    input: { padding: '8px', fontSize: '15px', borderRadius: '4px', border: '1px solid #ccc' },
    box: { background: '#f5f7fa', padding: '16px', borderRadius: '6px', marginTop: '12px' },
    btn: { padding: '12px 20px', background: '#0056b3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' },
    card: { textAlign: 'center', padding: '20px', border: '2px dashed #0056b3', borderRadius: '8px', marginTop: '20px' }
  };

  return (
    <div style={styles.container}>
      <h2>Ficha de Inscrição - Jiu-Jitsu</h2>

      {erro && <p style={{ color: 'red', fontWeight: 'bold' }}>{erro}</p>}

      {!alunoCadastrado ? (
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label>Nome Completo:</label>
            <input
              style={styles.input}
              type="text"
              name="nome_completo"
              value={formData.nome_completo}
              onChange={handleChange}
              required
            />
          </div>

          <div style={styles.field}>
            <label>Data de Nascimento:</label>
            <input
              style={styles.input}
              type="date"
              name="data_nascimento"
              max={new Date().toISOString().split('T')[0]}
              value={formData.data_nascimento}
              onChange={handleChange}
              required
            />
          </div>

          <hr style={{ margin: '20px 0' }} />

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="veio_outra_academia"
                checked={formData.veio_outra_academia}
                onChange={handleChange}
              />
              Veio de outra academia?
            </label>
          </div>

          {formData.veio_outra_academia && (
            <div style={styles.box}>
              <h3 style={{ marginTop: 0 }}>Histórico Anterior</h3>

              <div style={styles.field}>
                <label>Quanto tempo treinou?</label>
                <input
                  style={styles.input}
                  type="text"
                  name="tempo_treino_anterior"
                  value={formData.tempo_treino_anterior}
                  onChange={handleChange}
                  placeholder="Ex: 1 ano e 6 meses"
                />
              </div>

              <div style={styles.field}>
                <label>Qual a faixa?</label>
                <select style={styles.input} name="faixa_anterior" value={formData.faixa_anterior} onChange={handleChange}>
                  <option value="">Selecione...</option>
                  <option value="Branca">Branca</option>
                  <option value="Azul">Azul</option>
                  <option value="Roxa">Roxa</option>
                  <option value="Marrom">Marrom</option>
                  <option value="Preta">Preta</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="possui_graus"
                    checked={formData.possui_graus}
                    onChange={handleChange}
                  />
                  Tem graus na faixa?
                </label>
              </div>

              {formData.possui_graus && (
                <div style={styles.field}>
                  <label>Quantos graus?</label>
                  <input
                    style={styles.input}
                    type="number"
                    name="quantidade_graus"
                    min="1"
                    max="4"
                    value={formData.quantidade_graus}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div style={styles.field}>
                <label>Nome do mestre anterior (Opcional):</label>
                <input
                  style={styles.input}
                  type="text"
                  name="nome_mestre_anterior"
                  value={formData.nome_mestre_anterior}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <br />
          <button type="submit" style={styles.btn} disabled={carregando}>
            {carregando ? 'Salvando...' : 'Concluir Matrícula'}
          </button>
        </form>
      ) : (
        <div style={styles.card}>
          <h3>Matrícula Concluída!</h3>
          <p><strong>Aluno:</strong> {alunoCadastrado.nome_completo}</p>
          <p><strong>Matrícula:</strong> {alunoCadastrado.numero_matricula}</p>
          <div style={{ margin: '20px 0' }}>
            <QRCodeSVG value={alunoCadastrado.numero_matricula} size={160} />
          </div>
          <p style={{ fontSize: '13px', color: '#555' }}>Este QR Code é o identificador único para a carteirinha.</p>
          <button onClick={novoCadastro} style={styles.btn}>Novo Cadastro</button>
        </div>
      )}
    </div>
  );
}
