-- P3 #131: record attention time in whole MINUTES (min 1) instead of decimal
-- hours. The old form defaulted to 0.05 h, which clashed with the 0.25 step and
-- the min-0.25 validation and made closing fail. Convert existing closures
-- (round up to at least 1 minute) and switch the column.

alter table case_closures add column if not exists minutes integer;

update case_closures
set minutes = greatest(1, ceil(hours * 60)::int)
where minutes is null and hours is not null;

-- Any legacy row without hours defaults to the 1-minute floor.
update case_closures set minutes = 1 where minutes is null;

alter table case_closures alter column minutes set not null;
alter table case_closures drop column if exists hours;
