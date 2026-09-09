-- PLACEHOLDER checklist seed data.
--
-- This is NOT the real CBK checklist - it exists only so the app has
-- something to render during development. Replace with the compliance
-- team's authoritative Stage 1/2/3 checklist (item names, owner tags, expiry
-- rules) before the pilot (MILESTONES.md Phase 0/1). When that arrives,
-- either edit this file before it's first applied, or ship a new migration
-- that deactivates these rows (is_active = false) and inserts the real ones -
-- do not edit an already-applied migration in place.

insert into checklist_templates (stage, item_name, owner_tag, expiry_rule_days) values
  ('stage_1', 'Proposed company name reservation form', 'client', null),
  ('stage_1', 'KIPI name search & reservation letter', 'ilkerin', null),
  ('stage_2', 'Certificate of incorporation', 'client', null),
  ('stage_2', 'Memorandum & articles of association', 'client', null),
  ('stage_2', 'Director/shareholder CRB clearance report', 'client', 90),
  ('stage_2', 'Director/shareholder KYC documents', 'client', null),
  ('stage_2', 'Business plan', 'joint', null),
  ('stage_2', 'Application letter to CBK', 'ilkerin', null),
  ('stage_3', 'API testing sign-off', 'joint', null),
  ('stage_3', 'Licence fee payment receipt', 'client', null),
  ('stage_3', 'Data submission confirmation', 'ilkerin', null);
