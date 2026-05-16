# Admin CMS, Product Management, Analytics & Finance Build Plan

This is a large multi-phase build. I'll deliver it in 4 phases so you can review progress and we don't ship one giant unreviewable change. Each phase is independently usable.

## Phase 1 — Website Content CMS

**Database (new tables)**
- `site_content` — key/value JSONB store for editable pages & sections (`about`, `contact`, `privacy`, `terms`, `home_hero`, `footer`, `business_info`, `delivery_info`)
- `site_faqs` — question, answer, sort_order, is_published
- `site_media` — uploaded image references (storage bucket `site-media`, public read)
- Draft vs published: each row stores `draft_content` + `published_content` + `published_at`
- RLS: public reads published only; only admins write
- New storage bucket `site-media` (public)

**Admin UI** at `/admin/content`
- Tabs: Pages | Homepage | Footer | Business Info | Delivery | FAQ | Media
- Rich text editor (`@tiptap/react`) for long-form pages
- Image picker pulling from `site-media` bucket with upload
- Buttons: **Save Draft**, **Preview**, **Publish**, **Reset to Published**
- Mobile-responsive

**Public site wiring**
- `/about`, `/contact`, `/privacy`, `/terms`, homepage hero, footer, contact info all read from `site_content` (published version) via a server fn `getPublishedContent`
- Falls back to current hardcoded copy on first load if DB row missing

## Phase 2 — Product Management

**Schema additions to `products`**
- `cost_price_ghs` (numeric)
- `sale_price_ghs` (numeric, nullable)
- `is_active` (boolean, default true) — enable/disable
- keep existing `stock`, `is_featured`, `image_url`, `description`, `price_ghs`

**Admin UI** at `/admin/products` (rebuild)
- Table with inline edit for price, sale price, stock, active, featured
- Create/Edit drawer: name, slug, category, cost, price, sale price, stock, unit, description, image upload (to new `product-images` bucket), featured, active
- Delete with confirm
- Out-of-stock badge auto when `stock = 0`
- Bulk price update

## Phase 3 — Analytics Dashboard (live pie/donut charts)

Rebuild `/admin/dashboard`:
- KPI cards: revenue, orders, customers, products, pending deliveries, completed deliveries, low-stock count, total profit, total cost
- Donut/pie charts (recharts) for: order status breakdown, revenue by category, top products, stock health
- Realtime via Supabase `postgres_changes` on `orders`, `order_items`, `products`
- Server fn `getDashboardStats` aggregates from orders/order_items/products using cost vs sale price

## Phase 4 — Financial Management & Reinvestment

**New tables**
- `finance_settings` — single row: `reinvestment_percent`, `operational_expense_percent`
- `finance_transactions` — type (`revenue`,`expense`,`reinvestment_transfer`,`withdrawal`), amount, note, order_id (nullable), created_at
- `reinvestment_fund` — running balance view/materialised from transactions

**Admin UI** at `/admin/finance`
- Cards: Total revenue, Total cost, Gross profit, Reinvestment balance, Withdrawable profit, Operational expenses
- Per-product margin table (cost, price, qty sold, profit, margin %)
- Manual expense entry
- Reinvestment % slider + "Apply to current profit" button
- Withdrawal record entry
- Auto-trigger on order `payment_status='paid'`: insert revenue txn, compute profit, allocate reinvestment %

## Security
- All admin routes already protected by `useRoles().isAdmin` + RLS `has_role(auth.uid(),'admin')`
- All new tables enable RLS; finance + CMS write policies require `admin` role
- All mutations go through `createServerFn` with `requireSupabaseAuth` so RLS enforces

## Tech choices
- Rich text: **@tiptap/react** + starter kit (lightweight, no external CDN)
- Charts: existing **recharts** (already in deps via shadcn)
- Image uploads: Supabase Storage (`site-media`, `product-images` buckets)
- Realtime: Supabase Realtime on relevant tables

---

**This will take many migrations and ~30+ new/modified files.** Please confirm:

1. Proceed with all 4 phases in order? (I'll ship Phase 1 first, then continue.)
2. OK to add `@tiptap/react` dependency for the rich text editor?
3. For the reinvestment % — default to 20%? (you can change anytime in settings)

Reply "go" to start Phase 1.