-- Pinturas JAM / Chat 3 — operaciones comerciales transaccionales.
-- Extensión aditiva sobre el contrato de Chat 2. Aplicar SOLO en Supabase de desarrollo.
-- No crea usuarios, negocios, depósitos, productos, tasas ni autorizaciones fiscales.
create extension if not exists pgcrypto;

create or replace function public.jam_commercial_business(p_actor uuid, p_write boolean default false)
returns uuid language plpgsql stable security definer set search_path=public,auth as $$
declare v_business uuid; v_role text;
begin
 if auth.uid() is null or auth.uid() <> p_actor then raise exception 'No autorizado' using errcode='42501'; end if;
 select business_id,role into v_business,v_role from public.jam_user_access where user_id=auth.uid() and active;
 if v_business is null then raise exception 'Usuario sin acceso activo al negocio' using errcode='42501'; end if;
 if p_write and v_role not in ('owner','admin','sales','inventory') then raise exception 'Permiso comercial requerido' using errcode='42501'; end if;
 return v_business;
end $$;
revoke all on function public.jam_commercial_business(uuid,boolean) from public,anon;
grant execute on function public.jam_commercial_business(uuid,boolean) to authenticated;

create table if not exists public.jam_suppliers (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, name text not null,
 tax_id text, phone text, email text, address text, notes text, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(business_id,id), check(length(trim(name)) between 1 and 180)
);
create index if not exists jam_suppliers_name_idx on public.jam_suppliers(business_id,lower(name));

create table if not exists public.jam_customers (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, name text not null,
 identification_type text, identification_number text, tax_id text, phone text, email text, address text,
 fiscal_address text, credit_enabled boolean not null default false, credit_limit numeric(18,6) not null default 0 check(credit_limit>=0), credit_currency text not null default 'USD' check(credit_currency in ('USD','VES')),
 active boolean not null default true, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(business_id,id), check(length(trim(name)) between 1 and 180), check(email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);
create index if not exists jam_customers_name_idx on public.jam_customers(business_id,lower(name));

create table if not exists public.jam_purchases (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, supplier_id uuid not null,
 document_number text not null, document_date date not null, currency text not null check(currency in ('USD','VES')),
 status text not null default 'draft' check(status in ('draft','approved','partially_received','received','cancelled')),
 subtotal numeric(18,6) not null default 0, discount_total numeric(18,6) not null default 0,
 expense_total numeric(18,6) not null default 0, total numeric(18,6) not null default 0,
 notes text, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(business_id,id), unique(business_id,supplier_id,document_number),
 foreign key(business_id,supplier_id) references public.jam_suppliers(business_id,id)
);
create table if not exists public.jam_purchase_lines (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, purchase_id uuid not null,
 product_id uuid not null, description text, quantity numeric(18,6) not null check(quantity>0),
 unit_cost numeric(18,6) not null check(unit_cost>=0), discount_amount numeric(18,6) not null default 0 check(discount_amount>=0),
 attributable_expenses numeric(18,6) not null default 0 check(attributable_expenses>=0), line_total numeric(18,6) not null,
 received_quantity numeric(18,6) not null default 0 check(received_quantity>=0),
 unique(business_id,id), foreign key(business_id,purchase_id) references public.jam_purchases(business_id,id),
 foreign key(business_id,product_id) references public.jam_products(business_id,id)
);
create table if not exists public.jam_purchase_receipts (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, purchase_id uuid not null,
 warehouse_id uuid not null, received_at timestamptz not null, idempotency_key text not null,
 status text not null default 'posted' check(status in ('posted','reversed')), created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(business_id,id), unique(business_id,idempotency_key),
 foreign key(business_id,purchase_id) references public.jam_purchases(business_id,id),
 foreign key(business_id,warehouse_id) references public.jam_warehouses(business_id,id)
);
create table if not exists public.jam_purchase_receipt_lines (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, receipt_id uuid not null,
 purchase_line_id uuid not null, quantity_received numeric(18,6) not null check(quantity_received>0),
 unique(business_id,id), foreign key(business_id,receipt_id) references public.jam_purchase_receipts(business_id,id),
 foreign key(business_id,purchase_line_id) references public.jam_purchase_lines(business_id,id)
);
create table if not exists public.jam_supplier_payables (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, purchase_id uuid not null,
 supplier_id uuid not null, currency text not null check(currency in ('USD','VES')),
 original_amount numeric(18,6) not null check(original_amount>=0), due_date date,
 status text not null default 'pending' check(status in ('pending','partial','paid')),
 created_at timestamptz not null default now(), unique(business_id,id),
 foreign key(business_id,purchase_id) references public.jam_purchases(business_id,id),
 foreign key(business_id,supplier_id) references public.jam_suppliers(business_id,id)
);
-- Una compra puede recibirse en varios despachos, pero conserva una sola cuenta por pagar.
create unique index if not exists jam_supplier_payables_purchase_uidx on public.jam_supplier_payables(business_id,purchase_id);
create table if not exists public.jam_supplier_payments (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, payable_id uuid not null,
 amount numeric(18,6) not null check(amount>0), currency text not null check(currency in ('USD','VES')),
 applied_rate numeric(18,8) not null default 1 check(applied_rate>0), converted_ves numeric(18,6) not null,
 payment_date date not null, method text not null, reference text, idempotency_key text not null,
 actor_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(business_id,id), unique(business_id,idempotency_key), foreign key(business_id,payable_id) references public.jam_supplier_payables(business_id,id)
);

create table if not exists public.jam_quotes (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, quote_number text not null,
 customer_id uuid, currency text not null check(currency in ('USD','VES')), status text not null default 'draft' check(status in ('draft','pending','converted','cancelled','expired')),
 subtotal numeric(18,6) not null default 0, discount_total numeric(18,6) not null default 0, tax_total numeric(18,6) not null default 0,
 total numeric(18,6) not null default 0, valid_until date, notes text, converted_sale_id uuid,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(business_id,id), unique(business_id,quote_number), foreign key(business_id,customer_id) references public.jam_customers(business_id,id)
);
create table if not exists public.jam_quote_lines (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, quote_id uuid not null, product_id uuid not null,
 description text, quantity numeric(18,6) not null check(quantity>0), unit_price numeric(18,6) not null check(unit_price>=0),
 discount_amount numeric(18,6) not null default 0 check(discount_amount>=0), line_total numeric(18,6) not null,
 foreign key(business_id,quote_id) references public.jam_quotes(business_id,id), foreign key(business_id,product_id) references public.jam_products(business_id,id)
);

create table if not exists public.jam_tax_rates (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, tax_code text not null,
 rate_percent numeric(9,6) not null check(rate_percent>=0), effective_from date not null, effective_to date,
 active boolean not null default true, verified_reference text, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(business_id,id), unique(business_id,tax_code,effective_from), check(effective_to is null or effective_to>=effective_from)
);

create table if not exists public.jam_sales (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, sale_number text not null,
 customer_id uuid, warehouse_id uuid not null, currency text not null check(currency in ('USD','VES')), idempotency_key text not null,
 status text not null default 'confirmed' check(status in ('confirmed','partially_paid','paid','credit','cancelled','reversed')),
 exchange_rate numeric(18,8) not null default 1 check(exchange_rate>0), exchange_rate_id uuid,
 subtotal numeric(18,6) not null, discount_total numeric(18,6) not null default 0, taxable_base numeric(18,6) not null default 0,
 exempt_total numeric(18,6) not null default 0, tax_total numeric(18,6) not null default 0, total numeric(18,6) not null,
 paid_total numeric(18,6) not null default 0, change_total numeric(18,6) not null default 0,
 quote_id uuid, notes text, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(business_id,id), unique(business_id,sale_number), unique(business_id,idempotency_key), foreign key(business_id,customer_id) references public.jam_customers(business_id,id),
 foreign key(business_id,warehouse_id) references public.jam_warehouses(business_id,id), foreign key(business_id,exchange_rate_id) references public.jam_exchange_rates(business_id,id),
 foreign key(business_id,quote_id) references public.jam_quotes(business_id,id)
);
alter table public.jam_quotes drop constraint if exists jam_quotes_converted_sale_id_fkey;
alter table public.jam_quotes add constraint jam_quotes_converted_sale_id_fkey foreign key(business_id,converted_sale_id) references public.jam_sales(business_id,id) deferrable initially deferred;
create table if not exists public.jam_sale_lines (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, sale_id uuid not null, product_id uuid not null, tax_code text,
 description text, quantity numeric(18,6) not null check(quantity>0), unit_price numeric(18,6) not null check(unit_price>=0),
 discount_amount numeric(18,6) not null default 0 check(discount_amount>=0), tax_rate numeric(9,6) not null default 0 check(tax_rate>=0),
 tax_amount numeric(18,6) not null default 0, line_total numeric(18,6) not null,
 foreign key(business_id,sale_id) references public.jam_sales(business_id,id), foreign key(business_id,product_id) references public.jam_products(business_id,id)
);
create table if not exists public.jam_sale_payments (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, sale_id uuid not null,
 amount numeric(18,6) not null check(amount>0), currency text not null check(currency in ('USD','VES')),
 applied_rate numeric(18,8) not null default 1 check(applied_rate>0), converted_ves numeric(18,6) not null,
 payment_date date not null, method text not null, reference text, idempotency_key text not null,
 actor_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(business_id,id), unique(business_id,idempotency_key),
 foreign key(business_id,sale_id) references public.jam_sales(business_id,id)
);

create table if not exists public.jam_receivables (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, sale_id uuid not null, customer_id uuid not null,
 currency text not null check(currency in ('USD','VES')), original_amount numeric(18,6) not null check(original_amount>=0), due_date date,
 status text not null default 'pending' check(status in ('pending','partial','paid','cancelled')),
 created_at timestamptz not null default now(), unique(business_id,id), unique(business_id,sale_id),
 foreign key(business_id,sale_id) references public.jam_sales(business_id,id), foreign key(business_id,customer_id) references public.jam_customers(business_id,id)
);
create table if not exists public.jam_customer_payments (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, receivable_id uuid not null,
 amount numeric(18,6) not null check(amount>0), currency text not null check(currency in ('USD','VES')),
 applied_rate numeric(18,8) not null default 1 check(applied_rate>0), converted_ves numeric(18,6) not null,
 payment_date date not null, method text not null, reference text, idempotency_key text not null,
 actor_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(business_id,id), unique(business_id,idempotency_key), foreign key(business_id,receivable_id) references public.jam_receivables(business_id,id)
);

create table if not exists public.jam_payment_methods (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, name text not null,
 active boolean not null default true, currencies text[] not null default array['USD','VES'], created_at timestamptz not null default now(),
 unique(business_id,id), unique(business_id,name), check(cardinality(currencies)>0)
);

-- Eventos de caja: outbox durable, sin crear un segundo libro/caja. Chat 4 debe consumirlos.
create table if not exists public.jam_cash_events (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, event_type text not null check(event_type in ('sale_collection','sale_change','customer_payment','supplier_payment','refund','void')),
 source_type text not null, source_id uuid not null, amount numeric(18,6) not null, currency text not null check(currency in ('USD','VES')),
 applied_rate numeric(18,8) not null default 1, method text not null, occurred_at timestamptz not null default now(),
 consumed_at timestamptz, consumer_reference text, created_at timestamptz not null default now(), unique(business_id,id)
);

create table if not exists public.jam_fiscal_profiles (
 id uuid primary key default gen_random_uuid(), business_id uuid not null unique, legal_name text, rif text,
 fiscal_address text, phone text, email text, authorization_provider text, authorization_reference text,
 configured boolean not null default false, updated_at timestamptz not null default now()
);
create table if not exists public.jam_commercial_documents (
 id uuid primary key default gen_random_uuid(), business_id uuid not null, document_type text not null check(document_type in ('internal_receipt','invoice','credit_note','debit_note','quote')),
 source_type text not null, source_id uuid not null, document_number text not null, control_number text,
 fiscal_status text not null default 'internal' check(fiscal_status in ('internal','pending_fiscal','fiscally_issued','rejected')),
 issued_at timestamptz not null default now(), snapshot jsonb not null, provider_reference text, validation_reference text,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), unique(business_id,id), unique(business_id,document_type,document_number)
);
create table if not exists public.jam_commercial_audit (
 id bigint generated always as identity primary key, business_id uuid not null, actor_id uuid not null references auth.users(id),
 entity_type text not null, entity_id uuid not null, action text not null, reason text, before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);

-- RLS lectura por negocio; escritura sólo mediante RPC SECURITY DEFINER.
do $$ declare t text; begin
 foreach t in array array['jam_suppliers','jam_customers','jam_purchases','jam_purchase_lines','jam_purchase_receipts','jam_purchase_receipt_lines','jam_supplier_payables','jam_supplier_payments','jam_quotes','jam_quote_lines','jam_sales','jam_sale_lines','jam_sale_payments','jam_receivables','jam_customer_payments','jam_cash_events','jam_payment_methods','jam_fiscal_profiles','jam_commercial_documents','jam_commercial_audit','jam_tax_rates'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists %I on public.%I',t||'_read_business',t);
  execute format('create policy %I on public.%I for select to authenticated using (business_id = public.jam_commercial_business(auth.uid(),false))',t||'_read_business',t);
  execute format('revoke insert,update,delete on public.%I from anon,authenticated',t);
 end loop;
end $$;

create or replace function public.jam_purchase_supplier_save(p_supplier jsonb,p_actor_id uuid default auth.uid()) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare b uuid; i uuid; r public.jam_suppliers;
begin b:=public.jam_commercial_business(p_actor_id,true); i:=nullif(p_supplier->>'id','')::uuid;
 if nullif(trim(p_supplier->>'name'),'') is null then raise exception 'Nombre de proveedor obligatorio'; end if;
 if i is null then insert into public.jam_suppliers(business_id,name,tax_id,phone,email,address,notes) values(b,trim(p_supplier->>'name'),nullif(trim(p_supplier->>'taxId'),''),nullif(trim(p_supplier->>'phone'),''),nullif(trim(p_supplier->>'email'),''),nullif(trim(p_supplier->>'address'),''),nullif(trim(p_supplier->>'notes'),'')) returning * into r;
 else update public.jam_suppliers set name=trim(p_supplier->>'name'),tax_id=nullif(trim(p_supplier->>'taxId'),''),phone=nullif(trim(p_supplier->>'phone'),''),email=nullif(trim(p_supplier->>'email'),''),address=nullif(trim(p_supplier->>'address'),''),notes=nullif(trim(p_supplier->>'notes'),''),active=coalesce((p_supplier->>'active')::boolean,active),updated_at=now() where business_id=b and id=i returning * into r; if not found then raise exception 'Proveedor no encontrado'; end if; end if;
 return to_jsonb(r); end $$;

create or replace function public.jam_purchase_suppliers_list(p_search text default null) returns setof jsonb
language sql stable security definer set search_path=public,auth as $$ select to_jsonb(s) from public.jam_suppliers s where s.business_id=public.jam_commercial_business(auth.uid(),false) and (p_search is null or s.name ilike '%'||p_search||'%' or coalesce(s.tax_id,'') ilike '%'||p_search||'%') order by s.name $$;

create or replace function public.jam_purchase_create(p_purchase jsonb,p_actor_id uuid default auth.uid()) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare b uuid; sid uuid; pid uuid; l jsonb; q numeric(18,6); c numeric(18,6); d numeric(18,6); e numeric(18,6); sub numeric(18,6):=0; disc numeric(18,6):=0; exp numeric(18,6):=0; tot numeric(18,6); lineid uuid; v_result jsonb;
begin b:=public.jam_commercial_business(p_actor_id,true); sid:=(p_purchase->>'supplierId')::uuid;
 if not exists(select 1 from public.jam_suppliers where business_id=b and id=sid and active) then raise exception 'Proveedor no válido'; end if;
 if coalesce(p_purchase->>'currency','') not in ('USD','VES') then raise exception 'Moneda inválida'; end if; if nullif(trim(p_purchase->>'documentNumber'),'') is null then raise exception 'Número de documento obligatorio'; end if;
 if coalesce(jsonb_typeof(p_purchase->'lines'),'')<>'array' or jsonb_array_length(p_purchase->'lines')=0 then raise exception 'La compra requiere productos'; end if;
 insert into public.jam_purchases(business_id,supplier_id,document_number,document_date,currency,notes,created_by)
 values(b,sid,trim(p_purchase->>'documentNumber'),(p_purchase->>'documentDate')::date,p_purchase->>'currency',p_purchase->>'notes',p_actor_id) returning id into pid;
 for l in select value from jsonb_array_elements(p_purchase->'lines') loop
  q:=(l->>'quantity')::numeric; c:=(l->>'unitCost')::numeric; d:=coalesce((l->>'discountAmount')::numeric,0); e:=coalesce((l->>'attributableExpenses')::numeric,0);
  if q<=0 or c<0 or d<0 or e<0 or d>q*c then raise exception 'Importes inválidos en línea de compra'; end if;
  if not exists(select 1 from public.jam_products where business_id=b and id=(l->>'productId')::uuid and active) then raise exception 'Producto no válido'; end if;
  insert into public.jam_purchase_lines(business_id,purchase_id,product_id,description,quantity,unit_cost,discount_amount,attributable_expenses,line_total)
  values(b,pid,(l->>'productId')::uuid,l->>'description',q,c,d,e,q*c-d) returning id into lineid;
  sub:=sub+q*c; disc:=disc+d; exp:=exp+e;
 end loop;
 tot:=sub-disc+exp;
 update public.jam_purchases set subtotal=sub,discount_total=disc,expense_total=exp,total=tot,updated_at=now() where id=pid returning to_jsonb(jam_purchases) into v_result;
 return v_result || jsonb_build_object('lines',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.jam_purchase_lines x where x.business_id=b and x.purchase_id=pid)); end $$;

create or replace function public.jam_purchase_get(p_purchase_id uuid) returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare b uuid; r jsonb; begin b:=public.jam_commercial_business(auth.uid(),false); select to_jsonb(p)||jsonb_build_object('lines',(select coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) from public.jam_purchase_lines l where l.business_id=b and l.purchase_id=p.id)) into r from public.jam_purchases p where p.business_id=b and p.id=p_purchase_id; if r is null then raise exception 'Compra no encontrada'; end if; return r; end $$;
create or replace function public.jam_purchase_list(p_supplier_id uuid default null,p_status text default null,p_date_from date default null,p_date_to date default null) returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(p) from public.jam_purchases p where p.business_id=public.jam_commercial_business(auth.uid(),false) and (p_supplier_id is null or p.supplier_id=p_supplier_id) and (p_status is null or p.status=p_status) and (p_date_from is null or p.document_date>=p_date_from) and (p_date_to is null or p.document_date<=p_date_to) order by p.document_date desc,p.created_at desc $$;
create or replace function public.jam_purchase_approve(p_purchase_id uuid) returns jsonb language plpgsql security definer set search_path=public,auth as $$ declare b uuid; r public.jam_purchases; begin b:=public.jam_commercial_business(auth.uid(),true); if not exists(select 1 from public.jam_user_access where user_id=auth.uid() and business_id=b and role in ('owner','admin','inventory')) then raise exception 'Permiso de aprobación de compras requerido'; end if; update public.jam_purchases set status='approved',updated_at=now() where business_id=b and id=p_purchase_id and status='draft' returning * into r; if not found then raise exception 'Compra no encontrada o no está en borrador'; end if; return to_jsonb(r); end $$;

create or replace function public.jam_payment_method_save(p_method jsonb,p_actor_id uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path=public,auth as $$ declare b uuid; r public.jam_payment_methods; begin b:=public.jam_commercial_business(p_actor_id,true); if not exists(select 1 from public.jam_user_access where user_id=auth.uid() and business_id=b and role in ('owner','admin')) then raise exception 'Sólo administración puede configurar métodos de pago'; end if; if nullif(trim(p_method->>'name'),'') is null then raise exception 'Nombre de método obligatorio'; end if; insert into public.jam_payment_methods(business_id,name,active,currencies) values(b,trim(p_method->>'name'),coalesce((p_method->>'active')::boolean,true),array(select jsonb_array_elements_text(coalesce(p_method->'currencies','["USD","VES"]'::jsonb)))) on conflict(business_id,name) do update set active=excluded.active,currencies=excluded.currencies returning * into r; return to_jsonb(r); end $$;
create or replace function public.jam_payment_method_list() returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(m) from public.jam_payment_methods m where m.business_id=public.jam_commercial_business(auth.uid(),false) order by m.name $$;

-- Recepción atómica: cabecera, líneas, saldo y movimiento de inventario en la misma transacción.
create or replace function public.jam_purchase_receive_and_post(p_receipt jsonb,p_actor_id uuid default auth.uid()) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare b uuid; p public.jam_purchases; rec uuid; l jsonb; pl public.jam_purchase_lines; qty numeric(18,6); cost numeric(18,6); original_cost numeric(18,6); rate numeric(18,8); rateid uuid; key text; movement jsonb; received_total numeric(18,6):=0; payable_paid numeric(18,6):=0;
begin b:=public.jam_commercial_business(p_actor_id,true); if not exists(select 1 from public.jam_user_access where user_id=auth.uid() and business_id=b and role in ('owner','admin','inventory')) then raise exception 'Permiso de recepción de mercancía requerido'; end if; key:=trim(p_receipt->>'idempotencyKey'); if key is null or key='' then raise exception 'Clave idempotente obligatoria'; end if;
 perform pg_advisory_xact_lock(hashtextextended(b::text||':'||key,0)); select id into rec from public.jam_purchase_receipts where business_id=b and idempotency_key=key; if rec is not null then return jsonb_build_object('id',rec,'status','posted','idempotencyKey',key); end if;
 select * into p from public.jam_purchases where business_id=b and id=(p_receipt->>'purchaseId')::uuid for update; if not found or p.status not in ('approved','partially_received') then raise exception 'Compra no aprobada o no disponible para recepción'; end if;
 if not exists(select 1 from public.jam_warehouses where business_id=b and id=(p_receipt->>'warehouseId')::uuid and active) then raise exception 'Depósito no válido'; end if; if coalesce(jsonb_typeof(p_receipt->'lines'),'')<>'array' or jsonb_array_length(p_receipt->'lines')=0 then raise exception 'La recepción requiere líneas'; end if;
 insert into public.jam_purchase_receipts(business_id,purchase_id,warehouse_id,received_at,idempotency_key,created_by) values(b,p.id,(p_receipt->>'warehouseId')::uuid,coalesce((p_receipt->>'receivedAt')::timestamptz,now()),key,p_actor_id) returning id into rec;
 for l in select value from jsonb_array_elements(p_receipt->'lines') loop
  select * into pl from public.jam_purchase_lines where business_id=b and id=(l->>'purchaseLineId')::uuid and purchase_id=p.id for update; if not found then raise exception 'Línea de compra inválida'; end if;
  qty:=(l->>'quantityReceived')::numeric; if qty<=0 or pl.received_quantity+qty>pl.quantity then raise exception 'Cantidad recibida supera la pendiente'; end if;
  if p.currency='USD' then select id,rate into rateid,rate from public.jam_exchange_rates where business_id=b and effective_at=p.document_date and base_currency='USD' and quote_currency='VES' and upper(source) like '%BCV%'; if rate is null then raise exception 'Falta tasa BCV registrada para la fecha de compra'; end if; cost:=((pl.unit_cost-(pl.discount_amount/nullif(pl.quantity,0))+(pl.attributable_expenses/nullif(pl.quantity,0)))*rate); else cost:=pl.unit_cost-(pl.discount_amount/nullif(pl.quantity,0))+(pl.attributable_expenses/nullif(pl.quantity,0)); end if;
  -- La cuenta por pagar se reconoce sólo por la cantidad efectivamente recibida.
  received_total:=received_total + qty*(pl.unit_cost-(pl.discount_amount/nullif(pl.quantity,0))+(pl.attributable_expenses/nullif(pl.quantity,0)));
  insert into public.jam_purchase_receipt_lines(business_id,receipt_id,purchase_line_id,quantity_received) values(b,rec,pl.id,qty);
  original_cost:=pl.unit_cost-(pl.discount_amount/nullif(pl.quantity,0))+(pl.attributable_expenses/nullif(pl.quantity,0));
  -- Chat 2 conserva la propiedad del inventario. Esta RPC se ejecuta dentro
  -- de la misma transacción PostgreSQL de la recepción comercial.
  movement:=public.jam_inventory_record_movement(
    jsonb_build_object(
      'productId',pl.product_id,
      'warehouseId',(p_receipt->>'warehouseId')::uuid,
      'type','entry',
      'quantity',qty,
      'originalUnitCost',original_cost,
      'originalCurrency',p.currency,
      'rateId',case when p.currency='USD' then rateid else null end,
      'operationDate',p.document_date,
      'reason','Recepción de compra',
      'reference',p.document_number,
      'idempotencyKey',key||':'||pl.id
    ),p_actor_id
  );
  update public.jam_purchase_lines set received_quantity=received_quantity+qty where id=pl.id;
 end loop;
 update public.jam_purchases set status=case when not exists(select 1 from public.jam_purchase_lines where business_id=b and purchase_id=p.id and received_quantity<quantity) then 'received' else 'partially_received' end,updated_at=now() where id=p.id;
 insert into public.jam_supplier_payables(business_id,purchase_id,supplier_id,currency,original_amount) values(b,p.id,p.supplier_id,p.currency,received_total)
 on conflict (business_id,purchase_id) do update set original_amount=public.jam_supplier_payables.original_amount+excluded.original_amount;
 select coalesce(sum(amount),0) into payable_paid from public.jam_supplier_payments sp join public.jam_supplier_payables ap on ap.business_id=sp.business_id and ap.id=sp.payable_id where ap.business_id=b and ap.purchase_id=p.id and sp.currency=p.currency;
 update public.jam_supplier_payables set status=case when payable_paid>=original_amount then 'paid' when payable_paid>0 then 'partial' else 'pending' end where business_id=b and purchase_id=p.id;
 return jsonb_build_object('id',rec,'purchaseId',p.id,'status','posted','idempotencyKey',key,'receivedAmount',received_total); end $$;

create or replace function public.jam_purchase_supplier_history(p_supplier_id uuid) returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(p) from public.jam_purchases p where p.business_id=public.jam_commercial_business(auth.uid(),false) and p.supplier_id=p_supplier_id order by p.document_date desc $$;
create or replace function public.jam_purchase_receipts_list(p_purchase_id uuid) returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(r) from public.jam_purchase_receipts r where r.business_id=public.jam_commercial_business(auth.uid(),false) and r.purchase_id=p_purchase_id order by r.created_at desc $$;
create or replace function public.jam_purchase_payables_list(p_supplier_id uuid default null,p_status text default null) returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(a)||jsonb_build_object('paidAmount',coalesce((select sum(x.amount) from public.jam_supplier_payments x where x.business_id=a.business_id and x.payable_id=a.id and x.currency=a.currency),0),'balance',greatest(a.original_amount-coalesce((select sum(x.amount) from public.jam_supplier_payments x where x.business_id=a.business_id and x.payable_id=a.id and x.currency=a.currency),0),0)) from public.jam_supplier_payables a where a.business_id=public.jam_commercial_business(auth.uid(),false) and (p_supplier_id is null or a.supplier_id=p_supplier_id) and (p_status is null or a.status=p_status) order by a.created_at desc $$;
create or replace function public.jam_purchase_payment_register(p_payment jsonb,p_actor_id uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare b uuid; a public.jam_supplier_payables; amt numeric(18,6); paid numeric(18,6); rate numeric(18,8); r public.jam_supplier_payments;
begin b:=public.jam_commercial_business(p_actor_id,true); if not exists(select 1 from public.jam_user_access where user_id=auth.uid() and business_id=b and role in ('owner','admin','inventory')) then raise exception 'Permiso para pagar proveedores requerido'; end if; perform pg_advisory_xact_lock(hashtextextended(b::text||':'||trim(p_payment->>'idempotencyKey'),0)); select * into r from public.jam_supplier_payments where business_id=b and idempotency_key=trim(p_payment->>'idempotencyKey'); if found then return to_jsonb(r); end if;
 select * into a from public.jam_supplier_payables where business_id=b and id=(p_payment->>'payableId')::uuid for update; if not found then raise exception 'Cuenta por pagar no encontrada'; end if;
 amt:=(p_payment->>'amount')::numeric; if amt<=0 or p_payment->>'currency'<>a.currency then raise exception 'Importe o moneda de pago inválidos'; end if; if not exists(select 1 from public.jam_payment_methods m where m.business_id=b and m.name=p_payment->>'method' and m.active and a.currency=any(m.currencies)) then raise exception 'Método de pago no configurado o no válido para la moneda'; end if;
 select coalesce(sum(amount),0) into paid from public.jam_supplier_payments where business_id=b and payable_id=a.id and currency=a.currency; if paid+amt>a.original_amount then raise exception 'El pago supera el saldo pendiente'; end if;
 if a.currency='USD' then select er.rate into rate from public.jam_exchange_rates er where er.business_id=b and er.effective_at=(p_payment->>'paymentDate')::date and er.base_currency='USD' and er.quote_currency='VES' and upper(er.source) like '%BCV%'; if rate is null then raise exception 'No hay tasa BCV para la fecha del pago'; end if; else rate:=1; end if;
 insert into public.jam_supplier_payments(business_id,payable_id,amount,currency,applied_rate,converted_ves,payment_date,method,reference,idempotency_key,actor_id)
 values(b,a.id,amt,a.currency,rate,round(amt*rate,6),(p_payment->>'paymentDate')::date,coalesce(nullif(p_payment->>'method',''),'No especificado'),p_payment->>'reference',trim(p_payment->>'idempotencyKey'),p_actor_id) returning * into r;
 update public.jam_supplier_payables set status=case when paid+amt=a.original_amount then 'paid' else 'partial' end where id=a.id;
 insert into public.jam_cash_events(business_id,event_type,source_type,source_id,amount,currency,applied_rate,method) values(b,'supplier_payment','supplier_payment',r.id,amt,a.currency,rate,r.method);
 return to_jsonb(r); end $$;
create or replace function public.jam_purchase_payments_list(p_payable_id uuid) returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(p) from public.jam_supplier_payments p where p.business_id=public.jam_commercial_business(auth.uid(),false) and p.payable_id=p_payable_id order by p.payment_date desc $$;
create or replace function public.jam_purchase_bcv_rate_get(p_date date) returns jsonb language plpgsql stable security definer set search_path=public,auth as $$ declare b uuid; r public.jam_exchange_rates; begin b:=public.jam_commercial_business(auth.uid(),false); select * into r from public.jam_exchange_rates where business_id=b and effective_at=p_date and base_currency='USD' and quote_currency='VES' and upper(source) like '%BCV%'; if not found then raise exception 'No hay tasa BCV registrada para la fecha'; end if; return to_jsonb(r); end $$;

create or replace function public.jam_purchase_cancel(p_purchase_id uuid,p_reason text,p_actor_id uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path=public,auth as $$ declare b uuid; r public.jam_purchases; begin b:=public.jam_commercial_business(p_actor_id,true); if not exists(select 1 from public.jam_user_access where user_id=auth.uid() and business_id=b and role in ('owner','admin','inventory')) then raise exception 'Permiso para anular compras requerido'; end if; if nullif(trim(p_reason),'') is null then raise exception 'Motivo de anulación obligatorio'; end if; update public.jam_purchases set status='cancelled',notes=concat_ws(E'\n',notes,'ANULACIÓN: '||trim(p_reason)),updated_at=now() where business_id=b and id=p_purchase_id and status in ('draft','approved') and not exists(select 1 from public.jam_purchase_receipts x where x.business_id=b and x.purchase_id=jam_purchases.id) returning * into r; if not found then raise exception 'Sólo pueden anularse compras sin recepción'; end if; return to_jsonb(r); end $$;
create or replace function public.jam_quote_cancel(p_quote_id uuid,p_reason text,p_actor_id uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path=public,auth as $$ declare b uuid; r public.jam_quotes; begin b:=public.jam_commercial_business(p_actor_id,true); if nullif(trim(p_reason),'') is null then raise exception 'Motivo obligatorio'; end if; update public.jam_quotes set status='cancelled',notes=concat_ws(E'\n',notes,'CANCELADA: '||trim(p_reason)),updated_at=now() where business_id=b and id=p_quote_id and status in ('draft','pending') returning * into r; if not found then raise exception 'Cotización no encontrada o ya procesada'; end if; return to_jsonb(r); end $$;

create or replace function public.jam_customer_save(p_customer jsonb,p_actor_id uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path=public,auth as $$ declare b uuid; i uuid; r public.jam_customers; begin b:=public.jam_commercial_business(p_actor_id,true); i:=nullif(p_customer->>'id','')::uuid; if nullif(trim(p_customer->>'name'),'') is null then raise exception 'Nombre de cliente obligatorio'; end if; if (p_customer ? 'creditEnabled' or p_customer ? 'creditLimit' or p_customer ? 'creditCurrency') and not exists(select 1 from public.jam_user_access where user_id=auth.uid() and business_id=b and role in ('owner','admin')) then raise exception 'Sólo administración puede modificar condiciones de crédito'; end if;
 if i is null then insert into public.jam_customers(business_id,name,identification_type,identification_number,tax_id,phone,email,address,fiscal_address,credit_enabled,credit_limit,credit_currency,notes) values(b,trim(p_customer->>'name'),p_customer->>'identificationType',p_customer->>'identificationNumber',p_customer->>'taxId',p_customer->>'phone',p_customer->>'email',p_customer->>'address',p_customer->>'fiscalAddress',coalesce((p_customer->>'creditEnabled')::boolean,false),coalesce((p_customer->>'creditLimit')::numeric,0),coalesce(p_customer->>'creditCurrency','USD'),p_customer->>'notes') returning * into r;
 else update public.jam_customers set name=trim(p_customer->>'name'),identification_type=p_customer->>'identificationType',identification_number=p_customer->>'identificationNumber',tax_id=p_customer->>'taxId',phone=p_customer->>'phone',email=p_customer->>'email',address=p_customer->>'address',fiscal_address=p_customer->>'fiscalAddress',credit_enabled=coalesce((p_customer->>'creditEnabled')::boolean,credit_enabled),credit_limit=coalesce((p_customer->>'creditLimit')::numeric,credit_limit),credit_currency=coalesce(p_customer->>'creditCurrency',credit_currency),active=coalesce((p_customer->>'active')::boolean,active),notes=p_customer->>'notes',updated_at=now() where business_id=b and id=i returning * into r; if not found then raise exception 'Cliente no encontrado'; end if; end if; return to_jsonb(r); end $$;
create or replace function public.jam_customer_list(p_search text default null) returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(c) from public.jam_customers c where c.business_id=public.jam_commercial_business(auth.uid(),false) and (p_search is null or c.name ilike '%'||p_search||'%' or coalesce(c.identification_number,'') ilike '%'||p_search||'%') order by c.name $$;

create or replace function public.jam_quote_save(p_quote jsonb,p_actor_id uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path=public,auth as $$ declare b uuid; i uuid; l jsonb; qid uuid; sub numeric(18,6):=0; dis numeric(18,6):=0; tot numeric(18,6); q numeric(18,6); pr numeric(18,6); d numeric(18,6); begin b:=public.jam_commercial_business(p_actor_id,true); if coalesce(jsonb_typeof(p_quote->'lines'),'')<>'array' or jsonb_array_length(p_quote->'lines')=0 then raise exception 'La cotización requiere líneas'; end if; i:=nullif(p_quote->>'id','')::uuid; if i is not null then perform 1 from public.jam_quotes where business_id=b and id=i and status in ('draft','pending') for update; if not found then raise exception 'Cotización no editable'; end if; delete from public.jam_quote_lines where business_id=b and quote_id=i; update public.jam_quotes set customer_id=nullif(p_quote->>'customerId','')::uuid,currency=p_quote->>'currency',valid_until=nullif(p_quote->>'validUntil','')::date,notes=p_quote->>'notes' where business_id=b and id=i; qid:=i; else insert into public.jam_quotes(business_id,quote_number,customer_id,currency,status,valid_until,notes,created_by) values(b,coalesce(nullif(p_quote->>'quoteNumber',''),'COT-'||to_char(now(),'YYYYMMDDHH24MISSMS')),nullif(p_quote->>'customerId','')::uuid,p_quote->>'currency','pending',nullif(p_quote->>'validUntil','')::date,p_quote->>'notes',p_actor_id) returning id into qid; end if;
 for l in select value from jsonb_array_elements(p_quote->'lines') loop q:=(l->>'quantity')::numeric; pr:=(l->>'unitPrice')::numeric; d:=coalesce((l->>'discountAmount')::numeric,0); if q<=0 or pr<0 or d>q*pr or d<0 then raise exception 'Línea de cotización inválida'; end if; insert into public.jam_quote_lines(business_id,quote_id,product_id,description,quantity,unit_price,discount_amount,line_total) values(b,qid,(l->>'productId')::uuid,l->>'description',q,pr,d,q*pr-d); sub:=sub+q*pr; dis:=dis+d; end loop; if dis>0 and not exists(select 1 from public.jam_user_access where user_id=auth.uid() and business_id=b and role in ('owner','admin')) then raise exception 'Descuentos de cotización requieren autorización de administrador'; end if; tot:=sub-dis; update public.jam_quotes set subtotal=sub,discount_total=dis,total=tot,updated_at=now() where id=qid; return (select to_jsonb(x)||jsonb_build_object('lines',(select coalesce(jsonb_agg(to_jsonb(z)),'[]'::jsonb) from public.jam_quote_lines z where z.quote_id=x.id and z.business_id=b)) from public.jam_quotes x where x.id=qid); end $$;
create or replace function public.jam_quote_list(p_status text default null) returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(q)||jsonb_build_object('lines',(select coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) from public.jam_quote_lines l where l.business_id=q.business_id and l.quote_id=q.id)) from public.jam_quotes q where q.business_id=public.jam_commercial_business(auth.uid(),false) and (p_status is null or q.status=p_status) order by q.created_at desc $$;

-- Confirmación de venta: bloquea saldos, verifica stock, inserta movimientos, pagos, CxC y outbox atómicamente.
create or replace function public.jam_sale_confirm(p_sale jsonb,p_actor_id uuid default auth.uid()) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare b uuid; sid uuid; l jsonb; pr uuid; wh uuid; qty numeric(18,6); price numeric(18,6); disc numeric(18,6); tax numeric(18,6); line_total numeric(18,6); sub numeric(18,6):=0; dtotal numeric(18,6):=0; taxtotal numeric(18,6):=0; taxbase numeric(18,6):=0; exemptbase numeric(18,6):=0; total numeric(18,6); paid numeric(18,6):=0; payment jsonb; payment_id uuid; payment_index integer:=0; payment_rate numeric(18,8); payment_date date; line_index integer:=0; movement jsonb; cust uuid; recid uuid; key text; sale_no text; curr text; rate numeric(18,8); qrow public.jam_quotes; r public.jam_sales;
begin b:=public.jam_commercial_business(p_actor_id,true); wh:=(p_sale->>'warehouseId')::uuid; cust:=nullif(p_sale->>'customerId','')::uuid; curr:=p_sale->>'currency'; rate:=coalesce(nullif(p_sale->>'exchangeRate','')::numeric,1); key:=trim(p_sale->>'idempotencyKey'); if key is null or key='' then raise exception 'Clave idempotente obligatoria'; end if;
 perform pg_advisory_xact_lock(hashtextextended(b::text||':'||key,0)); select * into r from public.jam_sales where business_id=b and idempotency_key=key; if found then return to_jsonb(r); end if;
 if curr not in ('USD','VES') or rate<=0 then raise exception 'Moneda o tasa inválida'; end if; if curr='USD' then if nullif(p_sale->>'exchangeRateId','') is null or not exists(select 1 from public.jam_exchange_rates er where er.business_id=b and er.id=(p_sale->>'exchangeRateId')::uuid and er.base_currency='USD' and er.quote_currency='VES' and upper(er.source) like '%BCV%' and er.rate=rate and er.effective_at=current_date) then raise exception 'La venta en USD requiere una tasa BCV registrada y vinculada'; end if; else rate:=1; end if; if not exists(select 1 from public.jam_warehouses where business_id=b and id=wh and active) then raise exception 'Depósito inválido'; end if;
 if coalesce(jsonb_typeof(p_sale->'lines'),'')<>'array' or jsonb_array_length(p_sale->'lines')=0 then raise exception 'La venta requiere productos'; end if; if nullif(p_sale->>'quoteId','') is not null then select * into qrow from public.jam_quotes where business_id=b and id=(p_sale->>'quoteId')::uuid for update; if not found or qrow.status not in ('draft','pending') then raise exception 'Cotización ya convertida o no disponible'; end if; if qrow.currency<>curr or (select count(*) from public.jam_quote_lines where business_id=b and quote_id=qrow.id)<>jsonb_array_length(p_sale->'lines') then raise exception 'Las líneas de venta no coinciden con la cotización'; end if; if exists(select 1 from public.jam_quote_lines ql where ql.business_id=b and ql.quote_id=qrow.id and not exists(select 1 from jsonb_array_elements(p_sale->'lines') x where (x->>'productId')::uuid=ql.product_id and (x->>'quantity')::numeric=ql.quantity and (x->>'unitPrice')::numeric=ql.unit_price and coalesce((x->>'discountAmount')::numeric,0)=ql.discount_amount)) then raise exception 'Las líneas de venta no coinciden con la cotización'; end if; end if;
 for l in select value from jsonb_array_elements(p_sale->'lines') loop qty:=(l->>'quantity')::numeric; price:=(l->>'unitPrice')::numeric; disc:=coalesce((l->>'discountAmount')::numeric,0); tax:=0; if qty<=0 or price<0 or disc<0 or disc>qty*price then raise exception 'Línea de venta inválida'; end if; if nullif(l->>'taxCode','') is not null then taxbase:=taxbase+(qty*price-disc); select rate_percent into tax from public.jam_tax_rates where business_id=b and tax_code=l->>'taxCode' and active and effective_from<=current_date and (effective_to is null or effective_to>=current_date); if not found then raise exception 'Código de impuesto no configurado o fuera de vigencia'; end if; tax:=round(((qty*price-disc)*tax)/100,6); else exemptbase:=exemptbase+(qty*price-disc); end if; sub:=sub+qty*price; dtotal:=dtotal+disc; taxtotal:=taxtotal+tax; end loop; total:=sub-dtotal+taxtotal;
 if dtotal>0 and not exists(select 1 from public.jam_user_access where user_id=auth.uid() and business_id=b and role in ('owner','admin')) then raise exception 'Descuentos requieren autorización de administrador'; end if;
 if cust is not null and not exists(select 1 from public.jam_customers where business_id=b and id=cust and active) then raise exception 'Cliente no válido'; end if;
 sale_no:=coalesce(nullif(p_sale->>'saleNumber',''), 'V-'||replace(gen_random_uuid()::text,'-',''));
 insert into public.jam_sales(business_id,sale_number,customer_id,warehouse_id,currency,idempotency_key,status,exchange_rate,exchange_rate_id,subtotal,discount_total,taxable_base,exempt_total,tax_total,total,quote_id,notes,created_by)
 values(b,sale_no,cust,wh,curr,key,'confirmed',rate,nullif(p_sale->>'exchangeRateId','')::uuid,sub,dtotal,taxbase,exemptbase,taxtotal,total,nullif(p_sale->>'quoteId','')::uuid,p_sale->>'notes',p_actor_id) returning * into r; sid:=r.id;
 for l in select value from jsonb_array_elements(p_sale->'lines') loop pr:=(l->>'productId')::uuid; qty:=(l->>'quantity')::numeric; price:=(l->>'unitPrice')::numeric; disc:=coalesce((l->>'discountAmount')::numeric,0); tax:=0; if nullif(l->>'taxCode','') is not null then select rate_percent into tax from public.jam_tax_rates where business_id=b and tax_code=l->>'taxCode' and active and effective_from<=current_date and (effective_to is null or effective_to>=current_date); if not found then raise exception 'Código de impuesto no configurado o fuera de vigencia'; end if; tax:=round(((qty*price-disc)*tax)/100,6); end if; line_total:=qty*price-disc+tax;
  if not exists(select 1 from public.jam_products where business_id=b and id=pr and active) then raise exception 'Producto inválido'; end if;
  line_index:=line_index+1;
  -- Chat 2 valida disponibilidad, bloquea el saldo y registra el movimiento.
  -- La clave es determinista para que el reintento de la operación sea seguro.
  movement:=public.jam_inventory_record_movement(
    jsonb_build_object(
      'productId',pr,
      'warehouseId',wh,
      'type','exit',
      'quantity',qty,
      'reason','Venta confirmada',
      'reference',sale_no,
      'idempotencyKey','sale:'||sid::text||':line:'||line_index::text
    ),p_actor_id
  );
  insert into public.jam_sale_lines(business_id,sale_id,product_id,tax_code,description,quantity,unit_price,discount_amount,tax_rate,tax_amount,line_total) values(b,sid,pr,nullif(l->>'taxCode',''),l->>'description',qty,price,disc,coalesce((select rate_percent from public.jam_tax_rates where business_id=b and tax_code=l->>'taxCode' and active and effective_from<=current_date and (effective_to is null or effective_to>=current_date)),0),tax,line_total);
 end loop;
 for payment in select value from jsonb_array_elements(coalesce(p_sale->'payments','[]'::jsonb)) loop
  if (payment->>'amount')::numeric<=0 or payment->>'currency'<>curr then raise exception 'Los pagos de esta venta deben registrarse en la misma moneda del documento'; end if; if not exists(select 1 from public.jam_payment_methods m where m.business_id=b and m.name=payment->>'method' and m.active and curr=any(m.currencies)) then raise exception 'Método de pago no configurado o no válido para la moneda'; end if;
  paid:=paid+(payment->>'amount')::numeric; payment_index:=payment_index+1; payment_date:=coalesce(nullif(payment->>'paymentDate','')::date,current_date); if curr='USD' then select er.rate into payment_rate from public.jam_exchange_rates er where er.business_id=b and er.effective_at=payment_date and er.base_currency='USD' and er.quote_currency='VES' and upper(er.source) like '%BCV%'; if payment_rate is null then raise exception 'No hay tasa BCV para la fecha del cobro'; end if; else payment_rate:=1; end if;
  insert into public.jam_sale_payments(business_id,sale_id,amount,currency,applied_rate,converted_ves,payment_date,method,reference,idempotency_key,actor_id)
  values(b,sid,(payment->>'amount')::numeric,curr,payment_rate,round((payment->>'amount')::numeric*payment_rate,6),payment_date,trim(payment->>'method'),payment->>'reference','sale:'||sid::text||':payment:'||payment_index,p_actor_id) returning id into payment_id;
  insert into public.jam_cash_events(business_id,event_type,source_type,source_id,amount,currency,applied_rate,method) values(b,'sale_collection','sale_payment',payment_id,(payment->>'amount')::numeric,curr,payment_rate,trim(payment->>'method'));
 end loop;
 update public.jam_sales set paid_total=least(paid,total),change_total=greatest(paid-total,0),status=case when paid>=total then 'paid' when paid>0 then 'partially_paid' else 'credit' end where id=sid returning * into r; if paid>total then insert into public.jam_cash_events(business_id,event_type,source_type,source_id,amount,currency,applied_rate,method) values(b,'sale_change','sale',sid,paid-total,curr,rate,'Cambio de venta'); end if;
 if paid<total then if cust is null then raise exception 'Una venta con saldo pendiente requiere cliente'; end if; perform 1 from public.jam_customers where business_id=b and id=cust and credit_enabled for update; if not found then raise exception 'Cliente sin crédito habilitado'; end if; if (select credit_currency from public.jam_customers where business_id=b and id=cust)<>curr then raise exception 'La moneda de crédito del cliente no coincide con la venta'; end if;
  if (select coalesce(sum(a.original_amount-(select coalesce(sum(cp.amount),0) from public.jam_customer_payments cp where cp.business_id=a.business_id and cp.receivable_id=a.id and cp.currency=a.currency)),0) from public.jam_receivables a where a.business_id=b and a.customer_id=cust and a.currency=curr)+ (total-paid)> (select credit_limit from public.jam_customers where business_id=b and id=cust) then raise exception 'La venta excede el límite de crédito del cliente'; end if;
  insert into public.jam_receivables(business_id,sale_id,customer_id,currency,original_amount,due_date) values(b,sid,cust,curr,total-paid,nullif(p_sale->>'dueDate','')::date) returning id into recid;
 end if;
 if nullif(p_sale->>'quoteId','') is not null then update public.jam_quotes set status='converted',converted_sale_id=sid,updated_at=now() where business_id=b and id=(p_sale->>'quoteId')::uuid and status in ('draft','pending'); if not found then raise exception 'Cotización ya convertida o no disponible'; end if; end if;
 insert into public.jam_commercial_documents(business_id,document_type,source_type,source_id,document_number,fiscal_status,snapshot,created_by) values(b,'internal_receipt','sale',sid,sale_no,'internal',to_jsonb(r)||jsonb_build_object('lines',(select jsonb_agg(to_jsonb(x)) from public.jam_sale_lines x where x.business_id=b and x.sale_id=sid)),p_actor_id);
 return to_jsonb(r)||jsonb_build_object('receivableId',recid); end $$;

create or replace function public.jam_sale_payments_list(p_sale_id uuid) returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(p) from public.jam_sale_payments p where p.business_id=public.jam_commercial_business(auth.uid(),false) and p.sale_id=p_sale_id order by p.payment_date,p.created_at $$;
create or replace function public.jam_receivable_list(p_customer_id uuid default null,p_status text default null) returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(a)||jsonb_build_object('paidAmount',(select coalesce(sum(p.amount),0) from public.jam_customer_payments p where p.business_id=a.business_id and p.receivable_id=a.id and p.currency=a.currency),'balance',greatest(a.original_amount-(select coalesce(sum(p.amount),0) from public.jam_customer_payments p where p.business_id=a.business_id and p.receivable_id=a.id and p.currency=a.currency),0)) from public.jam_receivables a where a.business_id=public.jam_commercial_business(auth.uid(),false) and (p_customer_id is null or a.customer_id=p_customer_id) and (p_status is null or a.status=p_status) order by a.due_date nulls last,a.created_at $$;
create or replace function public.jam_customer_payment_register(p_payment jsonb,p_actor_id uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path=public,auth as $$ declare b uuid; a public.jam_receivables; amt numeric(18,6); paid numeric(18,6); rate numeric(18,8); r public.jam_customer_payments; begin b:=public.jam_commercial_business(p_actor_id,true); perform pg_advisory_xact_lock(hashtextextended(b::text||':'||trim(p_payment->>'idempotencyKey'),0)); select * into r from public.jam_customer_payments where business_id=b and idempotency_key=trim(p_payment->>'idempotencyKey'); if found then return to_jsonb(r); end if; select * into a from public.jam_receivables where business_id=b and id=(p_payment->>'receivableId')::uuid for update; if not found then raise exception 'Cuenta por cobrar no encontrada'; end if; amt:=(p_payment->>'amount')::numeric; if amt<=0 or p_payment->>'currency'<>a.currency then raise exception 'Monto o moneda inválidos'; end if; if not exists(select 1 from public.jam_payment_methods m where m.business_id=b and m.name=p_payment->>'method' and m.active and a.currency=any(m.currencies)) then raise exception 'Método de pago no configurado o no válido para la moneda'; end if; select coalesce(sum(amount),0) into paid from public.jam_customer_payments where business_id=b and receivable_id=a.id and currency=a.currency; if paid+amt>a.original_amount then raise exception 'El abono supera el saldo'; end if; if a.currency='USD' then select er.rate into rate from public.jam_exchange_rates er where er.business_id=b and er.effective_at=(p_payment->>'paymentDate')::date and er.base_currency='USD' and er.quote_currency='VES' and upper(er.source) like '%BCV%'; if rate is null then raise exception 'No hay tasa BCV para la fecha del pago'; end if; else rate:=1; end if; insert into public.jam_customer_payments(business_id,receivable_id,amount,currency,applied_rate,converted_ves,payment_date,method,reference,idempotency_key,actor_id) values(b,a.id,amt,a.currency,rate,round(amt*rate,6),(p_payment->>'paymentDate')::date,coalesce(nullif(p_payment->>'method',''),'No especificado'),p_payment->>'reference',trim(p_payment->>'idempotencyKey'),p_actor_id) returning * into r; update public.jam_receivables set status=case when paid+amt=a.original_amount then 'paid' else 'partial' end where id=a.id; insert into public.jam_cash_events(business_id,event_type,source_type,source_id,amount,currency,applied_rate,method) values(b,'customer_payment','customer_payment',r.id,amt,a.currency,rate,r.method); return to_jsonb(r); end $$;
create or replace function public.jam_customer_payments_list(p_receivable_id uuid) returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(p) from public.jam_customer_payments p where p.business_id=public.jam_commercial_business(auth.uid(),false) and p.receivable_id=p_receivable_id order by p.payment_date desc $$;
create or replace function public.jam_sale_list(p_from date default null,p_to date default null) returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(s)||jsonb_build_object('lines',(select coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) from public.jam_sale_lines l where l.business_id=s.business_id and l.sale_id=s.id)) from public.jam_sales s where s.business_id=public.jam_commercial_business(auth.uid(),false) and (p_from is null or s.created_at::date>=p_from) and (p_to is null or s.created_at::date<=p_to) order by s.created_at desc $$;
create or replace function public.jam_customer_statement(p_customer_id uuid) returns setof jsonb language sql stable security definer set search_path=public,auth as $$
 select movement from (
  select jsonb_build_object('movementType','sale','date',s.created_at,'documentNumber',s.sale_number,'currency',s.currency,'debit',s.total,'credit',0,'referenceId',s.id) movement
  from public.jam_sales s where s.business_id=public.jam_commercial_business(auth.uid(),false) and s.customer_id=p_customer_id
  union all
  select jsonb_build_object('movementType','payment','date',p.created_at,'documentNumber',coalesce(p.reference,p.id::text),'currency',p.currency,'debit',0,'credit',p.amount,'referenceId',p.id) movement
  from public.jam_customer_payments p join public.jam_receivables r on r.business_id=p.business_id and r.id=p.receivable_id
  where p.business_id=public.jam_commercial_business(auth.uid(),false) and r.customer_id=p_customer_id
 ) x order by movement->>'date'
$$;
create or replace function public.jam_commercial_document_list(p_source_type text default null,p_source_id uuid default null) returns setof jsonb language sql stable security definer set search_path=public,auth as $$ select to_jsonb(d) from public.jam_commercial_documents d where d.business_id=public.jam_commercial_business(auth.uid(),false) and (p_source_type is null or d.source_type=p_source_type) and (p_source_id is null or d.source_id=p_source_id) order by d.created_at desc $$;
create or replace function public.jam_fiscal_profile_get() returns jsonb language plpgsql stable security definer set search_path=public,auth as $$ declare b uuid; r public.jam_fiscal_profiles; begin b:=public.jam_commercial_business(auth.uid(),false); select * into r from public.jam_fiscal_profiles where business_id=b; if not found then return jsonb_build_object('configured',false,'fiscalStatus','not_configured'); end if; return to_jsonb(r); end $$;
create or replace function public.jam_fiscal_profile_save(p_profile jsonb,p_actor_id uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path=public,auth as $$ declare b uuid; r public.jam_fiscal_profiles; begin b:=public.jam_commercial_business(p_actor_id,true); if not exists(select 1 from public.jam_user_access where user_id=auth.uid() and business_id=b and role in ('owner','admin')) then raise exception 'Sólo administración puede cambiar el perfil fiscal'; end if; insert into public.jam_fiscal_profiles(business_id,legal_name,rif,fiscal_address,phone,email,authorization_provider,authorization_reference,configured) values(b,p_profile->>'legalName',p_profile->>'rif',p_profile->>'fiscalAddress',p_profile->>'phone',p_profile->>'email',p_profile->>'authorizationProvider',p_profile->>'authorizationReference',false) on conflict(business_id) do update set legal_name=excluded.legal_name,rif=excluded.rif,fiscal_address=excluded.fiscal_address,phone=excluded.phone,email=excluded.email,authorization_provider=excluded.authorization_provider,authorization_reference=excluded.authorization_reference,configured=false,updated_at=now() returning * into r; return to_jsonb(r); end $$;



create or replace function public.jam_tax_rate_save(p_rule jsonb,p_actor_id uuid default auth.uid()) returns jsonb
language plpgsql security definer set search_path=public,auth as $$ declare b uuid; r public.jam_tax_rates; begin b:=public.jam_commercial_business(p_actor_id,true); if not exists(select 1 from public.jam_user_access where user_id=auth.uid() and business_id=b and role in ('owner','admin')) then raise exception 'Sólo administración puede configurar impuestos'; end if; if nullif(trim(p_rule->>'verifiedReference'),'') is null then raise exception 'Indica referencia documental verificada para la regla tributaria'; end if; insert into public.jam_tax_rates(business_id,tax_code,rate_percent,effective_from,effective_to,verified_reference,created_by) values(b,trim(p_rule->>'taxCode'),(p_rule->>'ratePercent')::numeric,(p_rule->>'effectiveFrom')::date,nullif(p_rule->>'effectiveTo','')::date,trim(p_rule->>'verifiedReference'),p_actor_id) on conflict(business_id,tax_code,effective_from) do update set rate_percent=excluded.rate_percent,effective_to=excluded.effective_to,verified_reference=excluded.verified_reference,active=true returning * into r; return to_jsonb(r); end $$;
create or replace function public.jam_fiscal_document_prepare(p_sale_id uuid,p_document_type text default 'invoice',p_actor_id uuid default auth.uid()) returns jsonb language plpgsql security definer set search_path=public,auth as $$ declare b uuid; s public.jam_sales; f public.jam_fiscal_profiles; c public.jam_customers; d public.jam_commercial_documents; snap jsonb; begin b:=public.jam_commercial_business(p_actor_id,true); if p_document_type <> 'invoice' then raise exception 'Las notas de crédito y débito requieren operaciones de ajuste y reversión aún no implementadas; no se puede preparar un documento ficticio'; end if; select * into s from public.jam_sales where business_id=b and id=p_sale_id and status in ('confirmed','partially_paid','paid','credit') for update; if not found then raise exception 'Venta no disponible para preparación fiscal'; end if; select * into f from public.jam_fiscal_profiles where business_id=b; if not found or nullif(trim(f.legal_name),'') is null or nullif(trim(f.rif),'') is null or nullif(trim(f.fiscal_address),'') is null then raise exception 'Complete los datos fiscales del comercio antes de preparar el documento'; end if; if exists(select 1 from public.jam_commercial_documents where business_id=b and source_type='sale' and source_id=s.id and document_type=p_document_type and fiscal_status in ('pending_fiscal','fiscally_issued')) then raise exception 'Ya existe un documento fiscal preparado para esta venta'; end if; if s.customer_id is not null then select * into c from public.jam_customers where business_id=b and id=s.customer_id; end if; snap:=to_jsonb(s)||jsonb_build_object('lines',(select coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) from public.jam_sale_lines l where l.business_id=b and l.sale_id=s.id),'merchant',to_jsonb(f),'customer',case when c.id is null then null else to_jsonb(c) end,'fiscalNote','Pendiente de emisión por mecanismo autorizado; este registro no es una factura fiscal emitida.'); insert into public.jam_commercial_documents(business_id,document_type,source_type,source_id,document_number,fiscal_status,snapshot,created_by) values(b,p_document_type,'sale',s.id,'PEND-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),'pending_fiscal',snap,p_actor_id) returning * into d; return to_jsonb(d); end $$;

-- Cola de integración para Chat 4. No es una caja: no calcula saldos ni cierres.
create or replace function public.jam_cash_events_pending(p_limit integer default 100) returns setof jsonb
language plpgsql stable security definer set search_path=public,auth as $$ declare b uuid; begin b:=public.jam_commercial_business(auth.uid(),false); return query select to_jsonb(e) from public.jam_cash_events e where e.business_id=b and e.consumed_at is null order by e.created_at limit greatest(1,least(coalesce(p_limit,100),500)); end $$;
create or replace function public.jam_cash_event_mark_consumed(p_event_id uuid,p_consumer_reference text) returns jsonb
language plpgsql security definer set search_path=public,auth as $$ declare b uuid; r public.jam_cash_events; begin b:=public.jam_commercial_business(auth.uid(),true); if nullif(trim(p_consumer_reference),'') is null then raise exception 'La referencia del movimiento registrado en caja es obligatoria'; end if; update public.jam_cash_events set consumed_at=now(),consumer_reference=trim(p_consumer_reference) where business_id=b and id=p_event_id and consumed_at is null returning * into r; if not found then raise exception 'Evento inexistente o ya consumido'; end if; return to_jsonb(r); end $$;

-- Auditoría append-only de cambios comerciales. No se exponen permisos de escritura directa.
create or replace function public.jam_commercial_audit_trigger() returns trigger
language plpgsql security definer set search_path=public,auth as $$
declare b uuid; a uuid; eid uuid; begin
 b:=coalesce((to_jsonb(new)->>'business_id')::uuid,(to_jsonb(old)->>'business_id')::uuid);
 a:=coalesce(auth.uid(),nullif(coalesce(to_jsonb(new)->>'created_by',to_jsonb(new)->>'actor_id'),'')::uuid);
 eid:=coalesce((to_jsonb(new)->>'id')::uuid,(to_jsonb(old)->>'id')::uuid);
 if b is not null and a is not null and eid is not null then
  insert into public.jam_commercial_audit(business_id,actor_id,entity_type,entity_id,action,before_data,after_data)
  values(b,a,TG_TABLE_NAME,eid,TG_OP,case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,case when TG_OP in ('INSERT','UPDATE') then to_jsonb(new) else null end);
 end if;
 if TG_OP='DELETE' then return old; else return new; end if;
end $$;
do $$ declare t text; begin foreach t in array array['jam_suppliers','jam_customers','jam_purchases','jam_purchase_receipts','jam_supplier_payments','jam_quotes','jam_sales','jam_sale_payments','jam_customer_payments','jam_commercial_documents','jam_fiscal_profiles'] loop execute format('drop trigger if exists %I on public.%I',t||'_audit',t); execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.jam_commercial_audit_trigger()',t||'_audit',t); end loop; end $$;

-- Sólo RPCs públicas necesarias. Las funciones internas y tablas permanecen protegidas por RLS.
do $$ declare f text; begin foreach f in array array['jam_purchase_supplier_save(jsonb,uuid)','jam_purchase_suppliers_list(text)','jam_purchase_create(jsonb,uuid)','jam_purchase_get(uuid)','jam_purchase_list(uuid,text,date,date)','jam_purchase_approve(uuid)','jam_purchase_cancel(uuid,text,uuid)','jam_quote_cancel(uuid,text,uuid)','jam_purchase_receive_and_post(jsonb,uuid)','jam_purchase_supplier_history(uuid)','jam_purchase_receipts_list(uuid)','jam_purchase_payables_list(uuid,text)','jam_purchase_payment_register(jsonb,uuid)','jam_purchase_payments_list(uuid)','jam_purchase_bcv_rate_get(date)','jam_customer_save(jsonb,uuid)','jam_customer_list(text)','jam_quote_save(jsonb,uuid)','jam_quote_list(text)','jam_sale_confirm(jsonb,uuid)','jam_sale_payments_list(uuid)','jam_receivable_list(uuid,text)','jam_customer_payment_register(jsonb,uuid)','jam_customer_payments_list(uuid)','jam_sale_list(date,date)','jam_customer_statement(uuid)','jam_commercial_document_list(text,uuid)','jam_fiscal_profile_get()','jam_fiscal_profile_save(jsonb,uuid)','jam_fiscal_document_prepare(uuid,text,uuid)','jam_payment_method_save(jsonb,uuid)','jam_payment_method_list()','jam_cash_events_pending(integer)','jam_cash_event_mark_consumed(uuid,text)','jam_tax_rate_save(jsonb,uuid)'] loop execute format('revoke all on function public.%s from public,anon',f); execute format('grant execute on function public.%s to authenticated',f); end loop; end $$;

