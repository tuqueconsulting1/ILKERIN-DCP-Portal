-- Ilkerin DCP Workflow Automation - initial schema
-- Entities per PLAN.md section 4.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum ('case_manager', 'compliance', 'admin');
create type dcp_stage as enum ('stage_1', 'stage_2', 'stage_3');
create type owner_tag as enum ('client', 'ilkerin', 'joint');
create type document_status as enum ('missing', 'received', 'verified', 'expired', 'rejected');
create type task_status as enum ('open', 'done', 'cancelled');
create type cbk_response_status as enum ('pending', 'responded', 'overdue');
create type fee_status as enum ('pending', 'paid', 'waived');
create type notification_channel as enum ('email', 'push', 'in_app');
create type notification_status as enum ('queued', 'sent', 'failed');
create type application_status as enum ('active', 'complete', 'withdrawn');

-- ---------------------------------------------------------------------------
-- Profiles (case managers / compliance / admin) - one row per auth.users id
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role user_role not null default 'case_manager',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Checklist templates - versioned, compliance-team editable
-- ---------------------------------------------------------------------------

create table checklist_templates (
  id uuid primary key default gen_random_uuid(),
  stage dcp_stage not null,
  item_name text not null,
  owner_tag owner_tag not null,
  expiry_rule_days integer, -- null = never expires (e.g. CRB report = 90)
  version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------

create table clients (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  engagement_details text,
  case_manager_id uuid references profiles (id),
  zoho_workdrive_folder_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Applications - one per client, tracks current stage/progress
-- ---------------------------------------------------------------------------

create table applications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  stage dcp_stage not null default 'stage_1',
  sub_status text,
  completion_pct integer not null default 0 check (completion_pct between 0 and 100),
  status application_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_client_id_idx on applications (client_id);

-- ---------------------------------------------------------------------------
-- Shareholders / Directors - KYC & vetting status
-- ---------------------------------------------------------------------------

create table shareholders_directors (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  full_name text not null,
  role text not null, -- 'shareholder' | 'director' | both, kept as free text tag
  kyc_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index shareholders_directors_client_id_idx on shareholders_directors (client_id);

-- ---------------------------------------------------------------------------
-- Documents - one row per checklist item instance for an application
-- ---------------------------------------------------------------------------

create table documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  checklist_template_id uuid not null references checklist_templates (id),
  owner_tag owner_tag not null,
  status document_status not null default 'missing',
  expiry_date date,
  zoho_file_id text,
  zoho_file_url text,
  uploaded_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_application_id_idx on documents (application_id);
create index documents_expiry_date_idx on documents (expiry_date) where expiry_date is not null;

-- ---------------------------------------------------------------------------
-- Tasks - generic, linked to any entity (document, cbk query, etc.)
-- ---------------------------------------------------------------------------

create table tasks (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  linked_entity_type text, -- e.g. 'document', 'cbk_correspondence'
  linked_entity_id uuid,
  title text not null,
  owner_id uuid references profiles (id),
  due_date date,
  status task_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_application_id_idx on tasks (application_id);
create index tasks_owner_id_idx on tasks (owner_id);
create index tasks_due_date_idx on tasks (due_date) where status = 'open';

-- ---------------------------------------------------------------------------
-- CBK correspondence - query log & response deadlines
-- ---------------------------------------------------------------------------

create table cbk_correspondence (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  query_text text not null,
  received_date date not null default current_date,
  response_deadline date,
  response_status cbk_response_status not null default 'pending',
  response_text text,
  created_at timestamptz not null default now()
);

create index cbk_correspondence_application_id_idx on cbk_correspondence (application_id);

-- ---------------------------------------------------------------------------
-- Fee payments
-- ---------------------------------------------------------------------------

create table fee_payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  fee_type text not null,
  amount numeric(12, 2) not null,
  status fee_status not null default 'pending',
  receipt_ref text,
  created_at timestamptz not null default now()
);

create index fee_payments_application_id_idx on fee_payments (application_id);

-- ---------------------------------------------------------------------------
-- Notification log
-- ---------------------------------------------------------------------------

create table notification_log (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  channel notification_channel not null,
  template text not null,
  related_application_id uuid references applications (id),
  status notification_status not null default 'queued',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index notification_log_application_id_idx on notification_log (related_application_id);

-- ---------------------------------------------------------------------------
-- Audit log - append-only
-- ---------------------------------------------------------------------------

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null, -- 'insert' | 'update' | 'delete'
  actor_id uuid references profiles (id),
  diff jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_entity_idx on audit_log (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------

create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_set_updated_at before update on clients
  for each row execute function set_updated_at();
create trigger applications_set_updated_at before update on applications
  for each row execute function set_updated_at();
create trigger documents_set_updated_at before update on documents
  for each row execute function set_updated_at();
create trigger tasks_set_updated_at before update on tasks
  for each row execute function set_updated_at();
