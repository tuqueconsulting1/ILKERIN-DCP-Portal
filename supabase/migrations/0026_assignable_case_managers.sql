-- Feeds the "Assign to" dropdown on the case page: the Zoho sign-in
-- allowlist (0016), matched to a profile where that person has signed in at
-- least once. clients.case_manager_id references profiles, so an allowed
-- email with no profile yet is returned (shown greyed out) but can't be
-- assigned until they sign in.
--
-- zoho_allowed_emails itself stays super-admin-only under RLS; this security
-- definer function exposes just these columns, and only to staff.
create function assignable_case_managers()
returns table (email text, profile_id uuid, full_name text) as $$
  select z.email, p.id, p.full_name
  from zoho_allowed_emails z
  left join profiles p on lower(p.email) = lower(z.email)
  where is_staff()
  order by lower(z.email);
$$ language sql security definer stable set search_path = public;

grant execute on function assignable_case_managers() to authenticated;
