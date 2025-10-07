-- Add test_after_email and test_after_count columns to campaigns table
ALTER TABLE campaigns ADD COLUMN test_after_email VARCHAR(255);
ALTER TABLE campaigns ADD COLUMN test_after_count INTEGER DEFAULT 0;

-- Update existing campaigns to have default values
UPDATE campaigns SET test_after_count = 0 WHERE test_after_count IS NULL;
