-- NAGMEENA V15: colour variants + variant-level inventory.
-- Run AFTER the V14 migration. Safe to re-run.

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color text not null,
  product_code text not null,
  custom_code text not null,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists product_variants_product_code_unique on public.product_variants(lower(product_code));
create unique index if not exists product_variants_custom_code_unique on public.product_variants(custom_code);
create unique index if not exists product_variants_color_per_product_unique on public.product_variants(product_id, lower(color));
create unique index if not exists product_variants_one_primary_per_product on public.product_variants(product_id) where is_primary and is_active;
create index if not exists product_variants_product_idx on public.product_variants(product_id, is_active);

grant select on public.product_variants to anon, authenticated;
alter table public.product_variants enable row level security;
drop policy if exists "Public can read active product variants" on public.product_variants;
create policy "Public can read active product variants" on public.product_variants for select to anon, authenticated using (is_active = true);

alter table public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
alter table public.order_items add column if not exists variant_product_code text;
alter table public.order_items add column if not exists variant_custom_code text;
alter table public.order_items add column if not exists variant_color text;

create or replace function public.nagmeena_variant_stock_status(q integer)
returns text language sql immutable as $$
  select case when coalesce(q,0) <= 0 then 'out_of_stock'
              when q <= 2 then 'low_stock'
              else 'in_stock' end
$$;

create or replace function public.nagmeena_sync_parent_from_variants(p_product_id uuid)
returns void language plpgsql as $$
declare
  active_count integer;
  total_qty integer;
begin
  select count(*), coalesce(sum(stock_quantity),0)
    into active_count,total_qty
    from public.product_variants
   where product_id=p_product_id and is_active;

  if active_count > 0 then
    update public.products
       set stock_quantity = total_qty,
           stock_status = public.nagmeena_variant_stock_status(total_qty)::public.stock_status,
           color = coalesce(
             (select color from public.product_variants where product_id=p_product_id and is_active and is_primary limit 1),
             (select color from public.product_variants where product_id=p_product_id and is_active order by created_at asc limit 1),
             color
           )
     where id=p_product_id;
  end if;
end $$;

create or replace function public.nagmeena_sync_variant_parent_trigger()
returns trigger language plpgsql as $$
begin
  if tg_op='DELETE' then
    perform public.nagmeena_sync_parent_from_variants(old.product_id);
    return old;
  end if;
  new.stock_quantity := greatest(coalesce(new.stock_quantity,0),0);
  new.updated_at := now();
  perform public.nagmeena_sync_parent_from_variants(new.product_id);
  return new;
end $$;

-- Use AFTER trigger so the aggregate sees the just-written row.
create or replace function public.nagmeena_sync_variant_parent_after()
returns trigger language plpgsql as $$
begin
  if tg_op='DELETE' then
    perform public.nagmeena_sync_parent_from_variants(old.product_id);
    return old;
  end if;
  perform public.nagmeena_sync_parent_from_variants(new.product_id);
  return new;
end $$;

drop trigger if exists nagmeena_product_variants_touch on public.product_variants;
create trigger nagmeena_product_variants_touch
before insert or update on public.product_variants
for each row execute function public.nagmeena_sync_variant_parent_trigger();

drop trigger if exists nagmeena_product_variants_parent_sync on public.product_variants;
create trigger nagmeena_product_variants_parent_sync
after insert or update or delete on public.product_variants
for each row execute function public.nagmeena_sync_variant_parent_after();

-- Reserve exact selected variant stock when one exists; otherwise use legacy product stock.
create or replace function public.nagmeena_reserve_order_stock(p_order_id uuid)
returns boolean language plpgsql security definer as $$
declare
  item record;
  affected integer;
  already_reserved boolean;
begin
  select stock_reserved into already_reserved from public.orders where id=p_order_id for update;
  if not found then return false; end if;
  if already_reserved then return true; end if;

  for item in
    select product_id, variant_id, quantity from public.order_items where order_id=p_order_id for update
  loop
    if item.variant_id is not null then
      update public.product_variants
         set stock_quantity = stock_quantity - item.quantity
       where id=item.variant_id and is_active and stock_quantity >= item.quantity;
    else
      update public.products
         set stock_quantity = stock_quantity - item.quantity
       where id=item.product_id and stock_quantity >= item.quantity;
    end if;
    get diagnostics affected = row_count;
    if affected = 0 then raise exception 'INSUFFICIENT_STOCK'; end if;
  end loop;

  update public.orders set stock_reserved=true, updated_at=now() where id=p_order_id;
  return true;
exception when others then
  if SQLERRM = 'INSUFFICIENT_STOCK' then return false; end if;
  raise;
end $$;

create or replace function public.nagmeena_restore_order_stock(p_order_id uuid)
returns boolean language plpgsql security definer as $$
declare
  item record;
  reserved boolean;
begin
  select stock_reserved into reserved from public.orders where id=p_order_id for update;
  if not found then return false; end if;
  if not reserved then return true; end if;

  for item in select product_id, variant_id, quantity from public.order_items where order_id=p_order_id loop
    if item.variant_id is not null then
      update public.product_variants set stock_quantity=stock_quantity+item.quantity where id=item.variant_id;
    elsif item.product_id is not null then
      update public.products set stock_quantity=stock_quantity+item.quantity where id=item.product_id;
    end if;
  end loop;

  update public.orders set stock_reserved=false, updated_at=now() where id=p_order_id;
  return true;
end $$;

-- Bring existing parent totals in sync for products where variants already exist.
do $$ declare r record; begin
  for r in select distinct product_id from public.product_variants loop
    perform public.nagmeena_sync_parent_from_variants(r.product_id);
  end loop;
end $$;

notify pgrst, 'reload schema';
