-- 010: RG e Nº do SUS do aluno + dados pessoais protegidos na carteirinha digital.
-- Endereço, RG e SUS NÃO aparecem na verificação pública: só depois de informar a data de nascimento do aluno.
alter table public.enrollments add column if not exists sus_number text check(sus_number is null or sus_number ~ '^[0-9 .-]{0,25}$');
alter table public.students add column if not exists rg text check(rg is null or char_length(rg)<=30);
alter table public.students add column if not exists sus_number text check(sus_number is null or sus_number ~ '^[0-9 .-]{0,25}$');

create table if not exists public.card_unlock_attempts (
 id bigint generated always as identity primary key,
 token uuid not null, ok boolean not null, created_at timestamptz not null default now()
);
create index if not exists card_unlock_attempts_idx on public.card_unlock_attempts(token,created_at);
alter table public.card_unlock_attempts enable row level security;   -- sem policies: só a função (security definer) mexe

create or replace function public.card_private_data(p_token uuid, p_birth date)
returns table(address text, rg text, sus_number text)
language plpgsql security definer set search_path=public as $$
declare sid uuid; sbirth date; fails int;
begin
 delete from public.card_unlock_attempts where created_at < now() - interval '1 day';
 select count(*) into fails from public.card_unlock_attempts where token=p_token and not ok and created_at > now() - interval '15 minutes';
 if fails >= 5 then raise exception 'too_many_attempts'; end if;
 select s.id, s.birth_date into sid, sbirth from public.membership_cards mc join public.students s on s.id=mc.student_id
  where mc.qr_token=p_token and mc.status='active' and mc.expires_at>=current_date limit 1;
 if sid is null or sbirth is null or sbirth is distinct from p_birth then
  insert into public.card_unlock_attempts(token,ok) values(p_token,false);
  return;
 end if;
 insert into public.card_unlock_attempts(token,ok) values(p_token,true);
 return query select s.address, s.rg, s.sus_number from public.students s where s.id=sid;
end $$;
revoke all on function public.card_private_data(uuid,date) from public;
grant execute on function public.card_private_data(uuid,date) to anon,authenticated;
