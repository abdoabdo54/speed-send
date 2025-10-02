-- Add admin_email column to service_accounts table
ALTER TABLE service_accounts ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255);

