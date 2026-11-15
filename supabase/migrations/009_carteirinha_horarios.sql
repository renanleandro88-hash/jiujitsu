-- 009: carteirinha digital mostra, por atividade, os professores responsáveis e os horários das turmas do aluno.
drop function if exists public.verify_membership_card(uuid);
create function public.verify_membership_card(token uuid)
returns table(student_display_name text, student_number text, card_status text, expires_at date, photo_path text, activities jsonb)
language sql stable security definer set search_path=public
as $$
 select split_part(trim(s.full_name),' ',1) || case when position(' ' in trim(s.full_name))>0 then ' ' || left((regexp_split_to_array(trim(s.full_name),'\s+'))[array_length(regexp_split_to_array(trim(s.full_name),'\s+'),1)],1) || '.' else '' end,
   coalesce(s.student_number,'—'), mc.status, mc.expires_at, s.photo_path,
   coalesce((
    select jsonb_agg(jsonb_build_object(
      'name',a.name,
      'graduation',(select g.new_belt || case when g.degrees>0 then ' · ' || g.degrees || 'º grau' else '' end
         from public.graduation_history g where g.student_id=s.id and g.activity_id=a.id order by g.graduation_date desc, g.created_at desc limit 1),
      'belt',(select g.new_belt from public.graduation_history g where g.student_id=s.id and g.activity_id=a.id order by g.graduation_date desc, g.created_at desc limit 1),
      'degrees',(select coalesce(g.degrees,0) from public.graduation_history g where g.student_id=s.id and g.activity_id=a.id order by g.graduation_date desc, g.created_at desc limit 1),
      'teachers',coalesce((select jsonb_agg(distinct nm) from (
          select p.full_name as nm from public.teacher_activities ta join public.profiles p on p.id=ta.profile_id where ta.activity_id=a.id and p.active and p.role in ('teacher','assistant') and p.full_name<>''
          union select c.teacher_name from public.classes c where c.activity_id=a.id and c.active and c.teacher_name is not null and c.teacher_name<>'') t),'[]'::jsonb),
      'schedule',coalesce((select jsonb_agg(jsonb_build_object('weekday',c.weekday,'start',to_char(c.start_time,'HH24:MI'),'end',to_char(c.end_time,'HH24:MI'),'name',c.name) order by c.weekday,c.start_time)
          from public.classes c where c.activity_id=a.id and c.active
           and (c.category is null or s.category is null or c.category ilike '%'||s.category||'%')),'[]'::jsonb)
     ) order by a.sort_order)
    from public.student_activities sa join public.activities a on a.id=sa.activity_id
    where sa.student_id=s.id and sa.status='active'),'[]'::jsonb)
 from public.membership_cards mc
 join public.students s on s.id=mc.student_id
 where mc.qr_token=token and mc.status='active' and mc.expires_at>=current_date
 limit 1
$$;
revoke all on function public.verify_membership_card(uuid) from public;
grant execute on function public.verify_membership_card(uuid) to anon,authenticated;
