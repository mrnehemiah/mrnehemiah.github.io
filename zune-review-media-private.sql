-- Keep uploaded review photos private until the related review is approved.
UPDATE storage.buckets SET public=false WHERE id='zune-review-media';
DROP POLICY IF EXISTS zune_review_media_public_read ON storage.objects;
DROP POLICY IF EXISTS zune_review_media_approved_read ON storage.objects;
CREATE POLICY zune_review_media_approved_read ON storage.objects FOR SELECT TO anon,authenticated
USING(bucket_id='zune-review-media' AND EXISTS(
 SELECT 1 FROM public.product_reviews r
 WHERE storage.objects.name = ANY(r.media_urls)
   AND r.moderation_status='approved' AND r.is_visible=true
));
DROP POLICY IF EXISTS zune_review_media_owner_read ON storage.objects;
CREATE POLICY zune_review_media_owner_read ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='zune-review-media' AND (
 (storage.foldername(name))[1]=(select auth.uid())::text OR (select public.zune_is_admin())
));
