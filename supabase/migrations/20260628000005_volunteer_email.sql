-- Volunteer email (Block 4): used for notifications and as the login username.
alter table volunteers add column email text;
create unique index idx_volunteers_email on volunteers (email);
