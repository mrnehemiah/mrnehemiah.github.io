-- Phase 6: secure FCM installation ownership and refresh token activity.
-- No existing rows are deleted by this migration. An installation is reassigned
-- only when it next registers under an authenticated account.

create or replace function public.zune_register_push_token(
  p_fcm_token text,
  p_platform text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_token text := nullif(btrim(p_fcm_token), '');
  v_platform text := lower(btrim(coalesce(p_platform, '')));
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if v_token is null or length(v_token) < 50 or length(v_token) > 4096 then
    raise exception 'Invalid FCM token' using errcode = '22023';
  end if;
  if v_platform not in ('android', 'web') then
    raise exception 'Unsupported push platform' using errcode = '22023';
  end if;
  if p_user_agent is not null and length(p_user_agent) > 512 then
    raise exception 'User agent is too long' using errcode = '22023';
  end if;

  delete from public.zune_push_tokens
   where fcm_token = v_token
     and user_id <> v_user_id;

  insert into public.zune_push_tokens (
    user_id, fcm_token, platform, user_agent, updated_at, last_seen_at
  ) values (
    v_user_id, v_token, v_platform, nullif(btrim(p_user_agent), ''), now(), now()
  )
  on conflict (user_id, fcm_token) do update
    set platform = excluded.platform,
        user_agent = excluded.user_agent,
        updated_at = now(),
        last_seen_at = now()
  returning id into v_id;

  return v_id;
end;
$function$;

create or replace function public.zune_unregister_push_token(p_fcm_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_token text := nullif(btrim(p_fcm_token), '');
  v_deleted integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if v_token is null then return false; end if;

  delete from public.zune_push_tokens
   where user_id = v_user_id
     and fcm_token = v_token;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$function$;

revoke all on function public.zune_register_push_token(text, text, text) from public, anon;
revoke all on function public.zune_unregister_push_token(text) from public, anon;
grant execute on function public.zune_register_push_token(text, text, text) to authenticated;
grant execute on function public.zune_unregister_push_token(text) to authenticated;
