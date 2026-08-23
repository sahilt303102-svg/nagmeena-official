-- NAGMEENA V14: inventory, returns and reliable order lifecycle.
-- Run once after the V13 migration. Safe to re-run.

alter table public.products add column if not exists stock_quantity integer not null default 0;
update public.products
set stock_quantity = case
  when stock_status = 'out_of_stock' then 0
  when stock_quantity is null or stock_quantity = 0 then 1
  else stock_quantity
end;

alter table public.orders add column if not exists stock_reserved boolean not null default false;
alter table public.orders add column if not exists returned_at timestamptz;
alter table public.orders add column if not exists return_action text;

create index if not exists products_stock_quantity_idx on public.products(stock_quantity);
create index if not exists orders_stock_reserved_idx on public.orders(stock_reserved, status);

-- Keep status consistent with inventory quantity.
create or replace function public.nagmeena_sync_product_stock_status()
returns trigger language plpgsql as $$
begin
  if new.stock_quantity <= 0 then
    new.stock_quantity := 0;
    new.stock_status := 'out_of_stock';
  elsif new.stock_quantity <= 2 then
    new.stock_status := 'low_stock';
  else
    new.stock_status := 'in_stock';
  end if;
  return new;
end $$;

drop trigger if exists nagmeena_products_stock_sync on public.products;
create trigger nagmeena_products_stock_sync
before insert or update of stock_quantity on public.products
for each row execute function public.nagmeena_sync_product_stock_status();

-- Atomically reserve stock for a submitted order. Returns false if any item is unavailable.
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
    select product_id, quantity from public.order_items where order_id=p_order_id for update
  loop
    if item.product_id is null then return false; end if;
    update public.products
      set stock_quantity = stock_quantity - item.quantity
      where id=item.product_id and stock_quantity >= item.quantity;
    get diagnostics affected = row_count;
    if affected = 0 then
      -- rollback earlier decrements by raising an exception handled below
      raise exception 'INSUFFICIENT_STOCK';
    end if;
  end loop;

  update public.orders set stock_reserved=true, updated_at=now() where id=p_order_id;
  return true;
exception when others then
  if SQLERRM = 'INSUFFICIENT_STOCK' then return false; end if;
  raise;
end $$;

-- Restore stock exactly once when an order is rejected or a return is restocked.
create or replace function public.nagmeena_restore_order_stock(p_order_id uuid)
returns boolean language plpgsql security definer as $$
declare
  item record;
  reserved boolean;
begin
  select stock_reserved into reserved from public.orders where id=p_order_id for update;
  if not found then return false; end if;
  if not reserved then return true; end if;
  for item in select product_id, quantity from public.order_items where order_id=p_order_id loop
    if item.product_id is not null then
      update public.products set stock_quantity = stock_quantity + item.quantity where id=item.product_id;
    end if;
  end loop;
  update public.orders set stock_reserved=false, updated_at=now() where id=p_order_id;
  return true;
end $$;

-- Make PostgREST immediately see new columns/functions.
notify pgrst, 'reload schema';
