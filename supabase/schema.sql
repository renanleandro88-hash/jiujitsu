-- Instituto Realiza | Projeto Social de Jiu-Jitsu
-- Execute no Supabase SQL Editor de um projeto novo.
-- Este script implementa o núcleo do banco e RLS. Dados sensíveis têm políticas restritas.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 role text not null default 'student' check(role in ('admin','teacher','assistant','student','guardian')),
 active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create or replace function public.app_role() returns text
language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() and active=true limit 1 $$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public
as $$ select coalesce(public.app_role()='admin',false) $$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path=public
as $$ select coalesce(public.app_role() in ('admin','teacher','assistant'),false) $$;
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;

create table if not exists public.students (
 id uuid primary key default gen_random_uuid(), student_number text unique,
 full_name text not null, photo_path text, birth_date date, sex text,
 phone text, email text, address text, entry_date date not null default current_date,
 category text check(category in ('Baby','Kids','Juvenil','Adulto')),
 category_override boolean not null default false,
 status text not null default 'pending' check(status in ('active','pending','inactive','suspended')),
 notes text, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.guardians (
 id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id) on delete set null,
 full_name text not null, relationship text, phone text not null, email text, address text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.student_guardians (
 student_id uuid not null references public.students(id) on delete cascade,
 guardian_id uuid not null references public.guardians(id) on delete cascade,
 is_primary boolean not null default false, created_at timestamptz not null default now(),
 primary key(student_id,guardian_id)
);
create table if not exists public.emergency_contacts (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
 full_name text not null, phone text not null, relationship text, created_at timestamptz not null default now()
);
create table if not exists public.student_health_private (
 student_id uuid primary key references public.students(id) on delete cascade,
 has_allergies boolean not null default false, allergy_type text, known_reaction text, emergency_guidance text,
 updated_at timestamptz not null default now()
);
create table if not exists public.student_consents (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
 consent_type text not null check(consent_type in ('image','data_processing','other')),
 granted boolean not null default false, guardian_name text, consented_at timestamptz, revoked_at timestamptz, notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.teacher_assignments (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
 assignment_title text not null, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.classes (
 id uuid primary key default gen_random_uuid(), name text not null, category text,
 weekday text check(weekday in ('Segunda','Quarta','Terça','Quinta','Sexta','Sábado','Domingo')),
 start_time time, end_time time, teacher_profile_id uuid references public.profiles(id), teacher_name text,
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.attendance (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id),
 class_id uuid not null references public.classes(id), attendance_date date not null,
 status text not null check(status in ('present','absent','excused')), teacher_profile_id uuid references public.profiles(id),
 teacher_name text, notes text, created_at timestamptz not null default now(), unique(student_id,class_id,attendance_date)
);
create table if not exists public.belts (
 id uuid primary key default gen_random_uuid(), name text not null unique, category text, order_index int not null default 0,
 max_degrees int not null default 4 check(max_degrees between 0 and 4), active boolean not null default true
);
create table if not exists public.graduation_history (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id),
 previous_belt text, new_belt text not null, degrees int not null default 0 check(degrees between 0 and 4),
 graduation_date date not null, teacher_profile_id uuid references public.profiles(id), teacher_name text, notes text,
 created_at timestamptz not null default now()
);
create table if not exists public.student_assessments (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id),
 assessment_date date not null, discipline_score numeric(3,1) check(discipline_score between 0 and 10),
 attendance_score numeric(3,1) check(attendance_score between 0 and 10), technical_score numeric(3,1) check(technical_score between 0 and 10),
 fitness_score numeric(3,1) check(fitness_score between 0 and 10), overall_score numeric(3,1) check(overall_score between 0 and 10),
 comments text, assessor_profile_id uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.membership_cards (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id),
 card_number text not null unique, qr_token uuid not null default gen_random_uuid() unique,
 status text not null default 'pending' check(status in ('pending','active','rejected','suspended','expired','cancelled')),
 issued_at date, expires_at date not null, decision_reason text, approved_by uuid references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.membership_card_requests (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id),
 request_type text not null default 'renewal' check(request_type in ('renewal','new')),
 status text not null default 'pending' check(status in ('pending','approved','rejected','correction')),
 requested_at timestamptz not null default now(), reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
 notes text, created_at timestamptz not null default now()
);
create table if not exists public.membership_card_audit (
 id uuid primary key default gen_random_uuid(), card_id uuid references public.membership_cards(id) on delete set null,
 action text not null, old_status text, new_status text, reason text, actor_id uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.learning_contents (
 id uuid primary key default gen_random_uuid(), title text not null, description text, category text, belt text, degree int,
 difficulty text, content_type text, video_url text, image_paths text[] not null default '{}', steps text, common_errors text, safety_notes text,
 progressive_release boolean not null default false, published boolean not null default false,
 author_id uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.content_assignments (
 id uuid primary key default gen_random_uuid(), content_id uuid not null references public.learning_contents(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade, assigned_by uuid references public.profiles(id),
 assigned_at timestamptz not null default now(), due_date date, notes text, unique(content_id,student_id)
);
create table if not exists public.content_progress (
 id uuid primary key default gen_random_uuid(), content_id uuid not null references public.learning_contents(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 status text not null default 'presented' check(status in ('presented','studied','practiced','completed')),
 teacher_assessment text, updated_by uuid references public.profiles(id), updated_at timestamptz not null default now(), unique(content_id,student_id)
);
create table if not exists public.contribution_settings (
 id uuid primary key default gen_random_uuid(), amount numeric(12,2) not null default 15 check(amount>=0),
 effective_competence text not null, changed_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.contributions (
 id uuid primary key default gen_random_uuid(), student_id uuid references public.students(id) on delete set null,
 amount numeric(12,2) not null check(amount>=0), competence text not null,
 received_at date, payment_method text, status text not null default 'pending' check(status in ('received','pending')),
 notes text, recorded_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.expenses (
 id uuid primary key default gen_random_uuid(), description text not null, category text not null,
 amount numeric(12,2) not null check(amount>=0), expense_date date not null, receipt_url text, notes text,
 recorded_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.donations (
 id uuid primary key default gen_random_uuid(), donor_name text, amount numeric(12,2) check(amount is null or amount>=0),
 donation_date date not null, donation_type text not null default 'Financeira', description text, receipt_url text,
 recorded_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.donation_materials (
 id uuid primary key default gen_random_uuid(), material_name text not null, quantity numeric(12,2) not null check(quantity>0),
 donor_name text, received_at date, condition text, notes text, recorded_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.transparency_reports (
 id uuid primary key default gen_random_uuid(), title text not null, period_start date not null, period_end date not null,
 total_received numeric(12,2) not null default 0, total_spent numeric(12,2) not null default 0, balance numeric(12,2) not null default 0,
 public_summary text, document_path text, published boolean not null default false, created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(), check(period_end>=period_start)
);
create table if not exists public.site_events (
 id uuid primary key default gen_random_uuid(), event_type text not null, page_path text not null,
 anonymous_session_id text, referrer_domain text, consented boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.site_analytics (
 id uuid primary key default gen_random_uuid(), event_date date not null, page_path text not null,
 views_count int not null default 0, visitors_estimated int not null default 0, source_label text, created_at timestamptz not null default now()
);
create table if not exists public.announcements (
 id uuid primary key default gen_random_uuid(), title text not null, body text not null, published boolean not null default false,
 created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id), action text not null,
 table_name text, record_id uuid, old_values jsonb, new_values jsonb, reason text, created_at timestamptz not null default now()
);
create table if not exists public.public_interest (
 id uuid primary key default gen_random_uuid(), full_name text not null check(char_length(full_name) between 2 and 160),
 age smallint check(age between 1 and 120), phone text not null check(char_length(phone) between 8 and 30), email text,
 message text check(message is null or char_length(message)<=1500), status text not null default 'pending' check(status in ('pending','reviewed','approved','rejected')),
 created_at timestamptz not null default now()
);

create unique index if not exists site_analytics_unique_idx on public.site_analytics(event_date,page_path,coalesce(source_label,''));
-- Índices de busca/relatórios
create index if not exists students_status_idx on public.students(status);
create index if not exists students_name_idx on public.students(full_name);
create index if not exists attendance_date_idx on public.attendance(attendance_date);
create index if not exists attendance_student_idx on public.attendance(student_id);
create index if not exists graduation_student_date_idx on public.graduation_history(student_id,graduation_date desc);
create index if not exists cards_student_idx on public.membership_cards(student_id);
create index if not exists contributions_competence_idx on public.contributions(competence);
create index if not exists expenses_date_idx on public.expenses(expense_date);
create index if not exists site_events_date_idx on public.site_events(created_at);

-- updated_at triggers
do $$ declare t text; begin foreach t in array array['profiles','students','guardians','classes','membership_cards','learning_contents','announcements'] loop
 execute format('drop trigger if exists touch_%I on public.%I',t,t);
 execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()',t,t);
end loop; end $$;

-- RLS habilitada em todas as relações. Admin: tudo; equipe: tabelas pedagógicas;
-- aluno/responsável: apenas acesso ao próprio vínculo é ampliado em uma etapa de account-linking.
do $$ declare t text; begin foreach t in array array[
'profiles','students','guardians','student_guardians','emergency_contacts','student_health_private','student_consents','teacher_assignments','classes','attendance','belts','graduation_history','student_assessments','membership_cards','membership_card_requests','membership_card_audit','learning_contents','content_assignments','content_progress','contribution_settings','contributions','expenses','donations','donation_materials','transparency_reports','site_events','site_analytics','announcements','audit_logs','public_interest'
] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;

-- Drop/recreate predictable policies, idempotent.
do $$ declare t text; begin foreach t in array array[
'profiles','students','guardians','student_guardians','emergency_contacts','student_health_private','student_consents','teacher_assignments','classes','attendance','belts','graduation_history','student_assessments','membership_cards','membership_card_requests','membership_card_audit','learning_contents','content_assignments','content_progress','contribution_settings','contributions','expenses','donations','donation_materials','transparency_reports','site_events','site_analytics','announcements','audit_logs'
] loop
 execute format('drop policy if exists admin_all_%I on public.%I',t,t);
 execute format('create policy admin_all_%I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',t,t);
end loop; end $$;

-- Perfil individual pode consultar próprio profile; nenhuma permissão para auto-escalar papel.
drop policy if exists profile_self_read on public.profiles;
create policy profile_self_read on public.profiles for select to authenticated using (id=auth.uid());
drop policy if exists profile_admin_manage on public.profiles;
create policy profile_admin_manage on public.profiles for all to authenticated using(public.is_admin()) with check(public.is_admin());

-- Professores/auxiliares: operações esportivas (sem finanças e sem gestão de papéis).
-- Leitura em todas as tabelas esportivas; escrita (insert/update) apenas onde faz sentido.
-- Carteirinhas e faixas (belts) só são alteradas pelo administrador: evita que a equipe ative/renove a própria carteirinha.
do $$ declare t text; begin foreach t in array array['students','guardians','student_guardians','emergency_contacts','classes','attendance','belts','graduation_history','membership_cards','membership_card_requests','learning_contents','content_assignments','content_progress','student_assessments','announcements'] loop
 execute format('drop policy if exists staff_read_%I on public.%I',t,t);
 execute format('create policy staff_read_%I on public.%I for select to authenticated using (public.is_staff())',t,t);
end loop; end $$;

do $$ declare t text; begin foreach t in array array['students','guardians','student_guardians','emergency_contacts','classes','attendance','graduation_history','learning_contents','content_assignments','content_progress','student_assessments','announcements'] loop
 execute format('drop policy if exists staff_write_%I on public.%I',t,t);
 execute format('create policy staff_write_%I on public.%I for insert to authenticated with check (public.app_role() in (''teacher'',''assistant''))',t,t);
 execute format('drop policy if exists staff_update_%I on public.%I',t,t);
 execute format('create policy staff_update_%I on public.%I for update to authenticated using (public.app_role() in (''teacher'',''assistant'')) with check (public.app_role() in (''teacher'',''assistant''))',t,t);
end loop; end $$;

-- Equipe pode apenas abrir solicitações de carteirinha (a decisão é do administrador).
drop policy if exists staff_write_membership_card_requests on public.membership_card_requests;
create policy staff_write_membership_card_requests on public.membership_card_requests for insert to authenticated
 with check (public.app_role() in ('teacher','assistant') and status='pending');

-- Público pode enviar formulário de interesse; não pode consultar/editar cadastros.
drop policy if exists public_interest_insert on public.public_interest;
create policy public_interest_insert on public.public_interest for insert to anon,authenticated with check(status='pending');
drop policy if exists public_interest_admin on public.public_interest;
create policy public_interest_admin on public.public_interest for all to authenticated using(public.is_admin()) with check(public.is_admin());

revoke execute on function public.app_role(), public.is_admin(), public.is_staff() from anon;



-- Trilha de auditoria automática (quem alterou o quê). Dados de saúde não são copiados para o log.
create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path=public as $$
declare rid uuid; actor uuid;
begin
 select id into actor from public.profiles where id=auth.uid();
 if tg_op='DELETE' then rid:=(to_jsonb(old)->>'id')::uuid; else rid:=(to_jsonb(new)->>'id')::uuid; end if;
 insert into public.audit_logs(actor_id,action,table_name,record_id,old_values,new_values)
 values(actor,tg_op,tg_table_name,rid,
  case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
  case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
 return null;
end $$;
revoke all on function public.audit_row_change() from public;
do $$ declare t text; begin foreach t in array array['profiles','students','graduation_history','membership_cards','membership_card_requests','contributions','contribution_settings','expenses','donations','donation_materials'] loop
 execute format('drop trigger if exists audit_%I on public.%I',t,t);
 execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row_change()',t,t);
end loop; end $$;

-- Configuração de valor de ajuda de custo: primeiro valor de referência R$15.
insert into public.contribution_settings(amount,effective_competence)
select 15,'2026-11' where not exists(select 1 from public.contribution_settings);

-- IMPORTANTE provisionamento admin:
-- Desative signup público em Authentication settings. Crie/invite o usuário admin por console Supabase
-- (ou backend seguro usando service_role, jamais frontend); então execute:
-- insert into public.profiles(id,full_name,role,active)
-- values('UUID_DO_AUTH_USER','Administrador geral','admin',true)
-- on conflict(id) do update set role='admin',active=true,full_name=excluded.full_name;

-- Dados de pagamento (PIX) exibidos no site público. Execute uma vez no SQL Editor.
create table if not exists public.payment_settings (
 id uuid primary key default gen_random_uuid(),
 pix_key_type text not null check(pix_key_type in ('cpf','cnpj','email','phone','random')),
 pix_key text not null check(char_length(pix_key) between 5 and 120),
 beneficiary_name text not null check(char_length(beneficiary_name) between 2 and 25),
 beneficiary_city text not null check(char_length(beneficiary_city) between 2 and 15),
 instructions text check(instructions is null or char_length(instructions)<=500),
 active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- apenas uma linha de configuração
create unique index if not exists payment_settings_single_idx on public.payment_settings((true));

drop trigger if exists touch_payment_settings on public.payment_settings;
create trigger touch_payment_settings before update on public.payment_settings for each row execute function public.touch_updated_at();
drop trigger if exists audit_payment_settings on public.payment_settings;
create trigger audit_payment_settings after insert or update or delete on public.payment_settings for each row execute function public.audit_row_change();

alter table public.payment_settings enable row level security;
drop policy if exists admin_all_payment_settings on public.payment_settings;
create policy admin_all_payment_settings on public.payment_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Qualquer visitante pode LER a configuração ativa (é pública por natureza); só o admin escreve.
drop policy if exists payment_public_read on public.payment_settings;
create policy payment_public_read on public.payment_settings for select to anon, authenticated using (active);

-- 002 · Matrícula automática, nascimento e histórico de treino anterior. Execute uma vez no SQL Editor (pode repetir sem problema).

-- ===== 1) Histórico em outra academia (alunos e formulário público) =====
alter table public.students
  add column if not exists prior_training boolean not null default false,
  add column if not exists prior_time text,
  add column if not exists prior_belt text,
  add column if not exists prior_degrees smallint,
  add column if not exists prior_master text;
alter table public.students drop constraint if exists students_prior_degrees_chk;
alter table public.students add constraint students_prior_degrees_chk check(prior_degrees is null or prior_degrees between 0 and 4);

alter table public.public_interest
  add column if not exists birth_date date,
  add column if not exists prior_training boolean not null default false,
  add column if not exists prior_time text,
  add column if not exists prior_belt text,
  add column if not exists prior_degrees smallint,
  add column if not exists prior_master text;
alter table public.public_interest drop constraint if exists public_interest_extra_chk;
alter table public.public_interest add constraint public_interest_extra_chk check(
  (birth_date is null or birth_date >= date '1900-01-01')
  and (prior_degrees is null or prior_degrees between 0 and 4)
  and (prior_time is null or char_length(prior_time)<=80)
  and (prior_belt is null or char_length(prior_belt)<=40)
  and (prior_master is null or char_length(prior_master)<=120));

-- ===== 2) Matrícula automática (AAAA-NNNN), imutável =====
create sequence if not exists public.student_number_seq;

create or replace function public.set_student_number() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
  if new.student_number is null or btrim(new.student_number)='' then
   new.student_number := to_char(now(),'YYYY') || '-' || lpad(nextval('public.student_number_seq')::text,4,'0');
  end if;
 elsif old.student_number is not null and new.student_number is distinct from old.student_number then
  new.student_number := old.student_number;  -- a matrícula nunca muda
 end if;
 return new;
end $$;
drop trigger if exists set_student_number on public.students;
create trigger set_student_number before insert or update on public.students for each row execute function public.set_student_number();

-- preenche quem já existe sem matrícula
do $$ declare r record; begin
 for r in select id from public.students where student_number is null or btrim(student_number)='' order by created_at loop
  update public.students set student_number = to_char(now(),'YYYY') || '-' || lpad(nextval('public.student_number_seq')::text,4,'0') where id=r.id;
 end loop; end $$;

-- ===== 3) Carteirinha: número = matrícula do aluno (renovações mantêm o mesmo número) =====
alter table public.membership_cards drop constraint if exists membership_cards_card_number_key;
create or replace function public.set_card_number() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.card_number is null or btrim(new.card_number)='' then
  select student_number into new.card_number from public.students where id=new.student_id;
 end if;
 return new;
end $$;
drop trigger if exists set_card_number on public.membership_cards;
create trigger set_card_number before insert on public.membership_cards for each row execute function public.set_card_number();
-- no máximo uma carteirinha ativa por aluno
create unique index if not exists membership_cards_one_active_idx on public.membership_cards(student_id) where status='active';

-- ===== 4) Verificação pública mostra a matrícula =====
drop function if exists public.verify_membership_card(uuid);
create or replace function public.verify_membership_card(token uuid)
returns table(student_display_name text, student_number text, belt_name text, degrees int, card_status text)
language sql stable security definer set search_path=public
as $$
 select split_part(trim(s.full_name),' ',1) || case when position(' ' in trim(s.full_name))>0 then ' ' || left((regexp_split_to_array(trim(s.full_name),'\s+'))[array_length(regexp_split_to_array(trim(s.full_name),'\s+'),1)],1) || '.' else '' end,
   coalesce(s.student_number,'—'),
   gh.new_belt, gh.degrees, mc.status
 from public.membership_cards mc
 join public.students s on s.id=mc.student_id
 left join lateral (select new_belt,degrees from public.graduation_history where student_id=s.id order by graduation_date desc,created_at desc limit 1) gh on true
 where mc.qr_token=token and mc.status='active' and mc.expires_at>=current_date
 limit 1
$$;
revoke all on function public.verify_membership_card(uuid) from public;
grant execute on function public.verify_membership_card(uuid) to anon,authenticated;

-- 002: matrícula automática (= nº da carteirinha), data de nascimento no formulário público
--      e histórico de treino anterior (outra academia). Execute uma vez no SQL Editor.

-- 1) Matrícula automática: AAAA-0001, AAAA-0002... (imutável depois de criada)
create sequence if not exists public.student_number_seq;
create or replace function public.assign_student_number() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if tg_op='UPDATE' and old.student_number is not null then
  new.student_number := old.student_number;           -- não deixa trocar a matrícula
 elsif new.student_number is null or btrim(new.student_number)='' then
  new.student_number := to_char(current_date,'YYYY') || '-' || lpad(nextval('public.student_number_seq')::text,4,'0');
 end if;
 return new;
end $$;
revoke all on function public.assign_student_number() from public;
drop trigger if exists assign_student_number on public.students;
create trigger assign_student_number before insert or update on public.students for each row execute function public.assign_student_number();
-- alunos que já existiam sem matrícula
update public.students set student_number = to_char(coalesce(entry_date,current_date),'YYYY') || '-' || lpad(nextval('public.student_number_seq')::text,4,'0')
 where student_number is null or btrim(student_number)='';

-- 2) Nº da carteirinha = matrícula do aluno (preenchido sozinho). Renovações reutilizam o mesmo número.
alter table public.membership_cards drop constraint if exists membership_cards_card_number_key;
create or replace function public.assign_card_number() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.card_number is null or btrim(new.card_number)='' then
  select student_number into new.card_number from public.students where id=new.student_id;
 end if;
 return new;
end $$;
revoke all on function public.assign_card_number() from public;
drop trigger if exists assign_card_number on public.membership_cards;
create trigger assign_card_number before insert on public.membership_cards for each row execute function public.assign_card_number();

-- 3) Verificação pública mostra a matrícula completa (a mesma impressa na carteirinha); o QR continua com token aleatório
drop function if exists public.verify_membership_card(uuid);
create function public.verify_membership_card(token uuid)
returns table(student_display_name text, student_number text, belt_name text, degrees int, card_status text)
language sql stable security definer set search_path=public
as $$
 select split_part(trim(s.full_name),' ',1) || case when position(' ' in trim(s.full_name))>0 then ' ' || left((regexp_split_to_array(trim(s.full_name),'\s+'))[array_length(regexp_split_to_array(trim(s.full_name),'\s+'),1)],1) || '.' else '' end,
   coalesce(s.student_number,'—'),
   gh.new_belt, gh.degrees, mc.status
 from public.membership_cards mc
 join public.students s on s.id=mc.student_id
 left join lateral (select new_belt,degrees from public.graduation_history where student_id=s.id order by graduation_date desc,created_at desc limit 1) gh on true
 where mc.qr_token=token and mc.status='active' and mc.expires_at>=current_date
 limit 1
$$;
revoke all on function public.verify_membership_card(uuid) from public;
grant execute on function public.verify_membership_card(uuid) to anon,authenticated;

-- 4) Treino anterior (outra academia) no cadastro do aluno e no formulário público
alter table public.students
 add column if not exists came_from_other_academy boolean,
 add column if not exists previous_training_time text,
 add column if not exists previous_belt text,
 add column if not exists previous_degrees smallint check(previous_degrees is null or previous_degrees between 0 and 4),
 add column if not exists previous_master text;

alter table public.public_interest
 add column if not exists birth_date date check(birth_date is null or birth_date between date '1920-01-01' and date '2100-01-01'),
 add column if not exists came_from_other_academy boolean,
 add column if not exists previous_training_time text check(previous_training_time is null or char_length(previous_training_time)<=60),
 add column if not exists previous_belt text check(previous_belt is null or char_length(previous_belt)<=30),
 add column if not exists previous_degrees smallint check(previous_degrees is null or previous_degrees between 0 and 4),
 add column if not exists previous_master text check(previous_master is null or char_length(previous_master)<=120);

-- 003: Ficha de inscrição online (equivalente à ficha de papel). Execute uma vez no SQL Editor.
-- Dados sensíveis (menores, saúde, CPF/RG): qualquer visitante pode ENVIAR; só o administrador LÊ.
create table if not exists public.enrollments (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','reviewed','approved','rejected')),
 student_id uuid references public.students(id) on delete set null,
 -- cabeçalho
 start_date date, sport text, team text,
 -- aluno
 full_name text not null check(char_length(full_name) between 2 and 160),
 birth_date date not null check(birth_date between date '1920-01-01' and date '2100-01-01'),
 age smallint check(age is null or age between 0 and 120),
 rg text, cpf text,
 sex text check(sex is null or sex in ('M','F')),
 marital_status text, nationality text,
 race_color text check(race_color is null or race_color in ('Branca','Preta','Parda','Amarela','Indígena')),
 -- filiação
 father_name text, father_rg text, father_cpf text, father_birth_date date,
 mother_name text, mother_rg text, mother_cpf text, mother_birth_date date,
 -- endereço e contato
 address text, neighborhood text, city text, cep text, address_complement text,
 phone1 text not null check(char_length(phone1) between 8 and 30), phone2 text, email text,
 -- escolaridade
 school_level text check(school_level is null or school_level in ('Ensino Fundamental','Ensino Médio','Superior')),
 school_name text,
 school_shift text check(school_shift is null or school_shift in ('Manhã','Tarde','Noite')),
 may_leave_alone boolean,
 -- emergência
 emergency_name text, emergency_phone text, emergency_relationship text,
 -- saúde
 health_plan boolean, health_plan_name text, uses_sus boolean,
 has_health_problem boolean, health_problem_desc text,
 allergies text,
 takes_medication boolean, medication_desc text,
 has_disability boolean, disability_desc text,
 had_surgery boolean, surgery_desc text,
 blood_type text check(blood_type is null or blood_type in ('A+','A-','B+','B-','AB+','AB-','O+','O-','Não sei')),
 height_cm numeric(5,1) check(height_cm is null or height_cm between 30 and 260),
 weight_kg numeric(5,1) check(weight_kg is null or weight_kg between 3 and 400),
 -- termos e assinatura eletrônica
 accepted_terms boolean not null check(accepted_terms),
 ack_no_combat_outside boolean not null check(ack_no_combat_outside),
 commit_update_medical boolean not null check(commit_update_medical),
 image_consent boolean not null default false,
 terms_version text not null,
 signer_name text not null check(char_length(signer_name) between 2 and 160),
 signer_relationship text,
 signed_at timestamptz not null default now(),
 notes text
);
create index if not exists enrollments_status_idx on public.enrollments(status, created_at desc);

-- Proteção contra lixo/abuso no envio público: carimbo de hora do servidor e limite de tamanho
create or replace function public.enrollments_guard() returns trigger language plpgsql set search_path=public as $$
begin
 new.signed_at := now(); new.created_at := now();
 if octet_length(to_jsonb(new)::text) > 12000 then raise exception 'Ficha muito grande'; end if;
 return new;
end $$;
drop trigger if exists enrollments_guard on public.enrollments;
create trigger enrollments_guard before insert on public.enrollments for each row execute function public.enrollments_guard();

alter table public.enrollments enable row level security;
drop policy if exists admin_all_enrollments on public.enrollments;
create policy admin_all_enrollments on public.enrollments for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists enrollments_public_insert on public.enrollments;
create policy enrollments_public_insert on public.enrollments for insert to anon, authenticated
 with check (status='pending' and student_id is null and notes is null);

-- 004: Biblioteca de técnicas — passagem de guarda (conteúdo inicial para revisão do professor).
-- Execute uma vez no SQL Editor. Seguro rodar mais de uma vez (não duplica títulos).
alter table public.learning_contents add column if not exists sort_order int not null default 0;

-- Leitura pública SOMENTE de conteúdos publicados e apenas das colunas abaixo (sem dados internos).
drop policy if exists learning_public_read on public.learning_contents;
create policy learning_public_read on public.learning_contents for select to anon using (published);
revoke select on public.learning_contents from anon;
grant select (id,title,description,category,belt,difficulty,content_type,video_url,steps,common_errors,safety_notes,sort_order,published,created_at) on public.learning_contents to anon;

insert into public.learning_contents(title,description,category,belt,difficulty,content_type,steps,common_errors,safety_notes,published,sort_order)
select v.title,v.description,null,'Branca',v.difficulty,v.content_type,v.steps,v.errors,v.safety,true,v.sort_order from (values
($t$Postura na guarda fechada$t$,$t$Base de tudo na passagem de guarda: antes de tentar passar, aprenda a ficar bem posicionado e protegido dentro da guarda fechada do oponente.$t$,$t$Iniciante$t$,'Técnica',$t$Ajoelhe-se entre as pernas do oponente, com os joelhos abertos na largura dos ombros e o quadril baixo, sentado sobre os calcanhares.
Mantenha a coluna reta e a cabeça erguida, olhando para o oponente, com a cabeça acima do quadril dele.
Coloque as mãos no cinto ou na barriga do oponente, com os braços semiestendidos e os cotovelos próximos às suas costelas.
Mantenha o peso do corpo para baixo e levemente para a frente, sem se inclinar demais, para ele não conseguir quebrar a sua postura.
Se ele puxar a sua cabeça ou gola para baixo, estenda os braços, empurre o quadril para trás e volte à postura.
Respire normalmente e fique atento às mãos e pegadas do oponente antes de iniciar a abertura da guarda.$t$,$t$Curvar a coluna e deixar a cabeça ficar abaixo do quadril do oponente.
Apoiar as mãos no chão ao lado dele, perdendo o controle do quadril.
Colocar as mãos no pescoço ou no rosto do oponente.
Deixar os cotovelos abertos, facilitando que ele controle os seus braços.$t$,$t$Nunca empurre o pescoço ou o rosto do colega.
Se o colega bater (tap) ou avisar, solte imediatamente.
Em crianças, treine com calma e sem puxar a gola com força.$t$,10),
($t$Abrir a guarda fechada em pé$t$,$t$Como abrir as pernas do oponente que estão fechadas ao redor do seu corpo, levantando-se com segurança para iniciar a passagem.$t$,$t$Iniciante$t$,'Técnica',$t$Comece na postura na guarda fechada, ajoelhado, com as mãos no cinto do oponente e a coluna reta.
Levante um pé de cada vez, ficando em pé com os pés afastados na largura dos ombros e os joelhos levemente flexionados.
Mantenha a cabeça alta e o tronco ereto, sem se inclinar para a frente.
Pressione o quadril do oponente para baixo, com as mãos no cinto, e vá esticando as pernas devagar.
Quando as pernas dele afrouxarem ou se abrirem, firme os joelhos dele no chão com as mãos e dê um passo para trás.
Avance já com uma postura estável para uma das passagens (toreando, passagem longa ou joelho cortando).$t$,$t$Levantar com o tronco inclinado para a frente, ficando fácil de puxar para a guarda.
Tentar abrir a guarda com força bruta em vez de pressionar o quadril.
Soltar o quadril do oponente antes de ele afrouxar as pernas.
Ficar com os pés juntos, perdendo o equilíbrio.$t$,$t$Nunca force os joelhos do colega para os lados; peça para ele soltar e recomece.
Levante-se com controle, sem pular, para não escorregar no tatame.
Ao pressionar o quadril, não empurre as costelas nem a barriga com os cotovelos.$t$,20),
($t$Passagem toreando$t$,$t$Passagem em pé em que você controla as duas pernas do oponente, joga-as para um lado e circula rapidamente para o outro. Ótima para quem é rápido e ágil.$t$,$t$Iniciante$t$,'Técnica',$t$Fique em pé em postura estável diante do oponente que está deitado, com os joelhos levemente flexionados e fora do alcance dos pés dele.
Segure as duas pernas da calça do oponente na altura dos joelhos (ou nas barras da calça), firmando bem o tecido.
Empurre as pernas dele para um dos lados, mantendo os joelhos dele juntos e perto do chão.
Passe pelo lado oposto ao que você empurrou as pernas, caminhando em arco com passos curtos e rápidos.
Sem soltar as pernas, chegue ao lado do tronco dele, com o seu quadril perto do quadril dele.
Solte as pernas, apoie o peito sobre o dele e termine na estabilização do cem quilos.$t$,$t$Ficar muito perto e deixar o oponente colocar os pés no seu quadril.
Soltar uma das pernas durante o giro, abrindo espaço para a guarda recuperar.
Passar com passos longos e desequilibrados.
Olhar para baixo e perder a noção da posição da cabeça do oponente.$t$,$t$Não torça os joelhos do colega: empurre as pernas junto, na direção natural do movimento.
Passe com velocidade moderada no treino; velocidade máxima só com o professor autorizando.
Cuidado ao cair em cima do colega ao final: apoie o peito com controle, sem jogar o peso de uma vez.$t$,30),
($t$Passagem longa (long step)$t$,$t$Passagem em que você dá um passo longo para trás/ao redor da perna do oponente, saindo da frente dos pés dele e chegando ao lado do quadril.$t$,$t$Iniciante$t$,'Técnica',$t$Fique em pé em postura estável, com uma mão na calça do oponente (na altura do joelho) e a outra pronta para controlar o quadril.
Empurre o joelho do oponente em direção ao chão, tirando o pé dele da frente do seu quadril.
Dê um passo longo com a perna do mesmo lado, passando por fora da perna dele e chegando perto da linha do quadril dele.
Gire o quadril e abaixe o peso do corpo sobre o quadril do oponente, fechando o espaço.
Retire a outra perna e posicione os joelhos próximos ao tronco dele.
Finalize em estabilização lateral (cem quilos), com o peito sobre o peito dele.$t$,$t$Dar um passo curto e deixar a perna do oponente reentrar na sua frente.
Esquecer de pressionar o joelho dele para baixo antes do passo.
Ficar em pé, sem baixar o peso, depois de passar.
Deixar a cabeça longe do corpo dele, ficando fácil de ser puxado.$t$,$t$Passe com controle; um passo longo com escorregão pode causar queda sobre o colega.
Não pise nos pés ou nas mãos do colega.
Mantenha o equilíbrio e a cabeça alta durante todo o movimento.$t$,40),
($t$Passagem de joelho cortando (knee slice)$t$,$t$Passagem clássica para a meia-guarda: você prende o ombro do oponente, corta o joelho por cima das pernas dele e libera a perna presa.$t$,$t$Iniciante$t$,'Técnica',$t$Fique por cima na meia-guarda do oponente, com o quadril baixo e o peso do corpo sobre o peito dele.
Controle o ombro ou a gola do oponente com uma das mãos (crossface com antebraço junto ao ombro, sem pressionar o pescoço) e use a outra mão para controlar o quadril ou a calça dele.
Apoie o joelho da perna livre sobre a coxa de cima do oponente, com a canela atravessada.
Deslize esse joelho para o chão do outro lado, cortando as pernas dele, enquanto faz pressão com o ombro no peito dele.
Gire o pé da perna presa para fora, como um limpador de para-brisa, até liberá-la.
Finalize com o peito sobre o peito dele em estabilização lateral.$t$,$t$Ficar com o peso para trás e deixar o oponente recolocar a guarda.
Cortar o joelho sem controlar o ombro dele, permitindo que ele vire de lado.
Pressionar o rosto ou o pescoço em vez do ombro.
Deixar o quadril alto, perdendo pressão.$t$,$t$Faça a pressão de ombro devagar, sem empurrar o rosto ou o pescoço do colega.
Pare na hora se ele bater (tap).
Cuidado com o joelho da perna presa: não gire o corpo bruscamente enquanto o pé estiver preso.$t$,50),
($t$Passagem de pressão (por cima e por baixo)$t$,$t$Passagem em que você abraça as pernas do oponente (um braço por baixo e outro por cima) e circula usando o peso do ombro. Exige paciência e controle.$t$,$t$Intermediário$t$,'Técnica',$t$Segure as duas pernas do oponente e leve os joelhos dele para um dos lados, mantendo-os juntos.
Passe um braço por baixo das pernas (underhook) e o outro por cima, prendendo as duas pernas com os braços.
Apoie o ombro sobre as coxas do oponente e mantenha a cabeça baixa, do lado para onde vai passar.
Faça pressão com o peso do corpo e caminhe em círculo com passos curtos, aproximando-se do tronco dele.
Quando o quadril dele estiver livre, solte as pernas e abaixe o quadril no chão ao lado do tronco.
Finalize no cem quilos, com o peito sobre o peito dele.$t$,$t$Pressionar a cabeça contra o peito ou o pescoço do colega em vez das coxas.
Ficar em pé demais, sem pressionar com o ombro.
Circular com passos longos e perder a pressão.
Soltar os braços antes de ter o quadril livre.$t$,$t$Mantenha o peso nas coxas do colega; evite empilhar (jogar as pernas sobre a cabeça dele).
Em crianças e adolescentes, não faça pressão forte nem empilhe; treine com intensidade leve.
Se o colega reclamar de dor no pescoço ou nas costas, pare imediatamente.$t$,60),
($t$Estabilização no cem quilos$t$,$t$Posição de controle depois de passar a guarda. Antes de pensar em finalizar, aprenda a manter o oponente imobilizado com segurança.$t$,$t$Iniciante$t$,'Técnica',$t$Fique deitado de lado sobre o tronco do oponente, com o peito sobre o peito dele e o quadril baixo.
Com um braço, controle o ombro dele passando o antebraço junto ao ombro (crossface), sem pressionar o pescoço ou a garganta.
Com o outro braço, passe por baixo da axila e prenda o quadril ou o braço dele, impedindo que se vire.
Abra as pernas para trás, com os joelhos afastados, para ter uma base ampla e evitar que ele vire.
Pressione o peso do corpo sobre o peito dele, mantendo o quadril baixo e o corpo relaxado.
Quando ele tentar escapar, acompanhe o movimento e ajuste a pressão, sem sair da posição.$t$,$t$Ficar com o quadril alto, deixando espaço para ele entrar.
Apertar o pescoço ou o rosto do colega com o antebraço.
Juntar as pernas, perdendo a base.
Ficar sem controle do braço dele, permitindo que ele vire de lado.$t$,$t$Não pressione o pescoço, a garganta ou o rosto do colega.
Em crianças, use pressão leve e deixe o oponente respirar.
Se ele disser que não consegue respirar, alivie o peso na hora.$t$,70),
($t$Treino posicional de passagem de guarda$t$,$t$Exercício em dupla para treinar as passagens com segurança, aumentando a resistência aos poucos. Um passa, o outro defende a guarda.$t$,$t$Iniciante$t$,'Exercício',$t$Forme duplas de tamanho e peso parecidos. Um é o passador e o outro é o guardeiro.
Comece com a guarda do oponente aberta ou fechada, conforme o professor indicar.
Rodada 1 (resistência 30%): o guardeiro apenas se movimenta e não impede; o passador treina a técnica do dia.
Rodada 2 (resistência 60%): o guardeiro tenta recuperar a guarda; o passador procura passar com controle.
Rodada 3 (resistência 80%): treino mais realista, com o professor observando.
Troquem de papel a cada rodada e conversem sobre o que funcionou e o que errou.
Descanso de 30 segundos entre as rodadas, com água e respiração tranquila.$t$,$t$Ir com força total desde a primeira rodada.
Treinar sem conversar com o colega sobre a intensidade.
Insistir na mesma passagem sem ajustar quando ela não funciona.
Focar só em passar, esquecendo de manter o controle e a postura.$t$,$t$Combine o ritmo com o colega antes de começar.
Pare imediatamente quando houver o bate (tap) ou um aviso verbal.
O professor deve acompanhar sempre, principalmente com crianças e adolescentes.
Evite sparring com forte resistência para quem acabou de começar.$t$,80)
) as v(title,description,difficulty,content_type,steps,errors,safety,sort_order)
where not exists (select 1 from public.learning_contents c where c.title=v.title);

-- 005: foto do aluno (carteirinha digital). Execute uma vez no SQL Editor.
alter table public.students add column if not exists photo_path text check(photo_path is null or char_length(photo_path)<=200);

-- Bucket de fotos: leitura por URL (nomes aleatórios, sem listagem pública); só o administrador envia/remove.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('student-photos','student-photos',true,1048576,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists student_photos_admin_select on storage.objects;
create policy student_photos_admin_select on storage.objects for select to authenticated using (bucket_id='student-photos' and public.is_admin());
drop policy if exists student_photos_admin_insert on storage.objects;
create policy student_photos_admin_insert on storage.objects for insert to authenticated with check (bucket_id='student-photos' and public.is_admin());
drop policy if exists student_photos_admin_update on storage.objects;
create policy student_photos_admin_update on storage.objects for update to authenticated using (bucket_id='student-photos' and public.is_admin()) with check (bucket_id='student-photos' and public.is_admin());
drop policy if exists student_photos_admin_delete on storage.objects;
create policy student_photos_admin_delete on storage.objects for delete to authenticated using (bucket_id='student-photos' and public.is_admin());

-- Verificação pública / carteirinha digital: agora devolve validade e foto (só para carteirinha ativa e não vencida)
drop function if exists public.verify_membership_card(uuid);
create function public.verify_membership_card(token uuid)
returns table(student_display_name text, student_number text, belt_name text, degrees int, card_status text, expires_at date, photo_path text)
language sql stable security definer set search_path=public
as $$
 select split_part(trim(s.full_name),' ',1) || case when position(' ' in trim(s.full_name))>0 then ' ' || left((regexp_split_to_array(trim(s.full_name),'\s+'))[array_length(regexp_split_to_array(trim(s.full_name),'\s+'),1)],1) || '.' else '' end,
   coalesce(s.student_number,'—'),
   gh.new_belt, gh.degrees, mc.status, mc.expires_at, s.photo_path
 from public.membership_cards mc
 join public.students s on s.id=mc.student_id
 left join lateral (select new_belt,degrees from public.graduation_history where student_id=s.id order by graduation_date desc,created_at desc limit 1) gh on true
 where mc.qr_token=token and mc.status='active' and mc.expires_at>=current_date
 limit 1
$$;
revoke all on function public.verify_membership_card(uuid) from public;
grant execute on function public.verify_membership_card(uuid) to anon,authenticated;

-- 006: foto do aluno enviada junto com a ficha de inscrição online.
-- A foto vai dentro da própria ficha (JPEG pequeno em base64); ao "Virar aluno" o administrador a copia
-- para o cadastro e a carteirinha. Visitantes só enviam; ninguém além do administrador lê.
alter table public.enrollments add column if not exists photo_data text
 check (photo_data is null or (photo_data like 'data:image/jpeg;base64,%' and char_length(photo_data) <= 250000));

create or replace function public.enrollments_guard() returns trigger language plpgsql set search_path=public as $$
begin
 new.signed_at := now(); new.created_at := now();
 if octet_length((to_jsonb(new) - 'photo_data')::text) > 12000 then raise exception 'Ficha muito grande'; end if;
 return new;
end $$;
