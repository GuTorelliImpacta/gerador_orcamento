-- Teste de isolamento entre oficinas (RLS). Roda numa transação e desfaz tudo (rollback).
-- Uso: executar no SQL editor / via MCP. Retorna 'OK' ou lança exceção.
begin;

insert into auth.users (id, email, instance_id, aud, role)
values ('00000000-0000-0000-0000-00000000000a', 'a@teste.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
       ('00000000-0000-0000-0000-00000000000b', 'b@teste.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

do $$
declare wa uuid; wb uuid; n int; qa uuid;
begin
  -- Usuário A cria oficina, cliente e orçamento
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
  set local role authenticated;
  wa := public.create_workshop('Oficina A');
  insert into public.customers(workshop_id, nome) values (wa, 'Cliente da A');
  insert into public.quotes(workshop_id) values (wa) returning id into qa;
  insert into public.quote_items(quote_id, operacao, descricao) values (qa, 'troca', 'Pastilha');
  reset role;

  -- Usuário B cria a própria oficina
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  set local role authenticated;
  wb := public.create_workshop('Oficina B');

  select count(*) into n from public.customers;      if n <> 0 then raise exception 'FALHA: B viu clientes da A (%)', n; end if;
  select count(*) into n from public.quotes;         if n <> 0 then raise exception 'FALHA: B viu orçamentos da A (%)', n; end if;
  select count(*) into n from public.quote_items;    if n <> 0 then raise exception 'FALHA: B viu itens da A (%)', n; end if;
  select count(*) into n from public.workshops;      if n <> 1 then raise exception 'FALHA: B viu % oficinas', n; end if;

  begin
    insert into public.customers(workshop_id, nome) values (wa, 'Invasor');
    raise exception 'FALHA: B inseriu cliente na oficina A';
  exception when insufficient_privilege or check_violation then null; end;

  begin
    insert into public.quote_items(quote_id, operacao, descricao) values (qa, 'troca', 'Invasor');
    raise exception 'FALHA: B inseriu item em orçamento da A';
  exception when insufficient_privilege or check_violation then null; end;

  update public.quotes set status = 'aprovado' where id = qa;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHA: B alterou orçamento da A'; end if;

  reset role;
  -- Numeração sequencial independente por oficina
  if (select numero from public.quotes where id = qa) <> 1 then raise exception 'FALHA: numeração'; end if;

  -- Anônimo não enxerga nada
  set local role anon;
  select count(*) into n from public.quotes;
  if n <> 0 then raise exception 'FALHA: anon viu orçamentos'; end if;
  reset role;
end $$;

rollback;
select 'OK' as resultado;
