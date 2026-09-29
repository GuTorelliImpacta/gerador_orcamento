-- Seed para desenvolvimento local (`supabase db reset`).
-- Cria uma oficina de exemplo com 10 peças, 5 serviços e 3 modelos de veículo.
-- Como a oficina precisa de um usuário dono, vinculamos ao primeiro usuário existente (se houver);
-- em produção, use o botão "Carregar exemplos" em Configurações (função load_demo_data()).
do $$
declare w uuid; u uuid;
begin
  select id into u from auth.users order by created_at limit 1;
  if u is null then
    raise notice 'Nenhum usuário em auth.users: crie um usuário (login) e rode este seed de novo.';
    return;
  end if;
  insert into public.workshops (nome, nome_fantasia, cnpj, telefone, email, cep, rua, numero, bairro, cidade, uf, responsavel_tecnico, onboarding_concluido)
  values ('Auto Center Exemplo', 'Auto Center Exemplo', '11222333000181', '1133334444', 'contato@autocenter.com.br',
          '01310100', 'Avenida Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', 'João Pereira', true)
  returning id into w;
  insert into public.workshop_members (user_id, workshop_id) values (u, w) on conflict (user_id) do nothing;
  insert into public.workshop_settings (workshop_id, valor_hora_mao_de_obra, valor_hora_reparacao, valor_hora_pintura)
  values (w, 9000, 11000, 13000);
  insert into public.pdf_templates (workshop_id, nome, is_default) values (w, 'Padrão', true);

  -- reaproveita a mesma função do app para popular catálogo e modelos
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.load_demo_data();
  reset role;
end $$;
