import ActivityChoice, { useActivities } from '../components/ActivityChoice';
import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Brand from '../components/Brand';
import { blobToDataUrl, resizeToJpeg } from '../lib/photo';
import {
  BLOOD, EMERGENCY_RELATIONS, MARITAL, RACES, RELATIONS, TERMS, TERMS_VERSION,
  ageFromISO, maskCep, maskCpf, maskPhone, validCpf,
} from '../lib/enrollment';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const INITIAL: Record<string, string> = {
  start_date: today(), team: '',
  full_name: '', birth_date: '', rg: '', cpf: '', sex: '', marital_status: '', nationality: 'Brasileira', race_color: '',
  father_name: '', father_rg: '', father_cpf: '', father_birth_date: '', mother_name: '', mother_rg: '', mother_cpf: '', mother_birth_date: '',
  address: '', neighborhood: '', city: 'São Paulo', cep: '', address_complement: '',
  phone1: '', phone2: '', email: '',
  school_level: '', school_name: '', school_shift: '', may_leave_alone: '',
  emergency_name: '', emergency_phone: '', emergency_relationship: '',
  health_plan: '', health_plan_name: '', has_health_problem: '', health_problem_desc: '', allergies: '',
  takes_medication: '', medication_desc: '', has_disability: '', disability_desc: '', had_surgery: '', surgery_desc: '',
  blood_type: '', height_cm: '', weight_kg: '',
  signer_name: '', signer_relationship: '', website: '', // website = campo-armadilha anti-robô
};

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={wide ? 'wide' : ''}>{label}{children}</label>;
}

function YesNo({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="yn">
      <legend>{label}</legend>
      <label><input type="radio" name={name} required checked={value === 'yes'} onChange={() => onChange('yes')} /> Sim</label>
      <label><input type="radio" name={name} required checked={value === 'no'} onChange={() => onChange('no')} /> Não</label>
    </fieldset>
  );
}

export default function Enroll() {
  const [f, setF] = useState<Record<string, string>>(INITIAL);
  const [chk, setChk] = useState({ terms: false, combat: false, medical: false, image: false, sus: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [photo, setPhoto] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const { list: acts, loaded: actsLoaded } = useActivities();
  const [actIds, setActIds] = useState<string[]>([]);

  const val = (k: string) => f[k];
  const set = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }));
  const setMasked = (k: string, mask: (v: string) => string) => (e: ChangeEvent<HTMLInputElement>) => setF(p => ({ ...p, [k]: mask(e.target.value) }));
  const setYN = (k: string) => (v: string) => setF(p => ({ ...p, [k]: v }));

  const age = f.birth_date ? ageFromISO(f.birth_date) : null;
  const minor = age !== null && age < 18;
  const showParents = age === null || minor;

  const fail = (m: string) => { setError(m); top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const t = (k: string) => (f[k] ?? '').trim() || null;
  const yn = (k: string) => (f[k] === '' ? null : f[k] === 'yes');

  async function pickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { fail('Escolha um arquivo de imagem para a foto.'); return; }
    setPhotoBusy(true); setError('');
    try { setPhoto(await blobToDataUrl(await resizeToJpeg(file, 360, 480))); }
    catch { fail('Não foi possível usar esta foto. Tente outra imagem.'); }
    finally { setPhotoBusy(false); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (f.website) { setSent(true); return; } // robô: finge sucesso, não grava
    if (!supabase) return fail('Formulário indisponível no momento: o sistema ainda não foi configurado.');
    if (age === null || age < 0 || age > 120) return fail('Confira a data de nascimento.');
    if (f.cpf && !validCpf(f.cpf)) return fail('O CPF do aluno parece inválido.');
    if (f.father_cpf && !validCpf(f.father_cpf)) return fail('O CPF do pai parece inválido.');
    if (f.mother_cpf && !validCpf(f.mother_cpf)) return fail('O CPF da mãe parece inválido.');
    if (actIds.length < 1 || actIds.length > 2) return fail('Escolha 1 ou 2 atividades que o aluno vai praticar.');
    if (!photo) return fail('Envie a foto do aluno (rosto de frente). Ela será usada na carteirinha.');
    if (f.phone1.replace(/\D/g, '').length < 10) return fail('Informe o telefone com DDD.');
    if (!chk.terms || !chk.combat || !chk.medical) return fail('É preciso aceitar os termos e as declarações obrigatórias ao final da ficha.');

    const payload = {
      start_date: t('start_date'), sport: acts.filter(a => actIds.includes(a.id)).map(a => a.name).join(', ').slice(0, 80), activity_ids: actIds, team: t('team'),
      full_name: f.full_name.trim(), birth_date: f.birth_date, age: age >= 0 && age <= 120 ? age : null,
      rg: t('rg'), cpf: t('cpf'), sex: t('sex'), marital_status: t('marital_status'), nationality: t('nationality'), race_color: t('race_color'),
      father_name: showParents ? t('father_name') : null, father_rg: showParents ? t('father_rg') : null,
      father_cpf: showParents ? t('father_cpf') : null, father_birth_date: showParents ? t('father_birth_date') : null,
      mother_name: showParents ? t('mother_name') : null, mother_rg: showParents ? t('mother_rg') : null,
      mother_cpf: showParents ? t('mother_cpf') : null, mother_birth_date: showParents ? t('mother_birth_date') : null,
      address: t('address'), neighborhood: t('neighborhood'), city: t('city'), cep: t('cep'), address_complement: t('address_complement'),
      phone1: f.phone1.trim(), phone2: t('phone2'), email: t('email'),
      school_level: t('school_level'), school_name: t('school_name'), school_shift: t('school_shift'),
      may_leave_alone: minor ? yn('may_leave_alone') : null,
      emergency_name: t('emergency_name'), emergency_phone: t('emergency_phone'), emergency_relationship: t('emergency_relationship'),
      health_plan: yn('health_plan'), health_plan_name: f.health_plan === 'yes' ? t('health_plan_name') : null, uses_sus: chk.sus,
      has_health_problem: yn('has_health_problem'), health_problem_desc: f.has_health_problem === 'yes' ? t('health_problem_desc') : null,
      allergies: t('allergies'),
      takes_medication: yn('takes_medication'), medication_desc: f.takes_medication === 'yes' ? t('medication_desc') : null,
      has_disability: yn('has_disability'), disability_desc: f.has_disability === 'yes' ? t('disability_desc') : null,
      had_surgery: yn('had_surgery'), surgery_desc: f.had_surgery === 'yes' ? t('surgery_desc') : null,
      blood_type: t('blood_type'), height_cm: f.height_cm ? Number(f.height_cm) : null, weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
      accepted_terms: chk.terms, ack_no_combat_outside: chk.combat, commit_update_medical: chk.medical, image_consent: chk.image,
      photo_data: photo,
      terms_version: TERMS_VERSION,
      signer_name: f.signer_name.trim(), signer_relationship: minor ? t('signer_relationship') : 'O próprio aluno',
      status: 'pending',
    };
    setBusy(true);
    const { error: err } = await supabase.from('enrollments').insert(payload);
    setBusy(false);
    if (err) {
      fail(err.code === '23514' || err.code === '22001' || err.code === '22P02'
        ? 'Algum campo está com valor fora do permitido. Revise os dados (datas, altura, peso, textos longos).'
        : 'Não foi possível enviar a ficha agora. Confira a conexão e tente novamente.');
      return;
    }
    setSent(true);
    window.scrollTo({ top: 0 });
  }

  if (sent) {
    return (
      <main className="enrollPage"><div className="enrollWrap">
        <Link to="/" className="enrollBack">← Voltar ao site</Link>
        <div className="enrollCard successBox"><CheckCircle2 size={36} /><h2>Ficha enviada!</h2>
          <p>Recebemos a ficha de inscrição de <b>{f.full_name}</b>. A coordenação vai analisar e entrar em contato pelo telefone informado.</p>
          <Link className="primaryButton" to="/">Voltar ao site</Link></div>
      </div></main>
    );
  }

  return (
    <main className="enrollPage">
      <div className="enrollWrap">
        <header className="enrollHead"><Brand /><Link to="/" className="enrollBack">← Voltar ao site</Link></header>
        <div ref={top} />
        <h1>Ficha de <span>inscrição.</span></h1>
        <p className="enrollIntro">Preencha com os dados do aluno. Para menores de 18 anos, quem preenche deve ser o responsável legal. Os dados (inclusive de saúde) são usados só para a inscrição e a segurança nos treinos, protegidos nos termos da LGPD, e vistos apenas pela administração.</p>
        {error && <div className="error enrollError" role="alert">{error}</div>}

        <form onSubmit={submit} noValidate={false}>
          {/* campo-armadilha: invisível para pessoas */}
          <input type="text" name="website" value={f.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />

          <section className="enrollCard"><h2>Inscrição</h2>
            <div className="grid3">
              <Field label="Data de início"><input type="date" value={val('start_date')} onChange={set('start_date')} /></Field>
              <Field label="Equipe"><input value={val('team')} onChange={set('team')} maxLength={60} /></Field>
            </div>
            <div className="fieldLabel"><b>Atividade(s) que vai praticar *</b>{actsLoaded ? <ActivityChoice list={acts} value={actIds} onChange={setActIds} /> : <small>Carregando atividades…</small>}</div></section>

          <section className="enrollCard"><h2>Dados do aluno</h2>
            <div className="photoField">
              <div className="photoThumb">{photo ? <img src={photo} alt="Foto do aluno" /> : <span>Sem foto</span>}</div>
              <div>
                <b>Foto do aluno *</b>
                <p className="enrollNote">Rosto de frente, bem iluminado, fundo claro, sem óculos escuros ou boné. Será usada na ficha, no cadastro e na carteirinha do aluno.</p>
                <label className="primaryButton photoPick"><Camera size={16} /> {photoBusy ? 'Preparando…' : photo ? 'Trocar foto' : 'Tirar foto / escolher da galeria'}
                  <input type="file" accept="image/*" onChange={pickPhoto} disabled={photoBusy} hidden /></label>
              </div>
            </div>
            <div className="grid2">
              <Field label="Nome do aluno *" wide><input required value={val('full_name')} onChange={set('full_name')} maxLength={160} autoComplete="name" /></Field>
              <Field label="Data de nascimento *"><input type="date" required min="1920-01-01" max={today()} value={val('birth_date')} onChange={set('birth_date')} /></Field>
              <Field label="Idade"><input value={age !== null && age >= 0 ? `${age} anos` : ''} readOnly placeholder="Calculada pelo nascimento" /></Field>
              <Field label="RG"><input value={val('rg')} onChange={set('rg')} maxLength={20} inputMode="text" /></Field>
              <Field label="CPF"><input value={val('cpf')} onChange={setMasked('cpf', maskCpf)} inputMode="numeric" placeholder="000.000.000-00" /></Field>
              <Field label="Sexo"><select value={val('sex')} onChange={set('sex')}><option value="">Selecione…</option><option value="M">Masculino</option><option value="F">Feminino</option></select></Field>
              <Field label="Estado civil"><select value={val('marital_status')} onChange={set('marital_status')}><option value="">Selecione…</option>{MARITAL.map(x => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Nacionalidade"><input value={val('nationality')} onChange={set('nationality')} maxLength={40} /></Field>
              <Field label="Cor/Raça"><select value={val('race_color')} onChange={set('race_color')}><option value="">Selecione…</option>{RACES.map(x => <option key={x}>{x}</option>)}</select></Field>
            </div></section>

          {showParents && (
            <section className="enrollCard"><h2>Filiação</h2>
              <h3>Pai</h3>
              <div className="grid2">
                <Field label="Nome do pai" wide><input value={val('father_name')} onChange={set('father_name')} maxLength={160} /></Field>
                <Field label="RG"><input value={val('father_rg')} onChange={set('father_rg')} maxLength={20} /></Field>
                <Field label="CPF"><input value={val('father_cpf')} onChange={setMasked('father_cpf', maskCpf)} inputMode="numeric" placeholder="000.000.000-00" /></Field>
                <Field label="Data de nascimento"><input type="date" min="1920-01-01" max={today()} value={val('father_birth_date')} onChange={set('father_birth_date')} /></Field>
              </div>
              <h3>Mãe</h3>
              <div className="grid2">
                <Field label="Nome da mãe" wide><input value={val('mother_name')} onChange={set('mother_name')} maxLength={160} /></Field>
                <Field label="RG"><input value={val('mother_rg')} onChange={set('mother_rg')} maxLength={20} /></Field>
                <Field label="CPF"><input value={val('mother_cpf')} onChange={setMasked('mother_cpf', maskCpf)} inputMode="numeric" placeholder="000.000.000-00" /></Field>
                <Field label="Data de nascimento"><input type="date" min="1920-01-01" max={today()} value={val('mother_birth_date')} onChange={set('mother_birth_date')} /></Field>
              </div></section>
          )}

          <section className="enrollCard"><h2>Endereço e contato</h2>
            <div className="grid2">
              <Field label="Endereço" wide><input value={val('address')} onChange={set('address')} maxLength={200} autoComplete="street-address" /></Field>
              <Field label="Bairro"><input value={val('neighborhood')} onChange={set('neighborhood')} maxLength={80} /></Field>
              <Field label="Cidade"><input value={val('city')} onChange={set('city')} maxLength={80} /></Field>
              <Field label="CEP"><input value={val('cep')} onChange={setMasked('cep', maskCep)} inputMode="numeric" placeholder="00000-000" /></Field>
              <Field label="Complemento"><input value={val('address_complement')} onChange={set('address_complement')} maxLength={80} /></Field>
              <Field label="Telefone 1 (com DDD) *"><input required value={val('phone1')} onChange={setMasked('phone1', maskPhone)} inputMode="tel" placeholder="(11) 99999-9999" autoComplete="tel" /></Field>
              <Field label="Celular 2"><input value={val('phone2')} onChange={setMasked('phone2', maskPhone)} inputMode="tel" placeholder="(11) 99999-9999" /></Field>
              <Field label="E-mail" wide><input type="email" value={val('email')} onChange={set('email')} maxLength={120} autoComplete="email" /></Field>
            </div></section>

          <section className="enrollCard"><h2>Escolaridade</h2>
            <div className="grid2">
              <Field label="Escolaridade"><select value={val('school_level')} onChange={set('school_level')}><option value="">Selecione…</option><option>Ensino Fundamental</option><option>Ensino Médio</option><option>Superior</option></select></Field>
              <Field label="Turno"><select value={val('school_shift')} onChange={set('school_shift')}><option value="">Selecione…</option><option>Manhã</option><option>Tarde</option><option>Noite</option></select></Field>
              <Field label="Colégio" wide><input value={val('school_name')} onChange={set('school_name')} maxLength={120} /></Field>
            </div>
            {minor && <YesNo name="alone" label="Autorizo o menor ida e volta sozinho *" value={val('may_leave_alone')} onChange={setYN('may_leave_alone')} />}</section>

          <section className="enrollCard"><h2>Em caso de emergência</h2>
            <div className="grid3">
              <Field label="Nome"><input value={val('emergency_name')} onChange={set('emergency_name')} maxLength={160} /></Field>
              <Field label="Telefone"><input value={val('emergency_phone')} onChange={setMasked('emergency_phone', maskPhone)} inputMode="tel" placeholder="(11) 99999-9999" /></Field>
              <Field label="Parentesco"><select value={val('emergency_relationship')} onChange={set('emergency_relationship')}><option value="">Selecione…</option>{EMERGENCY_RELATIONS.map(x => <option key={x}>{x}</option>)}</select></Field>
            </div></section>

          <section className="enrollCard"><h2>Saúde</h2>
            <YesNo name="plan" label="Plano de saúde *" value={val('health_plan')} onChange={setYN('health_plan')} />
            {val('health_plan') === 'yes' && <Field label="Qual plano?"><input value={val('health_plan_name')} onChange={set('health_plan_name')} maxLength={80} /></Field>}
            <label className="check"><input type="checkbox" checked={chk.sus} onChange={e => setChk(p => ({ ...p, sus: e.target.checked }))} /> Utiliza o SUS</label>

            <YesNo name="problem" label="Possui algum problema de saúde? *" value={val('has_health_problem')} onChange={setYN('has_health_problem')} />
            {val('has_health_problem') === 'yes' && <Field label="Qual?"><input required value={val('health_problem_desc')} onChange={set('health_problem_desc')} maxLength={300} /></Field>}

            <Field label="Alergias (escreva “Nenhuma” se não houver)"><input value={val('allergies')} onChange={set('allergies')} maxLength={300} /></Field>

            <YesNo name="meds" label="Toma algum medicamento? *" value={val('takes_medication')} onChange={setYN('takes_medication')} />
            {val('takes_medication') === 'yes' && <Field label="Qual?"><input required value={val('medication_desc')} onChange={set('medication_desc')} maxLength={300} /></Field>}

            <YesNo name="disability" label="Portador de deficiência ou necessidades especiais? *" value={val('has_disability')} onChange={setYN('has_disability')} />
            {val('has_disability') === 'yes' && <Field label="Qual?"><input required value={val('disability_desc')} onChange={set('disability_desc')} maxLength={300} /></Field>}

            <YesNo name="surgery" label="Alguma cirurgia? *" value={val('had_surgery')} onChange={setYN('had_surgery')} />
            {val('had_surgery') === 'yes' && <Field label="Qual?"><input required value={val('surgery_desc')} onChange={set('surgery_desc')} maxLength={300} /></Field>}

            <div className="grid3">
              <Field label="Tipo sanguíneo"><select value={val('blood_type')} onChange={set('blood_type')}><option value="">Selecione…</option>{BLOOD.map(x => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Altura (cm)"><input type="number" min="30" max="260" step="0.1" value={val('height_cm')} onChange={set('height_cm')} inputMode="decimal" placeholder="Ex.: 150" /></Field>
              <Field label="Peso (kg)"><input type="number" min="3" max="400" step="0.1" value={val('weight_kg')} onChange={set('weight_kg')} inputMode="decimal" placeholder="Ex.: 42" /></Field>
            </div></section>

          <section className="enrollCard"><h2>Termos e autorizações</h2>
            <div className="termsBox" tabIndex={0} aria-label="Termos da ficha de inscrição">
              {TERMS.map(term => (
                <article key={term.n}>
                  <h3>{term.n}. {term.title}</h3>
                  {term.body.map((p, i) => <p key={i}>{p}</p>)}
                  {term.list && <ul>{term.list.map(l => <li key={l}>{l}</li>)}</ul>}
                </article>
              ))}
            </div>
            <label className="check"><input type="checkbox" required checked={chk.terms} onChange={e => setChk(p => ({ ...p, terms: e.target.checked }))} /> <span><b>Li e concordo</b> com os itens 1, 4, 5, 6, 7, 8 e 9 acima (o item 9 vale para alunos menores de idade). *</span></label>
            <label className="check"><input type="checkbox" required checked={chk.combat} onChange={e => setChk(p => ({ ...p, combat: e.target.checked }))} /> <span>Estou ciente que é expressamente proibida a prática de técnicas de combate fora do ambiente de treino. *</span></label>
            <label className="check"><input type="checkbox" required checked={chk.medical} onChange={e => setChk(p => ({ ...p, medical: e.target.checked }))} /> <span>Me comprometo a atualizar as informações médicas. *</span></label>
            <label className="check"><input type="checkbox" checked={chk.image} onChange={e => setChk(p => ({ ...p, image: e.target.checked }))} /> <span>Autorizo o uso de imagem e voz conforme os itens 2 e 3 (opcional; pode ser revogada a qualquer momento).</span></label>

            <h3>Assinatura eletrônica</h3>
            <div className="grid2">
              <Field label={minor ? 'Nome do responsável legal (conforme documento de identidade) *' : 'Nome do aluno (maior de idade) *'}>
                <input required value={val('signer_name')} onChange={set('signer_name')} maxLength={160} />
              </Field>
              {minor && <Field label="Parentesco com o aluno *"><select required value={val('signer_relationship')} onChange={set('signer_relationship')}><option value="">Selecione…</option>{RELATIONS.map(x => <option key={x}>{x}</option>)}</select></Field>}
            </div>
            <p className="enrollNote">São Paulo – SP, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}. Ao enviar, o nome acima vale como assinatura desta ficha, com data e hora registradas pelo sistema.</p>
          </section>

          <button className="primaryButton enrollSubmit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar ficha de inscrição →'}</button>
        </form>
      </div>
    </main>
  );
}
