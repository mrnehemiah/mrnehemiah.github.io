-- Rotate the ZUNE push webhook credential into Supabase Vault.
-- The trigger no longer stores a bearer secret in pg_trigger.tgargs.
do $block$
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'zune_push_webhook_secret'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'zune_push_webhook_secret',
      'Private credential used only by the ZUNE notifications trigger and push Edge Function'
    );
  end if;
end;
$block$;

create or replace function public.zune_verify_push_webhook_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select p_secret is not null
     and exists (
       select 1
       from vault.decrypted_secrets d
       where d.name = 'zune_push_webhook_secret'
         and d.decrypted_secret = p_secret
     );
$function$;

revoke all on function public.zune_verify_push_webhook_secret(text) from public, anon, authenticated;
grant execute on function public.zune_verify_push_webhook_secret(text) to service_role;

create or replace function public.zune_dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_secret text;
begin
  select d.decrypted_secret
    into v_secret
    from vault.decrypted_secrets d
   where d.name = 'zune_push_webhook_secret'
   limit 1;

  if v_secret is null then
    raise warning 'ZUNE push webhook secret is unavailable; notification row was saved without dispatch';
    return new;
  end if;

  perform net.http_post(
    url := 'https://rpkogiieegqgxqbzwxwo.supabase.co/functions/v1/zune-send-push',
    body := jsonb_build_object('record', to_jsonb(new)),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-zune-push-secret', v_secret
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$function$;

revoke all on function public.zune_dispatch_push_notification() from public, anon, authenticated;
drop trigger if exists "zune-push-notifications" on public.notifications;
create trigger "zune-push-notifications"
after insert on public.notifications
for each row execute function public.zune_dispatch_push_notification();
