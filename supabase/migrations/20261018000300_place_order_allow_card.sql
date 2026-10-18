-- Allow card as a payment method in place_order. Card orders stay payment_status='unpaid'
-- until the flutterwave-verify edge function confirms the payment.
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
