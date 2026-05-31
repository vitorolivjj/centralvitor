-- TASK-012 — snapshot_estado expandido (KPIs derivados)

create or replace function public.snapshot_estado()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
  atencao jsonb := '[]'::jsonb;
  n_criticas int;
  n_exec int;
  n_revisao int;
  n_rabiscos int;
begin
  if uid is null then
    return '{"error":"not_authenticated"}'::jsonb;
  end if;

  select count(*) into n_criticas from tasks
    where user_id = uid and prioridade in ('alta', 'critica', 'crítica')
      and status not in ('Concluído', 'Arquivado');
  select count(*) into n_exec from tasks
    where user_id = uid and status = 'Executando';
  select count(*) into n_revisao from tasks
    where user_id = uid and status = 'Revisão';
  select count(*) into n_rabiscos from rabiscos
    where user_id = uid and status = 'Solto';

  if n_criticas > 0 then
    atencao := atencao || jsonb_build_array(jsonb_build_object(
      'nivel', 'warn',
      'texto', n_criticas || ' task(s) alta prioridade abertas'
    ));
  end if;
  if n_revisao > 0 then
    atencao := atencao || jsonb_build_array(jsonb_build_object(
      'nivel', 'info',
      'texto', n_revisao || ' task(s) aguardando revisão'
    ));
  end if;
  if n_rabiscos > 5 then
    atencao := atencao || jsonb_build_array(jsonb_build_object(
      'nivel', 'info',
      'texto', n_rabiscos || ' rabiscos soltos — hora de triar'
    ));
  end if;
  if n_exec = 0 and (select count(*) from tasks where user_id = uid and status not in ('Concluído', 'Arquivado')) > 0 then
    atencao := atencao || jsonb_build_array(jsonb_build_object(
      'nivel', 'info',
      'texto', 'Nenhuma task em Executando — mover kanban?'
    ));
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'projetos_ativos', (select count(*) from projetos where user_id = uid and status = 'Ativo'),
    'projetos_total', (select count(*) from projetos where user_id = uid),
    'tasks_abertas', (select count(*) from tasks where user_id = uid and status not in ('Concluído', 'Arquivado')),
    'tasks_executando', n_exec,
    'tasks_revisao', n_revisao,
    'tasks_criticas', n_criticas,
    'rabiscos_soltos', n_rabiscos,
    'sugestoes_pendentes', (select count(*) from sugestoes where user_id = uid and status = 'proposta'),
    'por_coluna', (
      select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
      from (
        select status, count(*)::int as cnt
        from tasks where user_id = uid
        group by status
      ) s
    ),
    'atencao', atencao
  ) into result;
  return result;
end;
$$;

grant execute on function public.snapshot_estado() to authenticated;
