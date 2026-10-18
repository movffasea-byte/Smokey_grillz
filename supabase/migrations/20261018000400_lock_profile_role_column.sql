-- Customers may only edit their own name, phone and push token. role/id/created_at are not client-writable.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, push_token) on public.profiles to authenticated;
