-- ZUNE public order identifiers across marketplace, seller, driver and admin surfaces.
-- Existing orders.id UUID primary keys and all foreign-key relationships remain unchanged.

CREATE OR REPLACE FUNCTION public.assign_zune_order_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_vendor_id uuid;
  v_vendor_code text;
  v_zune_id text;
  v_order_no bigint;
  v_order_date date;
  v_checkout_id uuid;
BEGIN
  SELECT p.vendor_id INTO v_vendor_id FROM public.products p WHERE p.id=NEW.product_id;
  IF v_vendor_id IS NULL THEN RAISE EXCEPTION 'Cannot create ZUNE Order ID: product vendor was not found'; END IF;
  SELECT pr.vendor_code INTO v_vendor_code FROM public.profiles pr WHERE pr.id=v_vendor_id;
  SELECT pr.zune_id INTO v_zune_id FROM public.profiles pr WHERE pr.id=NEW.buyer_id;
  IF coalesce(v_vendor_code,'')='' OR coalesce(v_zune_id,'')='' THEN
    RAISE EXCEPTION 'Cannot create ZUNE Order ID: customer ZUNE ID or vendor ID is missing';
  END IF;
  v_checkout_id:=NEW.checkout_id;
  v_order_date:=(coalesce(NEW.created_at,now()) AT TIME ZONE 'Africa/Dar_es_Salaam')::date;
  NEW.vendor_id:=v_vendor_id;

  IF v_checkout_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_checkout_id::text||':'||v_vendor_id::text,0));
    SELECT g.order_number,g.order_date INTO v_order_no,v_order_date
      FROM public.vendor_checkout_orders g
      WHERE g.checkout_id=v_checkout_id AND g.vendor_id=v_vendor_id;
    IF NOT FOUND THEN
      INSERT INTO public.vendor_order_counters(vendor_id,last_number) VALUES(v_vendor_id,1)
      ON CONFLICT(vendor_id) DO UPDATE
        SET last_number=public.vendor_order_counters.last_number+1,updated_at=now()
      RETURNING last_number INTO v_order_no;
      INSERT INTO public.vendor_checkout_orders(checkout_id,vendor_id,order_number,order_date)
      VALUES(v_checkout_id,v_vendor_id,v_order_no,v_order_date);
    END IF;
  ELSE
    INSERT INTO public.vendor_order_counters(vendor_id,last_number) VALUES(v_vendor_id,1)
    ON CONFLICT(vendor_id) DO UPDATE
      SET last_number=public.vendor_order_counters.last_number+1,updated_at=now()
    RETURNING last_number INTO v_order_no;
  END IF;

  NEW.order_number:=lpad(v_order_no::text,4,'0');
  NEW.public_order_id:='ZN-'||to_char(v_order_date,'YYYYMMDD')||'-'||upper(v_zune_id)||'-'||upper(v_vendor_code)||'-'||lpad(v_order_no::text,4,'0');
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.assign_zune_order_id() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_assign_zune_order_id ON public.orders;
CREATE TRIGGER trg_assign_zune_order_id BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.assign_zune_order_id();

WITH source AS (
 SELECT o.id,p.vendor_id,v.vendor_code,b.zune_id,
        coalesce(nullif(substring(o.order_number from '([0-9]+)$'),''),'0')::bigint AS seq,
        (o.created_at AT TIME ZONE 'Africa/Dar_es_Salaam')::date AS local_date
 FROM public.orders o
 JOIN public.products p ON p.id=o.product_id
 JOIN public.profiles v ON v.id=p.vendor_id
 JOIN public.profiles b ON b.id=o.buyer_id
)
UPDATE public.orders o
SET vendor_id=s.vendor_id,
    order_number=lpad(s.seq::text,4,'0'),
    public_order_id='ZN-'||to_char(s.local_date,'YYYYMMDD')||'-'||upper(s.zune_id)||'-'||upper(s.vendor_code)||'-'||lpad(s.seq::text,4,'0')
FROM source s
WHERE o.id=s.id AND s.seq>0 AND coalesce(s.vendor_code,'')<>'' AND coalesce(s.zune_id,'')<>'';

INSERT INTO public.vendor_order_counters(vendor_id,last_number,updated_at)
SELECT p.vendor_id,max(coalesce(nullif(substring(o.order_number from '([0-9]+)$'),''),'0')::bigint),now()
FROM public.orders o JOIN public.products p ON p.id=o.product_id
GROUP BY p.vendor_id
ON CONFLICT(vendor_id) DO UPDATE
SET last_number=greatest(public.vendor_order_counters.last_number,EXCLUDED.last_number),updated_at=now();

INSERT INTO public.vendor_checkout_orders(checkout_id,vendor_id,order_number,order_date)
SELECT o.checkout_id,p.vendor_id,
       min(coalesce(nullif(substring(o.order_number from '([0-9]+)$'),''),'0')::bigint),
       min((o.created_at AT TIME ZONE 'Africa/Dar_es_Salaam')::date)
FROM public.orders o JOIN public.products p ON p.id=o.product_id
WHERE o.checkout_id IS NOT NULL
GROUP BY o.checkout_id,p.vendor_id
HAVING min(coalesce(nullif(substring(o.order_number from '([0-9]+)$'),''),'0')::bigint)>0
ON CONFLICT(checkout_id,vendor_id) DO UPDATE
SET order_number=EXCLUDED.order_number,order_date=EXCLUDED.order_date;

CREATE UNIQUE INDEX IF NOT EXISTS orders_public_order_id_uidx
ON public.orders(public_order_id) WHERE public_order_id IS NOT NULL;

-- Driver delivery details and payment history return the same public order ID.
CREATE OR REPLACE FUNCTION public.zune_delivery_driver_order_numbers(p_delivery_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_numbers text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Tafadhali ingia kwanza.'; END IF;
 SELECT string_agg(x.public_id, ', ' ORDER BY x.public_id) INTO v_numbers
 FROM (SELECT DISTINCT coalesce(o.public_order_id,o.order_number) AS public_id
   FROM public.order_deliveries d JOIN public.orders o
     ON o.checkout_id=d.checkout_id AND o.vendor_id=d.vendor_id
   WHERE d.id=p_delivery_id AND d.assigned_driver_id=auth.uid()) x;
 IF NOT EXISTS(SELECT 1 FROM public.order_deliveries d WHERE d.id=p_delivery_id AND d.assigned_driver_id=auth.uid()) THEN
  RAISE EXCEPTION 'Delivery haijapatikana au si yako.';
 END IF;
 RETURN coalesce(v_numbers,'Order ID haipatikani');
END;
$function$;

CREATE OR REPLACE FUNCTION public.zune_delivery_buyer_tracking(p_delivery_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Tafadhali ingia kwenye akaunti yako kwanza.'; END IF;
 SELECT jsonb_build_object(
  'delivery_id',d.id,
  'order_numbers',coalesce((SELECT jsonb_agg(x.public_id ORDER BY x.public_id)
    FROM (SELECT DISTINCT coalesce(o.public_order_id,o.order_number) AS public_id
      FROM public.orders o WHERE o.checkout_id=d.checkout_id AND o.vendor_id=d.vendor_id) x),'[]'::jsonb),
  'status',d.status,'delivery_fee',d.delivery_fee,'currency',d.currency,
  'estimated_delivery_at',d.estimated_delivery_at,'eta_updated_at',d.eta_updated_at,'created_at',d.created_at,
  'seller_handover_confirmed_at',d.seller_handover_confirmed_at,
  'driver_pickup_confirmed_at',d.driver_pickup_confirmed_at,
  'driver_delivered_at',d.driver_delivered_at,'buyer_confirmed_at',d.buyer_confirmed_at,
  'last_location',CASE WHEN d.last_latitude IS NOT NULL AND d.last_longitude IS NOT NULL
    THEN jsonb_build_object('latitude',d.last_latitude,'longitude',d.last_longitude,'updated_at',d.last_location_at) ELSE NULL END,
  'destination',jsonb_build_object('name',c.recipient_name,'phone',c.recipient_phone,'address',c.delivery_address,
    'region',c.region,'district',c.district,'latitude',c.latitude,'longitude',c.longitude),
  'driver',CASE WHEN dp.user_id IS NOT NULL THEN jsonb_build_object('name',dp.full_name,'phone',dp.phone_number,
    'vehicle_type',dp.vehicle_type,'vehicle_registration',dp.vehicle_registration) ELSE NULL END,
  'events',coalesce((SELECT jsonb_agg(jsonb_build_object('event_type',e.event_type,'note',e.note,'created_at',e.created_at)
    ORDER BY e.created_at ASC) FROM public.zune_delivery_events e
    WHERE e.delivery_id=d.id AND e.event_type<>'location_updated'),'[]'::jsonb)
 ) INTO v_result
 FROM public.order_deliveries d JOIN public.order_checkouts c ON c.id=d.checkout_id
 LEFT JOIN public.delivery_driver_profiles dp ON dp.user_id=d.assigned_driver_id
 WHERE d.id=p_delivery_id AND c.buyer_id=auth.uid();
 IF v_result IS NULL THEN RAISE EXCEPTION 'Delivery haijapatikana au si ya akaunti hii.'; END IF;
 RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.zune_driver_payment_dashboard()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE
 v_uid uuid:=auth.uid(); v_gross_earned numeric(14,2):=0; v_commission numeric(14,2):=0;
 v_earned numeric(14,2):=0; v_paid numeric(14,2):=0; v_pending numeric(14,2):=0;
 v_delivery_count integer:=0; v_payments jsonb:='[]'::jsonb; v_deliveries jsonb:='[]'::jsonb;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Tafadhali ingia kwanza.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.delivery_driver_profiles p WHERE p.user_id=v_uid AND p.status='active') THEN
  RAISE EXCEPTION 'Akaunti hii si dereva aliyeidhinishwa wa ZUNE Delivery.';
 END IF;
 SELECT coalesce(sum(d.driver_payout_amount),0),coalesce(sum(coalesce(p.deduction,0)),0),count(*)
 INTO v_gross_earned,v_commission,v_delivery_count
 FROM public.order_deliveries d LEFT JOIN public.zune_driver_payment_records p ON p.delivery_id=d.id
 WHERE d.assigned_driver_id=v_uid AND d.status='completed' AND d.buyer_confirmed_at IS NOT NULL;
 v_earned:=greatest(v_gross_earned-v_commission,0);
 SELECT coalesce(sum(p.net_amount),0) INTO v_paid FROM public.zune_driver_payment_records p
 WHERE p.driver_id=v_uid AND p.status='paid';
 v_pending:=greatest(v_earned-v_paid,0);
 SELECT coalesce(jsonb_agg(x.obj ORDER BY x.created_at DESC),'[]'::jsonb) INTO v_payments
 FROM (
  SELECT jsonb_build_object('id',p.id,'delivery_id',p.delivery_id,'order_numbers',
   (SELECT coalesce(jsonb_agg(z.public_id ORDER BY z.public_id),'[]'::jsonb)
    FROM (SELECT DISTINCT coalesce(o.public_order_id,o.order_number) AS public_id
      FROM public.order_deliveries d2 JOIN public.orders o
       ON o.checkout_id=d2.checkout_id AND o.vendor_id=d2.vendor_id WHERE d2.id=p.delivery_id) z),
   'amount',p.amount,'deduction',p.deduction,'net_amount',p.net_amount,'payment_method',p.payment_method,
   'payment_phone',p.payment_phone,'transaction_reference',p.transaction_reference,'status',p.status,
   'admin_note',p.admin_note,'created_at',p.created_at,'paid_at',p.paid_at) obj,p.created_at
  FROM public.zune_driver_payment_records p WHERE p.driver_id=v_uid ORDER BY p.created_at DESC LIMIT 100
 ) x;
 SELECT coalesce(jsonb_agg(x.obj ORDER BY x.created_at DESC),'[]'::jsonb) INTO v_deliveries
 FROM (
  SELECT jsonb_build_object('id',d.id,'order_numbers',
   (SELECT coalesce(jsonb_agg(z.public_id ORDER BY z.public_id),'[]'::jsonb)
    FROM (SELECT DISTINCT coalesce(o.public_order_id,o.order_number) AS public_id
      FROM public.orders o WHERE o.checkout_id=d.checkout_id AND o.vendor_id=d.vendor_id) z),
   'status',d.status,'delivery_fee',d.delivery_fee,'driver_payout_amount',d.driver_payout_amount,
   'zune_delivery_amount',d.zune_delivery_amount,'payout_status',d.payout_status,
   'created_at',d.created_at,'buyer_confirmed_at',d.buyer_confirmed_at) obj,d.created_at
  FROM public.order_deliveries d WHERE d.assigned_driver_id=v_uid AND d.status IN ('completed','delivered')
  ORDER BY d.created_at DESC LIMIT 100
 ) x;
 RETURN jsonb_build_object('currency','TZS','totals',jsonb_build_object('gross_earned',v_gross_earned,
  'commission',v_commission,'earned',v_earned,'paid',v_paid,'pending',v_pending,
  'completed_deliveries',v_delivery_count),'payments',v_payments,'deliveries',v_deliveries);
END;
$function$;
