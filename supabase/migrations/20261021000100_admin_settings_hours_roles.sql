-- Store settings and delivery zones become admin-only; staff keep menu and order access.
drop policy store_settings_write on public.store_settings;
create policy store_settings_write on public.store_settings for update
  using (public.is_admin()) with check (public.is_admin());

drop policy delivery_zones_write on public.delivery_zones;
create policy delivery_zones_write on public.delivery_zones for all
  using (public.is_admin()) with check (public.is_admin());

-- Admin-only role changes. profiles.role is not client-writable, so the app goes through this.
create function public.set_user_role(p_user_id uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'only admins can change roles'; end if;
  if p_role not in ('customer','staff','admin') then raise exception 'invalid role'; end if;
  if p_user_id = auth.uid() then raise exception 'you cannot change your own role'; end if;
  update public.profiles set role = p_role where id = p_user_id;
end $$;
revoke all on function public.set_user_role from public, anon;
grant execute on function public.set_user_role to authenticated;

-- Opening hours live in store_settings.hours as
--   {"mon": {"open": "10:00", "close": "22:00", "closed": false}, ...}  (keys sun..sat, Lagos time).
-- Empty hours, or a day with no entry, means no restriction. A close time at or before the open
-- time means the shop stays open past midnight.
create function public.store_open_now() returns boolean
language plpgsql stable set search_path = public as $$
declare
  v_hours jsonb;
  v_days text[] := array['sun','mon','tue','wed','thu','fri','sat'];
  v_dow int := extract(dow from now() at time zone 'Africa/Lagos')::int;
  v_today jsonb;
  v_yday jsonb;
  v_t time := (now() at time zone 'Africa/Lagos')::time;
begin
  select hours into v_hours from public.store_settings where id = 1;
  if v_hours is null or v_hours = '{}'::jsonb then return true; end if;

  v_today := v_hours -> v_days[v_dow + 1];
  v_yday := v_hours -> v_days[((v_dow + 6) % 7) + 1];

  -- still inside yesterday's after-midnight hours
  if v_yday is not null and not coalesce((v_yday->>'closed')::boolean, false)
     and (v_yday->>'close')::time <= (v_yday->>'open')::time
     and v_t < (v_yday->>'close')::time then
    return true;
  end if;

  if v_today is null then return true; end if;
  if coalesce((v_today->>'closed')::boolean, false) then return false; end if;

  if (v_today->>'close')::time > (v_today->>'open')::time then
    return v_t >= (v_today->>'open')::time and v_t < (v_today->>'close')::time;
  end if;
  return v_t >= (v_today->>'open')::time;
exception when others then
  return true; -- bad hours data must never block ordering
end $$;
revoke execute on function public.store_open_now() from public, anon, authenticated;

-- place_order: same as before plus the opening-hours check.
create or replace function public.place_order(
  p_type text, p_items jsonb, p_delivery_zone_id uuid default null, p_address jsonb default null,
  p_payment_method text default 'cash', p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  if not public.store_open_now() then
    raise exception 'store is closed right now (outside opening hours)';
  end if;
  if p_type not in ('pickup','delivery') then raise exception 'invalid order type'; end if;
  if p_payment_method not in ('cash','transfer','card') then raise exception 'invalid payment method'; end if;
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
end $function$;

-- DEMO delivery zones so delivery can be tried out. Replace names and fees in the admin
-- Store settings screen with the real ones. Only inserted while the table is empty.
insert into public.delivery_zones (name, fee_kobo)
select v.name, v.fee_kobo
from (values
  ('Demo - Barnawa', 50000),
  ('Demo - Kaduna Central', 100000),
  ('Demo - Outskirts', 150000)
) as v(name, fee_kobo)
where not exists (select 1 from public.delivery_zones);
