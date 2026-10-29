-- application_board left-joins documents, tasks and cbk_correspondence onto
-- the same application row, so each count was multiplied by the row counts
-- of the other two joins (e.g. 22 checklist items x 25 tasks x 2 CBK queries
-- showed as "0/1100 items verified" and "1100 CBK query"). Counting distinct
-- ids per joined table makes each count independent of the others.
create or replace view application_board with (security_invoker = true) as
select
  a.id as application_id,
  a.client_id,
  a.stage,
  a.status as application_status,
  a.completion_pct,
  a.updated_at,
  c.company_name,
  c.case_manager_id,
  p.full_name as case_manager_name,
  count(distinct d.id) as total_items,
  count(distinct d.id) filter (where d.status = 'verified') as verified_items,
  count(distinct d.id) filter (where d.status = 'missing') as missing_items,
  count(distinct d.id) filter (where d.status = 'received') as pending_review_items,
  count(distinct d.id) filter (
    where d.expiry_date is not null
      and d.expiry_date <= current_date + interval '14 days'
      and d.status <> 'expired'
  ) as expiring_soon_items,
  count(distinct t.id) filter (where t.status = 'open') as open_tasks,
  count(distinct t.id) filter (where t.status = 'open' and t.due_date < current_date) as overdue_tasks,
  count(distinct cc.id) filter (where cc.response_status <> 'responded') as pending_cbk_queries
from applications a
join clients c on c.id = a.client_id
left join profiles p on p.id = c.case_manager_id
left join documents d
  on d.application_id = a.id
  and d.checklist_template_id in (
    select ct.id from checklist_templates ct where ct.stage = a.stage
  )
left join tasks t on t.application_id = a.id
left join cbk_correspondence cc on cc.application_id = a.id
group by a.id, a.client_id, a.stage, a.status, a.completion_pct, a.updated_at,
  c.company_name, c.case_manager_id, p.full_name;
