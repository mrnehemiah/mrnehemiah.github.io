-- Applied production hardening for ZUNE Marketplace feature functions.
REVOKE EXECUTE ON FUNCTION public.zune_features_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.zune_limit_comparison_items() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.zune_notify_price_drop() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.zune_award_marketplace_rewards() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.zune_create_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.zune_apply_referral_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zune_create_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.zune_apply_referral_code(text) TO authenticated;
