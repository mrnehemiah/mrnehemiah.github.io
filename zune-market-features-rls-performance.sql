-- RLS and index performance hardening for ZUNE Marketplace features.
CREATE INDEX IF NOT EXISTS zune_comparison_items_product_idx ON public.zune_comparison_items(product_id);
CREATE INDEX IF NOT EXISTS support_ticket_messages_sender_idx ON public.support_ticket_messages(sender_id);

DROP POLICY IF EXISTS zune_compare_own_select ON public.zune_comparison_items;
CREATE POLICY zune_compare_own_select ON public.zune_comparison_items FOR SELECT TO authenticated USING(user_id=(select auth.uid()));
DROP POLICY IF EXISTS zune_compare_own_insert ON public.zune_comparison_items;
CREATE POLICY zune_compare_own_insert ON public.zune_comparison_items FOR INSERT TO authenticated WITH CHECK(user_id=(select auth.uid()));
DROP POLICY IF EXISTS zune_compare_own_delete ON public.zune_comparison_items;
CREATE POLICY zune_compare_own_delete ON public.zune_comparison_items FOR DELETE TO authenticated USING(user_id=(select auth.uid()));

DROP POLICY IF EXISTS zune_price_alert_own_select ON public.price_drop_alerts;
CREATE POLICY zune_price_alert_own_select ON public.price_drop_alerts FOR SELECT TO authenticated USING(user_id=(select auth.uid()));
DROP POLICY IF EXISTS zune_price_alert_own_insert ON public.price_drop_alerts;
CREATE POLICY zune_price_alert_own_insert ON public.price_drop_alerts FOR INSERT TO authenticated WITH CHECK(user_id=(select auth.uid()));
DROP POLICY IF EXISTS zune_price_alert_own_update ON public.price_drop_alerts;
CREATE POLICY zune_price_alert_own_update ON public.price_drop_alerts FOR UPDATE TO authenticated USING(user_id=(select auth.uid())) WITH CHECK(user_id=(select auth.uid()));
DROP POLICY IF EXISTS zune_price_alert_own_delete ON public.price_drop_alerts;
CREATE POLICY zune_price_alert_own_delete ON public.price_drop_alerts FOR DELETE TO authenticated USING(user_id=(select auth.uid()));

DROP POLICY IF EXISTS zune_reward_account_read_own ON public.zune_reward_accounts;
CREATE POLICY zune_reward_account_read_own ON public.zune_reward_accounts FOR SELECT TO authenticated USING(user_id=(select auth.uid()) OR (select public.zune_is_admin()));
DROP POLICY IF EXISTS zune_reward_ledger_read_own ON public.zune_reward_ledger;
CREATE POLICY zune_reward_ledger_read_own ON public.zune_reward_ledger FOR SELECT TO authenticated USING(user_id=(select auth.uid()) OR (select public.zune_is_admin()));
DROP POLICY IF EXISTS zune_referral_code_read_own ON public.zune_referral_codes;
CREATE POLICY zune_referral_code_read_own ON public.zune_referral_codes FOR SELECT TO authenticated USING(user_id=(select auth.uid()));
DROP POLICY IF EXISTS zune_referral_read_participant ON public.zune_referrals;
CREATE POLICY zune_referral_read_participant ON public.zune_referrals FOR SELECT TO authenticated USING(referrer_id=(select auth.uid()) OR referred_user_id=(select auth.uid()) OR (select public.zune_is_admin()));

DROP POLICY IF EXISTS support_ticket_messages_read_participant ON public.support_ticket_messages;
CREATE POLICY support_ticket_messages_read_participant ON public.support_ticket_messages FOR SELECT TO authenticated
USING(EXISTS(SELECT 1 FROM public.support_tickets t WHERE t.id=support_ticket_messages.ticket_id AND (t.user_id=(select auth.uid()) OR (select public.zune_is_admin()))));
DROP POLICY IF EXISTS support_ticket_messages_insert_participant ON public.support_ticket_messages;
CREATE POLICY support_ticket_messages_insert_participant ON public.support_ticket_messages FOR INSERT TO authenticated
WITH CHECK(sender_id=(select auth.uid()) AND EXISTS(
  SELECT 1 FROM public.support_tickets t WHERE t.id=support_ticket_messages.ticket_id
  AND (t.user_id=(select auth.uid()) OR (select public.zune_is_admin())) AND t.status NOT IN ('closed','resolved')
));
