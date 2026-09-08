-- Restricts Zoho OAuth sign-in (see updates.md) to @iacentre.co.ke accounts.
-- Other sign-up paths (dashboard-created email/password accounts) are
-- untouched -- this only rejects the insert when the new auth.users row's
-- provider is 'zoho' and the email domain doesn't match, distinguishing the
-- two via raw_app_meta_data->>'provider' (GoTrue sets this to the OAuth
-- provider slug for OAuth sign-ins, 'email' otherwise).
create or replace function public.handle_new_user() returns trigger as $$
declare
  is_zoho boolean := (new.raw_app_meta_data->>'provider') = 'custom:zoho';
  email_domain text := split_part(new.email, '@', 2);
begin
  if is_zoho and email_domain <> 'iacentre.co.ke' then
    raise exception 'Zoho sign-in is restricted to @iacentre.co.ke accounts.';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'case_manager'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
