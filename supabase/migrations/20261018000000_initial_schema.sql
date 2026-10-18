-- Smokey Grillz initial schema. Money is stored as integer kobo.

-- ============ Tables ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer','staff','admin')),
  push_token text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort int not null default 0,
  active boolean not null default true
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text,
  price_kobo int not null check (price_kobo >= 0),
  image_url text,
  available boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.menu_items(category_id);

create table public.item_options (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  required boolean not null default false,
  max_choices int not null default 1
);
create index on public.item_options(item_id);

create table public.option_choices (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.item_options(id) on delete cascade,
  name text not null,
  price_delta_kobo int not null default 0,
  available boolean not null default true
);
create index on public.option_choices(option_id);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  line text not null,
  area text,
  lat double precision,
  lng double precision
);
create index on public.addresses(user_id);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fee_kobo int not null check (fee_kobo >= 0),
  active boolean not null default true
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  type text not null check (type in ('pickup','delivery')),
  status text not null default 'pending'
    check (status in ('pending','confirmed','preparing','ready','out_for_delivery','completed','cancelled')),
  subtotal_kobo int not null,
  delivery_fee_kobo int not null default 0,
  total_kobo int not null,
  delivery_zone_id uuid references public.delivery_zones(id),
  address jsonb,
  payment_method text not null default 'cash' check (payment_method in ('cash','transfer','card')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  notes text,
  created_at timestamptz not null default now()
);
create index on public.orders(user_id);
create index on public.orders(status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name text not null,
  unit_price_kobo int not null,
  qty int not null check (qty > 0),
  options jsonb not null default '[]'
);
create index on public.order_items(order_id);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now()
);
create index on public.order_events(order_id);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  kind text not null default 'banner',
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

create table public.store_settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Smokey Grillz',
  address text not null default 'Somalia Road, beside Market Square, Barnawa Complex, Kaduna',
  phone text,
  whatsapp text,
  instagram text not null default '@Smokey_grillz',
  hours jsonb not null default '{}',
  lat double precision,
  lng double precision,
  accepting_orders boolean not null default true
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  reference text not null unique,
  status text not null,
  amount_kobo int not null,
  created_at timestamptz not null default now()
);

-- ============ Helpers ============
create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','staff'));
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- New auth user -> profile
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins may change roles
create function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'only admins can change roles';
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- Log status changes
create function public.log_order_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_events (order_id, status) values (new.id, new.status);
  end if;
  return new;
end $$;
create trigger orders_log_event after insert or update on public.orders
  for each row execute function public.log_order_event();

-- ============ place_order ============
-- p_items: [{"menu_item_id": uuid, "qty": int, "choice_ids": [uuid, ...]}]
-- p_address (delivery only): {"line": text, "area": text, "lat": num, "lng": num}
create function public.place_order(
  p_type text,
  p_items jsonb,
  p_delivery_zone_id uuid default null,
  p_address jsonb default null,
  p_payment_method text default 'cash',
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_order uuid;
  v_subtotal int := 0;
  v_fee int := 0;
  v_item jsonb;
  v_mi public.menu_items;
  v_unit int;
  v_qty int;
  v_opts jsonb;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not (select accepting_orders from public.store_settings where id = 1) then
    raise exception 'store is not accepting orders';
  end if;
  if p_type not in ('pickup','delivery') then raise exception 'invalid order type'; end if;
  if p_payment_method not in ('cash','transfer') then raise exception 'invalid payment method'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'empty cart'; end if;

  if p_type = 'delivery' then
    if p_address is null or coalesce(p_address->>'line','') = '' then
      raise exception 'delivery address required';
    end if;
    select fee_kobo into v_fee from public.delivery_zones
      where id = p_delivery_zone_id and active;
    if not found then raise exception 'invalid delivery zone'; end if;
  end if;

  insert into public.orders (user_id, type, subtotal_kobo, total_kobo, delivery_zone_id,
                             address, payment_method, notes)
  values (v_uid, p_type, 0, 0, p_delivery_zone_id, p_address, p_payment_method, p_notes)
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then raise exception 'invalid quantity'; end if;

    select * into v_mi from public.menu_items
      where id = (v_item->>'menu_item_id')::uuid and available;
    if not found then raise exception 'item unavailable'; end if;

    select coalesce(sum(c.price_delta_kobo), 0),
           coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'price_delta_kobo', c.price_delta_kobo)), '[]')
      into v_unit, v_opts
      from public.option_choices c
      join public.item_options o on o.id = c.option_id
      where o.item_id = v_mi.id and c.available
        and c.id in (select (jsonb_array_elements_text(coalesce(v_item->'choice_ids', '[]')))::uuid);

    v_unit := v_mi.price_kobo + v_unit;
    v_subtotal := v_subtotal + v_unit * v_qty;
    insert into public.order_items (order_id, menu_item_id, name, unit_price_kobo, qty, options)
    values (v_order, v_mi.id, v_mi.name, v_unit, v_qty, v_opts);
  end loop;

  update public.orders
    set subtotal_kobo = v_subtotal, delivery_fee_kobo = v_fee, total_kobo = v_subtotal + v_fee
    where id = v_order;
  return v_order;
end $$;
revoke all on function public.place_order from public, anon;
grant execute on function public.place_order to authenticated;

-- ============ RLS ============
alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.menu_items     enable row level security;
alter table public.item_options   enable row level security;
alter table public.option_choices enable row level security;
alter table public.addresses      enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.order_events   enable row level security;
alter table public.promotions     enable row level security;
alter table public.store_settings enable row level security;
alter table public.payments       enable row level security;

-- Profiles: own row (role guarded by trigger), staff can read all
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Addresses: own rows
create policy addresses_all on public.addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Public read / staff write
create policy categories_read on public.categories for select using (active or public.is_staff());
create policy categories_write on public.categories for all using (public.is_staff()) with check (public.is_staff());

create policy menu_items_read on public.menu_items for select using (available or public.is_staff());
create policy menu_items_write on public.menu_items for all using (public.is_staff()) with check (public.is_staff());

create policy item_options_read on public.item_options for select using (true);
create policy item_options_write on public.item_options for all using (public.is_staff()) with check (public.is_staff());

create policy option_choices_read on public.option_choices for select using (available or public.is_staff());
create policy option_choices_write on public.option_choices for all using (public.is_staff()) with check (public.is_staff());

create policy delivery_zones_read on public.delivery_zones for select using (active or public.is_staff());
create policy delivery_zones_write on public.delivery_zones for all using (public.is_staff()) with check (public.is_staff());

create policy promotions_read on public.promotions for select
  using ((active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
         or public.is_staff());
create policy promotions_write on public.promotions for all using (public.is_staff()) with check (public.is_staff());

create policy store_settings_read on public.store_settings for select using (true);
create policy store_settings_write on public.store_settings for update using (public.is_staff()) with check (public.is_staff());

-- Orders: read own, staff read all; no direct insert (place_order); staff update status columns only
create policy orders_select on public.orders for select using (user_id = auth.uid() or public.is_staff());
create policy orders_update on public.orders for update using (public.is_staff()) with check (public.is_staff());
revoke update on public.orders from authenticated;
grant update (status, payment_status) on public.orders to authenticated;

create policy order_items_select on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())));
create policy order_events_select on public.order_events for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())));

-- Payments: staff read; writes via service role only
create policy payments_select on public.payments for select using (public.is_staff());

-- ============ Storage ============
insert into storage.buckets (id, name, public) values ('menu-images', 'menu-images', true)
  on conflict (id) do nothing;
create policy menu_images_read on storage.objects for select using (bucket_id = 'menu-images');
create policy menu_images_write on storage.objects for all
  using (bucket_id = 'menu-images' and public.is_staff())
  with check (bucket_id = 'menu-images' and public.is_staff());

-- ============ Seed ============
insert into public.store_settings (id) values (1);
insert into public.categories (name, slug, sort) values
  ('Shawarma', 'shawarma', 1),
  ('Loaded Fries', 'loaded-fries', 2),
  ('Gas Meat', 'gas-meat', 3),
  ('Noodles', 'noodles', 4),
  ('Masa', 'masa', 5);
