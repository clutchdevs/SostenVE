-- #158: a patient may be referred to MORE THAN ONE specialist, so the closure's
-- referral destination becomes a LIST. The combined "ambos" (Psicología y
-- Psiquiatría) option is dropped — psicología and psiquiatría are now selected
-- individually. Convert existing single values to arrays.

alter table case_closures add column if not exists referral_destinations text[];

update case_closures
set referral_destinations = case
    when referral_destination is null then '{}'::text[]
    when referral_destination = 'ambos' then array['psicologia', 'psiquiatria']
    else array[referral_destination]
  end
where referral_destinations is null;

alter table case_closures alter column referral_destinations set default '{}';
alter table case_closures alter column referral_destinations set not null;

alter table case_closures drop column if exists referral_destination;
