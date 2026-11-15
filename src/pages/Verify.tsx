import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { photoUrl } from '../lib/photo';
import Brand from '../components/Brand';

type Result = { student_display_name: string; student_number: string; activities: { name: string; graduation: string | null; belt?: string | null; degrees?: number | null; teachers: string[] | null; schedule: { weekday: string | null; start: string | null; end: string | null; name: string }[] | null }[] | null; card_status: string; expires_at: string | null; photo_path: string | null };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACADEMY = 'Avenida Miguel de Castro, 1451 · Pirituba · São Paulo/SP';
const fmt = (d: string) => d.split('-').reverse().join('/');
const COLORS: [string, string][] = [['branca', '#f4f4f4'], ['cinza', '#9a9a9a'], ['amarela', '#f2c823'], ['laranja', '#f08a24'], ['verde', '#2e9e4f'], ['azul', '#1f5fbf'], ['roxa', '#7a3db5'], ['marrom', '#7a4a21'], ['preta', '#161616'], ['vermelha', '#c62828'], ['crua', '#e8dcc0'], ['bege', '#e8dcc0'], ['rosa', '#e86aa6'], ['dourada', '#c9a227']];
const beltColors = (b?: string | null) => { const t = (b || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); return COLORS.filter(([n]) => t.includes(n.slice(0, 5))).map(c => c[1]); };
function Belt({ belt, degrees }: { belt?: string | null; degrees?: number | null }) {
  const cols = beltColors(belt);
  if (!cols.length) return null;
  const bg = cols.length > 1 ? `linear-gradient(90deg,${cols.map((c, i) => `${c} ${(i * 100) / cols.length}% ${((i + 1) * 100) / cols.length}%`).join(',')})` : cols[0];
  return <div className="cnhBelt" aria-hidden="true"><div className="bar" style={{ background: bg }} /><div className="tip">{Array.from({ length: Math.min(degrees || 0, 4) }).map((_, i) => <i key={i} />)}</div></div>;
}

/** Carteirinha digital: é a mesma página que o QR da carteirinha abre. Mostra foto, matrícula, graduação e validade. */
export default function Verify() {
  const { token = '' } = useParams();
  const [state, setState] = useState<'loading' | 'valid' | 'invalid' | 'error'>('loading');
  const [card, setCard] = useState<Result | null>(null);

  useEffect(() => {
    if (!UUID.test(token)) { setState('invalid'); return; }
    if (!supabase) { setState('error'); return; }
    supabase.rpc('verify_membership_card', { token }).then(({ data, error }) => {
      if (error) { setState('error'); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (row) { setCard(row as Result); setState('valid'); } else setState('invalid');
    });
  }, [token]);

  const photo = card ? photoUrl(card.photo_path) : null;
  const [flip, setFlip] = useState(false);
  const [priv, setPriv] = useState<{ address: string | null; rg: string | null; sus_number: string | null } | null>(null);
  const [askBirth, setAskBirth] = useState(false);
  const [birth, setBirth] = useState('');
  const [privMsg, setPrivMsg] = useState('');
  async function unlock(e: FormEvent) {
    e.preventDefault(); setPrivMsg('');
    if (!supabase || !birth) return;
    const { data, error } = await supabase.rpc('card_private_data', { p_token: token, p_birth: birth });
    if (error) { setPrivMsg(/too_many/.test(error.message) ? 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' : 'Não foi possível consultar agora.'); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) { setPrivMsg('Data de nascimento não confere.'); return; }
    setPriv(row);
  }
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <main className="loginPage idPage">
      <Link to="/" className="back">← Voltar ao site</Link>
      {state === 'loading' && <div className="loginBox"><p>Verificando…</p></div>}
      {state === 'valid' && card && (
        <>
          <div className="cnh" aria-label="Carteirinha digital">
            {!flip ? (
              <article className="cnhFace cnhFront">
                <div className="cnhHolo" aria-hidden="true" />
                <header>
                  <div className="cnhLogo"><img src="/logo/logo.png" alt="" onError={e => (e.currentTarget.style.display = 'none')} /></div>
                  <div><strong>INSTITUTO REALIZA</strong><small>CARTEIRA DO ALUNO</small></div>
                  <span className="cnhOk"><BadgeCheck size={13} /> VÁLIDA</span>
                </header>
                <div className="cnhMain">
                  <div className="cnhPhoto">{photo ? <img src={photo} alt={`Foto de ${card.student_display_name}`} /> : <span>Sem foto</span>}</div>
                  <dl>
                    <dt>NOME</dt><dd className="cnhName">{card.student_display_name}</dd>
                    <dt>MATRÍCULA</dt><dd className="cnhMono">{card.student_number}</dd>
                    <dt>VALIDADE</dt><dd>{card.expires_at ? fmt(card.expires_at) : '—'}</dd>
                  </dl>
                </div>
                <div className="cnhActs">
                  {card.activities && card.activities.length ? card.activities.map(a => (
                    <section key={a.name}>
                      <h3>{a.name}</h3>
                      <div className="cnhGrad"><Belt belt={a.belt} degrees={a.degrees} /><b>{a.belt ? `${a.belt}${a.degrees ? ` · ${a.degrees}º grau` : ''}` : 'Sem graduação registrada'}</b></div>
                      {a.teachers && a.teachers.length > 0 && <p><b>Professor(es):</b> {a.teachers.join(', ')}</p>}
                      {a.schedule && a.schedule.length > 0 && <p><b>Horário:</b> {a.schedule.map(c => `${c.weekday ? c.weekday.slice(0, 3) : ''} ${c.start || ''}${c.end ? '–' + c.end : ''}`.trim()).join(' · ')}</p>}
                    </section>
                  )) : <p>Sem atividade registrada.</p>}
                </div>
                <div className="cnhLocal"><b>Local de treino:</b> {ACADEMY}</div>
                <div className="cnhPriv">
                  {priv ? (
                    <dl>
                      <dt>ENDEREÇO DO ALUNO</dt><dd>{priv.address || 'Não informado'}</dd>
                      <dt>RG</dt><dd>{priv.rg || 'Não informado'}</dd>
                      <dt>CARTÃO SUS</dt><dd>{priv.sus_number || 'Não informado'}</dd>
                    </dl>
                  ) : askBirth ? (
                    <form onSubmit={unlock}>
                      <label>Data de nascimento do aluno<input type="date" required value={birth} onChange={e => setBirth(e.target.value)} /></label>
                      <button className="primaryButton">Mostrar dados</button>
                      {privMsg && <small className="cnhErr">{privMsg}</small>}
                    </form>
                  ) : <button type="button" className="cnhUnlock" onClick={() => setAskBirth(true)}>🔒 Ver endereço, RG e SUS</button>}
                  <small>Dados pessoais protegidos: só aparecem com a data de nascimento.</small>
                </div>
                <footer>
                  <small>Confirme a autenticidade pelo QR code →</small>
                  <div className="cnhQrSm"><QRCodeSVG value={window.location.href} size={78} bgColor="#ffffff" fgColor="#111111" /></div>
                </footer>
              </article>
            ) : (
              <article className="cnhFace cnhBack">
                <div className="cnhHolo" aria-hidden="true" />
                <div className="cnhQr"><QRCodeSVG value={window.location.href} size={180} bgColor="#ffffff" fgColor="#111111" /></div>
                <p>Aponte a câmera para conferir a autenticidade desta carteirinha.</p>
                <div className="cnhClock">Verificada em<br /><b>{now.toLocaleDateString('pt-BR')} {now.toLocaleTimeString('pt-BR')}</b></div>
                <small>Por privacidade, só dados mínimos são exibidos.</small>
              </article>
            )}
          </div>
          <button className="outlineButton cnhFlip" onClick={() => setFlip(!flip)}>{flip ? 'Ver frente' : 'QR code ampliado'}</button>
          <small className="cnhHint">Dica: salve este link nos favoritos ou adicione à tela inicial do celular para abrir a carteirinha rápido.</small>
        </>
      )}
      {state === 'invalid' && (
        <div className="loginBox verifyBox"><Brand /><div className="verifyBad"><XCircle size={40} /><h1>Não <span>validada.</span></h1>
          <p>Carteirinha inexistente, vencida ou não ativa. Procure a coordenação do projeto.</p></div></div>
      )}
      {state === 'error' && <div className="loginBox"><div className="error">Não foi possível verificar agora. Tente novamente mais tarde.</div></div>}
    </main>
  );
}
