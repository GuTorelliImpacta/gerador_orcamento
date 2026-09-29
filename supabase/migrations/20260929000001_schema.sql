-- Orçamento Rápido para Oficinas — schema base (multi-tenant, valores em centavos)

create extension if not exists pgcrypto;

-- ============ Tabelas ============
create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nome_fantasia text,
  cnpj text,
  telefone text,
  whatsapp text,
  email text,
  cep text, rua text, numero text, bairro text, cidade text, uf char(2),
  logo_url text,
  responsavel_tecnico text,
  onboarding_concluido boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.workshop_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.workshop_members(workshop_id);

create table public.workshop_settings (
  workshop_id uuid primary key references public.workshops(id) on delete cascade,
  valor_hora_mao_de_obra integer not null default 0 check (valor_hora_mao_de_obra >= 0),
  valor_hora_reparacao integer not null default 0 check (valor_hora_reparacao >= 0),
  valor_hora_pintura integer not null default 0 check (valor_hora_pintura >= 0),
  desconto_padrao_pct numeric(5,2) not null default 0 check (desconto_padrao_pct between 0 and 100),
  validade_padrao_dias integer not null default 10 check (validade_padrao_dias > 0),
  garantia_padrao_dias integer not null default 90 check (garantia_padrao_dias >= 0),
  texto_condicoes text not null default '',
  texto_observacoes_padrao text not null default '',
  formas_pagamento text not null default 'Dinheiro, PIX, cartão de débito e crédito',
  prefixo_numeracao text not null default '',
  proximo_numero integer not null default 1 check (proximo_numero > 0)
);

create table public.pdf_templates (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  nome text not null default 'Padrão',
  cor_primaria text not null default '#1d4ed8',
  cor_secundaria text not null default '#0f172a',
  fonte text not null default 'helvetica' check (fonte in ('helvetica','times','courier')),
  layout text not null default 'classico' check (layout in ('classico','moderno','compacto')),
  mostrar_fipe boolean not null default true,
  mostrar_chassi boolean not null default true,
  mostrar_codigo_peca boolean not null default true,
  mostrar_assinatura boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.pdf_templates(workshop_id);
create unique index pdf_templates_one_default on public.pdf_templates(workshop_id) where is_default;

create table public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  marca text not null,
  modelo text not null,
  versao text,
  ano_inicio integer,
  ano_fim integer,
  codigo_fipe text,
  created_at timestamptz not null default now()
);
create index on public.vehicle_models(workshop_id, marca, modelo);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  nome text not null,
  cpf_cnpj text,
  telefone text,
  email text,
  created_at timestamptz not null default now()
);
create index on public.customers(workshop_id, nome);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_model_id uuid references public.vehicle_models(id) on delete set null,
  placa text not null,
  cor text,
  chassi text,
  ano integer,
  km integer,
  created_at timestamptz not null default now(),
  unique (workshop_id, placa)
);
create index on public.vehicles(customer_id);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  tipo text not null check (tipo in ('peca','servico')),
  codigo text,
  descricao text not null,
  preco_padrao integer not null default 0 check (preco_padrao >= 0),
  horas_padrao numeric(6,2) check (horas_padrao is null or horas_padrao >= 0),
  categoria_mao_de_obra text check (categoria_mao_de_obra in
    ('funilaria','mecanica','eletrica','pintura','tapecaria','vidracaria','reparacao','servicos')),
  vezes_usado integer not null default 0,
  created_at timestamptz not null default now(),
  unique (workshop_id, tipo, descricao)
);
create index on public.catalog_items(workshop_id, tipo, vezes_usado desc);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  numero integer not null,
  public_token uuid not null default gen_random_uuid() unique,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  template_id uuid references public.pdf_templates(id) on delete set null,
  status text not null default 'rascunho'
    check (status in ('rascunho','enviado','aprovado','recusado','expirado')),
  km_entrada integer,
  combustivel text,
  valor_fipe integer,
  -- parâmetros congelados
  valor_hora_mao_de_obra integer not null default 0,
  valor_hora_reparacao integer not null default 0,
  valor_hora_pintura integer not null default 0,
  desconto_geral_pct numeric(5,2) not null default 0 check (desconto_geral_pct between 0 and 100),
  garantia_dias integer not null default 90,
  formas_pagamento text,
  observacoes text,
  validade_ate date,
  -- snapshot de cliente/veículo para PDF imutável
  snapshot jsonb not null default '{}'::jsonb,
  -- totais calculados (centavos)
  total_pecas_cents integer not null default 0,
  total_mao_de_obra_cents integer not null default 0,
  subtotal_cents integer not null default 0,
  desconto_geral_cents integer not null default 0,
  total_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  approved_at timestamptz,
  unique (workshop_id, numero)
);
create index on public.quotes(workshop_id, created_at desc);
create index on public.quotes(workshop_id, status);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  ordem integer not null default 0,
  operacao text not null check (operacao in ('troca','ri','reparacao','pintura','servico')),
  categoria_mao_de_obra text check (categoria_mao_de_obra in
    ('funilaria','mecanica','eletrica','pintura','tapecaria','vidracaria','reparacao','servicos')),
  tipo text not null default 'peca' check (tipo in ('peca','servico')),
  codigo text,
  descricao text not null,
  quantidade numeric(8,2) not null default 1 check (quantidade > 0),
  fornecimento text not null default 'oficina' check (fornecimento in ('oficina','cliente')),
  preco_unitario integer not null default 0 check (preco_unitario >= 0),
  horas numeric(6,2) check (horas is null or horas >= 0),
  desconto_pct numeric(5,2) not null default 0 check (desconto_pct between 0 and 100),
  preco_liquido integer not null default 0
);
create index on public.quote_items(quote_id, ordem);

-- ============ Funções ============
create or replace function public.current_workshop_id()
returns uuid language sql stable security definer set search_path = public as $$
  select workshop_id from public.workshop_members where user_id = auth.uid()
$$;
revoke all on function public.current_workshop_id() from public, anon;
grant execute on function public.current_workshop_id() to authenticated;

-- numeração sequencial atômica por oficina
create or replace function public.assign_quote_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.workshop_settings
     set proximo_numero = proximo_numero + 1
   where workshop_id = new.workshop_id
   returning proximo_numero - 1 into n;
  if n is null then
    raise exception 'Configurações da oficina não encontradas';
  end if;
  new.numero := n;
  return new;
end $$;
create trigger quotes_assign_number before insert on public.quotes
  for each row execute function public.assign_quote_number();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger quotes_touch before update on public.quotes
  for each row execute function public.touch_updated_at();

-- cria oficina + vínculo + configurações + template padrão numa transação
create or replace function public.create_workshop(p_nome text)
returns uuid language plpgsql security definer set search_path = public as $$
declare w uuid;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if exists (select 1 from public.workshop_members where user_id = auth.uid()) then
    return (select workshop_id from public.workshop_members where user_id = auth.uid());
  end if;
  insert into public.workshops(nome, email)
    values (p_nome, (select email from auth.users where id = auth.uid()))
    returning id into w;
  insert into public.workshop_members(user_id, workshop_id) values (auth.uid(), w);
  insert into public.workshop_settings(workshop_id) values (w);
  insert into public.pdf_templates(workshop_id, nome, is_default) values (w, 'Padrão', true);
  return w;
end $$;
revoke all on function public.create_workshop(text) from public, anon;
grant execute on function public.create_workshop(text) to authenticated;

-- incrementa uso do catálogo (aprende com itens digitados)
create or replace function public.learn_catalog_item(
  p_tipo text, p_codigo text, p_descricao text, p_preco integer,
  p_horas numeric, p_categoria text)
returns void language plpgsql security invoker set search_path = public as $$
begin
  insert into public.catalog_items(workshop_id, tipo, codigo, descricao, preco_padrao,
                                   horas_padrao, categoria_mao_de_obra, vezes_usado)
  values (public.current_workshop_id(), p_tipo, nullif(p_codigo,''), p_descricao, p_preco,
          p_horas, p_categoria, 1)
  on conflict (workshop_id, tipo, descricao)
  do update set vezes_usado = public.catalog_items.vezes_usado + 1;
end $$;
grant execute on function public.learn_catalog_item(text,text,text,integer,numeric,text) to authenticated;

-- página pública do orçamento (somente leitura, por token)
create or replace function public.get_public_quote(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'quote', to_jsonb(q) - 'workshop_id',
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.ordem)
                        from public.quote_items i where i.quote_id = q.id), '[]'::jsonb),
    'workshop', to_jsonb(w) - 'id',
    'template', (select to_jsonb(t) - 'workshop_id' from public.pdf_templates t
                  where t.id = q.template_id)
  )
  from public.quotes q join public.workshops w on w.id = q.workshop_id
  where q.public_token = p_token and q.status <> 'rascunho'
$$;
grant execute on function public.get_public_quote(uuid) to anon, authenticated;

-- ============ RLS ============
alter table public.workshops enable row level security;
alter table public.workshop_members enable row level security;
alter table public.workshop_settings enable row level security;
alter table public.pdf_templates enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.catalog_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

create policy workshops_select on public.workshops for select to authenticated
  using (id = public.current_workshop_id());
create policy workshops_update on public.workshops for update to authenticated
  using (id = public.current_workshop_id()) with check (id = public.current_workshop_id());

create policy members_select on public.workshop_members for select to authenticated
  using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['workshop_settings','pdf_templates','vehicle_models',
                           'customers','vehicles','catalog_items','quotes'] loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (workshop_id = public.current_workshop_id())
         with check (workshop_id = public.current_workshop_id())',
      t || '_tenant', t);
  end loop;
end $$;

create policy quote_items_tenant on public.quote_items for all to authenticated
  using (exists (select 1 from public.quotes q
                  where q.id = quote_id and q.workshop_id = public.current_workshop_id()))
  with check (exists (select 1 from public.quotes q
                       where q.id = quote_id and q.workshop_id = public.current_workshop_id()));

-- ============ Storage: logos ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 512000, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = public.current_workshop_id()::text);
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.current_workshop_id()::text);
create policy logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = public.current_workshop_id()::text);
