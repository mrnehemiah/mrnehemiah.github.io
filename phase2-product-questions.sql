-- ZUNE Marketplace Phase 2: Product Q&A
-- Applied to Supabase project rpkogiieegqgxqbzwxwo on 2026-11-28.
create table if not exists public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  asker_id uuid not null references public.profiles(id) on delete cascade,
  question text not null check (char_length(btrim(question)) between 5 and 1500),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected','hidden')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_questions_product_status_created_idx on public.product_questions(product_id,moderation_status,created_at desc);
create index if not exists product_questions_asker_created_idx on public.product_questions(asker_id,created_at desc);
create table if not exists public.product_question_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.product_questions(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  answer text not null check (char_length(btrim(answer)) between 2 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_question_answers_seller_created_idx on public.product_question_answers(seller_id,created_at desc);
alter table public.product_questions enable row level security;
alter table public.product_question_answers enable row level security;
drop policy if exists product_questions_public_read_approved on public.product_questions;
create policy product_questions_public_read_approved on public.product_questions for select to anon,authenticated
using (moderation_status='approved' and exists(select 1 from public.products p where p.id=product_questions.product_id and p.moderation_status='approved' and p.published_at is not null and p.removed_at is null and p.seller_archived_at is null));
drop policy if exists product_questions_buyer_seller_admin_read_context on public.product_questions;
create policy product_questions_buyer_seller_admin_read_context on public.product_questions for select to authenticated
using (asker_id=(select auth.uid()) or public.zune_is_admin() or exists(select 1 from public.products p where p.id=product_questions.product_id and p.vendor_id=(select auth.uid())));
drop policy if exists product_questions_buyer_insert_own on public.product_questions;
create policy product_questions_buyer_insert_own on public.product_questions for insert to authenticated
with check (asker_id=(select auth.uid()) and moderation_status='pending' and exists(select 1 from public.products p join public.profiles buyer on buyer.id=(select auth.uid()) where p.id=product_questions.product_id and p.moderation_status='approved' and p.published_at is not null and p.removed_at is null and p.seller_archived_at is null and coalesce(buyer.account_status,'active')='active' and buyer.removed_at is null));
drop policy if exists product_questions_admin_manage on public.product_questions;
create policy product_questions_admin_manage on public.product_questions for all to authenticated using (public.zune_is_admin()) with check (public.zune_is_admin());
drop policy if exists product_question_answers_public_read on public.product_question_answers;
create policy product_question_answers_public_read on public.product_question_answers for select to anon,authenticated
using (exists(select 1 from public.product_questions q join public.products p on p.id=q.product_id where q.id=product_question_answers.question_id and q.moderation_status='approved' and p.moderation_status='approved' and p.published_at is not null and p.removed_at is null and p.seller_archived_at is null));
drop policy if exists product_question_answers_context_read on public.product_question_answers;
create policy product_question_answers_context_read on public.product_question_answers for select to authenticated
using (seller_id=(select auth.uid()) or public.zune_is_admin() or exists(select 1 from public.product_questions q where q.id=product_question_answers.question_id and q.asker_id=(select auth.uid())));
drop policy if exists product_question_answers_seller_insert_own on public.product_question_answers;
create policy product_question_answers_seller_insert_own on public.product_question_answers for insert to authenticated
with check (seller_id=(select auth.uid()) and exists(select 1 from public.product_questions q join public.products p on p.id=q.product_id join public.profiles seller on seller.id=(select auth.uid()) where q.id=product_question_answers.question_id and p.vendor_id=(select auth.uid()) and p.moderation_status='approved' and p.published_at is not null and p.removed_at is null and p.seller_archived_at is null and seller.role='vendor'::public.user_role and coalesce(seller.account_status,'active')='active' and seller.removed_at is null));
drop policy if exists product_question_answers_admin_manage on public.product_question_answers;
create policy product_question_answers_admin_manage on public.product_question_answers for all to authenticated using (public.zune_is_admin()) with check (public.zune_is_admin());
grant select on public.product_questions,public.product_question_answers to anon,authenticated;
grant insert,update,delete on public.product_questions,public.product_question_answers to authenticated;
