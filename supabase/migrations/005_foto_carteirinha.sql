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
