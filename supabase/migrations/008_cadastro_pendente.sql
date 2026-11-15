-- 008: Quem se cadastra em /login ("Criar conta") entra como PENDENTE (sem acesso) até o administrador liberar.
alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,full_name,role,active,email)
 values(new.id, coalesce(left(new.raw_user_meta_data->>'full_name',120),''), 'student', false, new.email)
 on conflict (id) do update set email=excluded.email;
 return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- preenche o e-mail de quem já existe
update public.profiles p set email=u.email from auth.users u where u.id=p.id and p.email is null;
