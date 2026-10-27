-- Adds Form CBK NDTCP 4 to the Stage 2 "NDTCP Application Forms" section,
-- directly after Form 3. Uses the NDTCP naming from 0020.
--
-- sort_order is a single global sequence (0014/0018), so make room at
-- position 4 by shifting every later Stage 2 row down one.
update checklist_templates
set sort_order = sort_order + 1
where stage = 'stage_2' and sort_order >= 4;

insert into checklist_templates (stage, item_name, owner_tag, form, category, subcategory, doc_type, sort_order, is_active) values
  ('stage_2', 'Form CBK NDTCP 4', 'client', 'NDTCP 4', 'Management & Assessment', 'NDTCP Application Forms', 'Application Form', 4, true);

-- Stage documents are only instantiated when a case advances into a stage
-- (0009), so cases already sitting in Stage 2 would never get the new item.
-- Backfill it for them; completed/withdrawn cases are left untouched.
insert into documents (application_id, checklist_template_id, owner_tag, status)
select a.id, ct.id, ct.owner_tag, 'missing'
from applications a
cross join checklist_templates ct
where a.stage = 'stage_2'
  and a.status = 'active'
  and ct.stage = 'stage_2'
  and ct.item_name = 'Form CBK NDTCP 4'
  and not exists (
    select 1 from documents d
    where d.application_id = a.id and d.checklist_template_id = ct.id
  );
