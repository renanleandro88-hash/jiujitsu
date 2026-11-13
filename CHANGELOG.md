# Revisão — correções aplicadas

## Quebras de build / execução
- `tsc -b` falhava: `replaceAll` não existe na lib ES2020 → lib/target ES2022.
- `tsc -b` falhava: faltava `src/vite-env.d.ts` (`import.meta.env`) e tipagem de `def?.fields.length>0`.
- Dashboard dava tela branca no 1º render (`metrics.income.toLocaleString` com `metrics = {}`).
- Sem `.env.local`, `/admin` ficava eternamente em "Verificando sessão…" → agora mostra aviso de configuração.
- Formulários enviavam `''` em campos de data/número/UUID (erro do Postgres) → vazio é omitido (criar) ou `null` (editar); números e booleanos são tipados.
- Módulo Usuários não conseguia criar perfil (faltava o `id`) → campo UUID do usuário Auth.
- Troca rápida de módulo podia mostrar dados do módulo anterior → controle de requisição.
- `vercel.json` adicionado (refresh em `/admin` dava 404).

## Segurança / banco
- `current_role()` é nome reservado do Postgres → renomeada para `app_role()`.
- Verificação pública da carteirinha expunha o nome completo (podem ser menores) → primeiro nome + inicial.
- Professores/auxiliares podiam criar/ativar carteirinhas e alterar faixas → agora só admin; equipe só abre solicitação `pending`.
- `audit_logs` nunca era preenchida → triggers de auditoria automática.
- Funções de papel sem execução para `anon`; índice único de analytics tratando `source_label` nulo.

## Funcionalidades que o README prometia e não existiam
- Página pública `/verificar/:token` e carteirinha imprimível com QR (usava `qrcode.react`, que nunca era importada).
- Painel respeita o papel: equipe não vê financeiro/usuários/auditoria; contas inativas/sem perfil/aluno/responsável veem tela de acesso negado.
- Aluno/turma escolhidos por lista (antes: colar UUID).
- Novos módulos: Interessados (formulário do site) e Valor da ajuda de custo (R$ 15 configurável).
- Colunas legíveis, rótulos em português, mensagens de erro amigáveis, detalhes antes/depois na Auditoria.
- Removida dependência não usada (`recharts`).

## PIX no site
- Módulo **Dados de pagamento (PIX)** (admin): tipo/chave, favorecido, cidade, instruções, exibir no site.
- Site público mostra QR Code, chave e botões "Copiar chave" / "Pix copia e cola" (BR Code estático gerado no navegador; CRC validado contra o exemplo oficial do BCB).
- Banco: tabela `payment_settings` (uma única linha; leitura pública só da configuração ativa; escrita só admin). Migração em `supabase/migrations/001_payment_settings.sql`.

## Chamada e fluxo de alunos
- Nova tela **Chamada por turma**: escolhe turma + data, marca Presente/Ausente/Justificada por aluno e salva tudo de uma vez (upsert; reabrir a mesma turma/data carrega e permite corrigir).
- Listas de aluno em Frequência, Graduações e Avaliações mostram só alunos **Ativos** (registros antigos de alunos não ativos continuam editáveis, marcados "(não ativo)").
- Interessados → botão **Virar aluno**: cria o aluno como Pendente (categoria sugerida pela idade, observações com origem/mensagem), avisa se já houver telefone igual e marca o interessado como aprovado.

## Matrícula automática e treino anterior
- **Matrícula automática** (AAAA-0001, 0002…) gerada pelo banco ao cadastrar o aluno; não pode ser alterada. O **nº da carteirinha é preenchido com a mesma matrícula**; a verificação pública mostra essa matrícula. O QR continua com token aleatório (não adivinhável).
- Formulário público: **data de nascimento** preenchida pelo próprio candidato (idade calculada) e bloco "Já treinou em outra academia?" com tempo, faixa, graus e mestre (opcional).
- Cadastro do aluno ganhou os mesmos campos de treino anterior; "Virar aluno" copia tudo e calcula a categoria pelo nascimento.
- Interessados: botão "Ver tudo" com todas as respostas.
- Migração `supabase/migrations/002_matricula_experiencia.sql` (também incluída no `schema.sql`).

## Ficha de inscrição online (equivalente à ficha de papel)
- Página pública **/inscricao** com todos os campos da ficha: inscrição, aluno (RG, CPF, sexo, estado civil, nacionalidade, cor/raça), filiação, endereço, contatos, escolaridade, emergência, saúde completa (plano/SUS, problemas, alergias, medicamentos, deficiência, cirurgia, tipo sanguíneo, altura, peso) e os 9 termos com aceite eletrônico e assinatura por nome (data/hora do servidor). Máscaras e validação de CPF/CEP/telefone.
- Banco: tabela `enrollments` (qualquer visitante envia; **só o administrador lê**), com checagens, carimbo de hora do servidor, limite de tamanho e campo anti-robô.
- Administração: módulo **Fichas de inscrição** (ver/imprimir ficha, mudar situação, **Virar aluno** → cria aluno + contato de emergência + saúde privada + consentimentos).
- Migração `supabase/migrations/003_enrollments.sql` (também no `schema.sql`).

## Ajustes
- "Virar aluno" (interessado e ficha) agora cria o aluno já como **Ativo**; ele aparece direto na Chamada.
- Chamada avisa quando há alunos Pendentes que não aparecem.
- Seção "Apoie o projeto": removida a frase sobre valor inicial configurável pelo administrador.

## Biblioteca de técnicas (passagem de guarda)
- Página pública **/tecnicas** (link "Técnicas" no menu): técnicas com passo a passo, erros comuns e cuidados de segurança; busca e filtro por nível; vídeo opcional.
- Conteúdo inicial (8 itens, para revisão do professor): postura na guarda fechada, abrir a guarda em pé, toreando, passagem longa, joelho cortando, pressão (por cima e por baixo), cem quilos e treino posicional.
- Banco: coluna `sort_order`; leitura pública só de conteúdo **publicado** e só das colunas necessárias. Migração `004_tecnicas_guarda.sql` (também no `schema.sql`).
- Biblioteca de ensino no painel: ordem de exibição, "Publicado no site", uma linha por item nos campos de passos.

## Foto e carteirinha digital
- Foto do aluno: em **Alunos → lápis**, botão "Enviar / tirar foto" (no celular abre a câmera). A imagem é recortada em retrato 3:4 e reduzida (~480×640 JPEG) no navegador e guardada no bucket `student-photos` (só o administrador envia/remove; arquivo com nome aleatório).
- **Carteirinha digital** (`/verificar/<token>`, o mesmo link do QR): cartão estilo documento digital com foto, nome abreviado, matrícula, graduação, validade e selo VÁLIDA, mais um QR da própria página para outra pessoa conferir na tela do celular.
- Carteirinha (impressão): foto + QR; botões "Copiar link" e "Enviar por WhatsApp" para mandar a carteirinha digital ao aluno/responsável.
- Migração `supabase/migrations/005_foto_carteirinha.sql` (também no `schema.sql`).

## App no celular (PWA)
- Instalável na tela inicial (Android/iPhone): manifesto, ícones gerados do logo, service worker mínimo **sem cache** de dados. Abre em tela cheia, direto no painel (/admin).
- `vercel.json` ajustado (cabeçalhos do service worker/manifesto).

## Foto na ficha de inscrição
- A ficha online agora pede a **foto do aluno** (obrigatória; câmera ou galeria). A imagem é reduzida no navegador (360×480 JPEG) e vai junto com a ficha.
- Na administração a foto aparece na ficha (e na impressão). Ao **Virar aluno**, a foto é copiada para o cadastro do aluno e passa a constar na carteirinha e na carteirinha digital.
- A lista de fichas não baixa mais as fotos (carrega só ao abrir/converter).
- Migração `supabase/migrations/006_foto_na_ficha.sql` (também no `schema.sql`).
