-- Add daily limit tracking columns to service_accounts table
-- This script adds the necessary columns for 2k daily limit tracking

-- Add daily limit columns
ALTER TABLE service_accounts ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 2000;
ALTER TABLE service_accounts ADD COLUMN IF NOT EXISTS daily_sent INTEGER DEFAULT 0;
ALTER TABLE service_accounts ADD COLUMN IF NOT EXISTS daily_reset_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE service_accounts ADD COLUMN IF NOT EXISTS total_sent_all_time INTEGER DEFAULT 0;

-- Update existing accounts to have 2k daily limit
UPDATE service_accounts SET daily_limit = 2000 WHERE daily_limit IS NULL;

-- Set reset date to today for all accounts
UPDATE service_accounts SET daily_reset_date = CURRENT_DATE WHERE daily_reset_date IS NULL;

-- Initialize daily_sent to 0 for all accounts
UPDATE service_accounts SET daily_sent = 0 WHERE daily_sent IS NULL;

-- Initialize total_sent_all_time to 0 for all accounts
UPDATE service_accounts SET total_sent_all_time = 0 WHERE total_sent_all_time IS NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_accounts_daily_reset_date ON service_accounts(daily_reset_date);
CREATE INDEX IF NOT EXISTS idx_service_accounts_daily_sent ON service_accounts(daily_sent);

-- Show the updated table structure
SELECT 
    account_name,
    daily_limit,
    daily_sent,
    daily_reset_date,
    total_sent_all_time,
    (daily_limit - daily_sent) as remaining_today
FROM service_accounts;
