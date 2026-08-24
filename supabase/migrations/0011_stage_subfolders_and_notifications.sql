-- Per-stage WorkDrive subfolder IDs, so a client's documents can be
-- organized by stage instead of dropped flat into one folder. Flat columns
-- (not a join table) since there are exactly three fixed stages.
alter table clients add column workdrive_stage1_folder_id text;
alter table clients add column workdrive_stage2_folder_id text;
alter table clients add column workdrive_stage3_folder_id text;

-- notification_log was originally written assuming only service-role jobs
-- would insert into it (see 0002's comment). In practice, the events that
-- feed it today (a document being marked "received") happen inside normal
-- case-manager server actions running under the user's own session, not a
-- background job — so staff need insert access too.
create policy "staff can insert notification_log" on notification_log
  for insert with check (is_staff());

create index notification_log_created_at_idx on notification_log (created_at desc);
