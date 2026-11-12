create table if not exists public.jam_daily_closings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  closing_date date not null,
  closing_number integer not null,
  cashier_id uuid not null references auth.users(id),
  cashier_name text not null,
  cash_currency text not null check (cash_currency in ('USD','VES')),
  opening_fund numeric(18,2) not null default 0 check (opening_fund >= 0),
  withdrawals numeric(18,2) not null default 0 check (withdrawals >= 0),
  lines jsonb not null default '[]'::jsonb check (jsonb_typeof(lines) = 'array'),
  total_mobile numeric(18,2) not null default 0,
  total_pos numeric(18,2) not null default 0,
  total_cash numeric(18,2) not null default 0,
  total_usdt numeric(18,2) not null default 0,
  notes text,
  status text not null default 'draft' check (status in ('draft','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (business_id, closing_date),
  unique (business_id, closing_number, closing_date)
);
alter table public.jam_daily_closings enable row level security;
revoke all on public.jam_daily_closings from anon, authenticated;

create or replace function public.jam_daily_closing_save(
  p_closing_date date, p_cashier_name text, p_cash_currency text,
  p_opening_fund numeric, p_withdrawals numeric, p_lines jsonb,
  p_notes text default null, p_finalize boolean default false
) returns jsonb
language plpgsql security definer set search_path = public, auth
as $$
declare
  b uuid; u uuid := auth.uid(); c public.jam_daily_closings; v_number integer;
  v_mobile numeric(18,2):=0; v_pos numeric(18,2):=0; v_cash numeric(18,2):=0; v_usdt numeric(18,2):=0;
  item jsonb; qty numeric; mobile numeric; pos numeric; cash numeric; usdt numeric; description text;
begin
  b:=public.jam_cash_require_role(true);
  if p_closing_date is null or p_cash_currency not in ('USD','VES') then raise exception 'Fecha o moneda de efectivo inválida'; end if;
  if coalesce(p_opening_fund,0)<0 or coalesce(p_withdrawals,0)<0 then raise exception 'El fondo y los retiros no pueden ser negativos'; end if;
  if nullif(trim(p_cashier_name),'') is null then raise exception 'Indique el cajero responsable'; end if;
  if p_lines is null or jsonb_typeof(p_lines)<>'array' then raise exception 'El detalle debe ser una lista de filas'; end if;
  for item in select value from jsonb_array_elements(p_lines) loop
    description:=trim(coalesce(item->>'description',''));
    if description='' then raise exception 'Cada fila necesita una descripción'; end if;
    qty:=coalesce(nullif(item->>'quantity','')::numeric,0);
    mobile:=coalesce(nullif(item->>'mobile','')::numeric,0);
    pos:=coalesce(nullif(item->>'pos','')::numeric,0);
    cash:=coalesce(nullif(item->>'cash','')::numeric,0);
    usdt:=coalesce(nullif(item->>'usdt','')::numeric,0);
    if qty<=0 or mobile<0 or pos<0 or cash<0 or usdt<0 then raise exception 'Cantidad e importes inválidos en la fila: %',description; end if;
    v_mobile:=v_mobile+mobile; v_pos:=v_pos+pos; v_cash:=v_cash+cash; v_usdt:=v_usdt+usdt;
  end loop;
  perform pg_advisory_xact_lock(hashtext(b::text),hashtext(p_closing_date::text));
  select * into c from public.jam_daily_closings where business_id=b and closing_date=p_closing_date for update;
  if found then
    if c.status='closed' then raise exception 'Este cierre ya está finalizado y no se puede editar'; end if;
    update public.jam_daily_closings set cashier_name=trim(p_cashier_name),cash_currency=p_cash_currency,
      opening_fund=p_opening_fund,withdrawals=p_withdrawals,lines=p_lines,total_mobile=v_mobile,
      total_pos=v_pos,total_cash=v_cash,total_usdt=v_usdt,notes=nullif(trim(p_notes),''),
      updated_at=now(),status=case when p_finalize then 'closed' else 'draft' end,
      closed_at=case when p_finalize then now() else null end
    where id=c.id returning * into c;
  else
    select coalesce(max(closing_number),0)+1 into v_number from public.jam_daily_closings where business_id=b;
    insert into public.jam_daily_closings(business_id,closing_date,closing_number,cashier_id,cashier_name,
      cash_currency,opening_fund,withdrawals,lines,total_mobile,total_pos,total_cash,total_usdt,notes,status,closed_at)
    values(b,p_closing_date,v_number,u,trim(p_cashier_name),p_cash_currency,p_opening_fund,p_withdrawals,
      p_lines,v_mobile,v_pos,v_cash,v_usdt,nullif(trim(p_notes),''),case when p_finalize then 'closed' else 'draft' end,
      case when p_finalize then now() else null end) returning * into c;
  end if;
  return to_jsonb(c);
end;
$$;

create or replace function public.jam_daily_closing_list(p_limit integer default 30)
returns setof jsonb language plpgsql stable security definer set search_path=public,auth
as $$
declare b uuid;
begin
  b:=public.jam_cash_require_role(false);
  return query select to_jsonb(c) from public.jam_daily_closings c
    where c.business_id=b order by c.closing_date desc,c.closing_number desc
    limit greatest(1,least(coalesce(p_limit,30),100));
end;
$$;

revoke all on function public.jam_daily_closing_save(date,text,text,numeric,numeric,jsonb,text,boolean) from public,anon;
revoke all on function public.jam_daily_closing_list(integer) from public,anon;
grant execute on function public.jam_daily_closing_save(date,text,text,numeric,numeric,jsonb,text,boolean) to authenticated;
grant execute on function public.jam_daily_closing_list(integer) to authenticated;
