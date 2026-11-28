-- Allow a buyer to start a general conversation from an active store profile.
-- Product-specific conversations continue using the existing product ownership policy.

drop policy if exists "Buyers can start store conversations" on public.chat_conversations;
create policy "Buyers can start store conversations"
on public.chat_conversations
for insert
to authenticated
with check (
  buyer_id = (select auth.uid())
  and buyer_id <> seller_id
  and product_id is null
  and exists (
    select 1
    from public.stores s
    where s.owner_id = chat_conversations.seller_id
      and s.is_active = true
  )
);
