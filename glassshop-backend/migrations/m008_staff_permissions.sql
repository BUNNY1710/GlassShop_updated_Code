-- m008_staff_permissions.sql
--
-- Per-staff RBAC. One row per (staff user, permission key). Admin users hold
-- every permission implicitly and get no rows here. Migrations run before
-- sequelize.sync, so the table is created explicitly. Splitter-safe (no $$).

CREATE TABLE IF NOT EXISTS staff_permissions (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key VARCHAR(50) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_permissions_user_perm
  ON staff_permissions (user_id, permission_key);
