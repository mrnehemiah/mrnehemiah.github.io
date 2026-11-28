-- ZUNE Wallet security hardening
-- Prevent duplicate withdrawal idempotency keys from reserving wallet funds twice.
-- The advisory transaction lock serializes concurrent submissions using the same key.
-- The existing request must match user, amount, currency and payout account.
CREATE OR REPLACE FUNCTION private.zune_reserve_withdrawal_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_balance numeric(14,2);
  v_existing public.withdrawal_requests%ROWTYPE;
BEGIN
  IF NEW.idempotency_key IS NULL OR length(btrim(NEW.idempotency_key)) < 12 THEN
    RAISE EXCEPTION 'A valid withdrawal idempotency key is required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.idempotency_key, 0)
  );

  SELECT *
    INTO v_existing
    FROM public.withdrawal_requests
   WHERE idempotency_key = NEW.idempotency_key;

  IF FOUND THEN
    IF v_existing.user_id IS DISTINCT FROM NEW.user_id
       OR v_existing.amount IS DISTINCT FROM NEW.amount
       OR v_existing.currency IS DISTINCT FROM NEW.currency
       OR v_existing.payout_account_id IS DISTINCT FROM NEW.payout_account_id THEN
      RAISE EXCEPTION 'Withdrawal idempotency key was already used with different request data';
    END IF;
    RETURN NEW;
  END IF;

  SELECT balance
    INTO v_balance
    FROM public.wallets
   WHERE user_id = NEW.user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found for this account';
  END IF;

  IF COALESCE(v_balance, 0) < NEW.amount THEN
    RAISE EXCEPTION 'Insufficient available wallet balance';
  END IF;

  UPDATE public.wallets
     SET balance = balance - NEW.amount,
         updated_at = now()
   WHERE user_id = NEW.user_id;

  INSERT INTO public.wallet_ledger(
    user_id, amount, currency, entry_type, reference_type, reference_id,
    idempotency_key, reason, created_by
  )
  VALUES(
    NEW.user_id, -NEW.amount, NEW.currency, 'hold', 'withdrawal', NEW.id::text,
    'withdrawal-hold:' || NEW.id::text,
    'Funds reserved for withdrawal request', NEW.user_id
  )
  ON CONFLICT(idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$function$;
