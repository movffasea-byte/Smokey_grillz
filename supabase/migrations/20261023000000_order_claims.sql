-- Staff claim orders so two people never work the same one.
-- Rules enforced here (not just in the app):
--   * staff must claim an order before changing its status or payment;
--   * once claimed, only the claimer or an admin can change it;
--   * admins can act on any order, release a claim, or claim for themselves;
--   * server-side updates (service role, e.g. the payment webhook) are not restricted.
alter table public.orders
  add column claimed_by uuid references public.profiles(id) on delete set null,
  add column claimed_at timestamptz;

create index on public.orders(claimed_by);

create function public.claim_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_updated int;
begin
  if not public.is_staff() then raise exception 'only staff can claim orders'; end if;
  perform set_config('app.claim_rpc', 'on', true);
  update public.orders set claimed_by = auth.uid(), claimed_at = now()
    where id = p_order_id and claimed_by is null;
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    if exists (select 1 from public.orders where id = p_order_id and claimed_by = auth.uid()) then return; end if;
    raise exception 'this order was already claimed';
  end if;
end $$;
revoke all on function public.claim_order from public, anon;
grant execute on function public.claim_order to authenticated;

create function public.release_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'only staff can release orders'; end if;
  perform set_config('app.claim_rpc', 'on', true);
  update public.orders set claimed_by = null, claimed_at = null
    where id = p_order_id and (claimed_by = auth.uid() or public.is_admin());
end $$;
revoke all on function public.release_order from public, anon;
grant execute on function public.release_order to authenticated;

create function public.enforce_order_claim() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Server-side writes (webhooks, edge functions) have no signed-in user.
  if auth.uid() is null then return new; end if;
  -- The claim columns only change through claim_order / release_order.
  if (new.claimed_by is distinct from old.claimed_by or new.claimed_at is distinct from old.claimed_at)
     and coalesce(current_setting('app.claim_rpc', true), '') <> 'on' then
    raise exception 'use claim_order to claim an order';
  end if;
  if coalesce(current_setting('app.claim_rpc', true), '') = 'on' then return new; end if;
  if public.is_admin() then return new; end if;
  if new.status is distinct from old.status or new.payment_status is distinct from old.payment_status then
    if old.claimed_by is null then raise exception 'claim this order first'; end if;
    if old.claimed_by <> auth.uid() then raise exception 'this order is claimed by another staff member'; end if;
  end if;
  return new;
end $$;
revoke all on function public.enforce_order_claim from public, anon, authenticated;

create trigger orders_enforce_claim before update on public.orders
  for each row execute function public.enforce_order_claim();
