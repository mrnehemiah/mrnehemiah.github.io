-- Only allow referral code redemption before the referred user's first completed order.
CREATE OR REPLACE FUNCTION public.zune_apply_referral_code(p_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid(); v_referrer uuid; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Ingia kwanza.'; END IF;
  SELECT user_id INTO v_referrer FROM public.zune_referral_codes WHERE upper(code)=upper(trim(p_code));
  IF v_referrer IS NULL THEN RAISE EXCEPTION 'Referral code haijatambulika.'; END IF;
  IF v_referrer = v_user THEN RAISE EXCEPTION 'Huwezi kutumia code yako mwenyewe.'; END IF;
  IF EXISTS(SELECT 1 FROM public.orders o WHERE o.buyer_id=v_user AND o.status::text='completed') THEN
    RAISE EXCEPTION 'Referral code inaweza kutumika kabla ya oda ya kwanza kukamilika tu.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.zune_referrals WHERE referred_user_id=v_user) THEN
    RAISE EXCEPTION 'Akaunti hii tayari imetumia referral code.';
  END IF;
  INSERT INTO public.zune_referrals(referrer_id,referred_user_id,referral_code)
  VALUES(v_referrer,v_user,upper(trim(p_code))) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.zune_apply_referral_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zune_apply_referral_code(text) TO authenticated;
