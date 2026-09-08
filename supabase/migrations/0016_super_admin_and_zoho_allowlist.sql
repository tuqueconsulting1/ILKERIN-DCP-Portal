-- Super admin: a capability orthogonal to the existing case_manager/
-- compliance/admin `role` column (which governs DCP-workflow permissions).
-- Super admin only controls system-level access config -- specifically,
-- which emails are allowed to sign in via Zoho -- managed from the new
-- /superadmin dashboard, not the regular app.
alter table profiles add column is_super_admin boolean not null default false;

create function is_super_admin() returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and is_super_admin);
$$ language sql security definer stable;

create table zoho_allowed_emails (
  email text primary key,
  added_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

alter table zoho_allowed_emails enable row level security;

create policy "super admin can read zoho_allowed_emails" on zoho_allowed_emails
  for select using (is_super_admin());

create policy "super admin can write zoho_allowed_emails" on zoho_allowed_emails
  for all using (is_super_admin()) with check (is_super_admin());

update profiles set is_super_admin = true where email = 'admin@iacentre.co.ke';

-- Supersedes the hardcoded @iacentre.co.ke domain check from 0015 -- Zoho
-- sign-in is now gated by the super-admin-managed allowlist (individual
-- emails, not just a domain) instead of a fixed rule.
create or replace function public.handle_new_user() returns trigger as $$
declare
  is_zoho boolean := (new.raw_app_meta_data->>'provider') = 'custom:zoho';
begin
  if is_zoho and not exists (
    select 1 from public.zoho_allowed_emails where lower(email) = lower(new.email)
  ) then
    raise exception 'This email is not approved for Zoho sign-in. Ask a super admin to add it.';
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
