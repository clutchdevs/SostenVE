-- Days of week each crisis line operates (issue #127). NULL means every day,
-- matching the existing behaviour of every current row. Reuses the Spanish
-- day names already used for volunteer availability (dia_semana enum values).
alter table crisis_lines add column days_of_week text[];
