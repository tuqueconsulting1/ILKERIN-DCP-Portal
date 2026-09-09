-- Make the auto-advance checklist seeding idempotent. Now that a case
-- manager can send an application back a stage (which resets that stage's
-- items rather than deleting the stage ahead of it - see the app's
-- moveToPreviousStage action), a case could later re-advance through a
-- stage whose documents already exist from before. Without this guard,
-- re-advancing would insert duplicate document rows for the same checklist
-- items.

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
      where ct.stage = next_stage
        and ct.is_active = true
        and not exists (
          select 1 from documents d2
          where d2.application_id = target_application_id
            and d2.checklist_template_id = ct.id
        );
    end if;
  end if;

  return null;
end;
$$ language plpgsql;
