-- Lets a case manager mark each CBK correspondence attachment (query side and
-- response side, matching the two slots from 0017) as verified, and leave a
-- note about it. Stored on the row itself rather than per-user, so once anyone
-- verifies a file every staff member sees it as verified, with who and when.
--
-- Deleting an attachment clears its verification (the file it vouched for is
-- gone) but keeps the note, since that's free text someone wrote by hand.
alter table cbk_correspondence
  add column query_file_verified_by uuid references profiles (id) on delete set null,
  add column query_file_verified_at timestamptz,
  add column query_file_verification_note text,
  add column response_file_verified_by uuid references profiles (id) on delete set null,
  add column response_file_verified_at timestamptz,
  add column response_file_verification_note text;
