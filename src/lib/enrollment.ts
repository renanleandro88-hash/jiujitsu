export const TERMS_VERSION = '2026-11-v1';

export type Term = { n: string; title: string; body: string[]; list?: string[]; after?: string[] };

/** Texto fiel à ficha de papel do Instituto Realiza. Se alterar, mude também TERMS_VERSION. */
export const TERMS: Term[] = [
  { n: '1', title: 'CONTRIBUIÇÃO DE PARTICIPAÇÃO',
    body: ['A participação no Instituto implica na contribuição obrigatória mensal no valor de R$20,00 (vinte reais), destinada exclusivamente ao custeio para graduações, batizado e à emissão de certificados.'] },
  { n: '2', title: 'AUTORIZAÇÃO DE USO DE IMAGEM E VOZ',
    body: ['Autorizo, de forma gratuita, o Instituto Realiza e seus professores a utilizarem minha imagem (fotos e vídeos) captada durante os treinos, eventos, campeonatos ou atividades promovidas pela equipe, nas modalidades Jiu Jitsu, Capoeira, Boxe, Muay Thai e Treinamento Físico, para fins de divulgação em redes sociais, materiais de comunicação e promoção institucional.'] },
  { n: '3', title: 'Autorização de Uso de Imagem (LGPD)',
    body: ['Nos termos da Lei nº 13.709/2018, autorizo o Instituto Realiza e Equipes dos Esporte a coletar e utilizar minha imagem e voz, captadas em fotos ou vídeos durante as aulas e eventos, para fins exclusivos de divulgação institucional, redes sociais e materiais didáticos. Estou ciente de que esta autorização não possui prazo de validade, podendo ser revogada a qualquer momento por meio de solicitação formal.'] },
  { n: '4', title: 'Responsabilidade Esportiva',
    body: ['Declaro, para os devidos fins, que estou ciente de que a prática das modalidades Jiu Jitsu, Capoeira, Boxe, Muay Thai e Treinamento Físico envolve contato físico e/ou esforço intenso, estando, portanto, sujeita a riscos inerentes como acidentes, lesões típicas e atípicas, traumatismos ou intercorrências relacionadas à atividade.',
      'Reconheço que o Instituto Realiza e seus professores não se responsabilizam por quaisquer eventos ou consequências decorrentes da prática esportiva, uma vez que fazem parte dos riscos naturais do treinamento.',
      'O esporte pode causar lesões leves, médias ou graves e que não somos responsáveis por situações causadas por:'],
    list: ['4.1. Imprudência do aluno', '4.2. Não seguir orientação do professor', '4.3. Problema de saúde não informado'] },
  { n: '5', title: 'REGIME DISCIPLINAR, SUSPENSÃO E EXCLUSÃO',
    body: ['Conduta Inaceitável: O aluno que se envolver em atos de agressão física ou verbal, bullying, assédio ou qualquer comportamento desrespeitoso contra professores, funcionários, colegas ou terceiros, dentro ou fora das dependências da academia, estará sujeito a sanções, aplicadas a critério da direção.'] },
  { n: '6', title: 'Isenção de Responsabilidade do Instituto e Professores',
    body: ['Declaro estar ciente de que o Instituto Realiza e seus professores não se responsabilizam por acidentes ocorridos fora do controle direto do professor ou das dependências do Instituto, sendo minha inteira responsabilidade (ou de meu responsável legal) zelar pela segurança fora do ambiente de treino.',
      'Estou ciente que é expressamente proibida a prática de técnicas de combate fora do ambiente de treino.',
      'Legítima Defesa: O conhecimento técnico só deve ser aplicado em casos de legítima defesa para neutralizar uma agressão injusta, sem excessos.'] },
  { n: '7', title: 'ATENDIMENTO MÉDICO DE URGÊNCIA',
    body: ['Em caso de emergência ou acidente durante as atividades, autorizo o Instituto a prestar os primeiros socorros e, se necessário, acionar o serviço público de urgência (SAMU/Corpo de Bombeiros) ou remover o menor para a unidade hospitalar mais próxima. Declaro estar ciente de que toda e qualquer despesa médica, hospitalar, medicamentosa ou de transporte privado decorrente deste atendimento será de minha inteira e exclusiva responsabilidade, devendo o Instituto ser reembolsado caso antecipe qualquer valor para a preservação da saúde do aluno.'] },
  { n: '8', title: 'OBJETOS PESSOAIS E VALORES',
    body: ['O Instituto não se responsabiliza pela guarda, perda, dano ou extravio de quaisquer objetos pessoais (celulares, joias, relógios, carteiras, vestimentas etc.) deixados nas dependências da academia ou vestiários. Recomendamos expressamente que o aluno não porte objetos de alto valor para o ambiente de treino. O uso de armários, quando disponíveis, é de caráter temporário e não implica na transferência da responsabilidade de custódia ao Instituto.'] },
  { n: '9', title: 'Termo de Responsabilidade a Menor',
    body: ['Declaro, na qualidade de responsável legal, que autorizo a participação do menor nas atividades promovidas pelo Instituto, assumindo total responsabilidade por sua inscrição, informações médicas fornecidas e ciência dos riscos inerentes às modalidades praticadas.'] },
];

export const MARITAL = ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)', 'Outro'];
export const RACES = ['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena'];
export const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não sei'];
export const RELATIONS = ['Pai', 'Mãe', 'Avó/Avô', 'Tio(a)', 'Irmão(ã) maior de idade', 'Responsável legal', 'Outro'];
export const EMERGENCY_RELATIONS = ['Pai', 'Mãe', 'Avó/Avô', 'Tio(a)', 'Irmão(ã)', 'Cônjuge', 'Amigo(a)', 'Outro'];

export const ageFromISO = (iso: string) => {
  const b = new Date(iso + 'T00:00:00'), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
};
export const categoryFor = (age: number | null | undefined) => (age == null ? null : age >= 18 ? 'Adulto' : age >= 13 ? 'Juvenil' : age >= 8 ? 'Kids' : age >= 4 ? 'Baby' : null);

const digits = (v: string) => v.replace(/\D/g, '');
export const maskCpf = (v: string) => { const d = digits(v).slice(0, 11); return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); };
export const maskCep = (v: string) => { const d = digits(v).slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; };
export const maskPhone = (v: string) => {
  const d = digits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
export const validCpf = (v: string) => {
  const d = digits(v);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const dv = ((sum * 10) % 11) % 10;
    if (dv !== Number(d[len])) return false;
  }
  return true;
};
