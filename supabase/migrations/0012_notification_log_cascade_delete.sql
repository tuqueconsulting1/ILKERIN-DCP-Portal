-- Bug found while testing the new notification feature: notification_log's
-- foreign key to applications was declared without ON DELETE CASCADE back in
-- 0001 (every other per-application table -- documents, tasks,
-- cbk_correspondence, pending_uploads -- already cascades correctly).
-- That silently broke "Delete client" for any client that had ever had a
-- notification logged: Postgres blocked the cascading delete of the
-- application because a notification_log row still referenced it, which in
-- turn blocked deleting the client, with no visible error path other than
-- the delete just not happening.
alter table notification_log drop constraint notification_log_related_application_id_fkey;

alter table notification_log
  add constraint notification_log_related_application_id_fkey
  foreign key (related_application_id) references applications (id) on delete cascade;
