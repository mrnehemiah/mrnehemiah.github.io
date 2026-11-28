-- ZUNE private buyer-seller chat media storage.
-- Applied to Supabase project rpkogiieegqgxqbzwxwo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zune-chat-media',
  'zune-chat-media',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do nothing;

drop policy if exists "Chat participants can upload chat media" on storage.objects;
create policy "Chat participants can upload chat media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'zune-chat-media'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[2] in (
    (select auth.uid())::text,
    public.zune_seller_owner_id()::text
  )
  and exists (
    select 1
    from public.chat_conversations c
    where c.id::text = (storage.foldername(name))[1]
      and (
        c.buyer_id = (select auth.uid())
        or c.seller_id = public.zune_seller_owner_id()
      )
  )
);

drop policy if exists "Chat participants can view chat media" on storage.objects;
create policy "Chat participants can view chat media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'zune-chat-media'
  and exists (
    select 1
    from public.chat_conversations c
    where c.id::text = (storage.foldername(name))[1]
      and (
        c.buyer_id = (select auth.uid())
        or c.seller_id = public.zune_seller_owner_id()
      )
  )
);
