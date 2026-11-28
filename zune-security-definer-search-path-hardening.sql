-- Security hardening: preserve the public approved-promotions RPC while pinning
-- its SECURITY DEFINER search_path to the empty path.
-- All referenced relations are schema-qualified in the function body.
ALTER FUNCTION public.list_active_seller_promotions() SET search_path = '';
