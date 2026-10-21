-- Menu from the Smokey Grillz price flyer. Prices are whole naira x 100 = kobo.
-- Size/variant lines on the flyer (Full/Half/Quarter, Small/Big, ...) are separate items so each
-- shows its own price. Safe to re-run: existing names within a category are skipped.
-- No photos yet: the app shows a category emoji tile until image_url is set in Manage menu.

-- The flyer has four sections beyond the original five categories.
insert into public.categories (name, slug, sort) values
  ('Chips', 'chips', 6),
  ('Grilled Chicken', 'grilled-chicken', 7),
  ('Mac-D', 'mac-d', 8),
  ('Extra', 'extra', 9)
on conflict (slug) do nothing;

insert into public.menu_items (category_id, name, description, price_kobo)
select c.id, v.name, v.description, v.price_naira * 100
from (values
  ('shawarma', 'Beef Shawarma', null, 3000),
  ('shawarma', 'Beef Shawarma with Sausage', null, 3500),
  ('shawarma', 'Chicken Shawarma', null, 3500),
  ('shawarma', 'Chicken Shawarma with Sausage', null, 3800),

  ('loaded-fries', 'Loaded Fries (Small)', null, 4000),
  ('loaded-fries', 'Loaded Fries', null, 6000),
  ('loaded-fries', 'Loaded Fries with Extra Chicken', null, 7000),
  ('loaded-fries', 'Loaded Fries with Cheese', null, 6500),

  ('gas-meat', 'Gas Meat (Pack)', null, 4000),
  ('gas-meat', 'Gas Meat (Small)', null, 2000),
  ('gas-meat', 'Gas Meat (Half Kilo)', null, 5000),
  ('gas-meat', 'Gas Meat (1 Kilo)', null, 10000),

  ('noodles', 'Noodles and Egg', null, 1200),
  ('noodles', 'Noodles with Sausage and Egg', null, 3000),
  ('noodles', 'Noodles with Beef and Egg', null, 3000),
  ('noodles', 'Noodles with Shredded Chicken', null, 3500),

  ('masa', 'Masa with Kuli Kuli or Yaji', null, 200),
  ('masa', 'Combo - Masa with Gas Meat', null, 4000),

  ('chips', 'Chips and Egg', null, 2500),
  ('chips', 'Grilled Chicken and Chips (Full)', null, 10000),
  ('chips', 'Grilled Chicken and Chips (Half)', null, 5000),
  ('chips', 'Grilled Chicken and Chips (Quarter)', null, 3500),
  ('chips', 'Smokey Special', 'Chips, grilled chicken and egg', 7000),

  ('grilled-chicken', 'Grilled Chicken (Full)', null, 10000),
  ('grilled-chicken', 'Grilled Chicken (Half)', null, 5000),
  ('grilled-chicken', 'Grilled Chicken (Quarter)', null, 2500),

  ('mac-d', 'Mac-D (Small)', null, 1500),
  ('mac-d', 'Mac-D (Big)', null, 3000),
  ('mac-d', 'Mac-D Special', null, 4500),

  ('extra', 'Extra Sausage', null, 300),
  ('extra', 'Extra Cheese', null, 500)
) as v(slug, name, description, price_naira)
join public.categories c on c.slug = v.slug
where not exists (select 1 from public.menu_items m where m.category_id = c.id and m.name = v.name);

-- Contact numbers printed on the flyer; only filled in if still empty.
update public.store_settings
  set phone = coalesce(phone, '0904 173 3437'),
      whatsapp = coalesce(whatsapp, '0703 383 8637')
  where id = 1;
