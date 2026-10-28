-- Automated document verification. Each file the WorkDrive poll queues in
-- pending_uploads is downloaded and read by Claude, which suggests the
-- checklist item it belongs to and a verify/reject recommendation with its
-- reasons (src/lib/verification.ts). A case manager still makes the final
-- call from the case page - nothing here changes a document's status.
--
-- Reviews live on pending_uploads rather than documents because a review is
-- of a file, made before anyone has decided which checklist item it is.
create type ai_review_status as enum ('queued', 'done', 'error', 'skipped');
create type ai_recommendation as enum ('verify', 'reject', 'unsure');

alter table pending_uploads
  add column ai_status ai_review_status not null default 'queued',
  add column ai_suggested_document_id uuid references documents (id) on delete set null,
  add column ai_recommendation ai_recommendation,
  add column ai_summary text,
  -- {right_document, signed_and_complete, in_date, names_match}, each
  -- {result: pass|fail|unclear|not_applicable, note}
  add column ai_checks jsonb,
  add column ai_expiry_date date,
  add column ai_model text,
  add column ai_input_tokens integer,
  add column ai_output_tokens integer,
  add column ai_checked_at timestamptz,
  -- Why a review errored or was skipped (unreadable file type, too large...)
  add column ai_error text;

create index pending_uploads_ai_queue_idx on pending_uploads (created_at)
  where status = 'pending' and ai_status = 'queued';
