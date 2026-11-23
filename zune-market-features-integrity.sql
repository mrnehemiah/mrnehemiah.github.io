-- Integrity hardening for the ZUNE Marketplace feature suite.
CREATE OR REPLACE FUNCTION public.zune_limit_comparison_items()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE item_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text));
  SELECT count(*) INTO item_count FROM public.zune_comparison_items
  WHERE user_id = NEW.user_id
    AND id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF item_count >= 4 THEN
    RAISE EXCEPTION 'Unaweza kulinganisha bidhaa zisizozidi nne kwa wakati mmoja.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.zune_limit_comparison_items() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS zune_reward_settings_admin_manage ON public.zune_reward_settings;
CREATE POLICY zune_reward_settings_admin_manage ON public.zune_reward_settings
FOR ALL TO authenticated USING(public.zune_is_admin()) WITH CHECK(public.zune_is_admin());
GRANT SELECT, UPDATE ON public.zune_reward_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.zune_features_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.zune_features_touch_updated_at() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS zune_product_reviews_touch ON public.product_reviews;
CREATE TRIGGER zune_product_reviews_touch BEFORE UPDATE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.zune_features_touch_updated_at();
