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
