import { useEffect, useMemo, useState } from 'react';
import { CheckCheck, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Cls = { id: string; name: string; category: string | null; weekday: string | null; start_time: string | null; teacher_name: string | null; activity_id: string; activities: { name: string } | null };
type Stu = { id: string; full_name: string; category: string | null };
type Link = { activity_id: string; students: (Stu & { status: string }) | null };
type St = 'present' | 'absent' | 'excused';
type Marks = Record<string, St>;

const OPTIONS: { value: St; label: string; short: string }[] = [
  { value: 'present', label: 'Presente', short: 'P' },
  { value: 'absent', label: 'Ausente', short: 'F' },
  { value: 'excused', label: 'Justificada', short: 'J' },
];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function RollCall({ profile, notify }: { profile: { id: string; full_name: string }; notify: (m: string) => void }) {
  const [classes, setClasses] = useState<Cls[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [marks, setMarks] = useState<Marks>({});
  const [saved, setSaved] = useState<Marks>({});
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // turmas ativas e alunos ativos
  useEffect(() => {
    if (!supabase) return;
    const s = supabase;
    (async () => {
      const [c, st, pend] = await Promise.all([
        s.from('classes').select('id,name,category,weekday,start_time,teacher_name,activity_id,activities(name)').eq('active', true).order('name'),
        s.from('student_activities').select('activity_id,students(id,full_name,category,status)').eq('status', 'active').limit(2000),
        s.from('students').select('full_name').eq('status', 'pending').order('full_name').limit(50),
      ]);
      setPendingNames(((pend.data as { full_name: string }[]) || []).map(x => x.full_name));
      if (c.error) notify('Falha ao carregar turmas: ' + c.error.message);
      if (st.error) notify('Falha ao carregar alunos: ' + st.error.message);
      setClasses((c.data as unknown as Cls[]) || []);
      setLinks(((st.data as unknown as Link[]) || []).filter(l => l.students && l.students.status === 'active'));
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // presenças já lançadas para a turma/data
  useEffect(() => {
    setMarks({}); setSaved({});
    if (!supabase || !classId || !date) return;
    let cancelled = false;
    supabase.from('attendance').select('student_id,status').eq('class_id', classId).eq('attendance_date', date).then(({ data, error }) => {
      if (cancelled) return;
      if (error) { notify('Falha ao carregar presenças: ' + error.message); return; }
      const m: Marks = {};
      (data || []).forEach(r => { m[r.student_id as string] = r.status as St; });
      setMarks(m); setSaved(m);
    });
    return () => { cancelled = true; };
  }, [classId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const cls = classes.find(c => c.id === classId);
  const visible = useMemo(() => {
    if (!cls) return [];
    return links.filter(l => l.activity_id === cls.activity_id).map(l => l.students as Stu)
      .filter(s => showAll || !cls.category || !s.category || s.category === cls.category || marks[s.id])
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'pt-BR'));
  }, [links, cls, showAll, marks]);

  const changed = Object.keys(marks).filter(id => marks[id] !== saved[id]);
  const counts = { present: 0, absent: 0, excused: 0, none: 0 };
  visible.forEach(s => { const m = marks[s.id]; if (m) counts[m]++; else counts.none++; });

  const set = (id: string, v: St) => setMarks(p => ({ ...p, [id]: v }));
  const markRestPresent = () => setMarks(p => { const n = { ...p }; visible.forEach(s => { if (!n[s.id]) n[s.id] = 'present'; }); return n; });

  async function save() {
    if (!supabase || !cls || changed.length === 0 || saving) return;
    setSaving(true);
    const rows = changed.map(id => ({
      student_id: id, class_id: cls.id, attendance_date: date, status: marks[id],
      teacher_profile_id: profile.id, teacher_name: cls.teacher_name || profile.full_name,
    }));
    const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,class_id,attendance_date' });
    setSaving(false);
    if (error) { notify('Não foi possível salvar a chamada: ' + error.message); return; }
    setSaved({ ...marks });
    notify(`Chamada salva: ${rows.length} registro(s).`);
  }

  if (loading) return <div className="loading">Carregando turmas e alunos…</div>;

  return (
    <>
      <div className="pageIntro"><div><div className="overline">FREQUÊNCIA</div><h1>Chamada <span>por turma.</span></h1>
        <p>Escolha a turma e a data, marque cada aluno e salve tudo de uma vez. Só aparecem alunos com situação Ativo e inscritos na atividade da turma.</p></div></div>

      <div className="tablePanel">
        <div className="rollFilters">
          <label>Turma
            <select value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">Selecione…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.activities?.name ? c.activities.name + ' · ' : ''}{c.name}{c.weekday ? ` · ${c.weekday}` : ''}{c.start_time ? ` ${c.start_time.slice(0, 5)}` : ''}</option>)}
            </select>
          </label>
          <label>Data<input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayStr()} /></label>
          <label className="rollCheck"><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} /> Mostrar alunos de todas as categorias</label>
        </div>

        {pendingNames.length > 0 && (
          <div className="notice rollPending">Alunos com situação <b>Pendente</b> não aparecem na chamada: {pendingNames.slice(0, 5).join(', ')}{pendingNames.length > 5 ? ` e mais ${pendingNames.length - 5}` : ''}. Em <b>Alunos</b>, edite e mude a situação para <b>Ativo</b>.</div>
        )}
        {classes.length === 0 ? (
          <div className="empty"><b>Nenhuma turma ativa</b><p>Cadastre as turmas em “Turmas e aulas” antes de fazer a chamada.</p></div>
        ) : !cls ? (
          <div className="empty"><b>Selecione uma turma</b></div>
        ) : visible.length === 0 ? (
          <div className="empty"><b>Nenhum aluno ativo para esta turma</b><p>Confira se há alunos Ativos inscritos na atividade desta turma (em “Alunos”, lápis → Atividades).{cls.category ? ` Esta turma é ${cls.category}: confira a categoria dos alunos ou marque “Mostrar alunos de todas as categorias”.` : ''}</p></div>
        ) : (
          <>
            <div className="rollSummary">
              <span><b>{counts.present}</b> presentes</span><span><b>{counts.absent}</b> ausentes</span>
              <span><b>{counts.excused}</b> justificadas</span><span><b>{counts.none}</b> sem marcação</span>
              <button type="button" className="lightIcon rollAll" onClick={markRestPresent}><CheckCheck size={15} /> Marcar restantes como presentes</button>
            </div>
            <ul className="rollList">
              {visible.map(s => (
                <li key={s.id} className={marks[s.id] && marks[s.id] !== saved[s.id] ? 'dirty' : ''}>
                  <span className="rollName">{s.full_name}{s.category && <small>{s.category}</small>}</span>
                  <div className="rollBtns" role="group" aria-label={`Presença de ${s.full_name}`}>
                    {OPTIONS.map(o => (
                      <button key={o.value} type="button" className={`${o.value} ${marks[s.id] === o.value ? 'on' : ''}`} onClick={() => set(s.id, o.value)} aria-pressed={marks[s.id] === o.value} title={o.label}>
                        <span className="full">{o.label}</span><span className="short">{o.short}</span>
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <div className="rollFooter">
              <span>{changed.length ? `${changed.length} alteração(ões) não salva(s)` : 'Tudo salvo'}</span>
              <button className="primaryButton" onClick={save} disabled={saving || changed.length === 0}><Save size={16} /> {saving ? 'Salvando…' : 'Salvar chamada'}</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
