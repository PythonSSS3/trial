-- NOW OR NEVER: public leaderboard cosmetic visibility
-- Run this in Supabase SQL Editor if normal users cannot read
-- other users' rows from public.user_cosmetics.
--
-- This exposes only the equipped cosmetic rows already stored in
-- user_cosmetics. It does NOT expose purchase history from shop_items.

alter table public.user_cosmetics enable row level security;

drop policy if exists "Leaderboard can read equipped cosmetics" on public.user_cosmetics;

create policy "Leaderboard can read equipped cosmetics"
on public.user_cosmetics
for select
to authenticated
using (true);
