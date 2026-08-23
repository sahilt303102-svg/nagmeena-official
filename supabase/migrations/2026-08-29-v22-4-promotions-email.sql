
alter table public.orders
  add column if not exists confirmation_email_sent_at timestamptz,
  add column if not exists confirmation_email_last_error text;

create table if not exists public.site_promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Special Offer',
  image_url text not null default '',
  image_path text,
  cta_text text not null default 'Browse Collection',
  cta_url text not null default '/#collections',
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  display_seconds integer not null default 6 check (display_seconds between 3 and 15),
  show_once_per_session boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.site_promotions (title, image_url, cta_text, cta_url, is_active, display_seconds, show_once_per_session)
select 'Special Offer', '', 'Browse Collection', '/#collections', false, 6, true
where not exists (select 1 from public.site_promotions);

alter table public.site_promotions enable row level security;
notify pgrst, 'reload schema';
