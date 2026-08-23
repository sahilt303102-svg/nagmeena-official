-- NAGMEENA V16: server-generated NAG product codes.
create sequence if not exists public.nagmeena_product_code_seq;
do $$ declare m bigint; begin
  select coalesce(max((regexp_match(product_code, '^NAG-P([0-9]+)$'))[1]::bigint),0) into m from public.products where product_code ~ '^NAG-P[0-9]+$';
  perform setval('public.nagmeena_product_code_seq', greatest(m,1), m>0);
end $$;
create or replace function public.nagmeena_next_product_code() returns text language plpgsql security definer set search_path=public as $$
declare n bigint; begin n:=nextval('public.nagmeena_product_code_seq'); return 'NAG-P'||lpad(n::text,3,'0'); end $$;
revoke all on function public.nagmeena_next_product_code() from public;
grant execute on function public.nagmeena_next_product_code() to service_role;
notify pgrst, 'reload schema';
