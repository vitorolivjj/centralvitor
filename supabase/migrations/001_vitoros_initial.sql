-- VitorOS PROJ-002 — schema inicial (A0)
-- Rodar no SQL Editor do Supabase ou via psql

-- Extensões
create extension if not exists "pgcrypto";

-- Perfil (1 usuário — Vitor)
create table if not exists public.perfil (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  created_at timestamptz not null default now()
);

-- Projetos / frentes
create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  descricao text,
  status text not null default 'Ideia',
  prioridade text default 'media',
  objetivo text,
  proximo_movimento text,
  frente text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  projeto_id uuid references public.projetos(id) on delete set null,
  titulo text not null,
  status text not null default 'Backlog',
  prioridade text default 'media',
  responsavel text,
  prazo date,
  observacoes text,
  link text,
  origem text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rabiscos
create table if not exists public.rabiscos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  texto text,
  status text not null default 'Solto',
  projeto_id uuid references public.projetos(id) on delete set null,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

-- Contrato Negão → cockpit
create table if not exists public.sugestoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,
  payload jsonb not null default '{}',
  status text not null default 'proposta',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.perfil enable row level security;
alter table public.projetos enable row level security;
alter table public.tasks enable row level security;
alter table public.rabiscos enable row level security;
alter table public.sugestoes enable row level security;

create policy "perfil_own" on public.perfil for all using (auth.uid() = id);
create policy "projetos_own" on public.projetos for all using (auth.uid() = user_id);
create policy "tasks_own" on public.tasks for all using (auth.uid() = user_id);
create policy "rabiscos_own" on public.rabiscos for all using (auth.uid() = user_id);
create policy "sugestoes_own" on public.sugestoes for all using (auth.uid() = user_id);

-- Snapshot estado vivo (stub A0 — expande em A1+)
create or replace function public.snapshot_estado()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    return '{"error":"not_authenticated"}'::jsonb;
  end if;
  select jsonb_build_object(
    'generated_at', now(),
    'projetos_ativos', (select count(*) from projetos where user_id = uid and status = 'Ativo'),
    'tasks_abertas', (select count(*) from tasks where user_id = uid and status not in ('Concluído', 'Arquivado')),
    'tasks_criticas', (select count(*) from tasks where user_id = uid and prioridade in ('alta', 'critica', 'crítica')),
    'rabiscos_soltos', (select count(*) from rabiscos where user_id = uid and status = 'Solto'),
    'sugestoes_pendentes', (select count(*) from sugestoes where user_id = uid and status = 'proposta')
  ) into result;
  return result;
end;
$$;

grant execute on function public.snapshot_estado() to authenticated;
