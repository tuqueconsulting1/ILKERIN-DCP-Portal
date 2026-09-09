-- Progress and item counts must be scoped to the application's CURRENT
-- stage, not every document ever attached to it - otherwise once a stage
-- auto-advances and the next stage's checklist is seeded alongside the
-- already-completed previous stage's documents, counts blend both stages
-- into one misleading number.

create or replace function recalc_application_completion() returns trigger as $$
declare
  target_application_id uuid;
  target_stage dcp_stage;
  next_stage dcp_stage;
  total_count int;
  verified_count int;
begin
  target_application_id := coalesce(new.application_id, old.application_id);

  select stage into target_stage from applications where id = target_application_id;

  select count(*), count(*) filter (where d.status = 'verified')
    into total_count, verified_count
    from documents d
    join checklist_templates ct on ct.id = d.checklist_template_id
    where d.application_id = target_application_id
      and ct.stage = target_stage;

  update applications
    set completion_pct = case
      when total_count = 0 then 0
      else round(100.0 * verified_count / total_count)
    end
    where id = target_application_id;

  -- Auto-advance once every item in the current stage is verified. Stage 3
  -- deliberately does NOT auto-complete the case - that's an explicit
  -- case-manager action ("licence received" button), not inferred here.
  if total_count > 0 and verified_count = total_count and target_stage <> 'stage_3' then
    next_stage := case target_stage
      when 'stage_1' then 'stage_2'
      when 'stage_2' then 'stage_3'
    end;

    update applications
      set stage = next_stage
      where id = target_application_id and stage = target_stage;

    if found then
      insert into documents (application_id, checklist_template_id, owner_tag, status)
      select target_application_id, ct.id, ct.owner_tag, 'missing'
      from checklist_templates ct
      where ct.stage = next_stage and ct.is_active = true;
    end if;
  end if;

  return null;
end;
$$ language plpgsql;

drop view application_board;

create view application_board with (security_invoker = true) as
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
  count(d.id) as total_items,
  count(d.id) filter (where d.status = 'verified') as verified_items,
  count(d.id) filter (where d.status = 'missing') as missing_items,
  count(d.id) filter (where d.status = 'received') as pending_review_items,
  count(d.id) filter (
    where d.expiry_date is not null
      and d.expiry_date <= current_date + interval '14 days'
      and d.status <> 'expired'
  ) as expiring_soon_items,
  count(t.id) filter (where t.status = 'open') as open_tasks,
  count(t.id) filter (where t.status = 'open' and t.due_date < current_date) as overdue_tasks,
  count(cc.id) filter (where cc.response_status <> 'responded') as pending_cbk_queries
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
