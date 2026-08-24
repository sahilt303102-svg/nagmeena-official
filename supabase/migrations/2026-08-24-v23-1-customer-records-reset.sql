-- V23.1 customer-records housekeeping.
-- This DOES NOT delete orders or order_items.
-- It only hides older snapshots from the Admin "Customer Records" section,
-- keeping the 3 most recent existing records visible as a clean starting point.

alter table public.orders
  add column if not exists customer_record_visible boolean not null default true;

with ranked as (
  select id, row_number() over (order by created_at desc, id desc) as rn
  from public.orders
)
update public.orders as o
set customer_record_visible = (ranked.rn <= 3)
from ranked
where o.id = ranked.id;

create index if not exists orders_customer_record_visible_created_idx
  on public.orders(customer_record_visible, created_at desc);

notify pgrst, 'reload schema';
