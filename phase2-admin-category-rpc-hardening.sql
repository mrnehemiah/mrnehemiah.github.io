-- Harden the existing Admin category RPCs with validation and audit records.
create or replace function public.admin_create_category(p_name text,p_slug text,p_parent_id uuid default null,p_image_url text default null,p_sort_order integer default 0,p_is_active boolean default true)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_category public.product_categories%rowtype; v_parent_parent uuid;
begin
 if auth.uid() is null or not public.zune_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if char_length(btrim(coalesce(p_name,''))) not between 2 and 80 then raise exception 'Category name must be 2 to 80 characters'; end if;
 if char_length(coalesce(p_slug,'')) not between 2 and 100 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Category slug must use lowercase letters, numbers and hyphens'; end if;
 if coalesce(p_sort_order,0)<0 or p_sort_order>100000 then raise exception 'Invalid category sort order'; end if;
 if p_image_url is not null and char_length(p_image_url)>2048 then raise exception 'Category image URL is too long'; end if;
 if p_parent_id is not null then
  select parent_id into v_parent_parent from public.product_categories where id=p_parent_id and is_active=true;
  if not found then raise exception 'Active parent category not found'; end if;
  if v_parent_parent is not null then raise exception 'Only root categories can contain subcategories'; end if;
 end if;
 insert into public.product_categories(name,slug,parent_id,image_url,sort_order,is_active)
 values(btrim(p_name),p_slug,p_parent_id,nullif(btrim(coalesce(p_image_url,'')),''),coalesce(p_sort_order,0),coalesce(p_is_active,true)) returning * into v_category;
 insert into public.admin_activity_logs(actor_id,action,target_type,target_id,reason,details,result)
 values(auth.uid(),'category_create','product_category',v_category.id::text,'Admin created product category',jsonb_build_object('name',v_category.name,'slug',v_category.slug,'parent_id',v_category.parent_id,'is_active',v_category.is_active),'success');
 return jsonb_build_object('success',true,'category',to_jsonb(v_category));
end; $$;
create or replace function public.admin_update_category(p_id uuid,p_name text,p_slug text,p_parent_id uuid default null,p_image_url text default null,p_sort_order integer default 0,p_is_active boolean default true)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_category public.product_categories%rowtype; v_parent_parent uuid;
begin
 if auth.uid() is null or not public.zune_is_admin() then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_id is null then raise exception 'Category ID is required'; end if;
 if char_length(btrim(coalesce(p_name,''))) not between 2 and 80 then raise exception 'Category name must be 2 to 80 characters'; end if;
 if char_length(coalesce(p_slug,'')) not between 2 and 100 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Category slug must use lowercase letters, numbers and hyphens'; end if;
 if coalesce(p_sort_order,0)<0 or p_sort_order>100000 then raise exception 'Invalid category sort order'; end if;
 if p_image_url is not null and char_length(p_image_url)>2048 then raise exception 'Category image URL is too long'; end if;
 perform 1 from public.product_categories where id=p_id for update;
 if not found then raise exception 'Category not found'; end if;
 if p_parent_id is not null then
  if p_parent_id=p_id then raise exception 'A category cannot be its own parent'; end if;
  select parent_id into v_parent_parent from public.product_categories where id=p_parent_id and is_active=true;
  if not found then raise exception 'Active parent category not found'; end if;
  if v_parent_parent is not null then raise exception 'Only root categories can contain subcategories'; end if;
  if exists(select 1 from public.product_categories where parent_id=p_id) then raise exception 'A category with subcategories cannot become a subcategory'; end if;
 end if;
 update public.product_categories set name=btrim(p_name),slug=p_slug,parent_id=p_parent_id,image_url=nullif(btrim(coalesce(p_image_url,'')),''),sort_order=coalesce(p_sort_order,0),is_active=coalesce(p_is_active,true),updated_at=now() where id=p_id returning * into v_category;
 insert into public.admin_activity_logs(actor_id,action,target_type,target_id,reason,details,result)
 values(auth.uid(),'category_update','product_category',v_category.id::text,'Admin updated product category',jsonb_build_object('name',v_category.name,'slug',v_category.slug,'parent_id',v_category.parent_id,'is_active',v_category.is_active),'success');
 return jsonb_build_object('success',true,'category',to_jsonb(v_category));
end; $$;
revoke all on function public.admin_create_category(text,text,uuid,text,integer,boolean) from public,anon;
revoke all on function public.admin_update_category(uuid,text,text,uuid,text,integer,boolean) from public,anon;
grant execute on function public.admin_create_category(text,text,uuid,text,integer,boolean) to authenticated;
grant execute on function public.admin_update_category(uuid,text,text,uuid,text,integer,boolean) to authenticated;
