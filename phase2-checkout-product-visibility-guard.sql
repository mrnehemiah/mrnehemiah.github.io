-- Checkout must reject products that are not publicly published.
do $$
declare v_def text; v_old text; v_new text;
begin
 v_def:=pg_get_functiondef('public.zune_quote_checkout(jsonb,jsonb,text)'::regprocedure);
 v_old:='IF NOT FOUND OR v_product.moderation_status<>'||quote_literal('approved')||' OR v_product.removed_at IS NOT NULL THEN';
 v_new:='IF NOT FOUND OR v_product.moderation_status<>'||quote_literal('approved')||' OR v_product.published_at IS NULL OR v_product.removed_at IS NOT NULL OR v_product.seller_archived_at IS NOT NULL THEN';
 if position(v_old in v_def)=0 then raise exception 'Quote product visibility guard anchor not found'; end if;
 v_def:=replace(v_def,v_old,v_new);execute v_def;
 v_def:=pg_get_functiondef('public.zune_create_checkout(jsonb,jsonb,text,text)'::regprocedure);
 v_old:='IF NOT FOUND OR v_product.moderation_status <> '||quote_literal('approved')||' OR v_product.removed_at IS NOT NULL THEN';
 v_new:='IF NOT FOUND OR v_product.moderation_status <> '||quote_literal('approved')||' OR v_product.published_at IS NULL OR v_product.removed_at IS NOT NULL OR v_product.seller_archived_at IS NOT NULL THEN';
 if position(v_old in v_def)=0 then raise exception 'Create checkout product visibility guard anchor not found'; end if;
 v_def:=replace(v_def,v_old,v_new);execute v_def;
end; $$;
