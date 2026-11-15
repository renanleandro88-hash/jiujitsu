-- 011: Ficha de emergência na carteirinha (treino de luta: socorro rápido).
-- Aparece: (a) para professor/administrador LOGADO com acesso ao aluno; (b) para quem informar a data de nascimento do aluno.
alter table public.students add column if not exists blood_type text check(blood_type is null or blood_type in ('A+','A-','B+','B-','AB+','AB-','O+','O-','Não sei'));

drop function if exists public.card_private_data(uuid,date);
create function public.card_private_data(p_token uuid, p_birth date default null)
returns table(address text, rg text, sus_number text, blood_type text, allergies text, health_notes text, contacts jsonb, staff_access boolean)
language plpgsql security definer set search_path=public as $$
declare sid uuid; sbirth date; fails int; staff boolean := false;
begin
 select s.id, s.birth_date into sid, sbirth from public.membership_cards mc join public.students s on s.id=mc.student_id
  where mc.qr_token=p_token and mc.status='active' and mc.expires_at>=current_date limit 1;
 if sid is null then return; end if;
 if auth.uid() is not null and (public.is_admin() or public.can_access_student(sid)) then staff := true; end if;
 if not staff then
  if p_birth is null then return; end if;
  delete from public.card_unlock_attempts where created_at < now() - interval '1 day';
  select count(*) into fails from public.card_unlock_attempts where token=p_token and not ok and created_at > now() - interval '15 minutes';
  if fails >= 5 then raise exception 'too_many_attempts'; end if;
  if sbirth is null or sbirth is distinct from p_birth then
   insert into public.card_unlock_attempts(token,ok) values(p_token,false);
   return;
  end if;
  insert into public.card_unlock_attempts(token,ok) values(p_token,true);
 end if;
 return query select s.address, s.rg, s.sus_number, s.blood_type,
  (select nullif(trim(concat_ws(' · ', case when h.has_allergies then coalesce(nullif(h.allergy_type,''),'Sim') end, nullif(h.known_reaction,''))),'') from public.student_health_private h where h.student_id=sid),
  (select nullif(h.emergency_guidance,'') from public.student_health_private h where h.student_id=sid),
  coalesce((select jsonb_agg(x) from (
     select jsonb_build_object('name',e.full_name,'relationship',e.relationship,'phone',e.phone) as x from public.emergency_contacts e where e.student_id=sid
     union all
     select jsonb_build_object('name',g.full_name,'relationship',coalesce(g.relationship,'Responsável'),'phone',g.phone) from public.student_guardians sg join public.guardians g on g.id=sg.guardian_id where sg.student_id=sid) t),'[]'::jsonb),
  staff
 from public.students s where s.id=sid;
end $$;
revoke all on function public.card_private_data(uuid,date) from public;
grant execute on function public.card_private_data(uuid,date) to anon,authenticated;
