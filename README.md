# Sistema completo — Projeto Social de Jiu-Jitsu | Instituto Realiza

Entrega full-stack preparada com React, Vite, TypeScript, Supabase/PostgreSQL, Auth, RLS, carteirinha verificável por token QR, site público e painel CRUD responsivo.

## Iniciar localmente
1. Instale Node.js LTS.
2. Extraia o ZIP e entre na pasta.
3. `npm install`
4. Copie `.env.example` para `.env.local`.
5. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a URL do projeto e a chave anon/publishable pública.
6. Execute `npm run dev`; para checar/build: `npm run build`.

## Configurar Supabase
1. Crie um projeto Supabase.
2. Abra SQL Editor e execute `supabase/schema.sql` inteiro.
3. Em Authentication > Settings, desabilite signup público.
4. Crie/invite administrador via Supabase Dashboard (ou backend seguro). Nunca colocar service_role no frontend.
5. Copie o UUID do usuário Auth e execute a query de provisionamento admin comentada ao final do SQL, substituindo UUID e nome.
6. Faça login com as credenciais. O administrador pode provisionar perfis via Users/Permissões (CRUD sob policy admin).
7. Configure Storage buckets privados para fotos, documentos e comprovantes; habilite políticas de acesso por perfil antes de enviar arquivos.

## Recursos incluídos
- Página pública institucional, horários, endereço, missão, apoio e área restrita.
- Login com Supabase Auth.
- Painel administrativo responsivo com dashboard de métricas reais do banco.
- CRUD genérico para alunos, responsáveis, turmas, frequência, graduações, carteirinhas, solicitações, avaliações, conteúdos, ajuda de custo, despesas, doações, materiais, usuários/perfis, avisos, auditoria e analytics.
- SQL inclui tabelas relacionais para vínculos de responsável, contatos de emergência, consentimentos, saúde privada, professor-assignment, progresso didático, prestação de contas e site events.
- Carteirinha: QR leva a `/verificar/<token>` (página pública). O token não contém PII; a RPC expõe só primeiro nome + inicial do sobrenome, matrícula mascarada e faixa, apenas para cartões ativos e não vencidos. No módulo Carteirinhas, o ícone de QR abre a carteirinha imprimível.
- RLS habilitada e políticas admin; staff limitada ao conjunto esportivo e sem financeiro/permissões.
- Ajuda de custo configurada inicialmente em R$15 e não condiciona acesso do aluno.

## Observações importantes antes de produção
- Logo oficial já incluído em `public/logo/logo.png`.
- Dados pessoais/saúde de menores são sensíveis. O esquema mantém tabela de saúde separada com RLS somente administrador por padrão; defina políticas adicionais para profissionais expressamente autorizados.
- Vínculos autenticados de aluno/responsável com estudante ainda precisam ser ligados a profiles via fluxo seguro e policies por vínculo antes de habilitar portal self-service. O sistema não abre esses dados a alunos automaticamente.
- Fluxo de aprovação de carteirinha é manual (admin edita o status). Não há ainda tabelas de saúde/contatos de emergência/consentimentos na interface (existem no banco, só admin).
- RLS equipe: leitura dos registros esportivos; insert/update em alunos, frequência, graduações, avaliações, turmas, conteúdos e avisos; apenas abre solicitações de carteirinha (status pending). Carteirinhas e faixas só o admin altera. Sem delete para a equipe. Admin: acesso total.
- Auditoria automática (triggers) em perfis, alunos, graduações, carteirinhas, financeiro; visível no módulo Auditoria.
- Upload real de arquivos exige Storage buckets e policies específicos. Não é seguro abrir buckets sensíveis publicamente.
- Estatísticas são provenientes das tabelas/eventos; não são inventadas. A coleta pública de analytics não foi habilitada automaticamente.
- A criação de convites e admin privilegia operação via console/backend seguro; não use client-side service_role.
- Build test deve ser executado no computador com npm instalado e dependências baixadas; este pacote foi gerado no ambiente da conversa.

## Hospedagem Vercel
O `vercel.json` já redireciona as rotas (`/login`, `/admin`, `/verificar/...`) para o app. Importe o repositório/pasta para Vercel, configure env vars no Project Settings, rode `npm run build`. Configure URL de site nas Authentication redirect URLs do Supabase.

## Alterações da revisão
Veja `CHANGELOG.md`.
