-- Calls the notify-order edge function when an order is placed or its status changes.
-- The shared secret lives in Vault (name: notify_secret), never in this file. Until it is
-- created the trigger does nothing, and a failure here must never block placing an order.
create extension if not exists pg_net with schema extensions;

create function public.notify_order_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_secret text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_secret';
  if v_secret is null then return new; end if;

  perform net.http_post(
    url := 'https://rtpdzslpfagctvnfpncn.supabase.co/functions/v1/notify-order',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
    body := jsonb_build_object('event', tg_op, 'order_id', new.id),
    timeout_milliseconds := 3000
  );
  return new;
exception when others then
  return new;
end $$;

revoke execute on function public.notify_order_push() from public, anon, authenticated;

create trigger orders_notify_push after insert or update of status on public.orders
  for each row execute function public.notify_order_push();
