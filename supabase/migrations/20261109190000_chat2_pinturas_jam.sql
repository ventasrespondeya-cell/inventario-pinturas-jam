-- Pinturas JAM / Chat 2: catálogo e inventario.
-- Aplicar primero en una base de desarrollo. No contiene existencias iniciales ni costos inventados.
create extension if not exists pgcrypto;

create table if not exists public.jam_user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null,
  role text not null check (role in ('owner','admin','inventory','sales','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.jam_categories (
  id uuid primary key default gen_random_uuid(), business_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 80),
  active boolean not null default true, created_at timestamptz not null default now(),
  unique (business_id, name), unique (business_id, id)
);

create table if not exists public.jam_products (
  id uuid primary key default gen_random_uuid(), business_id uuid not null,
  sku text, name text not null check (length(trim(name)) between 1 and 160),
  brand text, category_id uuid, presentation text,
  unit text not null default 'unidad', color text,
  active boolean not null default true,
  sale_price numeric(18,6) check (sale_price is null or sale_price >= 0),
  bcv_price numeric(18,6) check (bcv_price is null or bcv_price >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, category_id) references public.jam_categories(business_id,id)
);
create unique index if not exists jam_products_sku_uq on public.jam_products(business_id, lower(sku)) where sku is not null;
create index if not exists jam_products_name_idx on public.jam_products(business_id, lower(name));

create table if not exists public.jam_warehouses (
  id uuid primary key default gen_random_uuid(), business_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 80),
  active boolean not null default true, created_at timestamptz not null default now(),
  unique (business_id, id), unique (business_id, name)
);

-- La tasa se registra como VES por 1 USD. La fuente BCV debe cargarse con evidencia.
create table if not exists public.jam_exchange_rates (
  id uuid primary key default gen_random_uuid(), business_id uuid not null,
  base_currency text not null check (base_currency = 'USD'),
  quote_currency text not null check (quote_currency = 'VES'),
  rate numeric(18,8) not null check (rate > 0),
  source text not null check (upper(source) like '%BCV%'),
  effective_at date not null, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  unique (business_id, id), unique (business_id, effective_at)
);

create table if not exists public.jam_stock_balances (
  business_id uuid not null, product_id uuid not null, warehouse_id uuid not null,
  quantity numeric(18,6) not null default 0 check (quantity >= 0),
  average_cost_ves numeric(18,6) not null default 0 check (average_cost_ves >= 0),
  minimum_stock numeric(18,6) not null default 0 check (minimum_stock >= 0),
  updated_at timestamptz not null default now(),
  primary key (business_id, product_id, warehouse_id),
  foreign key (business_id, product_id) references public.jam_products(business_id,id),
  foreign key (business_id, warehouse_id) references public.jam_warehouses(business_id,id)
);

create table if not exists public.jam_inventory_movements (
  id uuid primary key default gen_random_uuid(), business_id uuid not null,
  product_id uuid not null, warehouse_id uuid not null,
  movement_type text not null check (movement_type in ('entry','exit','adjustment','reversal')),
  quantity_delta numeric(18,6) not null check (quantity_delta <> 0),
  quantity_abs numeric(18,6) generated always as (abs(quantity_delta)) stored,
  original_currency text check (original_currency in ('VES','USD')),
  original_unit_cost numeric(18,6) check (original_unit_cost is null or original_unit_cost >= 0),
  rate_id uuid, applied_rate numeric(18,8), rate_date date, rate_source text,
  unit_cost_ves numeric(18,6) check (unit_cost_ves is null or unit_cost_ves >= 0),
  balance_after numeric(18,6) not null check (balance_after >= 0),
  reason text, reference text, idempotency_key text not null,
  reversed_movement_id uuid, actor_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
  unique (business_id, id), unique (business_id, idempotency_key),
  foreign key (business_id, product_id) references public.jam_products(business_id,id),
  foreign key (business_id, warehouse_id) references public.jam_warehouses(business_id,id),
  foreign key (business_id, rate_id) references public.jam_exchange_rates(business_id,id),
  foreign key (business_id, reversed_movement_id) references public.jam_inventory_movements(business_id,id)
);
create index if not exists jam_movements_product_date_idx on public.jam_inventory_movements(business_id,product_id,created_at desc);

create or replace function public.jam_my_business(p_actor uuid, p_write boolean default false)
returns uuid language plpgsql stable security definer set search_path = public, auth as $$
declare v_business uuid; v_role text;
begin
  if auth.uid() is null or auth.uid() <> p_actor then raise exception 'No autorizado' using errcode='42501'; end if;
  select business_id, role into v_business, v_role from public.jam_user_access where user_id=auth.uid() and active;
  if v_business is null then raise exception 'Usuario sin acceso al negocio' using errcode='42501'; end if;
  if p_write and v_role not in ('owner','admin','inventory') then raise exception 'Permiso de inventario requerido' using errcode='42501'; end if;
  return v_business;
end $$;

create or replace function public.jam_catalog_save_product(p_product jsonb, p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_business uuid; v_id uuid; v_category uuid; v_row public.jam_products;
begin
  v_business := public.jam_my_business(p_actor_id,true);
  if nullif(trim(p_product->>'name'),'') is null then raise exception 'El nombre es obligatorio'; end if;
  if length(trim(p_product->>'name')) > 160 then raise exception 'Nombre demasiado largo'; end if;
  v_category := nullif(p_product->>'categoryId','')::uuid;
  if v_category is not null and not exists(select 1 from public.jam_categories where id=v_category and business_id=v_business and active) then raise exception 'Categoría no válida'; end if;
  v_id := nullif(p_product->>'id','')::uuid;
  if v_id is null then
    insert into public.jam_products(business_id,sku,name,brand,category_id,presentation,unit,color,sale_price,bcv_price)
    values(v_business,nullif(trim(p_product->>'sku'),''),trim(p_product->>'name'),nullif(trim(p_product->>'brand'),''),v_category,nullif(trim(p_product->>'presentation'),''),coalesce(nullif(trim(p_product->>'unit'),''),'unidad'),nullif(trim(p_product->>'color'),''),nullif(p_product->>'salePrice','')::numeric,nullif(p_product->>'bcvPrice','')::numeric)
    returning * into v_row;
  else
    update public.jam_products set sku=nullif(trim(p_product->>'sku'),''),name=trim(p_product->>'name'),brand=nullif(trim(p_product->>'brand'),''),category_id=v_category,presentation=nullif(trim(p_product->>'presentation'),''),unit=coalesce(nullif(trim(p_product->>'unit'),''),'unidad'),color=nullif(trim(p_product->>'color'),''),sale_price=nullif(p_product->>'salePrice','')::numeric,bcv_price=nullif(p_product->>'bcvPrice','')::numeric,updated_at=now()
    where id=v_id and business_id=v_business returning * into v_row;
    if not found then raise exception 'Producto no encontrado'; end if;
  end if;
  return to_jsonb(v_row);
end $$;

create or replace function public.jam_inventory_stock(p_search text default null)
returns table(product_id uuid,product_name text,sku text,warehouse_id uuid,warehouse_name text,quantity numeric,average_cost_ves numeric,minimum_stock numeric)
language plpgsql stable security definer set search_path=public,auth as $$
declare v_business uuid;
begin
  v_business := public.jam_my_business(auth.uid(),false);
  return query select p.id,p.name,p.sku,w.id,w.name,b.quantity,b.average_cost_ves,b.minimum_stock
  from public.jam_stock_balances b join public.jam_products p on p.id=b.product_id and p.business_id=b.business_id
  join public.jam_warehouses w on w.id=b.warehouse_id and w.business_id=b.business_id
  where b.business_id=v_business and p.active and w.active and (p_search is null or p.name ilike '%'||p_search||'%' or coalesce(p.sku,'') ilike '%'||p_search||'%')
  order by p.name,w.name;
end $$;

create or replace function public.jam_inventory_record_movement(p_movement jsonb,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
 v_business uuid; v_product uuid; v_warehouse uuid; v_type text; v_qty numeric(18,6); v_delta numeric(18,6);
 v_cost numeric(18,6); v_original numeric(18,6); v_currency text; v_rate_id uuid; v_rate numeric(18,8); v_rate_date date; v_rate_source text;
 v_balance public.jam_stock_balances; v_movement public.jam_inventory_movements; v_key text; v_role text;
begin
 v_business:=public.jam_my_business(p_actor_id,false);
 select role into v_role from public.jam_user_access where user_id=auth.uid() and business_id=v_business and active;
 v_product:=(p_movement->>'productId')::uuid; v_warehouse:=(p_movement->>'warehouseId')::uuid;
 v_type:=p_movement->>'type'; v_qty:=(p_movement->>'quantity')::numeric; v_key:=trim(p_movement->>'idempotencyKey');
 if v_type not in ('entry','exit','adjustment') then raise exception 'Tipo de movimiento no válido'; end if;
 -- Ventas pueden despachar (exit), pero sólo inventario/administración puede
 -- registrar entradas o ajustes manuales.
 if v_type='exit' and v_role not in ('owner','admin','inventory','sales') then raise exception 'Permiso de salida de inventario requerido'; end if;
 if v_type in ('entry','adjustment') and v_role not in ('owner','admin','inventory') then raise exception 'Permiso de inventario requerido'; end if;
 if v_qty<=0 or v_key is null or v_key='' then raise exception 'Cantidad y clave de operación son obligatorias'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_business::text||':'||v_key,0));
 select * into v_movement from public.jam_inventory_movements where business_id=v_business and idempotency_key=v_key;
 if found then return to_jsonb(v_movement); end if;
 if not exists(select 1 from public.jam_products where id=v_product and business_id=v_business and active) then raise exception 'Producto no válido'; end if;
 if not exists(select 1 from public.jam_warehouses where id=v_warehouse and business_id=v_business and active) then raise exception 'Depósito no válido'; end if;
 insert into public.jam_stock_balances(business_id,product_id,warehouse_id) values(v_business,v_product,v_warehouse) on conflict do nothing;
 select * into v_balance from public.jam_stock_balances where business_id=v_business and product_id=v_product and warehouse_id=v_warehouse for update;
 v_delta:=case when v_type='entry' then v_qty when v_type='exit' then -v_qty else (p_movement->>'quantityDelta')::numeric end;
 if v_type='adjustment' and (p_movement->>'quantityDelta') is null then raise exception 'El ajuste requiere diferencia positiva o negativa'; end if;
 if v_type='adjustment' and nullif(trim(p_movement->>'reason'),'') is null then raise exception 'El ajuste requiere un motivo'; end if;
 if v_delta=0 then raise exception 'El ajuste no puede ser cero'; end if;
 if v_balance.quantity+v_delta<0 then raise exception 'Existencia insuficiente'; end if;
 v_cost:=null; v_original:=null; v_currency:=null; v_rate_id:=null; v_rate:=null; v_rate_date:=null; v_rate_source:=null;
 if v_type='entry' and p_movement ? 'originalUnitCost' then
   v_original:=(p_movement->>'originalUnitCost')::numeric; v_currency:=p_movement->>'originalCurrency';
   if v_original<0 or v_currency not in ('VES','USD') then raise exception 'Costo o moneda no válidos'; end if;
   if v_currency='USD' then
     v_rate_id:=(p_movement->>'rateId')::uuid;
     select rate,effective_at,source into v_rate,v_rate_date,v_rate_source from public.jam_exchange_rates where id=v_rate_id and business_id=v_business and base_currency='USD' and quote_currency='VES';
     if not found or upper(v_rate_source) not like '%BCV%' or nullif(p_movement->>'operationDate','') is null or v_rate_date <> (p_movement->>'operationDate')::date then raise exception 'Tasa BCV no válida para la fecha de operación'; end if;
     v_cost:=round(v_original*v_rate,6);
   else v_cost:=v_original; end if;
 end if;
 if v_type='entry' and v_cost is not null then
   if v_balance.quantity=0 then v_balance.average_cost_ves:=v_cost;
   else v_balance.average_cost_ves:=round(((v_balance.quantity*v_balance.average_cost_ves)+(v_qty*v_cost))/(v_balance.quantity+v_qty),6); end if;
 end if;
 update public.jam_stock_balances set quantity=quantity+v_delta,average_cost_ves=v_balance.average_cost_ves,updated_at=now()
 where business_id=v_business and product_id=v_product and warehouse_id=v_warehouse returning * into v_balance;
 insert into public.jam_inventory_movements(business_id,product_id,warehouse_id,movement_type,quantity_delta,original_currency,original_unit_cost,rate_id,applied_rate,rate_date,rate_source,unit_cost_ves,balance_after,reason,reference,idempotency_key,actor_id)
 values(v_business,v_product,v_warehouse,v_type,v_delta,v_currency,v_original,v_rate_id,v_rate,v_rate_date,v_rate_source,v_cost,v_balance.quantity,nullif(trim(p_movement->>'reason'),''),nullif(trim(p_movement->>'reference'),''),v_key,p_actor_id)
 returning * into v_movement;
 return to_jsonb(v_movement);
end $$;


create or replace function public.jam_inventory_set_minimum_stock(p_product_id uuid,p_warehouse_id uuid,p_minimum numeric,p_actor_id uuid default auth.uid())
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_business uuid; v_row public.jam_stock_balances;
begin
 v_business:=public.jam_my_business(p_actor_id,true);
 if p_minimum<0 then raise exception 'El mínimo no puede ser negativo'; end if;
 insert into public.jam_stock_balances(business_id,product_id,warehouse_id,minimum_stock)
 values(v_business,p_product_id,p_warehouse_id,p_minimum)
 on conflict (business_id,product_id,warehouse_id) do update set minimum_stock=excluded.minimum_stock,updated_at=now()
 returning * into v_row;
 return to_jsonb(v_row);
end $$;

create or replace function public.jam_inventory_reverse_movement(p_movement_id uuid,p_reason text,p_idempotency_key text,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_business uuid; v_original public.jam_inventory_movements; v_new public.jam_inventory_movements; v_balance public.jam_stock_balances; v_delta numeric(18,6);
begin
 v_business:=public.jam_my_business(p_actor_id,true);
 perform pg_advisory_xact_lock(hashtextextended(v_business::text||':'||p_idempotency_key,0));
 select * into v_new from public.jam_inventory_movements where business_id=v_business and idempotency_key=p_idempotency_key;
 if found then return to_jsonb(v_new); end if;
 select * into v_original from public.jam_inventory_movements where id=p_movement_id and business_id=v_business for update;
 if not found then raise exception 'Movimiento no encontrado'; end if;
 if v_original.movement_type='reversal' or exists(select 1 from public.jam_inventory_movements where business_id=v_business and reversed_movement_id=v_original.id) then raise exception 'El movimiento ya fue reversado'; end if;
 if v_original.movement_type='entry' and exists(select 1 from public.jam_inventory_movements m where m.business_id=v_business and m.product_id=v_original.product_id and m.warehouse_id=v_original.warehouse_id and (m.created_at>v_original.created_at or (m.created_at=v_original.created_at and m.id<>v_original.id))) then raise exception 'No se puede reversar esta entrada porque existen movimientos posteriores; registra un ajuste autorizado'; end if;
 select * into v_balance from public.jam_stock_balances where business_id=v_business and product_id=v_original.product_id and warehouse_id=v_original.warehouse_id for update;
 v_delta:=-v_original.quantity_delta;
 if v_balance.quantity+v_delta<0 then raise exception 'No se puede reversar: la existencia actual no lo permite'; end if;
 update public.jam_stock_balances set quantity=quantity+v_delta,updated_at=now() where business_id=v_business and product_id=v_original.product_id and warehouse_id=v_original.warehouse_id returning * into v_balance;
 insert into public.jam_inventory_movements(business_id,product_id,warehouse_id,movement_type,quantity_delta,unit_cost_ves,balance_after,reason,idempotency_key,reversed_movement_id,actor_id)
 values(v_business,v_original.product_id,v_original.warehouse_id,'reversal',v_delta,v_original.unit_cost_ves,v_balance.quantity,trim(p_reason),p_idempotency_key,v_original.id,p_actor_id) returning * into v_new;
 return to_jsonb(v_new);
end $$;


create or replace function public.jam_catalog_save_category(p_name text,p_category_id uuid default null,p_actor_id uuid default auth.uid())
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_business uuid; v_row public.jam_categories;
begin
 v_business:=public.jam_my_business(p_actor_id,true);
 if nullif(trim(p_name),'') is null or length(trim(p_name))>80 then raise exception 'Nombre de categoría no válido'; end if;
 if p_category_id is null then insert into public.jam_categories(business_id,name) values(v_business,trim(p_name)) returning * into v_row;
 else update public.jam_categories set name=trim(p_name) where id=p_category_id and business_id=v_business returning * into v_row; if not found then raise exception 'Categoría no encontrada'; end if; end if;
 return to_jsonb(v_row);
end $$;

create or replace function public.jam_inventory_save_warehouse(p_name text,p_actor_id uuid default auth.uid())
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_business uuid; v_row public.jam_warehouses;
begin
 v_business:=public.jam_my_business(p_actor_id,true);
 if nullif(trim(p_name),'') is null or length(trim(p_name))>80 then raise exception 'Nombre de depósito no válido'; end if;
 insert into public.jam_warehouses(business_id,name) values(v_business,trim(p_name)) returning * into v_row;
 return to_jsonb(v_row);
end $$;

create or replace function public.jam_inventory_save_bcv_rate(p_rate numeric,p_effective_at date,p_source text,p_actor_id uuid default auth.uid())
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_business uuid; v_row public.jam_exchange_rates;
begin
 v_business:=public.jam_my_business(p_actor_id,true);
 if p_rate<=0 or upper(coalesce(p_source,'')) not like '%BCV%' then raise exception 'Tasa o fuente BCV no válida'; end if;
 insert into public.jam_exchange_rates(business_id,base_currency,quote_currency,rate,source,effective_at,created_by)
 values(v_business,'USD','VES',p_rate,trim(p_source),p_effective_at,p_actor_id)
 on conflict (business_id,effective_at) do update set rate=excluded.rate,source=excluded.source,created_by=excluded.created_by returning * into v_row;
 return to_jsonb(v_row);
end $$;

-- RLS: lectura por negocio. Escrituras directas bloqueadas; cambios mediante RPC.
alter table public.jam_user_access enable row level security;
alter table public.jam_categories enable row level security;
alter table public.jam_products enable row level security;
alter table public.jam_warehouses enable row level security;
alter table public.jam_exchange_rates enable row level security;
alter table public.jam_stock_balances enable row level security;
alter table public.jam_inventory_movements enable row level security;

drop policy if exists jam_access_self on public.jam_user_access;
create policy jam_access_self on public.jam_user_access for select to authenticated using (user_id=auth.uid());

do $$ declare t text; begin
 foreach t in array array['jam_categories','jam_products','jam_warehouses','jam_exchange_rates','jam_stock_balances','jam_inventory_movements'] loop
  execute format('drop policy if exists %I on public.%I',t||'_read',t);
  execute format('create policy %I on public.%I for select to authenticated using (business_id = (select business_id from public.jam_user_access where user_id=auth.uid() and active))',t||'_read',t);
 end loop;
end $$;
revoke all on public.jam_user_access from anon,authenticated;
grant select on public.jam_user_access to authenticated;
revoke insert,update,delete on public.jam_categories,public.jam_products,public.jam_warehouses,public.jam_exchange_rates,public.jam_stock_balances,public.jam_inventory_movements from anon,authenticated;
grant select on public.jam_categories,public.jam_products,public.jam_warehouses,public.jam_exchange_rates,public.jam_stock_balances,public.jam_inventory_movements,public.jam_user_access to authenticated;
revoke all on function public.jam_my_business(uuid,boolean) from public;
revoke all on function public.jam_catalog_save_product(jsonb,uuid) from public;
revoke all on function public.jam_inventory_stock(text) from public;
revoke all on function public.jam_inventory_record_movement(jsonb,uuid) from public;
revoke all on function public.jam_inventory_reverse_movement(uuid,text,text,uuid) from public;
revoke all on function public.jam_catalog_save_category(text,uuid,uuid) from public;
revoke all on function public.jam_inventory_save_warehouse(text,uuid) from public;
revoke all on function public.jam_inventory_save_bcv_rate(numeric,date,text,uuid) from public;
revoke all on function public.jam_inventory_set_minimum_stock(uuid,uuid,numeric,uuid) from public;
grant execute on function public.jam_catalog_save_product(jsonb,uuid) to authenticated;
grant execute on function public.jam_inventory_stock(text) to authenticated;
grant execute on function public.jam_inventory_record_movement(jsonb,uuid) to authenticated;
grant execute on function public.jam_inventory_reverse_movement(uuid,text,text,uuid) to authenticated;
grant execute on function public.jam_catalog_save_category(text,uuid,uuid) to authenticated;
grant execute on function public.jam_inventory_save_warehouse(text,uuid) to authenticated;
grant execute on function public.jam_inventory_save_bcv_rate(numeric,date,text,uuid) to authenticated;
grant execute on function public.jam_inventory_set_minimum_stock(uuid,uuid,numeric,uuid) to authenticated;
