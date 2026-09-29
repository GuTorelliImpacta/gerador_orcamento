-- Testa RPCs e a página pública. Roda numa transação e desfaz (rollback). Retorna 'OK' ou lança exceção.
begin;
insert into auth.users (id, email, instance_id, aud, role)
values ('00000000-0000-0000-0000-0000000000c1', 'c@teste.com', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

do $$
declare w uuid; q1 uuid; q2 uuid; c uuid; tok uuid; n int; r text; pub jsonb;
begin
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
  set local role authenticated;
  w := public.create_workshop('Oficina Teste');

  perform public.load_demo_data(); perform public.load_demo_data();  -- idempotente
  select count(*) into n from public.catalog_items where tipo='peca';    if n <> 10 then raise exception 'pecas=%', n; end if;
  select count(*) into n from public.catalog_items where tipo='servico'; if n <> 5  then raise exception 'servicos=%', n; end if;
  select count(*) into n from public.vehicle_models;                     if n <> 3  then raise exception 'modelos=%', n; end if;

  insert into public.customers(workshop_id, nome) values (w, 'Maria') returning id into c;
  insert into public.quotes(workshop_id, customer_id, placa, snapshot, status)
    values (w, c, 'ABC1D23', '{"customer":{"nome":"Maria","cpf_cnpj":"123"}}', 'rascunho') returning id, public_token into q1, tok;
  insert into public.quote_items(quote_id, operacao, tipo, descricao) values (q1, 'troca', 'peca', 'Pastilha');
  insert into public.quotes(workshop_id) values (w) returning id into q2;
  select numero into n from public.quotes where id = q2; if n <> 2 then raise exception 'numeracao=%', n; end if;

  perform public.learn_catalog_item('peca', null, 'Peça nova', 5000, null, null);
  perform public.learn_catalog_item('peca', null, 'Peça nova', 5000, null, null);
  select vezes_usado into n from public.catalog_items where descricao='Peça nova'; if n <> 2 then raise exception 'vezes_usado=%', n; end if;

  perform public.delete_customer(c);  -- LGPD
  select snapshot->'customer'->>'nome' into r from public.quotes where id = q1;
  if r <> 'Cliente removido' then raise exception 'lgpd=%', r; end if;
  if (select snapshot->'customer'->>'cpf_cnpj' from public.quotes where id=q1) is not null then raise exception 'cpf vazou'; end if;
  reset role;

  set local role anon;
  if public.get_public_quote(tok) is not null then raise exception 'rascunho vazou'; end if;
  reset role;
  update public.quotes set status='enviado' where id=q1;
  set local role anon;
  pub := public.get_public_quote(tok);
  if pub is null or jsonb_array_length(pub->'items') <> 1 then raise exception 'publico=%', pub; end if;
  if pub->'quote' ? 'workshop_id' or (pub->'workshop') ? 'id' then raise exception 'vaza ids internos'; end if;
  reset role;
end $$;
rollback;
select 'OK' as resultado;
