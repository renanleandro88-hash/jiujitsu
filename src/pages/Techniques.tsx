import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Brand from '../components/Brand';

type Tech = {
  id: string; title: string; description: string | null; category: string | null; belt: string | null; difficulty: string | null;
  content_type: string | null; video_url: string | null; steps: string | null; common_errors: string | null; safety_notes: string | null; sort_order: number;
};
const lines = (s: string | null) => (s || '').split('\n').map(x => x.trim()).filter(Boolean);
const COLS = 'id,title,description,category,belt,difficulty,content_type,video_url,steps,common_errors,safety_notes,sort_order';

export default function Techniques() {
  const [items, setItems] = useState<Tech[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [diff, setDiff] = useState('');

  useEffect(() => {
    if (!supabase) { setItems([]); setError('O sistema ainda não foi configurado.'); return; }
    supabase.from('learning_contents').select(COLS).eq('published', true).order('sort_order').order('title').then(({ data, error: err }) => {
      if (err) setError('Não foi possível carregar as técnicas agora.');
      setItems((data as Tech[]) || []);
    });
  }, []);

  const filtered = useMemo(() => (items || []).filter(t =>
    (!diff || t.difficulty === diff) &&
    (!q.trim() || (t.title + ' ' + (t.description || '')).toLowerCase().includes(q.trim().toLowerCase()))), [items, q, diff]);

  return (
    <main className="enrollPage">
      <div className="enrollWrap">
        <header className="enrollHead"><Brand /><Link to="/" className="enrollBack">← Voltar ao site</Link></header>
        <h1>Técnicas de <span>jiu-jitsu.</span></h1>
        <p className="enrollIntro">Passo a passo para revisar em casa o que foi ensinado no treino. Treine sempre com um colega de confiança, com calma, e siga as orientações do professor. Quem bate (tap) ou avisa, é solto na hora.</p>

        <div className="techFilters">
          <div className="searchBox techSearch"><Search size={17} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar técnica (ex.: passagem)…" /></div>
          <select value={diff} onChange={e => setDiff(e.target.value)} aria-label="Dificuldade">
            <option value="">Todos os níveis</option><option>Iniciante</option><option>Intermediário</option><option>Avançado</option>
          </select>
        </div>

        {error && <div className="error enrollError">{error}</div>}
        {items === null ? <p className="enrollIntro">Carregando…</p> : filtered.length === 0 ? (
          <div className="enrollCard"><p className="enrollNote">Nenhuma técnica encontrada.</p></div>
        ) : filtered.map(t => (
          <details key={t.id} className="enrollCard techCard">
            <summary>
              <div><h2>{t.title}</h2>{t.description && <p>{t.description}</p>}</div>
              <div className="techTags">{t.difficulty && <span>{t.difficulty}</span>}{t.content_type && <span>{t.content_type}</span>}{t.belt && <span>Faixa {t.belt}</span>}</div>
            </summary>
            {lines(t.steps).length > 0 && <><h3>Passo a passo</h3><ol>{lines(t.steps).map((s, i) => <li key={i}>{s}</li>)}</ol></>}
            {lines(t.common_errors).length > 0 && <><h3>Erros comuns</h3><ul>{lines(t.common_errors).map((s, i) => <li key={i}>{s}</li>)}</ul></>}
            {lines(t.safety_notes).length > 0 && <div className="techSafety"><h3>Cuidados de segurança</h3><ul>{lines(t.safety_notes).map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
            {t.video_url && <a className="primaryButton techVideo" href={t.video_url} target="_blank" rel="noopener noreferrer"><PlayCircle size={16} /> Assistir vídeo</a>}
          </details>
        ))}
      </div>
    </main>
  );
}
