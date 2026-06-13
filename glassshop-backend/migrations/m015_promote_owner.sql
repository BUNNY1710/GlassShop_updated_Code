-- m015_promote_owner.sql
--
-- Introduce the OWNER (super-admin) role. Promote each shop's earliest ADMIN
-- account to OWNER so existing main admins gain owner privileges (create/delete
-- other admins). New admins created via /create-admin remain ROLE_ADMIN.

UPDATE users SET role = 'ROLE_OWNER'
WHERE id IN (SELECT MIN(id) FROM users WHERE role = 'ROLE_ADMIN' GROUP BY shop_id);
