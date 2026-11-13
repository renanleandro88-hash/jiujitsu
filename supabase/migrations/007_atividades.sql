-- 007: ATIVIDADES (modalidades). Cada professor acessa só a(s) atividade(s) dele.
-- Jiu-Jitsu, Capoeira, Boxe, Muay Thai e Treinamento Físico. Aluno pode estar em 1 ou 2 atividades.
-- Execute uma vez no SQL Editor (pode repetir sem problema).

-- ===== 1) Tabelas =====
create table if not exists public.activities (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check(char_length(name) between 2 and 60),
 active boolean not null default true,
 sort_order int not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.teacher_activities (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.profiles(id) on delete cascade,
 activity_id uuid not null references public.activities(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(profile_id,activity_id)
);
create table if not exists public.student_activities (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 activity_id uuid not null references public.activities(id) on delete cascade,
 status text not null default 'active' check(status in ('active','inactive')),
 start_date date default current_date,
 created_at timestamptz not null default now(),
 unique(student_id,activity_id)
);
create index if not exists student_activities_activity_idx on public.student_activities(activity_id,status);
create index if not exists teacher_activities_profile_idx on public.teacher_activities(profile_id);

insert into public.activities(name,sort_order) values
 ('Jiu-Jitsu',10),('Capoeira',20),('Boxe',30),('Muay Thai',40),('Treinamento Físico',50)
on conflict (name) do nothing;

-- ===== 2) Ligar o que já existe à atividade (tudo que existia é Jiu-Jitsu) =====
alter table public.classes add column if not exists activity_id uuid references public.activities(id);
alter table public.graduation_history add column if not exists activity_id uuid references public.activities(id);
alter table public.student_assessments add column if not exists activity_id uuid references public.activities(id);
alter table public.learning_contents add column if not exists activity_id uuid references public.activities(id);
alter table public.enrollments add column if not exists activity_ids uuid[] check(activity_ids is null or cardinality(activity_ids) between 1 and 2);
alter table public.public_interest add column if not exists activity_ids uuid[] check(activity_ids is null or cardinality(activity_ids) between 1 and 2);

do $$ declare bjj uuid; begin
 select id into bjj from public.activities where name='Jiu-Jitsu';
 update public.classes set activity_id=bjj where activity_id is null;
 update public.graduation_history set activity_id=bjj where activity_id is null;
 update public.student_assessments set activity_id=bjj where activity_id is null;
 update public.learning_contents set activity_id=bjj where activity_id is null;
 insert into public.student_activities(student_id,activity_id) select s.id,bjj from public.students s on conflict do nothing;
end $$;
alter table public.classes alter column activity_id set not null;
alter table public.graduation_history alter column activity_id set not null;
alter table public.student_assessments alter column activity_id set not null;
create index if not exists classes_activity_idx on public.classes(activity_id);

-- ===== 3) Funções de acesso (professor só enxerga a própria atividade) =====
create or replace function public.can_access_activity(aid uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select aid is not null and exists(
  select 1 from public.teacher_activities ta join public.profiles p on p.id=ta.profile_id
  where ta.profile_id=auth.uid() and ta.activity_id=aid and p.active and p.role in ('teacher','assistant'))
$$;
create or replace function public.can_access_student(sid uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(
  select 1 from public.student_activities sa
  join public.teacher_activities ta on ta.activity_id=sa.activity_id
  join public.profiles p on p.id=ta.profile_id
  where sa.student_id=sid and ta.profile_id=auth.uid() and p.active and p.role in ('teacher','assistant'))
$$;
create or replace function public.student_in_activity(sid uuid, aid uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.student_activities where student_id=sid and activity_id=aid and status='active')
$$;
create or replace function public.can_access_class(cid uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.classes c where c.id=cid and public.can_access_activity(c.activity_id))
$$;
create or replace function public.can_write_attendance(sid uuid, cid uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.classes c join public.student_activities sa on sa.activity_id=c.activity_id and sa.student_id=sid and sa.status='active'
  where c.id=cid and public.can_access_activity(c.activity_id))
$$;
create or replace function public.can_access_guardian(gid uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.student_guardians sg where sg.guardian_id=gid and public.can_access_student(sg.student_id))
$$;
revoke all on function public.can_access_activity(uuid), public.can_access_student(uuid), public.student_in_activity(uuid,uuid),
 public.can_access_class(uuid), public.can_write_attendance(uuid,uuid), public.can_access_guardian(uuid) from public, anon;
grant execute on function public.can_access_activity(uuid), public.can_access_student(uuid), public.student_in_activity(uuid,uuid),
 public.can_access_class(uuid), public.can_write_attendance(uuid,uuid), public.can_access_guardian(uuid) to authenticated;

-- ===== 4) RLS das tabelas novas =====
alter table public.activities enable row level security;
alter table public.teacher_activities enable row level security;
alter table public.student_activities enable row level security;
drop policy if exists admin_all_activities on public.activities;
create policy admin_all_activities on public.activities for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists activities_public_read on public.activities;
create policy activities_public_read on public.activities for select to anon, authenticated using (active);   -- a lista de atividades é pública (formulário)
drop policy if exists admin_all_teacher_activities on public.teacher_activities;
create policy admin_all_teacher_activities on public.teacher_activities for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists teacher_activities_own on public.teacher_activities;
create policy teacher_activities_own on public.teacher_activities for select to authenticated using (profile_id=auth.uid());
drop policy if exists admin_all_student_activities on public.student_activities;
create policy admin_all_student_activities on public.student_activities for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists staff_scope_read_student_activities on public.student_activities;
drop policy if exists staff_scope_read_student_activities on public.student_activities; create policy staff_scope_read_student_activities on public.student_activities for select to authenticated using (public.can_access_activity(activity_id));

-- ===== 5) Troca das policies "equipe vê tudo" por policies por atividade =====
do $$ declare t text; begin foreach t in array array['students','guardians','student_guardians','emergency_contacts','classes','attendance','graduation_history','membership_cards','membership_card_requests','learning_contents','content_assignments','content_progress','student_assessments'] loop
 execute format('drop policy if exists staff_read_%I on public.%I',t,t);
 execute format('drop policy if exists staff_write_%I on public.%I',t,t);
 execute format('drop policy if exists staff_update_%I on public.%I',t,t);
end loop; end $$;

-- alunos: equipe lê e edita só os da sua atividade; criar aluno é do administrador
drop policy if exists staff_scope_read_students on public.students; create policy staff_scope_read_students on public.students for select to authenticated using (public.can_access_student(id));
drop policy if exists staff_scope_update_students on public.students; create policy staff_scope_update_students on public.students for update to authenticated using (public.can_access_student(id)) with check (public.can_access_student(id));
-- responsáveis, vínculos, emergência: leitura por aluno da atividade
drop policy if exists staff_scope_read_guardians on public.guardians; create policy staff_scope_read_guardians on public.guardians for select to authenticated using (public.can_access_guardian(id));
drop policy if exists staff_scope_read_student_guardians on public.student_guardians; create policy staff_scope_read_student_guardians on public.student_guardians for select to authenticated using (public.can_access_student(student_id));
drop policy if exists staff_scope_read_emergency_contacts on public.emergency_contacts; create policy staff_scope_read_emergency_contacts on public.emergency_contacts for select to authenticated using (public.can_access_student(student_id));
-- saúde, consentimentos e ficha completa (decisão do instituto: professor da atividade vê)
drop policy if exists staff_scope_read_student_health_private on public.student_health_private;
drop policy if exists staff_scope_read_student_health_private on public.student_health_private; create policy staff_scope_read_student_health_private on public.student_health_private for select to authenticated using (public.can_access_student(student_id));
drop policy if exists staff_scope_read_student_consents on public.student_consents;
drop policy if exists staff_scope_read_student_consents on public.student_consents; create policy staff_scope_read_student_consents on public.student_consents for select to authenticated using (public.can_access_student(student_id));
drop policy if exists staff_scope_read_enrollments on public.enrollments;
drop policy if exists staff_scope_read_enrollments on public.enrollments; create policy staff_scope_read_enrollments on public.enrollments for select to authenticated using (student_id is not null and public.can_access_student(student_id));
-- turmas
drop policy if exists staff_scope_read_classes on public.classes; create policy staff_scope_read_classes on public.classes for select to authenticated using (public.can_access_activity(activity_id));
drop policy if exists staff_scope_insert_classes on public.classes; create policy staff_scope_insert_classes on public.classes for insert to authenticated with check (public.can_access_activity(activity_id));
drop policy if exists staff_scope_update_classes on public.classes; create policy staff_scope_update_classes on public.classes for update to authenticated using (public.can_access_activity(activity_id)) with check (public.can_access_activity(activity_id));
-- frequência (o aluno precisa estar na atividade da turma)
drop policy if exists staff_scope_read_attendance on public.attendance; create policy staff_scope_read_attendance on public.attendance for select to authenticated using (public.can_access_class(class_id));
drop policy if exists staff_scope_insert_attendance on public.attendance; create policy staff_scope_insert_attendance on public.attendance for insert to authenticated with check (public.can_write_attendance(student_id,class_id));
drop policy if exists staff_scope_update_attendance on public.attendance; create policy staff_scope_update_attendance on public.attendance for update to authenticated using (public.can_access_class(class_id)) with check (public.can_write_attendance(student_id,class_id));
-- graduações e avaliações
drop policy if exists staff_scope_read_graduation_history on public.graduation_history; create policy staff_scope_read_graduation_history on public.graduation_history for select to authenticated using (public.can_access_activity(activity_id));
drop policy if exists staff_scope_insert_graduation_history on public.graduation_history; create policy staff_scope_insert_graduation_history on public.graduation_history for insert to authenticated with check (public.can_access_activity(activity_id) and public.student_in_activity(student_id,activity_id));
drop policy if exists staff_scope_update_graduation_history on public.graduation_history; create policy staff_scope_update_graduation_history on public.graduation_history for update to authenticated using (public.can_access_activity(activity_id)) with check (public.can_access_activity(activity_id) and public.student_in_activity(student_id,activity_id));
drop policy if exists staff_scope_read_student_assessments on public.student_assessments; create policy staff_scope_read_student_assessments on public.student_assessments for select to authenticated using (public.can_access_activity(activity_id));
drop policy if exists staff_scope_insert_student_assessments on public.student_assessments; create policy staff_scope_insert_student_assessments on public.student_assessments for insert to authenticated with check (public.can_access_activity(activity_id) and public.student_in_activity(student_id,activity_id));
drop policy if exists staff_scope_update_student_assessments on public.student_assessments; create policy staff_scope_update_student_assessments on public.student_assessments for update to authenticated using (public.can_access_activity(activity_id)) with check (public.can_access_activity(activity_id) and public.student_in_activity(student_id,activity_id));
-- biblioteca (conteúdo sem atividade = geral: toda a equipe lê)
drop policy if exists staff_scope_read_learning_contents on public.learning_contents; create policy staff_scope_read_learning_contents on public.learning_contents for select to authenticated using ((activity_id is null and public.is_staff()) or public.can_access_activity(activity_id));
drop policy if exists staff_scope_insert_learning_contents on public.learning_contents; create policy staff_scope_insert_learning_contents on public.learning_contents for insert to authenticated with check (public.can_access_activity(activity_id));
drop policy if exists staff_scope_update_learning_contents on public.learning_contents; create policy staff_scope_update_learning_contents on public.learning_contents for update to authenticated using (public.can_access_activity(activity_id)) with check (public.can_access_activity(activity_id));
-- tarefas/progresso e carteirinhas: por aluno
drop policy if exists staff_scope_read_content_assignments on public.content_assignments; create policy staff_scope_read_content_assignments on public.content_assignments for select to authenticated using (public.can_access_student(student_id));
drop policy if exists staff_scope_insert_content_assignments on public.content_assignments; create policy staff_scope_insert_content_assignments on public.content_assignments for insert to authenticated with check (public.can_access_student(student_id));
drop policy if exists staff_scope_read_content_progress on public.content_progress; create policy staff_scope_read_content_progress on public.content_progress for select to authenticated using (public.can_access_student(student_id));
drop policy if exists staff_scope_read_membership_cards on public.membership_cards; create policy staff_scope_read_membership_cards on public.membership_cards for select to authenticated using (public.can_access_student(student_id));
drop policy if exists staff_scope_read_membership_card_requests on public.membership_card_requests; create policy staff_scope_read_membership_card_requests on public.membership_card_requests for select to authenticated using (public.can_access_student(student_id));
drop policy if exists staff_scope_insert_membership_card_requests on public.membership_card_requests; create policy staff_scope_insert_membership_card_requests on public.membership_card_requests for insert to authenticated with check (public.can_access_student(student_id) and status='pending');

-- ===== 6) Biblioteca pública agora também informa a atividade =====
grant select (activity_id) on public.learning_contents to anon;

-- ===== 7) Auditoria das novas tabelas =====
do $$ declare t text; begin foreach t in array array['activities','teacher_activities','student_activities'] loop
 execute format('drop trigger if exists audit_%I on public.%I',t,t);
 execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row_change()',t,t);
end loop; end $$;

-- ===== 8) Carteirinha digital lista as atividades (e a graduação de cada uma) =====
drop function if exists public.verify_membership_card(uuid);
create function public.verify_membership_card(token uuid)
returns table(student_display_name text, student_number text, card_status text, expires_at date, photo_path text, activities jsonb)
language sql stable security definer set search_path=public
as $$
 select split_part(trim(s.full_name),' ',1) || case when position(' ' in trim(s.full_name))>0 then ' ' || left((regexp_split_to_array(trim(s.full_name),'\s+'))[array_length(regexp_split_to_array(trim(s.full_name),'\s+'),1)],1) || '.' else '' end,
   coalesce(s.student_number,'—'), mc.status, mc.expires_at, s.photo_path,
   coalesce((
    select jsonb_agg(jsonb_build_object('name',a.name,'graduation',
      (select g.new_belt || case when g.degrees>0 then ' · ' || g.degrees || 'º grau' else '' end
         from public.graduation_history g where g.student_id=s.id and g.activity_id=a.id order by g.graduation_date desc, g.created_at desc limit 1)) order by a.sort_order)
    from public.student_activities sa join public.activities a on a.id=sa.activity_id
    where sa.student_id=s.id and sa.status='active'),'[]'::jsonb)
 from public.membership_cards mc
 join public.students s on s.id=mc.student_id
 where mc.qr_token=token and mc.status='active' and mc.expires_at>=current_date
 limit 1
$$;
revoke all on function public.verify_membership_card(uuid) from public;
grant execute on function public.verify_membership_card(uuid) to anon,authenticated;
