export type RefDef = { table: string; label: string; flag?: string; activeOnly?: string }; // flag: coluna de situação; activeOnly: valor que a lista deve mostrar
export type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'date' | 'time' | 'number' | 'email' | 'url' | 'textarea' | 'boolean';
  required?: boolean;
  options?: string[];
  ref?: RefDef;          // campo que aponta para outra tabela (exibe lista de nomes em vez de UUID)
  createOnly?: boolean;  // só aparece ao criar (ex.: id do usuário Auth)
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  readOnly?: boolean;    // exibido mas nunca enviado (ex.: matrícula gerada pelo banco)
  blankLabel?: string;   // texto da opção vazia em listas
};
export type ModuleDef = {
  key: string;
  title: string;
  table: string;
  description: string;
  fields: FieldDef[];
  columns: string[];                 // colunas exibidas na tabela
  adminOnly?: boolean;               // equipe (teacher/assistant) não vê o módulo
  staffWrite?: 'full' | 'insert';    // o que a equipe pode gravar (espelha as policies RLS)
  readOnly?: boolean;                // sem criar/editar/excluir
  staffReadOnly?: boolean;           // equipe só visualiza (vê apenas o que a atividade dela permite)
  noCreate?: boolean;                // só edita registros existentes
  noDelete?: boolean;
  select?: string;                   // colunas da lista (evita baixar campos pesados)
  singleRow?: boolean;               // só pode existir um registro
  orderBy?: string;
};

const ref = {
  student: { table: 'students', label: 'full_name', flag: 'status' },
  activeStudent: { table: 'students', label: 'full_name', flag: 'status', activeOnly: 'active' },
  class: { table: 'classes', label: 'name' },
  activity: { table: 'activities', label: 'name' },
  profile: { table: 'profiles', label: 'full_name' },
} satisfies Record<string, RefDef>;

const CAT = ['Baby', 'Kids', 'Juvenil', 'Adulto'];
const BELTS = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Outra'];

export const modules: ModuleDef[] = [
  {
    key: 'students', title: 'Alunos', table: 'students', description: 'Cadastro e situação dos participantes. A matrícula é gerada automaticamente (AAAA-0001…) e é a mesma da carteirinha. Para enviar a foto, clique no lápis do aluno.',
    staffWrite: 'full', noDelete: true,
    select: '*,student_activities(status,activities(name))',
    columns: ['student_number', 'full_name', 'student_activities', 'category', 'status', 'phone', 'entry_date'],
    fields: [
      { name: 'student_number', label: 'Matrícula (automática)', readOnly: true },
      { name: 'full_name', label: 'Nome completo', required: true },
      { name: 'birth_date', label: 'Nascimento', type: 'date' },
      { name: 'phone', label: 'Telefone' },
      { name: 'email', label: 'E-mail', type: 'email' },
      { name: 'category', label: 'Categoria', options: CAT },
      { name: 'status', label: 'Situação', options: ['active', 'pending', 'inactive', 'suspended'] },
      { name: 'entry_date', label: 'Data de entrada', type: 'date' },
      { name: 'came_from_other_academy', label: 'Veio de outra academia?', type: 'boolean', blankLabel: 'Não informado' },
      { name: 'previous_training_time', label: 'Tempo de treino anterior', maxLength: 60 },
      { name: 'previous_belt', label: 'Faixa que tinha', options: BELTS },
      { name: 'previous_degrees', label: 'Graus que tinha (0–4)', type: 'number', min: 0, max: 4, step: 1 },
      { name: 'previous_master', label: 'Mestre / professor anterior (opcional)', maxLength: 120 },
      { name: 'notes', label: 'Observações', type: 'textarea' },
    ],
  },
  {
    key: 'guardians', title: 'Responsáveis', table: 'guardians', description: 'Cadastro de responsáveis legais.',
    staffWrite: 'full', noDelete: true,
    columns: ['full_name', 'relationship', 'phone', 'email'],
    fields: [
      { name: 'full_name', label: 'Nome completo', required: true },
      { name: 'phone', label: 'Telefone', required: true },
      { name: 'email', label: 'E-mail', type: 'email' },
      { name: 'relationship', label: 'Parentesco' },
      { name: 'address', label: 'Endereço' },
    ],
  },
  {
    key: 'classes', title: 'Turmas e aulas', table: 'classes', description: 'Turmas, horários e professores.',
    staffWrite: 'full', noDelete: true,
    columns: ['activity_id', 'name', 'category', 'weekday', 'start_time', 'end_time', 'teacher_name'],
    fields: [
      { name: 'activity_id', label: 'Atividade', required: true, ref: ref.activity },
      { name: 'name', label: 'Nome da turma', required: true },
      { name: 'category', label: 'Categoria', options: CAT },
      { name: 'weekday', label: 'Dia da semana', options: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] },
      { name: 'start_time', label: 'Início', type: 'time' },
      { name: 'end_time', label: 'Fim', type: 'time' },
      { name: 'teacher_name', label: 'Professor' },
    ],
  },
  {
    key: 'attendance', title: 'Frequência', table: 'attendance', description: 'Registro de presença, ausência e falta justificada.',
    staffWrite: 'full', noDelete: true, orderBy: 'attendance_date',
    columns: ['attendance_date', 'student_id', 'class_id', 'status', 'teacher_name'],
    fields: [
      { name: 'student_id', label: 'Aluno', required: true, ref: ref.activeStudent },
      { name: 'class_id', label: 'Turma', required: true, ref: ref.class },
      { name: 'attendance_date', label: 'Data', type: 'date', required: true },
      { name: 'status', label: 'Status', options: ['present', 'absent', 'excused'], required: true },
      { name: 'teacher_name', label: 'Professor' },
      { name: 'notes', label: 'Observações' },
    ],
  },
  {
    key: 'graduations', title: 'Graduações', table: 'graduation_history', description: 'Histórico esportivo de faixas e graus.',
    staffWrite: 'full', noDelete: true, orderBy: 'graduation_date',
    columns: ['graduation_date', 'activity_id', 'student_id', 'previous_belt', 'new_belt', 'degrees', 'teacher_name'],
    fields: [
      { name: 'activity_id', label: 'Atividade', required: true, ref: ref.activity },
      { name: 'student_id', label: 'Aluno (precisa estar inscrito na atividade)', required: true, ref: ref.activeStudent },
      { name: 'previous_belt', label: 'Graduação anterior (faixa, corda, nível…)' },
      { name: 'new_belt', label: 'Nova graduação (faixa, corda, nível…)', required: true },
      { name: 'degrees', label: 'Graus (0–4)', type: 'number', min: 0, max: 4, step: 1 },
      { name: 'graduation_date', label: 'Data', type: 'date', required: true },
      { name: 'teacher_name', label: 'Professor responsável' },
      { name: 'notes', label: 'Observação', type: 'textarea' },
    ],
  },
  {
    key: 'cards', title: 'Carteirinhas', table: 'membership_cards',
    description: 'Emissão, validade e situação. O número é a matrícula do aluno, preenchida automaticamente. Apenas o administrador emite ou altera carteirinhas. Use o ícone de QR para ver/imprimir.',
    columns: ['card_number', 'student_id', 'status', 'issued_at', 'expires_at'],
    fields: [
      { name: 'student_id', label: 'Aluno', required: true, ref: ref.student },
      { name: 'card_number', label: 'Nº da carteirinha (= matrícula, automático)', readOnly: true },
      { name: 'status', label: 'Status', options: ['pending', 'active', 'rejected', 'suspended', 'expired', 'cancelled'], required: true },
      { name: 'issued_at', label: 'Emissão', type: 'date' },
      { name: 'expires_at', label: 'Validade', type: 'date', required: true },
      { name: 'decision_reason', label: 'Motivo / observação' },
    ],
  },
  {
    key: 'card_requests', title: 'Solicitações de carteirinha', table: 'membership_card_requests',
    description: 'Pedidos de emissão e renovação. A equipe abre o pedido; a decisão é do administrador.',
    staffWrite: 'insert', noDelete: true,
    columns: ['requested_at', 'student_id', 'request_type', 'status', 'notes'],
    fields: [
      { name: 'student_id', label: 'Aluno', required: true, ref: ref.student },
      { name: 'request_type', label: 'Tipo', options: ['renewal', 'new'] },
      { name: 'status', label: 'Status', options: ['pending', 'approved', 'rejected', 'correction'] },
      { name: 'notes', label: 'Observação', type: 'textarea' },
    ],
  },
  {
    key: 'assessments', title: 'Avaliações', table: 'student_assessments', description: 'Avaliação privada. Não promove faixa automaticamente.',
    staffWrite: 'full', noDelete: true, orderBy: 'assessment_date',
    columns: ['assessment_date', 'activity_id', 'student_id', 'discipline_score', 'attendance_score', 'technical_score', 'fitness_score', 'overall_score'],
    fields: [
      { name: 'activity_id', label: 'Atividade', required: true, ref: ref.activity },
      { name: 'student_id', label: 'Aluno (precisa estar inscrito na atividade)', required: true, ref: ref.activeStudent },
      { name: 'assessment_date', label: 'Data', type: 'date', required: true },
      { name: 'discipline_score', label: 'Disciplina (0–10)', type: 'number', min: 0, max: 10, step: 0.1 },
      { name: 'attendance_score', label: 'Frequência (0–10)', type: 'number', min: 0, max: 10, step: 0.1 },
      { name: 'technical_score', label: 'Técnica (0–10)', type: 'number', min: 0, max: 10, step: 0.1 },
      { name: 'fitness_score', label: 'Condicionamento (0–10)', type: 'number', min: 0, max: 10, step: 0.1 },
      { name: 'overall_score', label: 'Evolução geral (0–10)', type: 'number', min: 0, max: 10, step: 0.1 },
      { name: 'comments', label: 'Observações', type: 'textarea' },
    ],
  },
  {
    key: 'contents', title: 'Biblioteca de ensino', table: 'learning_contents', description: 'Técnicas e exercícios exibidos na página pública /tecnicas quando estão publicados. Em Passo a passo, Erros comuns e Cuidados, escreva uma linha por item, sem numerar.',
    staffWrite: 'full', noDelete: true,
    columns: ['activity_id', 'title', 'difficulty', 'belt', 'content_type', 'published', 'sort_order'],
    fields: [
      { name: 'activity_id', label: 'Atividade', ref: ref.activity, blankLabel: 'Geral (todas as atividades)' },
      { name: 'title', label: 'Título', required: true },
      { name: 'description', label: 'Descrição', type: 'textarea' },
      { name: 'category', label: 'Categoria', options: CAT },
      { name: 'belt', label: 'Faixa' },
      { name: 'difficulty', label: 'Dificuldade', options: ['Iniciante', 'Intermediário', 'Avançado'] },
      { name: 'content_type', label: 'Tipo', options: ['Técnica', 'Vídeo', 'Exercício'] },
      { name: 'video_url', label: 'URL do vídeo', type: 'url' },
      { name: 'steps', label: 'Passo a passo', type: 'textarea' },
      { name: 'common_errors', label: 'Erros comuns', type: 'textarea' },
      { name: 'safety_notes', label: 'Cuidados de segurança', type: 'textarea' },
      { name: 'sort_order', label: 'Ordem de exibição (menor aparece primeiro)', type: 'number', step: 1 },
      { name: 'published', label: 'Publicado no site', type: 'boolean' },
    ],
  },
  {
    key: 'activities', title: 'Atividades', table: 'activities', adminOnly: true, noDelete: true, orderBy: 'sort_order',
    description: 'Modalidades oferecidas (Jiu-Jitsu, Capoeira, Boxe…). Para criar uma nova, clique em Novo. Para esconder da ficha, desmarque Ativa.',
    columns: ['name', 'active', 'sort_order'],
    fields: [
      { name: 'name', label: 'Nome da atividade', required: true, maxLength: 60 },
      { name: 'sort_order', label: 'Ordem de exibição', type: 'number', step: 1 },
      { name: 'active', label: 'Ativa (aparece na ficha)', type: 'boolean' },
    ],
  },
  {
    key: 'teacher_activities', title: 'Professores por atividade', table: 'teacher_activities', adminOnly: true,
    description: 'Defina quem ensina cada atividade. O professor só vê alunos, turmas, chamada, graduações e fichas da(s) atividade(s) dele.',
    columns: ['profile_id', 'activity_id', 'created_at'],
    fields: [
      { name: 'profile_id', label: 'Professor (usuário)', required: true, ref: ref.profile },
      { name: 'activity_id', label: 'Atividade', required: true, ref: ref.activity },
    ],
  },
  {
    key: 'announcements', title: 'Avisos', table: 'announcements', description: 'Comunicados para participantes.',
    staffWrite: 'full', noDelete: true,
    columns: ['title', 'body', 'published', 'created_at'],
    fields: [
      { name: 'title', label: 'Título', required: true },
      { name: 'body', label: 'Conteúdo', required: true, type: 'textarea' },
      { name: 'published', label: 'Publicado', type: 'boolean' },
    ],
  },
  {
    key: 'interests', title: 'Interessados (site)', table: 'public_interest', adminOnly: true, noCreate: true,
    description: 'Pedidos enviados pelo formulário público. Use o olho para ver tudo, o ícone de pessoa para virar aluno e o lápis para mudar a situação.',
    columns: ['created_at', 'full_name', 'birth_date', 'phone', 'came_from_other_academy', 'previous_belt', 'status'],
    fields: [{ name: 'status', label: 'Situação', options: ['pending', 'reviewed', 'approved', 'rejected'], required: true }],
  },
  {
    key: 'enrollments', title: 'Fichas de inscrição', table: 'enrollments', staffReadOnly: true, noCreate: true,
    select: 'id,created_at,status,student_id,full_name,birth_date,phone1,sport',
    description: 'Fichas enviadas online (com saúde e termos aceitos). Olho: ver/imprimir. Pessoa com +: criar o aluno. Lápis: mudar a situação.',
    columns: ['created_at', 'full_name', 'sport', 'birth_date', 'phone1', 'status', 'student_id'],
    fields: [{ name: 'status', label: 'Situação', options: ['pending', 'reviewed', 'approved', 'rejected'], required: true }],
  },
  {
    key: 'contributions', title: 'Ajuda de custo', table: 'contributions', adminOnly: true,
    description: 'Contribuições sociais. Nunca suspendem o aluno automaticamente.',
    columns: ['competence', 'student_id', 'amount', 'payment_method', 'status', 'received_at'],
    fields: [
      { name: 'student_id', label: 'Aluno (opcional)', ref: ref.student },
      { name: 'amount', label: 'Valor (R$)', type: 'number', required: true, min: 0, step: 0.01 },
      { name: 'competence', label: 'Competência (AAAA-MM)', required: true },
      { name: 'received_at', label: 'Recebimento', type: 'date' },
      { name: 'payment_method', label: 'Forma', options: ['PIX', 'Dinheiro', 'Transferência', 'Material', 'Outro'] },
      { name: 'status', label: 'Status', options: ['received', 'pending'] },
      { name: 'notes', label: 'Observações', type: 'textarea' },
    ],
  },
  {
    key: 'settings', title: 'Valor da ajuda de custo', table: 'contribution_settings', adminOnly: true, noDelete: true,
    description: 'Valor de referência (inicia em R$ 15,00). Cada alteração vale a partir da competência informada.',
    columns: ['amount', 'effective_competence', 'created_at'],
    fields: [
      { name: 'amount', label: 'Valor (R$)', type: 'number', required: true, min: 0, step: 0.01 },
      { name: 'effective_competence', label: 'Vale a partir de (AAAA-MM)', required: true },
    ],
  },
  {
    key: 'payment', title: 'Dados de pagamento (PIX)', table: 'payment_settings', adminOnly: true, noDelete: true, singleRow: true,
    description: 'Chave PIX exibida no site público, com QR Code e botão de copiar. Só existe um cadastro; edite-o quando precisar trocar a chave.',
    columns: ['pix_key_type', 'pix_key', 'beneficiary_name', 'beneficiary_city', 'active'],
    fields: [
      { name: 'pix_key_type', label: 'Tipo da chave', options: ['cpf', 'cnpj', 'email', 'phone', 'random'], required: true },
      { name: 'pix_key', label: 'Chave PIX', required: true, maxLength: 120 },
      { name: 'beneficiary_name', label: 'Nome do favorecido (máx. 25)', required: true, maxLength: 25 },
      { name: 'beneficiary_city', label: 'Cidade (máx. 15)', required: true, maxLength: 15 },
      { name: 'instructions', label: 'Instruções (opcional)', type: 'textarea', maxLength: 500 },
      { name: 'active', label: 'Exibir no site', type: 'boolean' },
    ],
  },
  {
    key: 'expenses', title: 'Despesas', table: 'expenses', adminOnly: true, orderBy: 'expense_date',
    description: 'Despesas e comprovantes do projeto.',
    columns: ['expense_date', 'description', 'category', 'amount', 'receipt_url'],
    fields: [
      { name: 'description', label: 'Descrição', required: true },
      { name: 'category', label: 'Categoria', required: true },
      { name: 'amount', label: 'Valor (R$)', type: 'number', required: true, min: 0, step: 0.01 },
      { name: 'expense_date', label: 'Data', type: 'date', required: true },
      { name: 'receipt_url', label: 'Comprovante (URL)', type: 'url' },
      { name: 'notes', label: 'Observações', type: 'textarea' },
    ],
  },
  {
    key: 'donations', title: 'Doações', table: 'donations', adminOnly: true, orderBy: 'donation_date',
    description: 'Registro de doações e doadores.',
    columns: ['donation_date', 'donor_name', 'donation_type', 'amount', 'description'],
    fields: [
      { name: 'donor_name', label: 'Doador (opcional)' },
      { name: 'amount', label: 'Valor (R$)', type: 'number', min: 0, step: 0.01 },
      { name: 'donation_date', label: 'Data', type: 'date', required: true },
      { name: 'donation_type', label: 'Tipo', options: ['Financeira', 'Material'] },
      { name: 'description', label: 'Descrição / destinação' },
      { name: 'receipt_url', label: 'Comprovante (URL)', type: 'url' },
    ],
  },
  {
    key: 'materials', title: 'Doações de materiais', table: 'donation_materials', adminOnly: true,
    description: 'Controle de itens recebidos.',
    columns: ['received_at', 'material_name', 'quantity', 'donor_name', 'condition'],
    fields: [
      { name: 'material_name', label: 'Material', required: true },
      { name: 'quantity', label: 'Quantidade', type: 'number', required: true, min: 0.01, step: 0.01 },
      { name: 'donor_name', label: 'Doador' },
      { name: 'received_at', label: 'Recebido em', type: 'date' },
      { name: 'condition', label: 'Condição', options: ['Novo', 'Usado em bom estado', 'Precisa avaliação'] },
      { name: 'notes', label: 'Observações', type: 'textarea' },
    ],
  },
  {
    key: 'users', title: 'Usuários e permissões', table: 'profiles', adminOnly: true, noDelete: true,
    description: 'Quem acessa o sistema. Quem se cadastra em /login aparece aqui como Inativo (perfil Aluno): clique no lápis, escolha Professor/Auxiliar/Administrador e marque Ativo; depois ligue a atividade em Professores por atividade. Ou clique em Novo para criar professor, auxiliar ou administrador (e-mail + senha). Lápis: mudar perfil ou desativar. Chave: trocar a senha. Para ligar o professor à atividade dele, use Professores por atividade.',
    columns: ['full_name', 'email', 'role', 'active', 'created_at'],
    fields: [
      { name: 'id', label: 'UUID do usuário (Supabase Auth)', required: true, createOnly: true },
      { name: 'email', label: 'E-mail', readOnly: true },
      { name: 'full_name', label: 'Nome completo', required: true },
      { name: 'role', label: 'Perfil', options: ['admin', 'teacher', 'assistant', 'student', 'guardian'], required: true },
      { name: 'active', label: 'Ativo', type: 'boolean' },
    ],
  },
  {
    key: 'analytics', title: 'Estatísticas do site', table: 'site_analytics', adminOnly: true, readOnly: true,
    description: 'Eventos coletados. Sem eventos, não há valores inventados.',
    columns: ['event_date', 'page_path', 'views_count', 'visitors_estimated', 'source_label'],
    fields: [],
  },
  {
    key: 'audit', title: 'Auditoria', table: 'audit_logs', adminOnly: true, readOnly: true,
    description: 'Trilha automática de alterações (somente leitura). Clique no olho para ver antes/depois.',
    columns: ['created_at', 'action', 'table_name', 'record_id'],
    fields: [],
  },
];

export const LABELS: Record<string, string> = {
  cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', phone: 'Telefone', random: 'Chave aleatória',
  active: 'Ativo', pending: 'Pendente', inactive: 'Inativo', suspended: 'Suspenso', expired: 'Expirada', cancelled: 'Cancelada',
  present: 'Presente', absent: 'Ausente', excused: 'Justificada', received: 'Recebido', approved: 'Aprovado', rejected: 'Rejeitado',
  correction: 'Correção', renewal: 'Renovação', new: 'Nova', reviewed: 'Analisado',
  admin: 'Administrador', teacher: 'Professor', assistant: 'Auxiliar', student: 'Aluno', guardian: 'Responsável',
  INSERT: 'Criação', UPDATE: 'Alteração', DELETE: 'Exclusão',
};

export const COLUMN_LABELS: Record<string, string> = {
  student_activities: 'Atividades', activity_id: 'Atividade', sport: 'Atividade(s)', profile_id: 'Professor',
  full_name: 'Nome', created_at: 'Criado em', student_id: 'Aluno', class_id: 'Turma', attendance_date: 'Data', teacher_name: 'Professor',
  graduation_date: 'Data', previous_belt: 'Faixa anterior', new_belt: 'Nova faixa', degrees: 'Graus', card_number: 'Nº carteirinha',
  issued_at: 'Emissão', expires_at: 'Validade', requested_at: 'Solicitado em', request_type: 'Tipo', assessment_date: 'Data',
  discipline_score: 'Disciplina', attendance_score: 'Frequência', technical_score: 'Técnica', fitness_score: 'Condicionamento',
  overall_score: 'Geral', content_type: 'Tipo', published: 'Publicado', body: 'Conteúdo', competence: 'Competência', amount: 'Valor',
  payment_method: 'Forma', received_at: 'Recebimento', expense_date: 'Data', description: 'Descrição', category: 'Categoria',
  receipt_url: 'Comprovante', donation_date: 'Data', donor_name: 'Doador', donation_type: 'Tipo', material_name: 'Material',
  quantity: 'Qtd.', condition: 'Condição', role: 'Perfil', active: 'Ativo', event_date: 'Data', page_path: 'Página',
  views_count: 'Visitas', visitors_estimated: 'Visitantes', source_label: 'Origem', action: 'Ação', table_name: 'Tabela',
  record_id: 'Registro', effective_competence: 'Vale desde', name: 'Turma', weekday: 'Dia', start_time: 'Início', end_time: 'Fim',
  pix_key_type: 'Tipo', pix_key: 'Chave', beneficiary_name: 'Favorecido', beneficiary_city: 'Cidade',
  status: 'Situação', phone: 'Telefone', email: 'E-mail', entry_date: 'Entrada', relationship: 'Parentesco', age: 'Idade',
  phone1: 'Telefone', sort_order: 'Ordem', message: 'Mensagem', student_number: 'Matrícula', birth_date: 'Nascimento', came_from_other_academy: 'Outra academia?',
  previous_training_time: 'Tempo de treino', previous_degrees: 'Graus', previous_master: 'Mestre anterior', title: 'Título', belt: 'Faixa', difficulty: 'Dificuldade', notes: 'Observações',
};
