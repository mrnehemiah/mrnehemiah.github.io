-- Add app icons to the existing ZUNE Marketplace theme asset catalog.
-- Keeps icons in zune_theme_assets; does not create a separate icon catalog.
begin;

alter table public.zune_theme_assets
  drop constraint if exists zune_theme_assets_asset_kind_check;

alter table public.zune_theme_assets
  add constraint zune_theme_assets_asset_kind_check
  check (asset_kind = any (array['theme','component','app_icon']::text[]));

grant select, insert, update, delete on table public.zune_theme_assets to authenticated;

create index if not exists zune_theme_assets_published_app_icons_idx
  on public.zune_theme_assets (is_featured desc, published_at desc, created_at desc)
  where asset_kind = 'app_icon'
    and scope in ('official','community')
    and status = 'published';

-- Keep app_icon asset management Admin-only while preserving existing theme/component workflows.
drop policy if exists "Owners and admins delete theme assets" on public.zune_theme_assets;
create policy "Owners and admins delete theme assets" on public.zune_theme_assets
for delete to authenticated
using (
  ((owner_id = (select auth.uid()) and scope = any (array['personal','community']::text[]) and asset_kind <> 'app_icon')
   or (select public.zune_is_admin()))
);

drop policy if exists "Owners and admins update theme assets" on public.zune_theme_assets;
create policy "Owners and admins update theme assets" on public.zune_theme_assets
for update to authenticated
using (
  ((owner_id = (select auth.uid()) and scope = any (array['personal','community']::text[]) and asset_kind <> 'app_icon')
   or (select public.zune_is_admin()))
)
with check (
  (select public.zune_is_admin())
  or (
    owner_id = (select auth.uid())
    and scope = any (array['personal','community']::text[])
    and asset_kind <> 'app_icon'
    and ((status <> 'published') or (select private.zune_is_trusted_theme_creator()))
  )
);

drop policy if exists "Users and admins create permitted theme assets" on public.zune_theme_assets;
create policy "Users and admins create permitted theme assets" on public.zune_theme_assets
for insert to authenticated
with check (
  (
    owner_id = (select auth.uid())
    and scope = any (array['personal','community']::text[])
    and asset_kind <> 'app_icon'
    and (
      (scope = 'personal' and status = 'draft')
      or (scope = 'community' and status = 'pending')
      or (scope = 'community' and status = 'published' and (select private.zune_is_trusted_theme_creator()))
    )
  )
  or (select public.zune_is_admin())
);

commit;
