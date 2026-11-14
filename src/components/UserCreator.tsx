import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { adminUsersApi } from '../lib/adminApi';

type Act = { id: string; name: string };

/** Janela para o administrador criar um professor, auxiliar ou outro administrador (e-mail + senha). */
export default function UserCreator({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [acts, setActs] = useState<Act[]>([]);
  const [f, setF] = useState({ full_name: '', email: '', password: '', role: 'teacher' });
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase?.from('activities').select('id,name').order('sort_order').then(({ data }) => setActs((data as Act[]) || []));
  }, []);

  const needsActs = f.role !== 'admin';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (needsActs && sel.length === 0 && !confirm('Nenhuma atividade marcada: este usuário não verá nenhum aluno até você ligar uma atividade. Continuar?')) return;
    setBusy(true);
    const r = await adminUsersApi({ action: 'create', ...f });
    if (!r.ok) { setBusy(false); setError(r.error || 'Erro.'); return; }
    let extra = '';
    if (needsActs && sel.length && supabase) {
      const { error: err } = await supabase.from('teacher_activities').insert(sel.map(a => ({ profile_id: r.data.id, activity_id: a })));
      if (err) extra = ' Atenção: não foi possível ligar as atividades — faça em "Professores por atividade".';
    }
    setBusy(false);
    onDone(`Usuário "${f.full_name}" criado. Passe o e-mail e a senha para ele entrar em /login.` + extra);
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modalHead"><div><div className="overline">NOVO ACESSO</div><h2>Novo usuário</h2></div>
          <button onClick={onClose} aria-label="Fechar"><X /></button></div>
        <form onSubmit={submit} className="modalForm">
          <label>Nome completo<input required maxLength={120} value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></label>
          <label>E-mail (será o login)<input required type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
          <label>Senha (mínimo 8 caracteres)<input required type="text" minLength={8} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></label>
          <label>Perfil
            <select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>
              <option value="teacher">Professor (só a atividade dele)</option>
              <option value="assistant">Auxiliar (só a atividade dele)</option>
              <option value="admin">Administrador (vê e faz tudo)</option>
            </select>
          </label>
          {needsActs && (
            <div className="activityPicker">
              <b>Atividade(s) que este usuário ensina</b>
              <div>{acts.map(a => <label key={a.id}><input type="checkbox" checked={sel.includes(a.id)} onChange={() => setSel(sel.includes(a.id) ? sel.filter(x => x !== a.id) : [...sel, a.id])} /> {a.name}</label>)}</div>
            </div>
          )}
          {error && <div className="error" style={{ gridColumn: '1/-1' }}>{error}</div>}
          <div className="modalActions">
            <button type="button" className="cancelButton" onClick={onClose}>Cancelar</button>
            <button className="primaryButton" disabled={busy}>{busy ? 'Criando…' : 'Criar usuário'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
