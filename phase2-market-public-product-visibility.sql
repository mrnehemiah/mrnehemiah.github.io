-- Phase 2: keep removed, archived, unpublished, or unapproved products out of the public Market feed.
-- Seller and Admin policies remain unchanged.
DROP POLICY IF EXISTS "Public can view approved products" ON public.products;

CREATE POLICY "Public can view approved products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (
  moderation_status = 'approved'
  AND published_at IS NOT NULL
  AND removed_at IS NULL
  AND seller_archived_at IS NULL
);
