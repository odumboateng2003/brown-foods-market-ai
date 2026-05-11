
-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create policy "Categories are viewable by everyone" on public.categories for select using (true);

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price_ghs numeric(10,2) not null check (price_ghs >= 0),
  unit text not null default 'kg',
  image_url text,
  stock int not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "Products are viewable by everyone" on public.products for select using (true);
create index on public.products(category_id);
create index on public.products(is_featured);

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cart items
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);
alter table public.cart_items enable row level security;
create policy "Users view own cart" on public.cart_items for select using (auth.uid() = user_id);
create policy "Users insert own cart" on public.cart_items for insert with check (auth.uid() = user_id);
create policy "Users update own cart" on public.cart_items for update using (auth.uid() = user_id);
create policy "Users delete own cart" on public.cart_items for delete using (auth.uid() = user_id);

-- Seed categories
insert into public.categories (name, slug, icon, sort_order) values
  ('Rice', 'rice', '🍚', 1),
  ('Yam', 'yam', '🍠', 2),
  ('Cassava', 'cassava', '🥔', 3),
  ('Plantain', 'plantain', '🍌', 4),
  ('Palm Oil', 'palm-oil', '🫗', 5),
  ('Tomatoes', 'tomatoes', '🍅', 6),
  ('Pepper', 'pepper', '🌶️', 7),
  ('Fish', 'fish', '🐟', 8),
  ('Meat', 'meat', '🥩', 9),
  ('Spices', 'spices', '🧂', 10),
  ('Drinks', 'drinks', '🥤', 11),
  ('Packaged Foods', 'packaged', '🥫', 12);

-- Seed products
with c as (select id, slug from public.categories)
insert into public.products (category_id, name, slug, description, price_ghs, unit, image_url, stock, is_featured) values
  ((select id from c where slug='rice'), 'Premium Jasmine Rice', 'jasmine-rice-5kg', 'Long grain fragrant jasmine rice, perfect for jollof.', 95.00, '5kg bag', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600', 80, true),
  ((select id from c where slug='rice'), 'Local Aromatic Rice', 'local-aromatic-rice', 'Northern Ghana grown aromatic rice.', 70.00, '5kg bag', 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600', 60, true),
  ((select id from c where slug='yam'), 'Pona Yam Tuber', 'pona-yam', 'Sweet, soft Pona yam from Brong Ahafo.', 45.00, 'tuber', 'https://images.unsplash.com/photo-1604908554007-bbf9a4d39e0d?w=600', 120, true),
  ((select id from c where slug='cassava'), 'Fresh Cassava', 'fresh-cassava', 'Freshly harvested cassava roots.', 18.00, 'kg', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600', 90, false),
  ((select id from c where slug='plantain'), 'Ripe Plantain Bunch', 'ripe-plantain', 'Sweet ripe plantains, ready to fry.', 25.00, 'bunch', 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=600', 100, true),
  ((select id from c where slug='palm-oil'), 'Pure Red Palm Oil', 'red-palm-oil-1l', 'Locally pressed red palm oil.', 55.00, '1L bottle', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600', 70, true),
  ((select id from c where slug='tomatoes'), 'Fresh Plum Tomatoes', 'plum-tomatoes', 'Vine-ripened plum tomatoes.', 22.00, 'kg', 'https://images.unsplash.com/photo-1546470427-f5e7d2b0e8ac?w=600', 150, false),
  ((select id from c where slug='pepper'), 'Scotch Bonnet Pepper', 'scotch-bonnet', 'Fiery red scotch bonnet, the soul of shito.', 30.00, '500g', 'https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=600', 80, true),
  ((select id from c where slug='fish'), 'Smoked Tilapia', 'smoked-tilapia', 'Traditional smoked tilapia, ready to eat.', 60.00, 'piece', 'https://images.unsplash.com/photo-1535400255456-c0a3432f8a44?w=600', 50, true),
  ((select id from c where slug='fish'), 'Fresh Mackerel', 'fresh-mackerel', 'Caught off the coast of Tema.', 50.00, 'kg', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600', 40, false),
  ((select id from c where slug='meat'), 'Goat Meat (Cut)', 'goat-meat', 'Fresh goat meat, perfect for light soup.', 110.00, 'kg', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600', 35, true),
  ((select id from c where slug='spices'), 'Ground Ginger', 'ground-ginger', 'Premium dried ground ginger.', 20.00, '250g', 'https://images.unsplash.com/photo-1599909533693-95c54f08ed28?w=600', 90, false),
  ((select id from c where slug='spices'), 'Hwentia (Grains of Selim)', 'hwentia', 'Aromatic Ghanaian spice for soups.', 25.00, '100g', 'https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=600', 60, false),
  ((select id from c where slug='drinks'), 'Sobolo (Hibiscus Drink)', 'sobolo-1l', 'Refreshing chilled hibiscus drink.', 18.00, '1L bottle', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600', 75, true),
  ((select id from c where slug='packaged'), 'Gari (Cassava Flakes)', 'gari-2kg', 'Premium dry gari, 2kg pack.', 35.00, '2kg pack', 'https://images.unsplash.com/photo-1607301406259-dfb186e15de8?w=600', 100, false),
  ((select id from c where slug='packaged'), 'Shito (Black Pepper Sauce)', 'shito-jar', 'Homemade authentic shito.', 40.00, '500g jar', 'https://images.unsplash.com/photo-1608500218890-c4f9019eee37?w=600', 65, true);
