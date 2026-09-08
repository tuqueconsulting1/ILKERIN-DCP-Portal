-- Lets compliance/admin drag-reorder checklist items (case page UI). Order is
-- per checklist_templates row, so it's shared across every application at
-- that stage — reordering is a template-level (admin) change, not a
-- per-case preference, matching the existing "compliance/admin can write
-- checklist templates" RLS policy from 0002.
alter table checklist_templates add column sort_order integer not null default 0;

-- Backfill: preserve today's implicit order (creation order within each
-- stage) as the starting sort_order, so existing checklists don't visibly
-- reshuffle the first time this ships.
with ordered as (
  select id, row_number() over (partition by stage order by created_at, id) as rn
  from checklist_templates
)
update checklist_templates ct
set sort_order = ordered.rn
from ordered
where ordered.id = ct.id;

create index checklist_templates_stage_sort_order_idx on checklist_templates (stage, sort_order);
