-- Bug found live: two accounts (admin@iacentre.co.ke, jonahkertich@iacentre.co.ke)
-- were created directly via the Supabase dashboard's Auth > Users screen,
-- which only creates an auth.users row -- not the matching public.profiles
-- row every RLS policy's is_staff() check depends on. That silently blocked
-- every write in the app for those accounts (not just adding a client),
-- with Postgres's generic RLS violation as the only visible symptom.
--
-- This is Supabase's own recommended pattern to prevent that class of bug
-- going forward: a trigger on auth.users that provisions a matching
-- profiles row automatically, regardless of how the auth user was created
-- (dashboard, admin API, or self-signup if that's ever enabled).
create function public.handle_new_user() returns trigger as $$
begin
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
