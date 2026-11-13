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
