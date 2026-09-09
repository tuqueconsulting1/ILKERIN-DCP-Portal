-- Replaces the Stage 2 placeholder checklist (0003) with the real,
-- CBK-mandated document list supplied by the compliance team
-- (CBK_DCP_Document_Requirements_2_3.xlsx), per the placeholder's own
-- instruction: "ship a new migration that deactivates these rows... and
-- inserts the real ones -- do not edit an already-applied migration."
--
-- category = the workbook's tab name; subcategory = the three red-filled
-- section-header rows in the first tab only (verified against the file's
-- raw XML: column B of rows 5/9/32 carries fill rgb FFFF0000 -- "DCP
-- Application Forms" / "Supporting Documents" / "Statutory Declaration");
-- the other two tabs have no red cells and so get no subcategory. form/
-- doc_type come from the sheet's own "Form"/"Category" columns. Per
-- explicit scope decision, only the sheet's Document Name/Form/Category
-- columns are imported -- Doc Code, Applies To, Required Format,
-- Multiplicity, and Mandatory/Conditional are not modeled this round (no
-- per-person document generation yet; shareholders_directors stays unused).
--
-- sort_order continues the column added in 0014 (drag-to-reorder) --
-- assigned once, globally, in the workbook's own row order, which already
-- nests category -> subcategory -> item correctly on its own.
update checklist_templates set is_active = false where stage = 'stage_2';

alter table checklist_templates add column category text;
alter table checklist_templates add column subcategory text;
alter table checklist_templates add column doc_type text;
alter table checklist_templates add column form text;

insert into checklist_templates (stage, item_name, owner_tag, form, category, subcategory, doc_type, sort_order, is_active) values
  ('stage_2', 'Form CBK DCP 1 (completed, printed & signed)', 'client', 'DCP 1', 'Management & Assessment', 'DCP Application Forms', 'Application Form', 1, true),
  ('stage_2', 'Form CBK DCP 2 (completed & sworn)', 'client', 'DCP 2', 'Management & Assessment', 'DCP Application Forms', 'Application Form', 2, true),
  ('stage_2', 'Form CBK DCP 3 (completed & sworn)', 'client', 'DCP 3', 'Management & Assessment', 'DCP Application Forms', 'Application Form', 3, true),
  ('stage_2', 'Certificate of Incorporation', 'client', 'DCP 1', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Company', 4, true),
  ('stage_2', 'Memorandum & Articles of Association', 'client', 'DCP 1', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Company', 5, true),
  ('stage_2', 'Notification of Registered Address', 'client', 'DCP 1', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Company', 6, true),
  ('stage_2', 'Memorandum & Articles of Association of Corporate Significant Shareholder', 'client', 'DCP 1', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Company', 7, true),
  ('stage_2', 'Constitutive Documents of Unincorporated Significant Shareholder', 'client', 'DCP 1', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Company', 8, true),
  ('stage_2', 'Certificate of Incorporation (Corporate Significant Shareholder)', 'client', 'DCP 3', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Company', 9, true),
  ('stage_2', 'Memorandum & Articles of Association / Constitutive Documents', 'client', 'DCP 3', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Company', 10, true),
  ('stage_2', 'Group / Ownership Structure Chart (Organogram)', 'client', 'DCP 3', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Company', 11, true),
  ('stage_2', 'Any Other Information Requested by CBK', 'client', 'DCP 1', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Company', 12, true),
  ('stage_2', 'Curriculum Vitae', 'client', 'DCP 2', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual', 13, true),
  ('stage_2', 'National ID or Passport', 'client', 'DCP 2', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual', 14, true),
  ('stage_2', 'KRA PIN Certificate', 'client', 'DCP 1/2/3', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual', 15, true),
  ('stage_2', 'Academic Certificates', 'client', 'DCP 2', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual', 16, true),
  ('stage_2', 'Professional Certificates', 'client', 'DCP 2', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual', 17, true),
  ('stage_2', 'Certificate of Good Conduct', 'client', 'DCP 2', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual', 18, true),
  ('stage_2', 'Tax Compliance Certificate', 'client', 'DCP 2', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual', 19, true),
  ('stage_2', 'Credit Reference Bureau (CRB) Report', 'client', 'DCP 2', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual', 20, true),
  ('stage_2', 'Professional Reference Letters (x3)', 'client', 'DCP 2', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual', 21, true),
  ('stage_2', 'National ID or Passport', 'client', 'DCP 3', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual', 22, true),
  ('stage_2', 'Certificate of Good Conduct', 'client', 'DCP 3', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual', 23, true),
  ('stage_2', 'Tax Compliance Certificate', 'client', 'DCP 1/2/3', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual/Company', 24, true),
  ('stage_2', 'Credit Reference Bureau (CRB) Report', 'client', 'DCP 2/ 3', 'Management & Assessment', 'Supporting Documents', 'Supporting Document - Individual/Company', 25, true),
  ('stage_2', 'Statutory Declaration (signed by every officer)', 'client', 'DCP 2/3', 'Management & Assessment', 'Statutory Declaration', 'Statutory Declaration', 26, true),
  ('stage_2', 'Non-Dual Directorship Affidavit', 'client', 'DCP 2', 'Management & Assessment', 'Statutory Declaration', 'Statutory Declaration', 27, true),
  ('stage_2', 'Sworn Statement - Funds Not Proceeds of Crime', 'client', 'DCP 3', 'Management & Assessment', 'Statutory Declaration', 'Statutory Declaration', 28, true),
  ('stage_2', 'AML/CFT Policy & Procedures', 'client', 'N/A', 'Operational Due Diligence', null, 'Policy', 29, true),
  ('stage_2', 'Data Protection Policy & Procedures', 'client', 'N/A', 'Operational Due Diligence', null, 'Policy', 30, true),
  ('stage_2', 'Consumer Redress Mechanism Policy', 'client', 'N/A', 'Operational Due Diligence', null, 'Policy', 31, true),
  ('stage_2', 'Credit Policy, Code of Ethics & Market Conduct Policy', 'client', 'N/A', 'Operational Due Diligence', null, 'Policy', 32, true),
  ('stage_2', 'Corporate Governance Policy', 'client', 'N/A', 'Operational Due Diligence', null, 'Policy', 33, true),
  ('stage_2', 'ICT Systems Description', 'client', 'N/A', 'Operational Due Diligence', null, 'Technical', 34, true),
  ('stage_2', 'Independent Assurance Report on ICT Systems', 'client', 'N/A', 'Operational Due Diligence', null, 'Technical', 35, true),
  ('stage_2', 'Delivery Channels / Platforms Description', 'client', 'N/A', 'Operational Due Diligence', null, 'Technical', 36, true),
  ('stage_2', 'Any other Policy', 'client', null, 'Operational Due Diligence', null, null, 37, true),
  ('stage_2', 'Pricing Model & Parameters', 'client', 'N/A', 'Financial-Commercial DD', null, 'Financial/Commercial', 38, true),
  ('stage_2', 'Audited Financial Statements', 'client', 'N/A', 'Financial-Commercial DD', null, 'Financial', 39, true),
  ('stage_2', 'Business Plan/Business Continuity Plan', 'client', 'N/A', 'Financial-Commercial DD', null, 'Operational Resilience', 40, true),
  ('stage_2', 'Credit Products & Terms Description', 'client', 'N/A', 'Financial-Commercial DD', null, 'Commercial', 41, true),
  ('stage_2', 'Source of Funds Description & Evidence', 'client', 'N/A', 'Financial-Commercial DD', null, 'Financial', 42, true),
  ('stage_2', 'Capital Injection Evidence - Bank Statements', 'client', 'N/A', 'Financial-Commercial DD', null, 'Financial', 43, true);
