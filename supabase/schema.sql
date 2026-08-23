-- NAGMEENA catalog schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

do $$
begin
  create type public.stock_status as enum ('in_stock', 'low_stock', 'out_of_stock', 'preorder');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  product_code text not null unique,
  category_id uuid not null references public.categories(id) on update cascade on delete restrict,
  price numeric(12,2),
  stock_status public.stock_status not null default 'in_stock',
  card_fabric text,
  card_work text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_specifications (
  product_id uuid primary key references public.products(id) on delete cascade,
  upper_fabric text,
  upper_work text,
  upper_print text,
  upper_length text,
  bottom_fabric text,
  bottom_type text,
  dupatta_fabric text,
  dupatta_work text,
  dupatta_length text,
  dupatta_print text,
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  image_path text,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(is_active);
create index if not exists product_images_product_id_idx on public.product_images(product_id);
create index if not exists product_images_sort_idx on public.product_images(product_id, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists product_specs_set_updated_at on public.product_specifications;
create trigger product_specs_set_updated_at
before update on public.product_specifications
for each row execute function public.set_updated_at();

-- Admin mutations are performed by the Next.js server using the server-only
-- SUPABASE_SECRET_KEY. Public browser access remains read-only through RLS.

-- Seed categories.
insert into public.categories (slug, label, sort_order)
values
  ('anarkali', 'Batch 1', 1),
  ('straight', 'Batch 2', 2),
  ('festive', 'Batch 3', 3),
  ('designer', 'Batch 4', 4)
on conflict (slug) do update
set label = excluded.label, sort_order = excluded.sort_order, is_active = true;

-- Seed the 12 products currently present in the static site.
insert into public.products (name, product_code, category_id, price, stock_status, card_fabric, card_work)
values
  ('Meherunissa Anarkali', 'NAG-P001', (select id from public.categories where slug='anarkali'), null, 'in_stock', 'Pure Chanderi Silk', 'Zari Embroidery'),
  ('Zeenat Floor-Length Anarkali', 'NAG-P002', (select id from public.categories where slug='anarkali'), null, 'in_stock', 'Georgette', 'Thread & Sequin'),
  ('Rania Panelled Anarkali', 'NAG-P003', (select id from public.categories where slug='anarkali'), null, 'in_stock', 'Muslin Silk', 'Gota Patti'),
  ('Amira Straight Suit', 'NAG-P004', (select id from public.categories where slug='straight'), null, 'in_stock', 'Cotton Silk', 'Block Print'),
  ('Farah Panelled Straight Suit', 'NAG-P005', (select id from public.categories where slug='straight'), null, 'in_stock', 'Modal Satin', 'Mirror Work'),
  ('Layla Kurta Set', 'NAG-P006', (select id from public.categories where slug='straight'), null, 'in_stock', 'Chanderi Cotton', 'Hand Block Print'),
  ('Noorjahan Festive Suit', 'NAG-P007', (select id from public.categories where slug='festive'), null, 'in_stock', 'Organza Silk', 'Sequin & Zari'),
  ('Yasmin Ceremonial Set', 'NAG-P008', (select id from public.categories where slug='festive'), null, 'in_stock', 'Silk Blend', 'Dabka Embroidery'),
  ('Sahiba Radiance Suit', 'NAG-P009', (select id from public.categories where slug='festive'), null, 'in_stock', 'Tissue Silk', 'Kundan & Zari'),
  ('Gulnaar Heavy Bridal Suit', 'NAG-P010', (select id from public.categories where slug='designer'), null, 'in_stock', 'Velvet', 'Zardozi Embroidery'),
  ('Mahira Couture Suit', 'NAG-P011', (select id from public.categories where slug='designer'), null, 'in_stock', 'Raw Silk', 'Hand Embellished'),
  ('Shireen Regal Suit', 'NAG-P012', (select id from public.categories where slug='designer'), null, 'in_stock', 'Banarasi Silk', 'Zari Weave')
on conflict (product_code) do update set
  name = excluded.name,
  category_id = excluded.category_id,
  card_fabric = excluded.card_fabric,
  card_work = excluded.card_work;

insert into public.product_specifications (product_id)
select id from public.products
on conflict (product_id) do nothing;

-- Seed the existing local images as temporary URLs. The admin panel can replace
-- these with ImageKit URLs. Existing local files remain usable during migration.
insert into public.product_images (product_id, image_url, sort_order, is_primary)
select p.id, v.image_url, v.sort_order, v.sort_order = 0
from (values
  ('NAG-P001','/products/p1-1.png',0),('NAG-P001','/products/p1-2.png',1),('NAG-P001','/products/p1-3.png',2),
  ('NAG-P002','/products/p2-1.png',0),('NAG-P002','/products/p2-2.png',1),
  ('NAG-P003','/products/p3-1.png',0),('NAG-P003','/products/p3-2.png',1),
  ('NAG-P004','/products/p4-1.png',0),('NAG-P004','/products/p4-2.png',1),
  ('NAG-P005','/products/p5-1.png',0),('NAG-P005','/products/p5-2.png',1),
  ('NAG-P006','/products/p6-1.png',0),('NAG-P006','/products/p6-2.png',1),
  ('NAG-P007','/products/p7-1.png',0),('NAG-P007','/products/p7-2.png',1),('NAG-P007','/products/p7-3.png',2),
  ('NAG-P008','/products/p8-1.png',0),('NAG-P008','/products/p8-2.png',1),('NAG-P008','/products/p8-3.png',2),
  ('NAG-P009','/products/p9-1.png',0),('NAG-P009','/products/p9-2.png',1),('NAG-P009','/products/p9-3.png',2),
  ('NAG-P010','/products/p10-1.png',0),('NAG-P010','/products/p10-2.png',1),
  ('NAG-P011','/products/p11-1.png',0),('NAG-P011','/products/p11-2.png',1),('NAG-P011','/products/p11-3.png',2),
  ('NAG-P012','/products/p12-1.png',0),('NAG-P012','/products/p12-2.png',1)
) as v(product_code, image_url, sort_order)
join public.products p on p.product_code = v.product_code
where not exists (
  select 1 from public.product_images pi where pi.product_id = p.id
);

-- ============================================================
-- NAGMEENA v2 migration: no public categories + dynamic hero
-- Safe to run after the original schema above.
-- ============================================================

alter table public.products alter column category_id drop not null;

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  slide_number integer not null unique check (slide_number between 1 and 3),
  title text not null,
  desktop_image_url text not null,
  mobile_image_url text not null,
  desktop_image_path text,
  mobile_image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists hero_slides_set_updated_at on public.hero_slides;
create trigger hero_slides_set_updated_at
before update on public.hero_slides
for each row execute function public.set_updated_at();

insert into public.hero_slides (slide_number, title, desktop_image_url, mobile_image_url)
values
  (1, 'Anarkali Suits — Festive Silhouettes', '/desk1.png', '/mobile1.png'),
  (2, 'Straight Suits — Everyday Grace', '/desk 2.png', '/mobile2.png'),
  (3, 'Designer Heavy Suits — Bridal Radiance', '/desk 3.png', '/mobile3.png')
on conflict (slide_number) do nothing;

-- Public catalog: only active products are visible.
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_specifications enable row level security;
alter table public.hero_slides enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read images for active products" on public.product_images;
create policy "Public can read images for active products"
on public.product_images for select
to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.is_active = true));

drop policy if exists "Public can read specs for active products" on public.product_specifications;
create policy "Public can read specs for active products"
on public.product_specifications for select
to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.is_active = true));

drop policy if exists "Public can read active hero slides" on public.hero_slides;
create policy "Public can read active hero slides"
on public.hero_slides for select
to anon, authenticated
using (is_active = true);
