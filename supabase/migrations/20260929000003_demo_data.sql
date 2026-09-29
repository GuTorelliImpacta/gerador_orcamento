-- Carrega dados de exemplo (10 peças, 5 serviços, 3 modelos) na oficina do usuário logado.
-- Idempotente: pode ser chamada mais de uma vez.
create or replace function public.load_demo_data()
returns void language plpgsql security invoker set search_path = public as $$
declare w uuid := public.current_workshop_id();
begin
  if w is null then raise exception 'Oficina não encontrada'; end if;

  insert into public.catalog_items (workshop_id, tipo, codigo, descricao, preco_padrao)
  select w, 'peca', v.codigo, v.descricao, v.preco from (values
    ('PA-1020', 'Pastilha de freio dianteira', 18990),
    ('DI-2201', 'Disco de freio dianteiro (par)', 32900),
    ('FO-0331', 'Filtro de óleo', 3590),
    ('FA-0412', 'Filtro de ar', 4590),
    ('FC-0518', 'Filtro de combustível', 5990),
    ('VE-7710', 'Vela de ignição (jogo)', 15900),
    ('CO-3305', 'Correia dentada (kit)', 42900),
    ('AM-5502', 'Amortecedor dianteiro', 31900),
    ('BA-6001', 'Bateria 60Ah', 54900),
    ('OL-5W30', 'Óleo 5W30 sintético (litro)', 4900)
  ) as v(codigo, descricao, preco)
  on conflict (workshop_id, tipo, descricao) do nothing;

  insert into public.catalog_items (workshop_id, tipo, descricao, preco_padrao, horas_padrao, categoria_mao_de_obra)
  select w, 'servico', v.descricao, v.preco, v.horas, v.cat from (values
    ('Troca de óleo e filtro', 0, 0.5::numeric, 'mecanica'),
    ('Substituição de pastilhas de freio', 0, 1.0::numeric, 'mecanica'),
    ('Alinhamento e balanceamento', 12000, null::numeric, 'servicos'),
    ('Diagnóstico eletrônico (scanner)', 15000, null::numeric, 'eletrica'),
    ('Pintura de para-choque', 0, 3.0::numeric, 'pintura')
  ) as v(descricao, preco, horas, cat)
  on conflict (workshop_id, tipo, descricao) do nothing;

  insert into public.vehicle_models (workshop_id, marca, modelo, versao, ano_inicio, ano_fim)
  select w, v.marca, v.modelo, v.versao, v.ini, v.fim from (values
    ('Volkswagen', 'Gol', '1.6 MSI', 2016, 2022),
    ('Fiat', 'Uno', 'Way 1.0', 2012, 2021),
    ('Chevrolet', 'Onix', '1.0 LT', 2013, 2023)
  ) as v(marca, modelo, versao, ini, fim)
  where not exists (
    select 1 from public.vehicle_models m
     where m.workshop_id = w and m.marca = v.marca and m.modelo = v.modelo and m.versao = v.versao);
end $$;
revoke all on function public.load_demo_data() from public, anon;
grant execute on function public.load_demo_data() to authenticated;
