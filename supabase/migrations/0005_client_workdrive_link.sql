-- Case managers link an already-existing WorkDrive folder for clients whose
-- engagement predates this app (historical/in-progress clients). New clients
-- going forward will get a folder auto-created by the app once the broader
-- Zoho write scope is in place (tracked in MILESTONES.md) - this column is
-- shared by both paths.
alter table clients add column workdrive_folder_url text;
