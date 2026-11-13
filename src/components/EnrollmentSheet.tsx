import { Printer, X } from 'lucide-react';
import Brand from './Brand';

type Row = Record<string, any>;
const yn = (v: any) => (v === true ? 'Sim' : v === false ? 'Não' : '—');
const txt = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v));
const date = (v: any) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');
const withDetail = (flag: any, detail: any) => (flag === true ? `Sim${detail ? ' — ' + detail : ''}` : yn(flag));

export default function EnrollmentSheet({ row, onClose }: { row: Row; onClose: () => void }) {
  const sections: { title: string; rows: [string, string][] }[] = [
    { title: 'Inscrição', rows: [['Data de início', date(row.start_date)], ['Atividade(s)', txt(row.sport)], ['Equipe', txt(row.team)], ['Situação da ficha', txt(row.status)]] },
    { title: 'Aluno', rows: [['Nome', txt(row.full_name)], ['Nascimento', `${date(row.birth_date)}${row.age != null ? ` (${row.age} anos)` : ''}`], ['RG', txt(row.rg)], ['CPF', txt(row.cpf)],
      ['Sexo', row.sex === 'M' ? 'Masculino' : row.sex === 'F' ? 'Feminino' : '—'], ['Estado civil', txt(row.marital_status)], ['Nacionalidade', txt(row.nationality)], ['Cor/Raça', txt(row.race_color)]] },
    { title: 'Filiação', rows: [['Pai', txt(row.father_name)], ['RG / CPF do pai', `${txt(row.father_rg)} / ${txt(row.father_cpf)}`], ['Nasc. do pai', date(row.father_birth_date)],
      ['Mãe', txt(row.mother_name)], ['RG / CPF da mãe', `${txt(row.mother_rg)} / ${txt(row.mother_cpf)}`], ['Nasc. da mãe', date(row.mother_birth_date)]] },
    { title: 'Endereço e contato', rows: [['Endereço', txt(row.address)], ['Bairro', txt(row.neighborhood)], ['Cidade', txt(row.city)], ['CEP', txt(row.cep)], ['Complemento', txt(row.address_complement)],
      ['Telefone 1', txt(row.phone1)], ['Celular 2', txt(row.phone2)], ['E-mail', txt(row.email)]] },
    { title: 'Escolaridade', rows: [['Escolaridade', txt(row.school_level)], ['Colégio', txt(row.school_name)], ['Turno', txt(row.school_shift)], ['Ida e volta sozinho (menor)', yn(row.may_leave_alone)]] },
    { title: 'Emergência', rows: [['Nome', txt(row.emergency_name)], ['Telefone', txt(row.emergency_phone)], ['Parentesco', txt(row.emergency_relationship)]] },
    { title: 'Saúde', rows: [['Plano de saúde', withDetail(row.health_plan, row.health_plan_name)], ['SUS', yn(row.uses_sus)], ['Problema de saúde', withDetail(row.has_health_problem, row.health_problem_desc)],
      ['Alergias', txt(row.allergies)], ['Medicamento', withDetail(row.takes_medication, row.medication_desc)], ['Deficiência / necessidades especiais', withDetail(row.has_disability, row.disability_desc)],
      ['Cirurgia', withDetail(row.had_surgery, row.surgery_desc)], ['Tipo sanguíneo', txt(row.blood_type)], ['Altura', row.height_cm ? `${row.height_cm} cm` : '—'], ['Peso', row.weight_kg ? `${row.weight_kg} kg` : '—']] },
    { title: 'Termos e assinatura eletrônica', rows: [['Termos aceitos (itens 1, 4–9)', `${yn(row.accepted_terms)} · versão ${txt(row.terms_version)}`], ['Ciente: sem técnicas de combate fora do treino', yn(row.ack_no_combat_outside)],
      ['Compromisso de atualizar dados médicos', yn(row.commit_update_medical)], ['Uso de imagem e voz (itens 2 e 3)', yn(row.image_consent)],
      ['Assinado por', `${txt(row.signer_name)}${row.signer_relationship ? ` (${row.signer_relationship})` : ''}`], ['Data e hora', row.signed_at ? new Date(row.signed_at).toLocaleString('pt-BR') : '—']] },
  ];
  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal sheetModal" onClick={e => e.stopPropagation()}>
        <div className="modalHead"><div><div className="overline">FICHA DE INSCRIÇÃO</div><h2>{row.full_name}</h2></div>
          <button onClick={onClose} aria-label="Fechar"><X /></button></div>
        <div className="printSheet" id="printFicha">
          <div className="printSheetHead"><Brand /><b>Ficha de Inscrição</b>{row.photo_data && <img className="sheetPhoto" src={row.photo_data} alt="Foto do aluno" />}</div>
          {sections.map(s => (
            <section key={s.title}><h3>{s.title}</h3>
              <dl>{s.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section>
          ))}
        </div>
        <div className="modalActions"><button className="primaryButton" onClick={() => window.print()}><Printer size={16} /> Imprimir ficha</button></div>
      </div>
    </div>
  );
}
