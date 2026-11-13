import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, XCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { photoUrl } from '../lib/photo';
import Brand from '../components/Brand';

type Result = { student_display_name: string; student_number: string; activities: { name: string; graduation: string | null }[] | null; card_status: string; expires_at: string | null; photo_path: string | null };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fmt = (d: string) => d.split('-').reverse().join('/');

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

  return (
    <main className="loginPage idPage">
      <Link to="/" className="back">← Voltar ao site</Link>
      {state === 'loading' && <div className="loginBox"><p>Verificando…</p></div>}
      {state === 'valid' && card && (
        <article className="idCard" aria-label="Carteirinha digital">
          <header><Brand /><span className="idBadge"><BadgeCheck size={16} /> VÁLIDA</span></header>
          <div className="idBody">
            <div className="idPhoto">{photo ? <img src={photo} alt={`Foto de ${card.student_display_name}`} /> : <span>Sem foto</span>}</div>
            <dl>
              <dt>Nome</dt><dd className="idName">{card.student_display_name}</dd>
              <dt>Matrícula</dt><dd>{card.student_number}</dd>
              <dt>Atividades</dt><dd>{card.activities && card.activities.length ? <span className="idActs">{card.activities.map(a => <span key={a.name}><span>{a.name}</span><b>{a.graduation || 'Sem graduação'}</b></span>)}</span> : 'Não registrada'}</dd>
              <dt>Validade</dt><dd>{card.expires_at ? fmt(card.expires_at) : '—'}</dd>
            </dl>
          </div>
          <footer>
            <div className="idQr"><QRCodeSVG value={window.location.href} size={104} bgColor="#ffffff" fgColor="#111111" /></div>
            <small>Aponte a câmera para este QR para conferir a carteirinha. Por privacidade, só dados mínimos são exibidos. Verificada em {new Date().toLocaleString('pt-BR')}.</small>
          </footer>
        </article>
      )}
      {state === 'invalid' && (
        <div className="loginBox verifyBox"><Brand /><div className="verifyBad"><XCircle size={40} /><h1>Não <span>validada.</span></h1>
          <p>Carteirinha inexistente, vencida ou não ativa. Procure a coordenação do projeto.</p></div></div>
      )}
      {state === 'error' && <div className="loginBox"><div className="error">Não foi possível verificar agora. Tente novamente mais tarde.</div></div>}
    </main>
  );
}
