-- Customers may now read unavailable items so the app can show them as "Sold out" instead of
-- hiding them. Writes are unchanged (is_staff), and place_order still rejects unavailable items.
drop policy menu_items_read on public.menu_items;
create policy menu_items_read on public.menu_items for select using (true);
