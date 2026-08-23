-- NAGMEENA v4 migration: product color, ordering, bottom length
alter table public.products add column if not exists color text;
alter table public.products add column if not exists display_order integer;
alter table public.product_specifications add column if not exists bottom_length text;
update public.products set display_order = row_number from (select id, row_number() over(order by created_at asc) as row_number from public.products) ranked where public.products.id = ranked.id and public.products.display_order is null;
