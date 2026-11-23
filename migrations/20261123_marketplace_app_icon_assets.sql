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

commit;
