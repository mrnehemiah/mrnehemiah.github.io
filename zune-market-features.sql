-- ZUNE MARKET 3D feature suite — additive schema, no payment/order flow changes.
-- Existing wishlist, reviews, support and dispute records are preserved.

CREATE TABLE IF NOT EXISTS public.zune_comparison_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS zune_comparison_items_user_idx ON public.zune_comparison_items(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.price_drop_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  target_price numeric(14,2),
  active boolean NOT NULL DEFAULT true,
  last_notified_price numeric(14,2),
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id),
  CHECK (target_price IS NULL OR target_price >= 0)
);
CREATE INDEX IF NOT EXISTS price_drop_alerts_product_active_idx ON public.price_drop_alerts(product_id) WHERE active;

CREATE TABLE IF NOT EXISTS public.zune_reward_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  points_per_1000_tzs numeric(8,2) NOT NULL DEFAULT 1 CHECK (points_per_1000_tzs >= 0),
  referral_bonus_points integer NOT NULL DEFAULT 100 CHECK (referral_bonus_points >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.zune_reward_settings(id) VALUES(true) ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.zune_reward_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points_balance bigint NOT NULL DEFAULT 0 CHECK(points_balance >= 0),
  lifetime_points bigint NOT NULL DEFAULT 0 CHECK(lifetime_points >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.zune_reward_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL CHECK(points <> 0),
  source_type text NOT NULL CHECK(source_type IN ('completed_order','referral_inviter','referral_welcome','admin_adjustment')),
  source_id uuid NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS zune_reward_ledger_user_idx ON public.zune_reward_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.zune_referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.zune_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','rewarded','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  rewarded_at timestamptz,
  CHECK(referrer_id <> referred_user_id)
);
CREATE INDEX IF NOT EXISTS zune_referrals_referrer_idx ON public.zune_referrals(referrer_id, created_at DESC);

ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS media_urls text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK(length(trim(message)) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx ON public.support_ticket_messages(ticket_id, created_at);

CREATE OR REPLACE FUNCTION public.zune_features_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zune_price_drop_alerts_touch ON public.price_drop_alerts;
CREATE TRIGGER zune_price_drop_alerts_touch BEFORE UPDATE ON public.price_drop_alerts
FOR EACH ROW EXECUTE FUNCTION public.zune_features_touch_updated_at();

CREATE OR REPLACE FUNCTION public.zune_limit_comparison_items()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE item_count integer;
BEGIN
  SELECT count(*) INTO item_count FROM public.zune_comparison_items
  WHERE user_id = NEW.user_id AND id <> coalesce(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF item_count >= 4 THEN
    RAISE EXCEPTION 'Unaweza kulinganisha bidhaa zisizozidi nne kwa wakati mmoja.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zune_comparison_limit ON public.zune_comparison_items;
CREATE TRIGGER zune_comparison_limit BEFORE INSERT OR UPDATE ON public.zune_comparison_items
FOR EACH ROW EXECUTE FUNCTION public.zune_limit_comparison_items();

CREATE OR REPLACE FUNCTION public.zune_notify_price_drop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE alert_row record;
BEGIN
  IF NEW.price < OLD.price THEN
    FOR alert_row IN
      SELECT id, user_id, target_price FROM public.price_drop_alerts
      WHERE product_id = NEW.id AND active = true
        AND (target_price IS NULL OR NEW.price <= target_price)
    LOOP
      INSERT INTO public.notifications(user_id,type,title_sw,title_en,body_sw,body_en,action_url,data)
      VALUES(
        alert_row.user_id,'price_drop',
        'Bei ya bidhaa imeshuka','A product price dropped',
        'Bei ya ' || NEW.title || ' imeshuka. Angalia ofa mpya.',
        'The price of ' || NEW.title || ' has dropped. Check the new offer.',
        '/?tab=features',
        jsonb_build_object('product_id',NEW.id,'price',NEW.price,'previous_price',OLD.price,'alert_id',alert_row.id)
      );
      UPDATE public.price_drop_alerts
      SET last_notified_price = NEW.price, last_notified_at = now()
      WHERE id = alert_row.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zune_products_price_drop_alert ON public.products;
CREATE TRIGGER zune_products_price_drop_alert AFTER UPDATE OF price ON public.products
FOR EACH ROW EXECUTE FUNCTION public.zune_notify_price_drop();

CREATE OR REPLACE FUNCTION public.zune_create_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid(); v_code text; v_existing text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Ingia kwanza.'; END IF;
  SELECT code INTO v_existing FROM public.zune_referral_codes WHERE user_id = v_user;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  LOOP
    v_code := 'ZUNE' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    BEGIN
      INSERT INTO public.zune_referral_codes(user_id,code) VALUES(v_user,v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      SELECT code INTO v_existing FROM public.zune_referral_codes WHERE user_id = v_user;
      IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.zune_apply_referral_code(p_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid := auth.uid(); v_referrer uuid; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Ingia kwanza.'; END IF;
  SELECT user_id INTO v_referrer FROM public.zune_referral_codes WHERE upper(code)=upper(trim(p_code));
  IF v_referrer IS NULL THEN RAISE EXCEPTION 'Referral code haijatambulika.'; END IF;
  IF v_referrer = v_user THEN RAISE EXCEPTION 'Huwezi kutumia code yako mwenyewe.'; END IF;
  IF EXISTS(SELECT 1 FROM public.zune_referrals WHERE referred_user_id=v_user) THEN
    RAISE EXCEPTION 'Akaunti hii tayari imetumia referral code.';
  END IF;
  INSERT INTO public.zune_referrals(referrer_id,referred_user_id,referral_code)
  VALUES(v_referrer,v_user,upper(trim(p_code))) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.zune_award_marketplace_rewards()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_points integer; v_bonus integer; v_referrer uuid; v_ledger uuid;
BEGIN
  IF NEW.status::text <> 'completed' OR OLD.status::text = 'completed' THEN RETURN NEW; END IF;
  SELECT greatest(0,floor((NEW.total_price / 1000) * points_per_1000_tzs)::integer),
         referral_bonus_points
    INTO v_points,v_bonus FROM public.zune_reward_settings WHERE id=true;
  IF coalesce(v_points,0) > 0 THEN
    INSERT INTO public.zune_reward_accounts(user_id) VALUES(NEW.buyer_id) ON CONFLICT(user_id) DO NOTHING;
    INSERT INTO public.zune_reward_ledger(user_id,points,source_type,source_id,description)
    VALUES(NEW.buyer_id,v_points,'completed_order',NEW.id,'Points za oda iliyokamilika')
    ON CONFLICT(user_id,source_type,source_id) DO NOTHING RETURNING id INTO v_ledger;
    IF v_ledger IS NOT NULL THEN
      UPDATE public.zune_reward_accounts SET points_balance=points_balance+v_points,
        lifetime_points=lifetime_points+v_points,updated_at=now() WHERE user_id=NEW.buyer_id;
    END IF;
  END IF;
  SELECT referrer_id INTO v_referrer FROM public.zune_referrals
  WHERE referred_user_id=NEW.buyer_id AND status='pending' FOR UPDATE;
  IF v_referrer IS NOT NULL AND coalesce(v_bonus,0)>0 THEN
    INSERT INTO public.zune_reward_accounts(user_id) VALUES(v_referrer),(NEW.buyer_id) ON CONFLICT(user_id) DO NOTHING;
    v_ledger := NULL;
    INSERT INTO public.zune_reward_ledger(user_id,points,source_type,source_id,description)
    VALUES(v_referrer,v_bonus,'referral_inviter',NEW.id,'Bonasi ya rafiki uliyemwalika')
    ON CONFLICT(user_id,source_type,source_id) DO NOTHING RETURNING id INTO v_ledger;
    IF v_ledger IS NOT NULL THEN
      UPDATE public.zune_reward_accounts SET points_balance=points_balance+v_bonus,lifetime_points=lifetime_points+v_bonus,updated_at=now() WHERE user_id=v_referrer;
    END IF;
    v_ledger := NULL;
    INSERT INTO public.zune_reward_ledger(user_id,points,source_type,source_id,description)
    VALUES(NEW.buyer_id,v_bonus,'referral_welcome',NEW.id,'Bonasi ya kujiunga kupitia mwaliko')
    ON CONFLICT(user_id,source_type,source_id) DO NOTHING RETURNING id INTO v_ledger;
    IF v_ledger IS NOT NULL THEN
      UPDATE public.zune_reward_accounts SET points_balance=points_balance+v_bonus,lifetime_points=lifetime_points+v_bonus,updated_at=now() WHERE user_id=NEW.buyer_id;
    END IF;
    UPDATE public.zune_referrals SET status='rewarded',rewarded_at=now() WHERE referred_user_id=NEW.buyer_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zune_order_completed_rewards ON public.orders;
CREATE TRIGGER zune_order_completed_rewards AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.zune_award_marketplace_rewards();

ALTER TABLE public.zune_comparison_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_drop_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zune_reward_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zune_reward_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zune_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zune_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS zune_compare_own_select ON public.zune_comparison_items;
CREATE POLICY zune_compare_own_select ON public.zune_comparison_items FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS zune_compare_own_insert ON public.zune_comparison_items;
CREATE POLICY zune_compare_own_insert ON public.zune_comparison_items FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS zune_compare_own_delete ON public.zune_comparison_items;
CREATE POLICY zune_compare_own_delete ON public.zune_comparison_items FOR DELETE TO authenticated USING(user_id=auth.uid());

DROP POLICY IF EXISTS zune_price_alert_own_select ON public.price_drop_alerts;
CREATE POLICY zune_price_alert_own_select ON public.price_drop_alerts FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS zune_price_alert_own_insert ON public.price_drop_alerts;
CREATE POLICY zune_price_alert_own_insert ON public.price_drop_alerts FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS zune_price_alert_own_update ON public.price_drop_alerts;
CREATE POLICY zune_price_alert_own_update ON public.price_drop_alerts FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
DROP POLICY IF EXISTS zune_price_alert_own_delete ON public.price_drop_alerts;
CREATE POLICY zune_price_alert_own_delete ON public.price_drop_alerts FOR DELETE TO authenticated USING(user_id=auth.uid());

DROP POLICY IF EXISTS zune_reward_account_read_own ON public.zune_reward_accounts;
CREATE POLICY zune_reward_account_read_own ON public.zune_reward_accounts FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.zune_is_admin());
DROP POLICY IF EXISTS zune_reward_ledger_read_own ON public.zune_reward_ledger;
CREATE POLICY zune_reward_ledger_read_own ON public.zune_reward_ledger FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.zune_is_admin());
DROP POLICY IF EXISTS zune_referral_code_read_own ON public.zune_referral_codes;
CREATE POLICY zune_referral_code_read_own ON public.zune_referral_codes FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS zune_referral_read_participant ON public.zune_referrals;
CREATE POLICY zune_referral_read_participant ON public.zune_referrals FOR SELECT TO authenticated USING(referrer_id=auth.uid() OR referred_user_id=auth.uid() OR public.zune_is_admin());

DROP POLICY IF EXISTS support_ticket_messages_read_participant ON public.support_ticket_messages;
CREATE POLICY support_ticket_messages_read_participant ON public.support_ticket_messages FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM public.support_tickets t WHERE t.id=ticket_id AND (t.user_id=auth.uid() OR public.zune_is_admin())));
DROP POLICY IF EXISTS support_ticket_messages_insert_participant ON public.support_ticket_messages;
CREATE POLICY support_ticket_messages_insert_participant ON public.support_ticket_messages FOR INSERT TO authenticated
WITH CHECK(sender_id=auth.uid() AND EXISTS(
  SELECT 1 FROM public.support_tickets t WHERE t.id=ticket_id
  AND (t.user_id=auth.uid() OR public.zune_is_admin()) AND t.status NOT IN ('closed','resolved')
));

-- Public product-review photos; uploads are scoped to the authenticated user's folder.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('zune-review-media','zune-review-media',true,6291456,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=true,file_size_limit=6291456,allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('zune-dispute-evidence','zune-dispute-evidence',false,10485760,ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT(id) DO NOTHING;

DROP POLICY IF EXISTS zune_review_media_public_read ON storage.objects;
CREATE POLICY zune_review_media_public_read ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='zune-review-media');
DROP POLICY IF EXISTS zune_review_media_owner_insert ON storage.objects;
CREATE POLICY zune_review_media_owner_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='zune-review-media' AND (storage.foldername(name))[1]=auth.uid()::text);
DROP POLICY IF EXISTS zune_review_media_owner_update ON storage.objects;
CREATE POLICY zune_review_media_owner_update ON storage.objects FOR UPDATE TO authenticated
USING(bucket_id='zune-review-media' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.zune_is_admin()))
WITH CHECK(bucket_id='zune-review-media' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.zune_is_admin()));
DROP POLICY IF EXISTS zune_review_media_owner_delete ON storage.objects;
CREATE POLICY zune_review_media_owner_delete ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='zune-review-media' AND ((storage.foldername(name))[1]=auth.uid()::text OR public.zune_is_admin()));

DROP POLICY IF EXISTS zune_dispute_evidence_participant_read ON storage.objects;
CREATE POLICY zune_dispute_evidence_participant_read ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='zune-dispute-evidence' AND EXISTS(
 SELECT 1 FROM public.transaction_disputes d
 WHERE d.id::text=(storage.foldername(name))[1]
 AND (d.buyer_id=auth.uid() OR d.seller_id=auth.uid() OR public.zune_is_admin())
));
DROP POLICY IF EXISTS zune_dispute_evidence_participant_insert ON storage.objects;
CREATE POLICY zune_dispute_evidence_participant_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='zune-dispute-evidence' AND (storage.foldername(name))[2]=auth.uid()::text AND EXISTS(
 SELECT 1 FROM public.transaction_disputes d
 WHERE d.id::text=(storage.foldername(name))[1]
 AND (d.buyer_id=auth.uid() OR d.seller_id=auth.uid()) AND d.status NOT IN ('resolved','rejected')
));
DROP POLICY IF EXISTS zune_dispute_evidence_participant_delete ON storage.objects;
CREATE POLICY zune_dispute_evidence_participant_delete ON storage.objects FOR DELETE TO authenticated
USING(bucket_id='zune-dispute-evidence' AND (storage.foldername(name))[2]=auth.uid()::text AND EXISTS(
 SELECT 1 FROM public.transaction_disputes d
 WHERE d.id::text=(storage.foldername(name))[1]
 AND (d.buyer_id=auth.uid() OR d.seller_id=auth.uid()) AND d.status NOT IN ('resolved','rejected')
));
