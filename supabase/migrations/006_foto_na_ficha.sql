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
