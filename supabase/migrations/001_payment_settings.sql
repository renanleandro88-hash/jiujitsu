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
