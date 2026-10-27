-- CBK now licenses Digital Credit Providers (DCP) as Non-Deposit Taking
-- Credit Providers (NDTCP), and the portal's credit-provider module is named
-- NDTCP to match. Rewrite the "DCP" token in every checklist template
-- column, across all stages. Case documents reference these rows by id, so
-- existing cases pick up the new wording without touching `documents`.
-- \m...\M are Postgres word boundaries: they match "DCP 1", "DCP 1/2/3" and
-- "CBK DCP 2" but never re-match an already-renamed "NDTCP", so this is
-- safe to re-run.
update checklist_templates
set
  item_name   = regexp_replace(item_name,   '\mDCP\M', 'NDTCP', 'g'),
  form        = regexp_replace(form,        '\mDCP\M', 'NDTCP', 'g'),
  category    = regexp_replace(category,    '\mDCP\M', 'NDTCP', 'g'),
  subcategory = regexp_replace(subcategory, '\mDCP\M', 'NDTCP', 'g'),
  doc_type    = regexp_replace(doc_type,    '\mDCP\M', 'NDTCP', 'g')
where item_name   ~ '\mDCP\M'
   or form        ~ '\mDCP\M'
   or category    ~ '\mDCP\M'
   or subcategory ~ '\mDCP\M'
   or doc_type    ~ '\mDCP\M';
