import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';
import {
  Activity, AlertCircle, BookOpen, CalendarCheck, ChartNoAxesColumn, ClipboardList, CreditCard, Edit, Eye, FileText,
  GraduationCap, HandCoins, HeartHandshake, Home, LockKeyhole, LogOut, Menu, Plus, Printer, QrCode, RefreshCw, Search,
  KeyRound, Settings, ShieldCheck, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import { supabase, ready } from '../lib/supabase';
import { COLUMN_LABELS, LABELS, modules, type FieldDef, type ModuleDef } from '../lib/modules';
import Brand from '../components/Brand';
import RollCall from './RollCall';
import PhotoUploader from '../components/PhotoUploader';
import ActivityPicker from '../components/ActivityPicker';
import UserCreator from '../components/UserCreator';
import { adminUsersApi } from '../lib/adminApi';
import { buildCardPdf } from '../lib/cardPdf';
import { photoUrl, PHOTO_BUCKET } from '../lib/photo';
import EnrollmentSheet from '../components/EnrollmentSheet';
import { categoryFor as catFor, ageFromISO as ageISO } from '../lib/enrollment';

type Row = Record<string, any>;
type Profile = { id: string; full_name: string; role: string; active: boolean };

const iconMap: Record<string, any> = {
  students: Users, guardians: HeartHandshake, classes: CalendarCheck, attendance: ClipboardList, graduations: GraduationCap,
  cards: CreditCard, card_requests: CreditCard, assessments: Activity, contents: BookOpen, contributions: HandCoins,
  expenses: FileText, donations: HeartHandshake, materials: HeartHandshake, announcements: FileText, users: ShieldCheck,
  audit: LockKeyhole, analytics: ChartNoAxesColumn, interests: UserPlus, settings: Settings, payment: HandCoins, rollcall: CalendarCheck, enrollments: FileText, activities: GraduationCap, teacher_activities: ShieldCheck,
};

const navGroups = [
  { label: 'GESTÃO', items: ['dashboard', 'students', 'guardians', 'interests', 'enrollments', 'users', 'activities', 'teacher_activities', 'classes', 'rollcall', 'attendance', 'graduations', 'cards', 'card_requests', 'assessments'] },
  { label: 'PROJETO', items: ['contents', 'announcements'] },
  { label: 'TRANSPARÊNCIA', items: ['contributions', 'settings', 'payment', 'expenses', 'donations', 'materials', 'analytics', 'audit'] },
];

const money = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const brl = (v: any) => (v === null || v === undefined || v === '' ? '—' : money(Number(v)));

function friendlyError(error: { code?: string; message: string }) {
  switch (error.code) {
    case '42501': return 'Você não tem permissão para esta ação.';
    case '23505': return 'Já existe um registro com esse valor único (ex.: número, ou mesma data/aluno/turma).';
    case '23503': return 'O aluno/turma/usuário informado não existe, ou o registro está sendo usado em outro lugar.';
    case '23502': return 'Há um campo obrigatório vazio.';
    case '23514': return 'Algum valor está fora do permitido (ex.: nota 0–10, graus 0–4).';
    case '22P02': case '22007': return 'Algum campo tem formato inválido (data, número ou UUID).';
    default: return error.message;
  }
}

const ageFrom = (iso: string) => {
  const b = new Date(iso + 'T00:00:00'), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
};
const categoryFor = (age: number | null | undefined) => (age == null ? null : age >= 18 ? 'Adulto' : age >= 13 ? 'Juvenil' : age >= 8 ? 'Kids' : age >= 4 ? 'Baby' : null);

const fmtDate = (d: string) => d.split('-').reverse().join('/');

function fmtCell(def: ModuleDef, key: string, v: any, refs: Record<string, Map<string, string>>): string {
  if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return '—';
  const field = def.fields.find(f => f.name === key);
  if (field?.ref) return refs[field.ref.table]?.get(v) ?? String(v).slice(0, 8) + '…';
  if (key === 'student_activities' && Array.isArray(v)) return v.filter((x: any) => x.status === 'active' && x.activities?.name).map((x: any) => x.activities.name).join(', ') || '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (key === 'amount') return brl(v);
  if (key === 'created_at' || key === 'requested_at') return new Date(v).toLocaleString('pt-BR');
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return fmtDate(String(v));
  if (typeof v === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(v)) return v.slice(0, 5);
  if (typeof v === 'object') return JSON.stringify(v);
  return LABELS[v] ?? String(v);
}

function initialForm(def: ModuleDef, row?: Row): Row {
  const f: Row = {};
  for (const field of def.fields) {
    if (row) {
      let v = row[field.name];
      if (v === null || v === undefined) v = '';
      if (field.type === 'date') v = String(v).slice(0, 10);
      if (field.type === 'boolean') v = v === '' ? '' : String(v);
      f[field.name] = v;
    } else f[field.name] = '';
  }
  return f;
}

/** Converte o formulário em payload para o banco: vazio vira omitido (insert) ou null (update); números/booleanos tipados. */
function buildPayload(def: ModuleDef, form: Row, editing: boolean): Row {
  const out: Row = {};
  for (const field of def.fields) {
    if (field.readOnly || (field.createOnly && editing)) continue;
    let v = form[field.name];
    if (v === '' || v === undefined || v === null) { if (editing) out[field.name] = null; continue; }
    if (field.type === 'number') v = Number(v);
    else if (field.type === 'boolean') v = v === 'true' || v === true;
    else if (typeof v === 'string') v = v.trim();
    out[field.name] = v;
  }
  return out;
}

export default function Admin() {
  const nav = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileState, setProfileState] = useState<'loading' | 'ok' | 'missing' | 'inactive' | 'norole'>('loading');
  const [active, setActive] = useState('dashboard');
  const [sidebar, setSidebar] = useState(false);
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [metrics, setMetrics] = useState<{ students: number; attendance: number; interests: number; enrollments: number; income: number; expenses: number } | null>(null);
  const [refs, setRefs] = useState<Record<string, Map<string, string>>>({});
  const [refOptions, setRefOptions] = useState<Record<string, { id: string; label: string; flag?: any }[]>>({});
  const [cardView, setCardView] = useState<Row | null>(null);
  const [cardStudent, setCardStudent] = useState<Row | null>(null);
  const [cardEmerg, setCardEmerg] = useState<{ contacts: Row[]; health: Row | null }>({ contacts: [], health: null });
  const [copied, setCopied] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [viewRow, setViewRow] = useState<Row | null>(null);
  const [sheet, setSheet] = useState<Row | null>(null);
  const [userModal, setUserModal] = useState(false);
  const reqId = useRef(0);

  const isAdmin = profile?.role === 'admin';
  const def = modules.find(m => m.key === active);
  const allowed = useCallback((m: ModuleDef) => isAdmin || !m.adminOnly, [isAdmin]);

  // ---- sessão ----
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  // ---- perfil ----
  useEffect(() => {
    if (!supabase || !session) { setProfile(null); return; }
    setProfileState('loading');
    supabase.from('profiles').select('id,full_name,role,active').eq('id', session.user.id).maybeSingle().then(({ data, error }) => {
      if (error || !data) { setProfileState('missing'); return; }
      setProfile(data as Profile);
      if (!data.active) setProfileState('inactive');
      else if (!['admin', 'teacher', 'assistant'].includes(data.role)) setProfileState('norole');
      else setProfileState('ok');
    });
  }, [session]);

  // ---- listas de referência (aluno/turma) usadas nos formulários e tabelas ----
  const loadRefs = useCallback(async (d: ModuleDef) => {
    if (!supabase) return;
    const tables = [...new Set(d.fields.filter(f => f.ref).map(f => f.ref!))];
    for (const r of tables) {
      if (refs[r.table]) continue;
      const { data } = await supabase.from(r.table).select(`id,${r.label}${r.flag ? ',' + r.flag : ''}`).order(r.label).limit(1000);
      let list = ((data as unknown as Row[]) || []).map(x => ({ id: x.id as string, label: x[r.label] as string, flag: r.flag ? x[r.flag] : undefined }));
      if (r.table === 'activities' && profile && profile.role !== 'admin') {   // professor só escolhe a(s) atividade(s) dele
        const { data: mine } = await supabase.from('teacher_activities').select('activity_id').eq('profile_id', profile.id);
        const ids = new Set(((mine as { activity_id: string }[]) || []).map(x => x.activity_id));
        list = list.filter(x => ids.has(x.id));
      }
      setRefs(p => ({ ...p, [r.table]: new Map(list.map(x => [x.id, x.label])) }));
      setRefOptions(p => ({ ...p, [r.table]: list }));
    }
  }, [refs, profile]);

  // ---- carregamento dos registros do módulo ----
  const load = useCallback(async () => {
    if (!supabase || !def) return;
    const id = ++reqId.current;
    setLoading(true);
    const { data, error } = await supabase.from(def.table).select(def.select || '*').order(def.orderBy || 'created_at', { ascending: false }).limit(500);
    if (id !== reqId.current) return; // resposta de módulo anterior: descarta
    setData((data as unknown as Row[]) || []);
    if (error) setMessage('Falha ao carregar: ' + friendlyError(error));
    setLoading(false);
  }, [def]);

  useEffect(() => {
    if (profileState !== 'ok') return;
    setData([]); setSearch('');
    if (def) { load(); loadRefs(def); }
  }, [active, profileState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- dashboard ----
  useEffect(() => {
    if (profileState !== 'ok' || active !== 'dashboard' || !supabase) return;
    const s = supabase;
    (async () => {
      const [st, at] = await Promise.all([
        s.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        s.from('attendance').select('*', { count: 'exact', head: true }).eq('status', 'present'),
      ]);
      let income = 0, expenses = 0, interests = 0, enrollments = 0;
      if (isAdmin) {
        const [c, e, i, en] = await Promise.all([
          s.from('contributions').select('amount').eq('status', 'received'),
          s.from('expenses').select('amount'),
          s.from('public_interest').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          s.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        ]);
        income = (c.data || []).reduce((x, y) => x + Number(y.amount || 0), 0);
        expenses = (e.data || []).reduce((x, y) => x + Number(y.amount || 0), 0);
        interests = i.count || 0;
        enrollments = en.count || 0;
      }
      setMetrics({ students: st.count || 0, attendance: at.count || 0, interests, enrollments, income, expenses });
    })();
  }, [active, profileState, isAdmin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(row => def!.columns.some(k => fmtCell(def!, k, row[k], refs).toLowerCase().includes(q)));
  }, [data, search, def, refs]);

  const canWrite = !!def && !def.readOnly && (isAdmin || !!def.staffWrite);
  const canCreate = canWrite && !def?.noCreate && !(def?.singleRow && data.length > 0) && !(def?.key === 'students' && !isAdmin);
  const canEdit = canWrite && (isAdmin || def?.staffWrite === 'full');
  const canDelete = canWrite && isAdmin && !def?.noDelete;

  function newRecord() {
    if (!def) return;
    if (def.key === 'users') { setUserModal(true); return; }
    const f = initialForm(def);
    if (def.key === 'students') { f.status = 'pending'; }
    setEditing(null); setForm(f); setModal(true);
  }
  function editRecord(row: Row) { if (!def) return; setEditing(row); setForm(initialForm(def, row)); setModal(true); }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !def || saving) return;
    setSaving(true);
    const payload = buildPayload(def, form, !!editing);
    const res = editing
      ? await supabase.from(def.table).update(payload).eq('id', editing.id)
      : await supabase.from(def.table).insert(payload);
    setSaving(false);
    if (res.error) { setMessage('Não foi salvo: ' + friendlyError(res.error)); return; }
    setModal(false); setMessage('Registro salvo.'); load();
  }

  async function remove(row: Row) {
    if (!supabase || !def || !confirm('Confirma excluir este registro? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from(def.table).delete().eq('id', row.id);
    if (error) setMessage('Não foi possível excluir: ' + friendlyError(error));
    else { setMessage('Registro excluído.'); load(); }
  }

  async function convertInterest(row: Row) {
    if (!supabase) return;
    if (row.status === 'approved' && !confirm('Este interessado já está marcado como aprovado. Criar outro aluno mesmo assim?')) return;
    const { data: dup } = await supabase.from('students').select('id,full_name').eq('phone', row.phone).limit(1);
    if (dup && dup.length > 0 && !confirm(`Já existe o aluno "${dup[0].full_name}" com este telefone. Criar um novo mesmo assim?`)) return;
    const age: number | null = row.birth_date ? ageFrom(row.birth_date) : (row.age as number | null);
    const category = categoryFor(age);
    const notes = [`Origem: formulário do site (${new Date(row.created_at).toLocaleDateString('pt-BR')}).`, row.message ? `Mensagem: ${row.message}` : ''].filter(Boolean).join(' ');
    const { data: newSt, error } = await supabase.from('students').insert({
      full_name: row.full_name, phone: row.phone, email: row.email || null, birth_date: row.birth_date || null, category, status: 'active', notes,
      came_from_other_academy: row.came_from_other_academy, previous_training_time: row.previous_training_time, previous_belt: row.previous_belt,
      previous_degrees: row.previous_degrees, previous_master: row.previous_master,
    }).select('id').single();
    if (error || !newSt) { setMessage('Não foi possível criar o aluno: ' + (error ? friendlyError(error) : 'sem retorno')); return; }
    const wanted = (row.activity_ids as string[] | null) || [];
    if (wanted.length) await supabase.from('student_activities').insert(wanted.map(a => ({ student_id: newSt.id, activity_id: a })));
    await supabase.from('public_interest').update({ status: 'approved' }).eq('id', row.id);
    setActive('students');
    setMessage(`Aluno "${row.full_name}" criado como Ativo.` + (wanted.length ? ' Atividades já vinculadas.' : ' ATENÇÃO: nenhuma atividade informada — abra o lápis do aluno e marque a(s) atividade(s), senão ele não aparece na chamada.') + ' Complete o cadastro quando puder.');
  }

  async function resetPassword(row: Row) {
    const pw = window.prompt(`Nova senha para ${row.full_name} (mínimo 8 caracteres):`);
    if (!pw) return;
    const r = await adminUsersApi({ action: 'set_password', id: row.id, password: pw });
    setMessage(r.ok ? `Senha de ${row.full_name} alterada. Avise a pessoa.` : 'Não foi possível trocar a senha: ' + r.error);
  }

  async function openSheet(listRow: Row) {
    if (!supabase) return;
    const { data, error } = await supabase.from('enrollments').select('*').eq('id', listRow.id).maybeSingle();
    if (error || !data) { setMessage('Não foi possível abrir a ficha.'); return; }
    setSheet(data as Row);
  }

  async function convertEnrollment(listRow: Row) {
    if (!supabase) return;
    const { data: full } = await supabase.from('enrollments').select('*').eq('id', listRow.id).maybeSingle();
    if (!full) { setMessage('Não foi possível ler a ficha.'); return; }
    const row = full as Row;
    if (row.student_id) { setMessage('Esta ficha já foi vinculada a um aluno.'); return; }
    const { data: dup } = await supabase.from('students').select('id,full_name').eq('phone', row.phone1).limit(1);
    if (dup && dup.length > 0 && !confirm(`Já existe o aluno "${dup[0].full_name}" com este telefone. Criar um novo mesmo assim?`)) return;
    const age = row.birth_date ? ageISO(row.birth_date) : row.age;
    const address = [row.address, row.neighborhood, row.city, row.cep && `CEP ${row.cep}`, row.address_complement].filter(Boolean).join(' · ') || null;
    const notes = [`Origem: ficha de inscrição online (${new Date(row.created_at).toLocaleDateString('pt-BR')}).`, row.signer_name ? `Assinada por ${row.signer_name}${row.signer_relationship ? ' (' + row.signer_relationship + ')' : ''}.` : ''].filter(Boolean).join(' ');
    const { data: st, error } = await supabase.from('students').insert({
      full_name: row.full_name, birth_date: row.birth_date, phone: row.phone1, email: row.email || null, sex: row.sex === 'M' ? 'Masculino' : row.sex === 'F' ? 'Feminino' : null,
      address, rg: row.rg || null, sus_number: row.sus_number || null, blood_type: row.blood_type || null, category: catFor(age), status: 'active', entry_date: row.start_date || undefined, notes,
    }).select('id').single();
    if (error || !st) { setMessage('Não foi possível criar o aluno: ' + (error ? friendlyError(error) : 'sem retorno')); return; }
    const sid = st.id as string;
    const problems: string[] = [];
    const wantedActs = (row.activity_ids as string[] | null) || [];
    if (wantedActs.length) { const ra = await supabase.from('student_activities').insert(wantedActs.map(a => ({ student_id: sid, activity_id: a }))); if (ra.error) problems.push('atividades: ' + ra.error.message); }
    const run = async (label: string, p: PromiseLike<{ error: any }>) => { const r = await p; if (r.error) problems.push(`${label}: ${r.error.message}`); };
    if (row.photo_data) {
      try {
        const blob = await (await fetch(row.photo_data)).blob();
        const path = `${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600' });
        if (up.error) throw up.error;
        await run('foto', supabase.from('students').update({ photo_path: path }).eq('id', sid));
      } catch (ex: any) { problems.push('foto: ' + (ex?.message || 'falha ao enviar')); }
    }
    if (row.emergency_name && row.emergency_phone) await run('contato de emergência', supabase.from('emergency_contacts').insert({ student_id: sid, full_name: row.emergency_name, phone: row.emergency_phone, relationship: row.emergency_relationship || null }));
    const resumo = [row.has_health_problem ? `Problema de saúde: ${row.health_problem_desc || 'sim'}` : '', row.takes_medication ? `Medicamento: ${row.medication_desc || 'sim'}` : '', row.has_disability ? `Deficiência/necessidades: ${row.disability_desc || 'sim'}` : '', row.had_surgery ? `Cirurgia: ${row.surgery_desc || 'sim'}` : '', row.blood_type ? `Tipo sanguíneo: ${row.blood_type}` : '', row.health_plan ? `Plano: ${row.health_plan_name || 'sim'}` : row.uses_sus ? 'SUS' : ''].filter(Boolean).join('. ');
    const hasAllergy = !!row.allergies && !/^\s*(nenhuma?|não|nao|n\/a|-)\s*\.?$/i.test(row.allergies);
    await run('saúde', supabase.from('student_health_private').insert({ student_id: sid, has_allergies: hasAllergy, allergy_type: hasAllergy ? row.allergies : null, emergency_guidance: resumo || null }));
    await run('consentimentos', supabase.from('student_consents').insert([
      { student_id: sid, consent_type: 'data_processing', granted: true, guardian_name: row.signer_name, consented_at: row.signed_at, notes: `Termos ${row.terms_version}` },
      { student_id: sid, consent_type: 'image', granted: !!row.image_consent, guardian_name: row.signer_name, consented_at: row.signed_at, notes: `Termos ${row.terms_version}` },
    ]));
    await supabase.from('enrollments').update({ student_id: sid, status: 'approved' }).eq('id', row.id);
    setActive('students');
    setMessage(`Aluno "${row.full_name}" criado como Ativo (com foto, contato de emergência, saúde e consentimentos) e já aparece na Chamada.` + (wantedActs.length ? '' : ' ATENÇÃO: a ficha não trazia atividade — marque no lápis do aluno, senão ele não aparece na chamada.') + (problems.length ? ' Atenção, faltou gravar: ' + problems.join('; ') : ' Revise o cadastro quando puder.'));
  }

  async function openCard(row: Row) {
    setCardView(row); setCardStudent(null); setCardEmerg({ contacts: [], health: null }); setCopied(false);
    if (!supabase) return;
    const { data } = await supabase.from('students').select('full_name,phone,photo_path,blood_type,rg,sus_number,address').eq('id', row.student_id).maybeSingle();
    setCardStudent(data as Row | null);
    const [ec, hp] = await Promise.all([
      supabase.from('emergency_contacts').select('full_name,phone,relationship').eq('student_id', row.student_id),
      supabase.from('student_health_private').select('has_allergies,allergy_type,emergency_guidance').eq('student_id', row.student_id).maybeSingle(),
    ]);
    setCardEmerg({ contacts: (ec.data as Row[]) || [], health: (hp.data as Row | null) || null });
  }
  const [pdfBusy, setPdfBusy] = useState(false);
  async function sendCardPdf(r: Row) {
    if (!supabase || !cardStudent) return;
    if (r.status !== 'active') { setMessage('A carteirinha precisa estar ativa para gerar o PDF.'); return; }
    setPdfBusy(true);
    try {
      const v = await supabase.rpc('verify_membership_card', { token: r.qr_token });
      const vr = (Array.isArray(v.data) ? v.data[0] : v.data) as Row | null;
      const qrEl = document.querySelector('#printCard .qrBox svg');
      const qrSvg = qrEl ? new XMLSerializer().serializeToString(qrEl).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ') : null;
      const h = cardEmerg.health;
      const blob = await buildCardPdf({
        name: String(cardStudent.full_name || refs.students?.get(r.student_id) || 'Aluno'), number: String(r.card_number || ''), expires: r.expires_at ? fmtDate(r.expires_at) : '—',
        photoUrl: photoUrl(cardStudent.photo_path), academy: 'Avenida Miguel de Castro, 1451 · Pirituba · São Paulo/SP', link: cardLink(r), qrSvg,
        activities: (vr?.activities as any[]) || [],
        emergency: { blood: cardStudent.blood_type || null, sus: cardStudent.sus_number || null, rg: cardStudent.rg || null, address: cardStudent.address || null,
          allergies: h?.has_allergies ? (h.allergy_type || 'Sim') : null, health: h?.emergency_guidance || null,
          contacts: cardEmerg.contacts.map(c => ({ name: c.full_name, relationship: c.relationship || null, phone: c.phone })) },
      });
      const fname = `carteirinha-${String(cardStudent.full_name || 'aluno').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}.pdf`;
      const file = new File([blob], fname, { type: 'application/pdf' });
      const text = 'Carteirinha do Instituto Realiza. Link da versão digital: ' + cardLink(r);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text, title: 'Carteirinha' }); } catch { /* cancelado */ }
      } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; a.click();
        const ph = cardStudent.phone ? '55' + String(cardStudent.phone).replace(/\D/g, '').replace(/^55/, '') : '';
        window.open(`https://wa.me/${ph}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        setMessage('PDF baixado. No WhatsApp que abriu, clique no clipe (anexar) e escolha o arquivo ' + fname + '.');
      }
    } catch { setMessage('Não foi possível gerar o PDF agora.'); }
    setPdfBusy(false);
  }
  const cardLink = (r: Row) => `${window.location.origin}/verificar/${r.qr_token}`;
  async function copyCardLink(r: Row) {
    try { await navigator.clipboard.writeText(cardLink(r)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copie o link:', cardLink(r)); }
  }

  async function signOut() { await supabase?.auth.signOut(); nav('/login'); }

  // ---- estados de bloqueio ----
  if (!ready) return (
    <main className="loginPage"><div className="loginBox"><Brand /><div className="overline">CONFIGURAÇÃO PENDENTE</div>
      <h1>Supabase <span>não configurado.</span></h1>
      <p>Crie o arquivo <code>.env.local</code> com <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> e reinicie o <code>npm run dev</code>.</p></div></main>
  );
  if (session === undefined) return <div className="loading">Verificando sessão…</div>;
  if (session === null) return <Navigate to="/login" replace />;
  if (profileState === 'loading') return <div className="loading">Carregando perfil…</div>;
  if (profileState !== 'ok') {
    const txt = {
      missing: 'Seu usuário ainda não tem perfil no sistema. Peça ao administrador para provisionar seu acesso.',
      inactive: 'Sua conta está desativada. Procure o administrador.',
      norole: 'Seu perfil não possui acesso ao painel administrativo.',
    }[profileState];
    return (
      <main className="loginPage"><div className="loginBox"><Brand /><div className="overline">ACESSO NÃO LIBERADO</div>
        <h1>Sem <span>acesso.</span></h1><p>{txt}</p>
        <button className="primaryButton" onClick={signOut}><LogOut size={16} /> Sair</button></div></main>
    );
  }

  const visibleGroups = navGroups
    .map(g => ({ label: g.label, items: g.items.filter(k => k === 'dashboard' || k === 'rollcall' || (modules.find(m => m.key === k) && allowed(modules.find(m => m.key === k)!))) }))
    .filter(g => g.items.length);
  const title = (k: string) => (k === 'dashboard' ? 'Visão geral' : k === 'rollcall' ? 'Chamada por turma' : modules.find(m => m.key === k)?.title || k);
  const m = metrics;
  const metricCards: [string, string | number, any][] = m ? [
    ['Alunos ativos', m.students, Users],
    ['Presenças registradas', m.attendance, CalendarCheck],
    ...(isAdmin ? [
      ['Interessados pendentes', m.interests, UserPlus],
      ['Fichas pendentes', m.enrollments, FileText],
      ['Ajuda de custo recebida', money(m.income), HandCoins],
      ['Despesas registradas', money(m.expenses), FileText],
      ['Saldo registrado', money(m.income - m.expenses), ChartNoAxesColumn],
    ] as [string, string | number, any][] : []),
  ] : [];
  const quick = [['students', 'Cadastrar aluno'], ['attendance', 'Registrar frequência'], ['graduations', 'Registrar graduação'], ['contributions', 'Registrar ajuda de custo']]
    .filter(([k]) => allowed(modules.find(x => x.key === k)!));

  function renderField(field: FieldDef) {
    const value = form[field.name] ?? '';
    const set = (v: string) => setForm({ ...form, [field.name]: v });
    const hidden = field.createOnly && editing;
    if (hidden) return null;
    let control;
    if (field.readOnly) {
      control = <input disabled value={value || ''} placeholder="Gerado automaticamente" />;
    } else if (field.ref) {
      control = (
        <select required={field.required} value={value} onChange={e => set(e.target.value)}>
          <option value="">Selecione…</option>
          {(refOptions[field.ref.table] || []).filter(o => !field.ref!.activeOnly || o.flag === field.ref!.activeOnly || o.id === value).map(o => <option key={o.id} value={o.id}>{o.label}{field.ref!.activeOnly && o.flag !== field.ref!.activeOnly ? ' (não ativo)' : ''}</option>)}
        </select>
      );
    } else if (field.type === 'boolean') {
      control = (
        <select required={field.required} value={value} onChange={e => set(e.target.value)}>
          <option value="">{field.blankLabel || 'Padrão'}</option><option value="true">Sim</option><option value="false">Não</option>
        </select>
      );
    } else if (field.options) {
      control = (
        <select required={field.required} value={value} onChange={e => set(e.target.value)}>
          <option value="">Selecione…</option>
          {field.options.map(o => <option key={o} value={o}>{LABELS[o] ?? o}</option>)}
        </select>
      );
    } else if (field.type === 'textarea') {
      control = <textarea required={field.required} value={value} onChange={e => set(e.target.value)} />;
    } else {
      control = <input required={field.required} type={field.type || 'text'} min={field.min} max={field.max} step={field.step} maxLength={field.maxLength}
        value={value} onChange={e => set(e.target.value)} />;
    }
    return <label key={field.name} className={field.type === 'textarea' ? 'wide' : ''}>{field.label}{field.required ? ' *' : ''}{control}</label>;
  }

  const showActions = !!def && (canEdit || canDelete || def.key === 'users' || def.key === 'cards' || def.key === 'interests' || def.key === 'enrollments' || def.readOnly);

  return (
    <div className="adminLayout">
      <aside className={sidebar ? 'sidebar show' : 'sidebar'}>
        <div className="sideBrand"><Brand /><button className="closeSide" onClick={() => setSidebar(false)} aria-label="Fechar menu"><X /></button></div>
        <div className="sideScroll">
          {visibleGroups.map(group => (
            <section key={group.label}>
              <label>{group.label}</label>
              {group.items.map(key => {
                const Icon = iconMap[key] || Home;
                return (
                  <button key={key} className={active === key ? 'active' : ''} onClick={() => { setActive(key); setSidebar(false); setMessage(''); }}>
                    <Icon size={17} /><span>{title(key)}</span>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
        <div className="sideBottom">
          <div className="userBadge">
            <div className="avatar">{(profile?.full_name || session.user.email || 'U')[0].toUpperCase()}</div>
            <div><b>{profile?.full_name || 'Usuário'}</b><small>{LABELS[profile?.role || ''] || profile?.role}</small></div>
          </div>
          <button onClick={signOut}><LogOut size={17} /> Sair</button>
        </div>
      </aside>

      <main className="adminMain">
        <header className="topbar">
          <button className="hamb" onClick={() => setSidebar(true)} aria-label="Abrir menu"><Menu /></button>
          <div><span className="crumb">INSTITUTO REALIZA /</span><b>{title(active)}</b></div>
          <div className="topRight"><span className="secure"><ShieldCheck size={15} /> Sessão segura</span>
            <button onClick={signOut} className="iconButton" aria-label="Sair"><LogOut size={18} /></button></div>
        </header>

        <div className="contentArea">
          {message && <div className="notice"><AlertCircle size={16} />{message}<button onClick={() => setMessage('')}>×</button></div>}

          {active === 'dashboard' ? (
            <>
              <div className="pageIntro"><div><div className="overline">RESUMO DO PROJETO</div><h1>Visão <span>geral.</span></h1>
                <p>Indicadores agregados dos registros atuais. Sem dados cadastrados, os valores ficam zerados.</p></div>
                <div className="datePill">Painel de gestão</div></div>
              <div className="metricGrid">
                {!m ? <div className="loading" style={{ gridColumn: '1/-1' }}>Carregando indicadores…</div> :
                  metricCards.map(([label, value, Icon]) => (
                    <article key={label} className="metric"><div className="metricIcon"><Icon size={19} /></div><span>{label}</span><strong>{value}</strong><small>Dados atuais do banco</small></article>
                  ))}
              </div>
              <div className="welcomePanel"><div><div className="overline">PROJETO SOCIAL DE JIU-JITSU</div>
                <h2>Muito além do tatame,<br /><span>transformando vidas.</span></h2>
                <p>Use o menu para administrar participantes, treinos, carteirinhas, conteúdos e prestação de contas. Dados sensíveis exigem permissão apropriada.</p></div>
                <div className="welcomeMark"><GraduationCap size={48} /></div></div>
              <div className="quickGrid">{quick.map(([key, label]) => <button key={key} onClick={() => setActive(key)}><Plus size={17} />{label}</button>)}</div>
            </>
          ) : active === 'rollcall' ? (
            <RollCall profile={profile!} notify={setMessage} />
          ) : def && allowed(def) ? (
            <>
              <div className="pageIntro"><div><div className="overline">MÓDULO ADMINISTRATIVO</div><h1>{def.title}<span>.</span></h1><p>{def.description}</p></div>
                {canCreate && <button className="primaryButton" onClick={newRecord}><Plus size={17} /> Novo registro</button>}</div>
              <div className="tablePanel">
                <div className="tableToolbar">
                  <div className="searchBox"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar registros…" /></div>
                  <button className="lightIcon" onClick={load} aria-label="Atualizar"><RefreshCw size={16} /></button>
                  <span>{filtered.length} registros</span>
                </div>
                {loading ? <div className="loading">Carregando registros…</div> : filtered.length === 0 ? (
                  <div className="empty"><ClipboardList size={36} /><b>Nenhum registro encontrado</b><p>Quando houver dados, eles aparecerão aqui.</p></div>
                ) : (
                  <div className="tableWrap"><table>
                    <thead><tr>{def.columns.map(k => <th key={k}>{def.key === 'activities' && k === 'name' ? 'Atividade' : COLUMN_LABELS[k] || k.replace(/_/g, ' ')}</th>)}{showActions && <th>Ações</th>}</tr></thead>
                    <tbody>{filtered.map(row => (
                      <tr key={row.id}>
                        {def.columns.map(k => <td key={k} title={fmtCell(def, k, row[k], refs)}>{fmtCell(def, k, row[k], refs).slice(0, 100)}</td>)}
                        {showActions && <td><div className="rowActions">
                          {def.key === 'enrollments' && <button onClick={() => openSheet(row)} title="Ver / imprimir ficha"><Eye size={15} /></button>}
                          {def.key === 'enrollments' && isAdmin && !row.student_id && <button onClick={() => convertEnrollment(row)} title="Virar aluno"><UserPlus size={15} /></button>}
                          {def.key === 'interests' && <button onClick={() => setViewRow(row)} title="Ver tudo"><Eye size={15} /></button>}
                          {def.key === 'interests' && <button onClick={() => convertInterest(row)} title="Virar aluno"><UserPlus size={15} /></button>}
                          {def.key === 'users' && <button onClick={() => resetPassword(row)} title="Trocar senha"><KeyRound size={15} /></button>}
                          {def.key === 'cards' && <button onClick={() => openCard(row)} title="Ver carteirinha / QR"><QrCode size={15} /></button>}
                          {def.readOnly && def.key === 'audit' && <button onClick={() => setDetail(row)} title="Ver detalhes"><Eye size={15} /></button>}
                          {canEdit && <button onClick={() => editRecord(row)} title="Editar"><Edit size={15} /></button>}
                          {canDelete && <button onClick={() => remove(row)} title="Excluir"><Trash2 size={15} /></button>}
                        </div></td>}
                      </tr>))}</tbody>
                  </table></div>
                )}
              </div>
            </>
          ) : <div className="empty"><LockKeyhole size={36} /><b>Módulo indisponível para o seu perfil</b></div>}
        </div>
      </main>

      {userModal && <UserCreator onClose={() => setUserModal(false)} onDone={m => { setUserModal(false); setMessage(m); load(); }} />}
      {modal && def && (
        <div className="modalBackdrop" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modalHead"><div><div className="overline">{editing ? 'EDITAR' : 'NOVO REGISTRO'}</div><h2>{def.title}</h2></div>
              <button onClick={() => setModal(false)} aria-label="Fechar"><X /></button></div>
            <form onSubmit={save} className="modalForm">
              {def.key === 'students' && editing && isAdmin && (
                <PhotoUploader studentId={editing.id} photoPath={editing.photo_path ?? null} onDone={p => { setEditing({ ...editing, photo_path: p }); load(); }} />
              )}
              {def.key === 'students' && editing && isAdmin && <ActivityPicker studentId={editing.id} notify={setMessage} onChange={load} />}
              {def.key === 'students' && !editing && <div className="notice">Depois de salvar, abra o lápis do aluno para marcar as atividades (1 ou 2).</div>}
              {def.fields.map(renderField)}
              <div className="modalActions">
                <button type="button" className="cancelButton" onClick={() => setModal(false)}>Cancelar</button>
                <button className="primaryButton" disabled={saving}>{saving ? 'Salvando…' : 'Salvar registro'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cardView && (
        <div className="modalBackdrop" onClick={() => setCardView(null)}>
          <div className="modal cardModal" onClick={e => e.stopPropagation()}>
            <div className="modalHead"><div><div className="overline">CARTEIRINHA</div><h2>{refs.students?.get(cardView.student_id) || 'Aluno'}</h2></div>
              <button onClick={() => setCardView(null)} aria-label="Fechar"><X /></button></div>
            <div className="printCard" id="printCard">
              <div className="printCardHead"><Brand /></div>
              <div className="printCardBody">
                <div className="cardPhoto">{photoUrl(cardStudent?.photo_path) ? <img src={photoUrl(cardStudent?.photo_path)!} alt="Foto" /> : <span>Sem foto</span>}</div>
                <div className="cardInfo">
                  <small>PARTICIPANTE</small><b>{refs.students?.get(cardView.student_id) || '—'}</b>
                  <small>MATRÍCULA</small><b>{cardView.card_number}</b>
                  <small>VALIDADE</small><b>{cardView.expires_at ? fmtDate(cardView.expires_at) : '—'}</b>
                  <small>SITUAÇÃO</small><b>{LABELS[cardView.status] || cardView.status}</b>
                </div>
                <div className="qrBox"><QRCodeSVG value={cardLink(cardView)} size={96} bgColor="#ffffff" fgColor="#111111" /></div>
              </div>
              <div className="printEmerg">
                <h4>EMERGÊNCIA</h4>
                <div><b>Sangue:</b> {cardStudent?.blood_type || '—'} · <b>SUS:</b> {cardStudent?.sus_number || '—'} · <b>RG:</b> {cardStudent?.rg || '—'}</div>
                <div><b>Contatos:</b> {cardEmerg.contacts.length ? cardEmerg.contacts.map(c => `${c.full_name}${c.relationship ? ' (' + c.relationship + ')' : ''} ${c.phone}`).join(' · ') : '—'}</div>
                <div><b>Alergias:</b> {cardEmerg.health?.has_allergies ? (cardEmerg.health.allergy_type || 'Sim') : 'Nenhuma informada'}{cardEmerg.health?.emergency_guidance ? <> · <b>Saúde:</b> {cardEmerg.health.emergency_guidance}</> : null}</div>
              </div>
              <small className="printCardFoot">O QR abre a carteirinha digital. Em caso de acidente, o professor logado ou a data de nascimento do aluno liberam a ficha de emergência.</small>
            </div>
            {cardStudent && !cardStudent.photo_path && <div className="notice" style={{ marginTop: 14 }}><AlertCircle size={16} />Aluno sem foto. Em Alunos, clique no lápis dele para enviar a foto.</div>}
            {cardView.status !== 'active' && <div className="notice" style={{ marginTop: 14 }}><AlertCircle size={16} />Carteirinha não está ativa: a verificação pública a recusará.</div>}
            <div className="modalActions cardShare">
              <button className="cancelButton" onClick={() => copyCardLink(cardView)}>{copied ? 'Link copiado!' : 'Copiar link da carteirinha digital'}</button>
              <a className="cancelButton" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${cardStudent?.phone ? '55' + String(cardStudent.phone).replace(/\D/g, '').replace(/^55/, '') : ''}?text=${encodeURIComponent('Sua carteirinha digital do Instituto Realiza: ' + cardLink(cardView))}`}>Enviar por WhatsApp</a>
              <button className="primaryButton" disabled={pdfBusy} onClick={() => sendCardPdf(cardView)}>{pdfBusy ? 'Gerando PDF…' : 'Enviar PDF pelo WhatsApp'}</button>
              <button className="cancelButton" onClick={() => window.print()}><Printer size={16} /> Imprimir</button>
            </div>
          </div>
        </div>
      )}


      {sheet && <EnrollmentSheet row={sheet} onClose={() => setSheet(null)} />}

      {viewRow && def && (
        <div className="modalBackdrop" onClick={() => setViewRow(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modalHead"><div><div className="overline">INTERESSADO</div><h2>{viewRow.full_name}</h2></div>
              <button onClick={() => setViewRow(null)} aria-label="Fechar"><X /></button></div>
            <dl className="viewList">
              {['birth_date', 'age', 'phone', 'email', 'message', 'came_from_other_academy', 'previous_training_time', 'previous_belt', 'previous_degrees', 'previous_master', 'status', 'created_at']
                .filter(k => viewRow[k] !== null && viewRow[k] !== undefined && viewRow[k] !== '')
                .map(k => <div key={k}><dt>{k === 'age' ? 'Idade' : COLUMN_LABELS[k] || k}</dt><dd>{k === 'previous_degrees' ? `${viewRow[k]} grau(s)` : fmtCell(def, k, viewRow[k], refs)}</dd></div>)}
            </dl>
          </div>
        </div>
      )}

      {detail && (
        <div className="modalBackdrop" onClick={() => setDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modalHead"><div><div className="overline">AUDITORIA</div><h2>{LABELS[detail.action] || detail.action} · {detail.table_name}</h2></div>
              <button onClick={() => setDetail(null)} aria-label="Fechar"><X /></button></div>
            <p className="auditMeta">{new Date(detail.created_at).toLocaleString('pt-BR')} · registro {detail.record_id} · autor {detail.actor_id || 'sistema/SQL'}</p>
            <div className="auditCols">
              <div><h3>Antes</h3><pre>{detail.old_values ? JSON.stringify(detail.old_values, null, 2) : '—'}</pre></div>
              <div><h3>Depois</h3><pre>{detail.new_values ? JSON.stringify(detail.new_values, null, 2) : '—'}</pre></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
