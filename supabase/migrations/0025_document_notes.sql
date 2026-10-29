-- A free-text note on each checklist item (one documents row per item per
-- application), so a case manager can flag something about that item for
-- the rest of the team. One shared note per item, with who last edited it
-- and when. Doesn't touch status, so the completion trigger (0004, fires on
-- "update of status") isn't affected.
alter table documents
  add column notes text,
  add column notes_updated_by uuid references profiles (id) on delete set null,
  add column notes_updated_at timestamptz;
