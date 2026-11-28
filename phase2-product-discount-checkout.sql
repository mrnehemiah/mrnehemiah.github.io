-- Phase 2: apply seller-set product discounts consistently in authoritative checkout pricing.
-- Product/variant prices remain unchanged; the server calculates the discounted unit price.
do $$
declare v_def text; v_old text; v_new text;
begin
 v_def:=pg_get_functiondef('public.zune_quote_checkout(jsonb,jsonb,text)'::regprocedure);
 v_old:='  IF v_available_stock<v_qty THEN';
 v_new:='  v_unit_price:=round(v_unit_price*(1-least(greatest(coalesce(v_product.discount_percent,0),0),100)/100),2);'||E'\n'||v_old;
 if position(v_old in v_def)=0 then raise exception 'Quote discount insertion anchor not found'; end if;
 v_def:=replace(v_def,v_old,v_new);execute v_def;

 v_def:=pg_get_functiondef('public.zune_create_checkout(jsonb,jsonb,text,text)'::regprocedure);
 v_old:='  IF v_available_stock < v_quantity THEN';
 v_new:='  v_unit_price:=round(v_unit_price*(1-least(greatest(coalesce(v_product.discount_percent,0),0),100)/100),2);'||E'\n'||v_old;
 if position(v_old in v_def)=0 then raise exception 'Create checkout validation discount anchor not found'; end if;
 v_def:=replace(v_def,v_old,v_new);
 v_old:='  INSERT INTO public.orders(';
 v_new:='  v_unit_price:=round(v_unit_price*(1-least(greatest(coalesce(v_product.discount_percent,0),0),100)/100),2);'||E'\n'||v_old;
 if position(v_old in v_def)=0 then raise exception 'Create checkout order discount anchor not found'; end if;
 v_def:=replace(v_def,v_old,v_new);execute v_def;

 v_def:=pg_get_functiondef('private.zune_apply_platform_coupon(jsonb,text,uuid,text,boolean)'::regprocedure);
 v_old:='coalesce(v.price,p.price)*(i.value->>''quantity'')::integer';
 v_new:='round(coalesce(v.price,p.price)*(1-least(greatest(coalesce(p.discount_percent,0),0),100)/100),2)*(i.value->>''quantity'')::integer';
 if position(v_old in v_def)=0 then raise exception 'Coupon eligible subtotal anchor not found'; end if;
 v_def:=replace(v_def,v_old,v_new);execute v_def;
end; $$;
