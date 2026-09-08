-- Lets a case manager attach a file (any format) to a CBK query and,
-- separately, to the response sent back -- two slots rather than one,
-- mirroring the existing query_text/response_text split, since a single
-- correspondence row can carry a document on each side of the exchange.
alter table cbk_correspondence add column query_zoho_file_id text;
alter table cbk_correspondence add column query_zoho_file_url text;
alter table cbk_correspondence add column query_zoho_file_name text;
alter table cbk_correspondence add column response_zoho_file_id text;
alter table cbk_correspondence add column response_zoho_file_url text;
alter table cbk_correspondence add column response_zoho_file_name text;
