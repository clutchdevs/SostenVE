-- Preferred contact method (RF-1.3, green-branch screen 2, issue #52).
--
-- The requester chooses how they'd rather be reached (WhatsApp / phone call);
-- the assigned psychologist uses it to contact through the preferred channel.
-- Stored as a wire value ('whatsapp' | 'llamada'); nullable (red branch and older
-- cases have none).

alter table cases
  add column preferred_contact_method text;
