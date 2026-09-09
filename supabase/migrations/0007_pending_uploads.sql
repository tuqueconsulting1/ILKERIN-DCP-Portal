-- Staging area for files the polling job finds in a client's WorkDrive
-- folder that don't yet correspond to a checklist item. A case manager
-- manually matches each one to the right document (or ignores it) - see
-- PLAN.md's note on why automatic filename matching isn't reliable enough
-- to be the only path.
create type pending_upload_status as enum ('pending', 'matched', 'ignored');

create table pending_uploads (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  zoho_file_id text not null,
  zoho_file_name text not null,
  zoho_file_url text,
  zoho_uploaded_time timestamptz,
  status pending_upload_status not null default 'pending',
  matched_document_id uuid references documents (id),
  created_at timestamptz not null default now(),
  unique (application_id, zoho_file_id)
);

create index pending_uploads_application_id_idx on pending_uploads (application_id);
create index pending_uploads_status_idx on pending_uploads (status) where status = 'pending';

alter table pending_uploads enable row level security;

create policy "staff can read pending_uploads" on pending_uploads
  for select using (is_staff());

create policy "staff can write pending_uploads" on pending_uploads
  for all using (is_staff()) with check (is_staff());
