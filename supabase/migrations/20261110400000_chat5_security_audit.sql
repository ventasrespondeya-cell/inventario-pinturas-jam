-- PINTURAS JAM / Etapa 8: administración de accesos y auditoría inmutable.
-- Ejecutar primero en staging con respaldo. No crea usuarios Auth ni cambia datos históricos.
create table if not exists public.jam_system_audit (
  id bigint generated always as identity primary key, business_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null, entity_table text not null,
  entity_id text not null, action text not null check (action in ('INSERT','UPDATE','DELETE')),
  reason text, before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);
create index if not exists jam_system_audit_business_date_idx on public.jam_system_audit(business_id, created_at desc);
create index if not exists jam_system_audit_entity_idx on public.jam_system_audit(business_id, entity_table, entity_id, created_at desc);
alter table public.jam_system_audit enable row level security;
drop policy if exists jam_system_audit_admin_read on public.jam_system_audit;
create policy jam_system_audit_admin_read on public.jam_system_audit for select to authenticated using (
 business_id = (select a.business_id from public.jam_user_access a where a.user_id=auth.uid() and a.active and a.role in ('owner','admin') limit 1)
);
revoke all on public.jam_system_audit from anon, authenticated;
grant select on public.jam_system_audit to authenticated;

create or replace function public.jam_system_audit_capture() returns trigger
language plpgsql security definer set search_path=public,auth as $$
declare v_old jsonb; v_new jsonb; v_data jsonb; v_business uuid; v_entity text;
begin
 if tg_op <> 'INSERT' then v_old:=to_jsonb(old); end if;
 if tg_op <> 'DELETE' then v_new:=to_jsonb(new); end if;
 v_data:=coalesce(v_new,v_old);
 v_business:=nullif(v_data->>'business_id','')::uuid;
 if v_business is null then if tg_op='DELETE' then return old; else return new; end if; end if;
 v_entity:=coalesce(v_data->>'id',v_data->>'user_id',v_data->>'product_id',v_data->>'session_id',v_data->>'source_id','unknown');
 insert into public.jam_system_audit(business_id,actor_id,entity_table,entity_id,action,reason,before_data,after_data)
 values(v_business,auth.uid(),tg_table_name,v_entity,tg_op,nullif(current_setting('app.audit_reason',true),''),v_old,v_new);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function public.jam_system_audit_capture() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['jam_user_access','jam_categories','jam_products','jam_warehouses','jam_exchange_rates','jam_stock_balances','jam_inventory_movements','jam_suppliers','jam_customers','jam_purchases','jam_purchase_lines','jam_purchase_receipts','jam_purchase_receipt_lines','jam_supplier_payables','jam_supplier_payments','jam_quotes','jam_quote_lines','jam_sales','jam_sale_lines','jam_sale_payments','jam_receivables','jam_customer_payments','jam_cash_events','jam_payment_methods','jam_fiscal_profiles','jam_commercial_documents','jam_cash_sessions','jam_cash_movements'] loop
  if to_regclass('public.'||t) is not null then
   execute format('drop trigger if exists %I on public.%I',t||'_system_audit',t);
   execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.jam_system_audit_capture()',t||'_system_audit',t);
  end if;
 end loop;
end $$;

create or replace function public.jam_admin_require() returns uuid
language plpgsql stable security definer set search_path=public,auth as $$
declare b uuid; begin
 if auth.uid() is null then raise exception 'Sesión requerida' using errcode='42501'; end if;
 select business_id into b from public.jam_user_access where user_id=auth.uid() and active and role in ('owner','admin') limit 1;
 if b is null then raise exception 'Se requiere rol de administración' using errcode='42501'; end if;
 return b;
end $$;
create or replace function public.jam_admin_users_list() returns jsonb
language plpgsql stable security definer set search_path=public,auth as $$
declare b uuid; begin b:=public.jam_admin_require();
 return coalesce((select jsonb_agg(jsonb_build_object('userId',a.user_id,'email',u.email,'role',a.role,'active',a.active,'createdAt',a.created_at) order by a.created_at)
 from public.jam_user_access a left join auth.users u on u.id=a.user_id where a.business_id=b),'[]'::jsonb);
end $$;
-- Sólo asigna usuarios existentes en Supabase Auth. Nunca crea contraseñas ni asigna el rol owner.
create or replace function public.jam_admin_user_access_set(p_user_id uuid,p_role text,p_active boolean default true) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare b uuid; actor_role text; target_role text; result_row public.jam_user_access;
begin
 b:=public.jam_admin_require();
 select role into actor_role from public.jam_user_access where user_id=auth.uid() and business_id=b and active;
 if p_user_id is null or p_role not in ('admin','inventory','sales','viewer') or p_active is null then raise exception 'Datos de acceso inválidos'; end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'El usuario debe existir primero en Supabase Auth'; end if;
 select role into target_role from public.jam_user_access where user_id=p_user_id and business_id=b;
 if target_role='owner' then raise exception 'La cuenta propietaria no puede modificarse desde esta pantalla'; end if;
 if actor_role='admin' and (p_role='admin' or target_role='admin') then raise exception 'Sólo el propietario puede administrar cuentas de administrador' using errcode='42501'; end if;
 if p_user_id=auth.uid() and not p_active then raise exception 'No puedes desactivar tu propia cuenta'; end if;
 if exists(select 1 from public.jam_user_access where user_id=p_user_id and business_id<>b) then raise exception 'El usuario ya está asignado a otro negocio'; end if;
 insert into public.jam_user_access(user_id,business_id,role,active) values(p_user_id,b,p_role,p_active)
 on conflict(user_id) do update set role=excluded.role,active=excluded.active where jam_user_access.business_id=b returning * into result_row;
 if not found then raise exception 'No se pudo actualizar el acceso'; end if;
 return jsonb_build_object('userId',result_row.user_id,'role',result_row.role,'active',result_row.active,'businessId',result_row.business_id);
end $$;
create or replace function public.jam_admin_audit_list(p_limit integer default 100,p_before timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path=public,auth as $$
declare b uuid; begin b:=public.jam_admin_require();
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
  select id,actor_id,entity_table,entity_id,action,reason,before_data,after_data,created_at from public.jam_system_audit
  where business_id=b and (p_before is null or created_at<p_before) order by created_at desc limit greatest(1,least(coalesce(p_limit,100),500))
 ) x),'[]'::jsonb);
end $$;
revoke all on function public.jam_admin_require() from public,anon;
revoke all on function public.jam_admin_users_list() from public,anon;
revoke all on function public.jam_admin_user_access_set(uuid,text,boolean) from public,anon;
revoke all on function public.jam_admin_audit_list(integer,timestamptz) from public,anon;
grant execute on function public.jam_admin_users_list(),public.jam_admin_user_access_set(uuid,text,boolean),public.jam_admin_audit_list(integer,timestamptz) to authenticated;

-- El fondo inicial ya está en opening_amount: no se registra otra vez como ingreso.
create or replace function public.jam_cash_session_open(p_amount numeric,p_currency text,p_notes text default null) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare b uuid; s public.jam_cash_sessions; begin
 b:=public.jam_cash_require_role(true);
 if p_amount is null or p_amount<0 or p_currency not in ('VES','USD') then raise exception 'Monto o moneda inválidos'; end if;
 insert into public.jam_cash_sessions(business_id,opened_by,opening_amount,currency,notes) values(b,auth.uid(),p_amount,p_currency,nullif(trim(p_notes),'')) returning * into s;
 return to_jsonb(s);
end $$;
-- Consumo idempotente: importe en su moneda original; cambio y pago a proveedor son egresos.
create or replace function public.jam_cash_events_consume(p_session uuid,p_limit integer default 100) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare b uuid; s public.jam_cash_sessions; e public.jam_cash_events; n integer:=0; typ text;
begin
 b:=public.jam_cash_require_role(true);
 select * into s from public.jam_cash_sessions where id=p_session and business_id=b and status='open' for update;
 if not found then raise exception 'Abra una caja antes de sincronizar eventos'; end if;
 for e in select * from public.jam_cash_events where business_id=b and consumed_at is null and currency=s.currency order by created_at for update skip locked limit greatest(1,least(coalesce(p_limit,100),500)) loop
  typ:=case when e.event_type in ('supplier_payment','sale_change') then 'expense' else 'income' end;
  insert into public.jam_cash_movements(business_id,session_id,movement_type,amount,currency,description,reference,source_type,source_id,idempotency_key,actor_id)
  values(b,s.id,typ,e.amount,e.currency,e.event_type,e.source_id::text,e.source_type,e.source_id,'event:'||e.id,auth.uid()) on conflict(business_id,idempotency_key) do nothing;
  update public.jam_cash_events set consumed_at=now(),consumer_reference='cash:'||s.id where id=e.id and business_id=b and consumed_at is null;
  n:=n+1;
 end loop;
 return jsonb_build_object('consumed',n,'sessionId',s.id,'currency',s.currency);
end $$;
revoke all on function public.jam_cash_session_open(numeric,text,text) from public,anon;
revoke all on function public.jam_cash_events_consume(uuid,integer) from public,anon;
grant execute on function public.jam_cash_session_open(numeric,text,text),public.jam_cash_events_consume(uuid,integer) to authenticated;

-- Caja: limitar lectura y consultas a propietario, administración y ventas/cajeros.
drop policy if exists jam_cash_sessions_read on public.jam_cash_sessions;
create policy jam_cash_sessions_read on public.jam_cash_sessions for select to authenticated using (
 business_id = (select a.business_id from public.jam_user_access a where a.user_id=auth.uid() and a.active and a.role in ('owner','admin','sales') limit 1)
);
drop policy if exists jam_cash_movements_read on public.jam_cash_movements;
create policy jam_cash_movements_read on public.jam_cash_movements for select to authenticated using (
 business_id = (select a.business_id from public.jam_user_access a where a.user_id=auth.uid() and a.active and a.role in ('owner','admin','sales') limit 1)
);
create or replace function public.jam_cash_require_role(p_write boolean default false) returns uuid
language plpgsql stable security definer set search_path=public,auth as $$
declare b uuid; r text;
begin
 if auth.uid() is null then raise exception 'Sesión requerida' using errcode='42501'; end if;
 select business_id,role into b,r from public.jam_user_access where user_id=auth.uid() and active limit 1;
 if b is null or r not in ('owner','admin','sales') then raise exception 'Permiso de caja requerido' using errcode='42501'; end if;
 return b;
end $$;
revoke all on function public.jam_cash_require_role(boolean) from public,anon;

-- La bitácora comercial también contiene información de cambios internos: sólo administración.
drop policy if exists jam_commercial_audit_read_business on public.jam_commercial_audit;
drop policy if exists jam_commercial_audit_read on public.jam_commercial_audit;
create policy jam_commercial_audit_admin_read on public.jam_commercial_audit for select to authenticated using (
 business_id = (select a.business_id from public.jam_user_access a where a.user_id=auth.uid() and a.active and a.role in ('owner','admin') limit 1)
);
