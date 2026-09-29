-- Desempenho: avalia auth.uid()/current_workshop_id() uma vez por consulta (initplan) e indexa FKs.
drop policy if exists members_select on public.workshop_members;
create policy members_select on public.workshop_members for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists workshops_select on public.workshops;
drop policy if exists workshops_update on public.workshops;
create policy workshops_select on public.workshops for select to authenticated
  using (id = (select public.current_workshop_id()));
create policy workshops_update on public.workshops for update to authenticated
  using (id = (select public.current_workshop_id())) with check (id = (select public.current_workshop_id()));

do $$
declare t text;
begin
  foreach t in array array['workshop_settings','pdf_templates','vehicle_models',
                           'customers','vehicles','catalog_items','quotes'] loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (workshop_id = (select public.current_workshop_id()))
         with check (workshop_id = (select public.current_workshop_id()))',
      t || '_tenant', t);
  end loop;
end $$;

drop policy if exists quote_items_tenant on public.quote_items;
create policy quote_items_tenant on public.quote_items for all to authenticated
  using (exists (select 1 from public.quotes q
                  where q.id = quote_id and q.workshop_id = (select public.current_workshop_id())))
  with check (exists (select 1 from public.quotes q
                       where q.id = quote_id and q.workshop_id = (select public.current_workshop_id())));

drop policy if exists logos_insert on storage.objects;
drop policy if exists logos_update on storage.objects;
drop policy if exists logos_delete on storage.objects;
create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select public.current_workshop_id())::text);
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select public.current_workshop_id())::text);
create policy logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select public.current_workshop_id())::text);

create index if not exists quotes_customer_id_idx on public.quotes (customer_id);
create index if not exists quotes_vehicle_id_idx on public.quotes (vehicle_id);
create index if not exists quotes_template_id_idx on public.quotes (template_id);
create index if not exists vehicles_vehicle_model_id_idx on public.vehicles (vehicle_model_id);
