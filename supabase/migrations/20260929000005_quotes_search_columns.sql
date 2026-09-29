-- Colunas desnormalizadas para busca rápida por placa ou nome do cliente na lista de orçamentos.
alter table public.quotes add column if not exists placa text, add column if not exists cliente_nome text;
create index if not exists quotes_placa_idx on public.quotes (workshop_id, placa);
update public.quotes set placa = snapshot->'vehicle'->>'placa', cliente_nome = snapshot->'customer'->>'nome' where placa is null;
