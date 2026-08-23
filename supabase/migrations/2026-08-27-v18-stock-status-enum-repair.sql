-- NAGMEENA V18
-- Fix PostgreSQL 42804 enum/text mismatch during colour-variant save.
-- Safe to run after V17 and safe to run more than once.

-- IMPORTANT: do not change the helper return type in-place. Existing databases may already
-- have dependent functions. Instead cast its TEXT result explicitly at the enum assignment.
create or replace function public.nagmeena_sync_parent_from_variants(p_product_id uuid)
returns void
language plpgsql
as $$
declare
  active_count integer;
  total_qty integer;
begin
  select count(*), coalesce(sum(stock_quantity), 0)
    into active_count, total_qty
    from public.product_variants
   where product_id = p_product_id
     and is_active;

  if active_count > 0 then
    update public.products
       set stock_quantity = total_qty,
           stock_status = public.nagmeena_variant_stock_status(total_qty)::public.stock_status,
           color = coalesce(
             (select color from public.product_variants where product_id = p_product_id and is_active and is_primary limit 1),
             (select color from public.product_variants where product_id = p_product_id and is_active order by created_at asc limit 1),
             color
           )
     where id = p_product_id;
  end if;
end
$$;

-- Recalculate current parent inventory/status using the repaired type-safe assignment.
do $$
declare r record;
begin
  for r in select distinct product_id from public.product_variants loop
    perform public.nagmeena_sync_parent_from_variants(r.product_id);
  end loop;
end $$;

notify pgrst, 'reload schema';
