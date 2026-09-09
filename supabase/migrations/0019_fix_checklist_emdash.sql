-- 0018 was written with em-dashes in a few doc_type/item_name values before
-- a project-wide em-dash cleanup; those rows were already live by the time
-- of that cleanup, so fix the already-inserted data to match (editing 0018
-- in place would only affect a future from-scratch run, not this database).
update checklist_templates
set doc_type = replace(doc_type, ' — ', ' - ')
where doc_type like '%—%';

update checklist_templates
set item_name = replace(item_name, ' — ', ' - ')
where item_name like '%—%';
