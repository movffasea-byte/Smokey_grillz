-- Staff are alerted to a new order only once it is real: immediately for cash and transfer
-- orders, and when payment_status flips to 'paid' for card orders (so abandoned card checkouts
-- never ping the kitchen). Customers are alerted on every status change.
-- The request body now carries `kind` ('new_order' | 'status') for the notify-order function.
create or replace function public.notify_order_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_secret text;
  v_kinds text[] := '{}';
  v_kind text;
begin
  if tg_op = 'INSERT' then
    if new.payment_method <> 'card' then v_kinds := array['new_order']; end if;
  else
    if new.payment_method = 'card' and new.payment_status = 'paid'
       and old.payment_status is distinct from new.payment_status then
      v_kinds := array_append(v_kinds, 'new_order');
    end if;
    if new.status is distinct from old.status then
      v_kinds := array_append(v_kinds, 'status');
    end if;
  end if;
  if array_length(v_kinds, 1) is null then return new; end if;

  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_secret';
  if v_secret is null then return new; end if;

  foreach v_kind in array v_kinds loop
    perform net.http_post(
      url := 'https://rtpdzslpfagctvnfpncn.supabase.co/functions/v1/notify-order',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
      body := jsonb_build_object('kind', v_kind, 'order_id', new.id),
      timeout_milliseconds := 3000
    );
  end loop;
  return new;
exception when others then
  return new;
end $$;

drop trigger orders_notify_push on public.orders;
create trigger orders_notify_push after insert or update of status, payment_status on public.orders
  for each row execute function public.notify_order_push();
