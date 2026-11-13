import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Act = { id: string; name: string };
type Link = { id: string; activity_id: string; status: string };

/** Marca em quais atividades o aluno treina (somente administrador). Cada clique grava na hora. */
export default function ActivityPicker({ studentId, onChange, notify }: { studentId: string; onChange?: () => void; notify: (m: string) => void }) {
  const [acts, setActs] = useState<Act[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!supabase) return;
    const [a, l] = await Promise.all([
      supabase.from('activities').select('id,name').order('sort_order'),
      supabase.from('student_activities').select('id,activity_id,status').eq('student_id', studentId),
    ]);
    setActs((a.data as Act[]) || []);
    setLinks((l.data as Link[]) || []);
  }
  useEffect(() => { load(); }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(a: Act) {
    if (!supabase || busy) return;
    setBusy(true);
    const cur = links.find(x => x.activity_id === a.id);
    const r = cur
      ? await supabase.from('student_activities').delete().eq('id', cur.id)
      : await supabase.from('student_activities').insert({ student_id: studentId, activity_id: a.id });
    setBusy(false);
    if (r.error) { notify('Não foi possível alterar a atividade: ' + r.error.message); return; }
    await load(); onChange?.();
  }

  return (
    <div className="activityPicker">
      <b>Atividades do aluno</b>
      <div>
        {acts.map(a => (
          <label key={a.id}><input type="checkbox" disabled={busy} checked={links.some(l => l.activity_id === a.id)} onChange={() => toggle(a)} /> {a.name}</label>
        ))}
      </div>
      <small>Marque 1 ou 2 atividades. O professor de cada atividade só enxerga os alunos marcados nela. Desmarcar tira o aluno daquela atividade.</small>
    </div>
  );
}
