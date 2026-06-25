-- m017_shop_profile_fields.sql
--
-- Extra shop profile fields captured during self-registration.

ALTER TABLE shop ADD COLUMN IF NOT EXISTS business_type VARCHAR(50);
ALTER TABLE shop ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50);
ALTER TABLE shop ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE shop ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE shop ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE shop ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
