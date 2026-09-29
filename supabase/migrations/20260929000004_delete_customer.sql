-- LGPD: excluir cliente também apaga os dados pessoais copiados nos orçamentos já emitidos.
create or replace function public.delete_customer(p_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.quotes
     set snapshot = jsonb_set(snapshot, '{customer}', '{"nome":"Cliente removido"}'::jsonb)
   where customer_id = p_id;
  delete from public.customers where id = p_id;
end $$;
revoke all on function public.delete_customer(uuid) from public, anon;
grant execute on function public.delete_customer(uuid) to authenticated;
